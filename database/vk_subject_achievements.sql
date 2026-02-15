-- =====================================================
-- VCE Konnect - Subject-Level Achievements (Gamification)
-- =====================================================
-- Purpose: Track and reward individual subject goal completions
-- Features: Cookie rewards, perfect weeks, overachiever badges, consistency streaks
-- =====================================================

-- =====================================================
-- 1. SUBJECT COMPLETION TRACKING TABLE
-- =====================================================
-- Tracks every time a subject goal is completed (100%+)
create table if not exists vk_subject_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references vk_users(id) on delete cascade,
  subject_id text not null,
  goal_period_id uuid not null references vk_goal_periods(id) on delete cascade,
  completion_percent numeric(5,2) not null,
  completed_at timestamp with time zone default now(),
  
  -- Prevent duplicate tracking
  constraint unique_subject_completion unique (user_id, subject_id, goal_period_id)
);

create index idx_vk_subject_completions_user on vk_subject_completions(user_id);
create index idx_vk_subject_completions_subject on vk_subject_completions(subject_id);
create index idx_vk_subject_completions_date on vk_subject_completions(completed_at);

-- =====================================================
-- 2. SUBJECT CONSISTENCY STREAKS TABLE
-- =====================================================
-- Tracks consecutive weeks of 100%+ for the same subject
create table if not exists vk_subject_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references vk_users(id) on delete cascade,
  subject_id text not null,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_completion_week date, -- Week start date (Monday)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  constraint unique_user_subject_streak unique (user_id, subject_id)
);

create index idx_vk_subject_streaks_user on vk_subject_streaks(user_id);
create index idx_vk_subject_streaks_subject on vk_subject_streaks(subject_id);

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================
alter table vk_subject_completions enable row level security;
alter table vk_subject_streaks enable row level security;

create policy "allow_anon_all_subject_completions"
  on vk_subject_completions for all to anon
  using (true)
  with check (true);

create policy "allow_anon_all_subject_streaks"
  on vk_subject_streaks for all to anon
  using (true)
  with check (true);

-- =====================================================
-- 4. FUNCTION: DETECT SUBJECT ACHIEVEMENTS
-- =====================================================
-- Called after study session save to detect new subject completions
drop function if exists detect_subject_achievements(uuid);
create or replace function detect_subject_achievements(p_user_id uuid)
returns json
language plpgsql
as $$
declare
  v_achievement record;
  v_subject record;
  v_total_completions integer;
  v_perfect_week boolean;
  v_new_achievements json[] := '{}';
  v_week_start date;
  v_streak_record record;
  v_current_streak integer;
