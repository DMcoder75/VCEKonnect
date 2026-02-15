-- =====================================================
-- Achievements & Streaks Schema
-- Tracks user achievements, badges, and goal streaks
-- =====================================================

-- Achievements table: stores earned badges and milestones
create table if not exists public.vk_achievements (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  achievement_type text not null, -- 'first_goal', 'week_streak_5', 'week_streak_10', 'month_complete', 'term_complete', 'perfect_week', etc.
  achievement_name text not null,
  achievement_description text,
  icon_name text, -- MaterialIcons name
  earned_at timestamp with time zone not null default now(),
  metadata jsonb default '{}'::jsonb, -- Additional data (streak count, percentage, etc.)
  constraint vk_achievements_pkey primary key (id),
  constraint vk_achievements_user_id_fkey foreign key (user_id) references vk_users (id) on delete cascade
);

-- Index for fast user achievement queries
create index if not exists idx_vk_achievements_user_id on public.vk_achievements using btree (user_id);
create index if not exists idx_vk_achievements_type on public.vk_achievements using btree (achievement_type);

-- Streaks table: tracks consecutive goal completions
create table if not exists public.vk_goal_streaks (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  streak_type text not null, -- 'weekly', 'monthly'
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_completion_date date,
  last_updated timestamp with time zone not null default now(),
  constraint vk_goal_streaks_pkey primary key (id),
  constraint vk_goal_streaks_user_id_fkey foreign key (user_id) references vk_users (id) on delete cascade,
  constraint unique_user_streak_type unique (user_id, streak_type)
);

-- Index for streak queries
create index if not exists idx_vk_goal_streaks_user_id on public.vk_goal_streaks using btree (user_id);

-- RLS Policies for achievements
alter table public.vk_achievements enable row level security;

create policy "allow_anon_read_own_achievements"
  on public.vk_achievements for select to anon
  using (true);

create policy "allow_anon_insert_achievements"
  on public.vk_achievements for insert to anon
  with check (true);

-- RLS Policies for streaks
alter table public.vk_goal_streaks enable row level security;

create policy "allow_anon_all_streaks"
  on public.vk_goal_streaks for all to anon
  using (true)
  with check (true);

-- =====================================================
-- Function: Copy previous week's goals to new week
-- =====================================================
create or replace function copy_previous_week_goals(
  p_user_id uuid,
  p_new_start_date date
) returns jsonb as $$
declare
  v_previous_period record;
  v_new_period_id uuid;
  v_subject record;
  v_copied_count integer := 0;
begin
  -- Find the most recent weekly goal period
  select * into v_previous_period
  from vk_goal_periods
  where user_id = p_user_id
    and period_type = 'weekly'
    and start_date < p_new_start_date
  order by start_date desc
  limit 1;
  
  -- If no previous period found, return empty
  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'No previous weekly goals found to copy',
      'copied_count', 0
    );
  end if;
  
  -- Calculate new week's end date (6 days after start)
  -- Insert new period (or update if exists due to UPSERT)
  insert into vk_goal_periods (
    user_id,
    period_type,
    start_date,
    end_date,
    total_hours_target,
    total_minutes_achieved,
    is_active
  ) values (
    p_user_id,
    'weekly',
    p_new_start_date,
    p_new_start_date + interval '6 days',
    v_previous_period.total_hours_target,
    0, -- Reset achieved minutes
    true
  )
  on conflict (user_id, period_type, start_date)
  do update set
    total_hours_target = excluded.total_hours_target,
    is_active = true
  returning id into v_new_period_id;
  
  -- Copy subject goals from previous period
  for v_subject in
    select subject_id, hours_target
    from vk_goal_subjects
    where goal_period_id = v_previous_period.id
  loop
    insert into vk_goal_subjects (
      goal_period_id,
      subject_id,
      hours_target,
      minutes_achieved
    ) values (
      v_new_period_id,
      v_subject.subject_id,
      v_subject.hours_target,
      0 -- Reset achieved minutes
    )
    on conflict (goal_period_id, subject_id)
    do update set
      hours_target = excluded.hours_target,
      minutes_achieved = 0;
    
    v_copied_count := v_copied_count + 1;
  end loop;
  
  return jsonb_build_object(
    'success', true,
    'message', 'Goals copied successfully',
    'copied_count', v_copied_count,
    'new_period_id', v_new_period_id,
    'period_name', to_char(p_new_start_date, 'Mon DD') || ' - ' || to_char(p_new_start_date + interval '6 days', 'Mon DD')
  );