begin
  -- Recalculate progress first
  perform calculate_goal_progress(p_user_id);
  
  -- Get current week start (Monday)
  v_week_start := date_trunc('week', current_date)::date;
  
  -- ========== TRACK ALL COMPLETED SUBJECTS (100%+) ==========
  for v_subject in
    select 
      gs.subject_id,
      gs.goal_period_id,
      case 
        when gs.hours_target > 0 
        then round((gs.minutes_achieved::numeric / (gs.hours_target * 60)) * 100, 1)
        else 0 
      end as progress_percent,
      gp.period_type
    from vk_goal_subjects gs
    inner join vk_goal_periods gp on gp.id = gs.goal_period_id
    where gp.user_id = p_user_id
      and gp.is_active = true
      and gp.period_type = 'weekly' -- Only track weekly completions
      and gs.hours_target > 0
      and (gs.minutes_achieved::numeric / (gs.hours_target * 60)) >= 1.0 -- 100%+
  loop
    -- Insert completion record (ignore duplicates)
    insert into vk_subject_completions (
      user_id, subject_id, goal_period_id, completion_percent
    )
    values (
      p_user_id, 
      v_subject.subject_id, 
      v_subject.goal_period_id, 
      v_subject.progress_percent
    )
    on conflict (user_id, subject_id, goal_period_id) do nothing;
    
    -- Update subject streak
    insert into vk_subject_streaks (
      user_id, subject_id, current_streak, longest_streak, last_completion_week
    )
    values (
      p_user_id, v_subject.subject_id, 1, 1, v_week_start
    )
    on conflict (user_id, subject_id) do update
    set 
      current_streak = case
        -- Consecutive week: increment
        when vk_subject_streaks.last_completion_week = v_week_start - interval '7 days' then vk_subject_streaks.current_streak + 1
        -- Same week: keep current
        when vk_subject_streaks.last_completion_week = v_week_start then vk_subject_streaks.current_streak
        -- Broken streak: reset to 1
        else 1
      end,
      longest_streak = greatest(
        vk_subject_streaks.longest_streak,
        case
          when vk_subject_streaks.last_completion_week = v_week_start - interval '7 days' then vk_subject_streaks.current_streak + 1
          when vk_subject_streaks.last_completion_week = v_week_start then vk_subject_streaks.current_streak
          else 1
        end
      ),
      last_completion_week = v_week_start,
      updated_at = now();
  end loop;
  
  -- ========== COUNT TOTAL UNIQUE SUBJECT COMPLETIONS ==========
  select count(distinct subject_id) into v_total_completions
  from vk_subject_completions
  where user_id = p_user_id;
  
  -- ========== CHECK PERFECT WEEK (ALL subjects 100%+) ==========
  select 
    count(*) = count(*) filter (
      where (gs.minutes_achieved::numeric / (gs.hours_target * 60)) >= 1.0
    )
    and count(*) > 0
  into v_perfect_week
  from vk_goal_subjects gs
  inner join vk_goal_periods gp on gp.id = gs.goal_period_id
  where gp.user_id = p_user_id
    and gp.is_active = true
    and gp.period_type = 'weekly'
    and gs.hours_target > 0;
  
  -- ========== AWARD ACHIEVEMENTS ==========
  
  -- First Subject Completion (Cookie Time!)
  if v_total_completions >= 1 then
    insert into vk_achievements (
      user_id, achievement_type, achievement_name, achievement_description, icon_name
    )
    values (
      p_user_id,
      'subject_first_completion',
      'Cookie Time! 🍪',
      'Completed your first subject goal - treat yourself!',
      'cookie'
    )
    on conflict (user_id, achievement_type) do nothing
    returning achievement_name into v_achievement;
    
    if v_achievement.achievement_name is not null then
      v_new_achievements := array_append(v_new_achievements, json_build_object(
        'name', 'Cookie Time! 🍪',
        'description', 'Completed your first subject goal - treat yourself!',
        'icon', 'cookie'
      ));
    end if;
  end if;
  
  -- 5 Subject Completions (Sweet Streak!)
  if v_total_completions >= 5 then
    insert into vk_achievements (
      user_id, achievement_type, achievement_name, achievement_description, icon_name
    )
    values (
      p_user_id,
      'subject_5_completions',
      'Sweet Streak! 🍭',
      'Completed 5 different subject goals - you''re on fire!',
      'local-fire-department'
    )
    on conflict (user_id, achievement_type) do nothing
    returning achievement_name into v_achievement;
    
    if v_achievement.achievement_name is not null then
      v_new_achievements := array_append(v_new_achievements, json_build_object(
        'name', 'Sweet Streak! 🍭',
        'description', 'Completed 5 different subject goals',
        'icon', 'local-fire-department'
      ));
    end if;
  end if;
  
  -- 10 Subject Completions (Snack Master!)
  if v_total_completions >= 10 then
    insert into vk_achievements (
      user_id, achievement_type, achievement_name, achievement_description, icon_name
    )
    values (
      p_user_id,
      'subject_10_completions',
      'Snack Master! 🎂',
      'Completed 10 different subject goals - time for cake!',
      'cake'
    )
    on conflict (user_id, achievement_type) do nothing
    returning achievement_name into v_achievement;
    
    if v_achievement.achievement_name is not null then
      v_new_achievements := array_append(v_new_achievements, json_build_object(
        'name', 'Snack Master! 🎂',
        'description', 'Completed 10 different subject goals',
        'icon', 'cake'
      ));
    end if;
  end if;
  
  -- Perfect Week Achievement
  if v_perfect_week then
    insert into vk_achievements (
      user_id, achievement_type, achievement_name, achievement_description, icon_name
    )
    values (
      p_user_id,
      'subject_perfect_week',
      'Perfect Week! 🏆',
      'Completed ALL subjects at 100%+ this week - legendary!',
      'emoji-events'
    )
    on conflict (user_id, achievement_type) do nothing
    returning achievement_name into v_achievement;
    
    if v_achievement.achievement_name is not null then
      v_new_achievements := array_append(v_new_achievements, json_build_object(
        'name', 'Perfect Week! 🏆',
        'description', 'Completed ALL subjects at 100%+ this week',
        'icon', 'emoji-events'
      ));
    end if;
  end if;
  
  -- Overachiever (150%+)
  for v_subject in
    select 
      gs.subject_id,
      case 
        when gs.hours_target > 0 
        then round((gs.minutes_achieved::numeric / (gs.hours_target * 60)) * 100, 1)
        else 0 
      end as progress_percent
    from vk_goal_subjects gs
    inner join vk_goal_periods gp on gp.id = gs.goal_period_id
    where gp.user_id = p_user_id
      and gp.is_active = true
      and gp.period_type = 'weekly'
      and gs.hours_target > 0
      and (gs.minutes_achieved::numeric / (gs.hours_target * 60)) >= 1.5 -- 150%+
    limit 1
  loop
    insert into vk_achievements (
      user_id, achievement_type, achievement_name, achievement_description, icon_name
    )
    values (
      p_user_id,
      'subject_overachiever_150',
      'Overachiever! ⭐',
      'Exceeded 150% on a subject - pizza party time!',
      'star'
    )
    on conflict (user_id, achievement_type) do nothing
    returning achievement_name into v_achievement;
    
    if v_achievement.achievement_name is not null then
      v_new_achievements := array_append(v_new_achievements, json_build_object(
        'name', 'Overachiever! ⭐',
        'description', 'Exceeded 150% on a subject',
        'icon', 'star'
      ));
    end if;
  end loop;
  
  -- Subject Consistency Streaks (3/5/10 weeks)
  for v_streak_record in
    select subject_id, current_streak
    from vk_subject_streaks
    where user_id = p_user_id
      and current_streak >= 3
  loop
    -- 3-Week Consistency
    if v_streak_record.current_streak >= 3 then
      insert into vk_achievements (
        user_id, achievement_type, achievement_name, achievement_description, icon_name
      )
      values (
        p_user_id,
        'subject_consistency_3',
        '3-Week Champ! 🥉',
        'Completed same subject 100%+ for 3 consecutive weeks - ice cream!',
        'ice-cream'
      )
      on conflict (user_id, achievement_type) do nothing
      returning achievement_name into v_achievement;
      
      if v_achievement.achievement_name is not null then
        v_new_achievements := array_append(v_new_achievements, json_build_object(
          'name', '3-Week Champ! 🥉',
          'description', 'Same subject 100%+ for 3 weeks',
          'icon', 'ice-cream'
        ));
      end if;
    end if;
    
    -- 5-Week Consistency
    if v_streak_record.current_streak >= 5 then
      insert into vk_achievements (
        user_id, achievement_type, achievement_name, achievement_description, icon_name
      )
      values (
        p_user_id,
        'subject_consistency_5',
        '5-Week Master! 🥈',
        'Completed same subject 100%+ for 5 consecutive weeks - you deserve chocolate!',
        'stars'
      )
      on conflict (user_id, achievement_type) do nothing
      returning achievement_name into v_achievement;
      
      if v_achievement.achievement_name is not null then
        v_new_achievements := array_append(v_new_achievements, json_build_object(
          'name', '5-Week Master! 🥈',
          'description', 'Same subject 100%+ for 5 weeks',
          'icon', 'stars'
        ));
      end if;
    end if;
    
    -- 10-Week Consistency
    if v_streak_record.current_streak >= 10 then
      insert into vk_achievements (
        user_id, achievement_type, achievement_name, achievement_description, icon_name
      )
      values (
        p_user_id,
        'subject_consistency_10',
        '10-Week Legend! 🥇',
        'Completed same subject 100%+ for 10 consecutive weeks - EPIC! Anything you want!',
        'military-tech'
      )
      on conflict (user_id, achievement_type) do nothing
      returning achievement_name into v_achievement;
      
      if v_achievement.achievement_name is not null then
        v_new_achievements := array_append(v_new_achievements, json_build_object(
          'name', '10-Week Legend! 🥇',
          'description', 'Same subject 100%+ for 10 weeks',
          'icon', 'military-tech'
        ));
      end if;
    end if;
  end loop;
  
  -- Return all newly unlocked achievements
  return json_build_object(
    'newAchievements', v_new_achievements,
    'totalSubjectCompletions', v_total_completions,
    'perfectWeek', v_perfect_week
  );
end;
$$;

-- =====================================================
-- 5. AUTO-UPDATE TRIGGER
-- =====================================================
create trigger update_vk_subject_streaks_updated_at
  before update on vk_subject_streaks
  for each row
  execute function update_updated_at_column();

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================
-- This function should be called AFTER every study session save
-- in the studyService.ts file.
--
-- Example integration:
-- 1. User completes study timer
-- 2. Save study session to vk_study_sessions
-- 3. Call: SELECT detect_subject_achievements('user_id');
-- 4. Return new achievements to frontend
-- 5. Show celebration overlay with reward message
--
-- Test query:
-- SELECT detect_subject_achievements('YOUR_USER_ID_HERE');
-- =====================================================