end;
$$ language plpgsql;

-- =====================================================
-- Function: Check and update goal streaks
-- =====================================================
create or replace function update_goal_streak(
  p_user_id uuid,
  p_period_id uuid,
  p_period_type text
) returns jsonb as $$
declare
  v_period record;
  v_streak record;
  v_is_complete boolean;
  v_new_streak integer;
  v_achievement_earned boolean := false;
  v_achievement_type text;
begin
  -- Get period details
  select * into v_period
  from vk_goal_periods
  where id = p_period_id;
  
  if not found then
    return jsonb_build_object('success', false, 'message', 'Period not found');
  end if;
  
  -- Check if goal is 100% complete
  v_is_complete := (v_period.total_minutes_achieved::numeric / (v_period.total_hours_target * 60)) >= 1.0;
  
  if not v_is_complete then
    return jsonb_build_object('success', false, 'message', 'Goal not complete');
  end if;
  
  -- Get or create streak record
  insert into vk_goal_streaks (user_id, streak_type, current_streak, longest_streak, last_completion_date)
  values (p_user_id, p_period_type, 0, 0, null)
  on conflict (user_id, streak_type)
  do nothing;
  
  select * into v_streak
  from vk_goal_streaks
  where user_id = p_user_id and streak_type = p_period_type;
  
  -- Check if this is a consecutive completion
  if v_streak.last_completion_date is null then
    -- First ever completion
    v_new_streak := 1;
  elsif p_period_type = 'weekly' and v_period.start_date = (v_streak.last_completion_date + interval '7 days')::date then
    -- Consecutive week
    v_new_streak := v_streak.current_streak + 1;
  elsif p_period_type = 'monthly' and extract(month from v_period.start_date) = extract(month from v_streak.last_completion_date) + 1 then
    -- Consecutive month
    v_new_streak := v_streak.current_streak + 1;
  else
    -- Streak broken, reset to 1
    v_new_streak := 1;
  end if;
  
  -- Update streak record
  update vk_goal_streaks
  set current_streak = v_new_streak,
      longest_streak = greatest(longest_streak, v_new_streak),
      last_completion_date = v_period.start_date,
      last_updated = now()
  where user_id = p_user_id and streak_type = p_period_type;
  
  -- Award achievements for milestones
  if v_new_streak = 1 then
    v_achievement_type := 'first_' || p_period_type || '_goal';
  elsif v_new_streak = 5 then
    v_achievement_type := p_period_type || '_streak_5';
  elsif v_new_streak = 10 then
    v_achievement_type := p_period_type || '_streak_10';
  elsif v_new_streak = 20 then
    v_achievement_type := p_period_type || '_streak_20';
  elsif v_new_streak = 50 then
    v_achievement_type := p_period_type || '_streak_50';
  end if;
  
  if v_achievement_type is not null then
    -- Check if achievement already exists
    if not exists (
      select 1 from vk_achievements
      where user_id = p_user_id and achievement_type = v_achievement_type
    ) then
      insert into vk_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_name, metadata)
      values (
        p_user_id,
        v_achievement_type,
        initcap(replace(v_achievement_type, '_', ' ')),
        'Completed ' || v_new_streak || ' consecutive ' || p_period_type || ' goals!',
        case
          when v_new_streak >= 50 then 'emoji-events'
          when v_new_streak >= 20 then 'military-tech'
          when v_new_streak >= 10 then 'star'
          when v_new_streak >= 5 then 'local-fire-department'
          else 'flag'
        end,
        jsonb_build_object('streak_count', v_new_streak)
      );
      v_achievement_earned := true;
    end if;
  end if;
  
  return jsonb_build_object(
    'success', true,
    'current_streak', v_new_streak,
    'longest_streak', greatest(v_streak.longest_streak, v_new_streak),
    'achievement_earned', v_achievement_earned,
    'achievement_type', v_achievement_type
  );
end;
$$ language plpgsql;
