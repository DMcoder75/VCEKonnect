-- =====================================================
-- VCE Konnect - Multi-Period Study Goals Schema
-- =====================================================
-- Purpose: Weekly/Monthly/Term/Yearly goal tracking with auto-progress updates
-- Affected tables: vk_goal_periods, vk_goal_subjects
-- Integration: Links to vk_study_sessions for auto-calculation
-- =====================================================

-- =====================================================
-- 1. GOAL PERIODS TABLE
-- =====================================================
-- Stores goal timeframes (weekly, monthly, term, yearly)
create table if not exists vk_goal_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references vk_users(id) on delete cascade,
  period_type text not null check (period_type in ('weekly', 'monthly', 'term', 'yearly')),
  period_name text not null, -- e.g., "Week 10-16 Feb", "February 2026", "Term 2 2026"
  start_date date not null,
  end_date date not null,
  total_hours_target numeric(6,2) not null default 0, -- Target hours for this period
  total_minutes_achieved integer not null default 0, -- Auto-calculated from study sessions
  is_active boolean default true, -- Current period vs historical
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Constraints
  constraint valid_date_range check (end_date >= start_date),
  constraint valid_hours check (total_hours_target >= 0),
  constraint unique_user_period unique (user_id, period_type, start_date)
);

-- Indexes for performance
create index idx_vk_goal_periods_user_id on vk_goal_periods(user_id);
create index idx_vk_goal_periods_active on vk_goal_periods(user_id, is_active) where is_active = true;
create index idx_vk_goal_periods_dates on vk_goal_periods(start_date, end_date);

-- =====================================================
-- 2. SUBJECT-SPECIFIC GOALS TABLE
-- =====================================================
-- Stores per-subject targets within each goal period
create table if not exists vk_goal_subjects (
  id uuid primary key default gen_random_uuid(),
  goal_period_id uuid not null references vk_goal_periods(id) on delete cascade,
  subject_id text not null,
  hours_target numeric(5,2) not null default 0, -- Subject-specific target
  minutes_achieved integer not null default 0, -- Auto-calculated from study sessions
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Constraints
  constraint valid_subject_hours check (hours_target >= 0),
  constraint unique_period_subject unique (goal_period_id, subject_id)
);

-- Indexes for performance
create index idx_vk_goal_subjects_period on vk_goal_subjects(goal_period_id);
create index idx_vk_goal_subjects_subject on vk_goal_subjects(subject_id);

-- =====================================================
-- 3. AUTO-UPDATE TRIGGERS
-- =====================================================
-- Update updated_at timestamp on any changes
create trigger update_vk_goal_periods_updated_at
  before update on vk_goal_periods
  for each row
  execute function update_updated_at_column();

create trigger update_vk_goal_subjects_updated_at
  before update on vk_goal_subjects
  for each row
  execute function update_updated_at_column();

-- =====================================================
-- 4. RPC FUNCTION: CALCULATE GOAL PROGRESS
-- =====================================================
-- Recalculates minutes_achieved for all active goals based on study sessions
drop function if exists calculate_goal_progress(uuid);
create or replace function calculate_goal_progress(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  -- Update total minutes for each active goal period
  update vk_goal_periods gp
  set total_minutes_achieved = (
    select coalesce(sum(ss.duration_minutes), 0)
    from vk_study_sessions ss
    where ss.user_id = gp.user_id
      and ss.session_date >= gp.start_date
      and ss.session_date <= gp.end_date
  )
  where gp.user_id = p_user_id
    and gp.is_active = true;

  -- Update subject-specific minutes for each goal
  update vk_goal_subjects gs
  set minutes_achieved = (
    select coalesce(sum(ss.duration_minutes), 0)
    from vk_study_sessions ss
    inner join vk_goal_periods gp on gp.id = gs.goal_period_id
    where ss.user_id = gp.user_id
      and ss.subject_id = gs.subject_id
      and ss.session_date >= gp.start_date
      and ss.session_date <= gp.end_date
  )
  where exists (
    select 1 from vk_goal_periods gp
    where gp.id = gs.goal_period_id
      and gp.user_id = p_user_id
      and gp.is_active = true
  );
end;
$$;

-- =====================================================
-- 5. RPC FUNCTION: GET ACTIVE GOALS WITH PROGRESS
-- =====================================================
-- Returns all active goals with current progress for dashboard
drop function if exists get_active_goals(uuid);
create or replace function get_active_goals(p_user_id uuid)
returns json
language plpgsql
as $$
declare
  result json;
begin
  -- First recalculate all progress
  perform calculate_goal_progress(p_user_id);
  
  -- Return structured JSON with goals and subjects
  select json_build_object(
    'weekly', (
      select json_build_object(
        'id', gp.id,
        'period_name', gp.period_name,
        'start_date', gp.start_date,
        'end_date', gp.end_date,
        'target_hours', gp.total_hours_target,
        'achieved_minutes', gp.total_minutes_achieved,
        'achieved_hours', round((gp.total_minutes_achieved::numeric / 60), 2),
        'progress_percent', case 
          when gp.total_hours_target > 0 
          then round((gp.total_minutes_achieved::numeric / (gp.total_hours_target * 60)) * 100, 1)
          else 0 
        end,
        'subjects', (
          select json_agg(
            json_build_object(
              'subject_id', gs.subject_id,
              'target_hours', gs.hours_target,
              'achieved_minutes', gs.minutes_achieved,
              'achieved_hours', round((gs.minutes_achieved::numeric / 60), 2),
              'progress_percent', case 
                when gs.hours_target > 0 
                then round((gs.minutes_achieved::numeric / (gs.hours_target * 60)) * 100, 1)
                else 0 
              end
            )
          )
          from vk_goal_subjects gs
          where gs.goal_period_id = gp.id
          order by gs.hours_target desc
        )
      )
      from vk_goal_periods gp
      where gp.user_id = p_user_id
        and gp.period_type = 'weekly'
        and gp.is_active = true
      limit 1
    ),
    'monthly', (
      select json_build_object(
        'id', gp.id,
        'period_name', gp.period_name,
        'start_date', gp.start_date,
        'end_date', gp.end_date,
        'target_hours', gp.total_hours_target,
        'achieved_minutes', gp.total_minutes_achieved,
        'achieved_hours', round((gp.total_minutes_achieved::numeric / 60), 2),
        'progress_percent', case 
          when gp.total_hours_target > 0 
          then round((gp.total_minutes_achieved::numeric / (gp.total_hours_target * 60)) * 100, 1)
          else 0 
        end,
        'subjects', (
          select json_agg(
            json_build_object(
              'subject_id', gs.subject_id,
              'target_hours', gs.hours_target,
              'achieved_minutes', gs.minutes_achieved,
              'achieved_hours', round((gs.minutes_achieved::numeric / 60), 2),
              'progress_percent', case 
                when gs.hours_target > 0 
                then round((gs.minutes_achieved::numeric / (gs.hours_target * 60)) * 100, 1)
                else 0 
              end
            )
          )
          from vk_goal_subjects gs
          where gs.goal_period_id = gp.id
          order by gs.hours_target desc
        )
      )
      from vk_goal_periods gp
      where gp.user_id = p_user_id
        and gp.period_type = 'monthly'
        and gp.is_active = true
      limit 1
    ),
    'term', (
      select json_build_object(
        'id', gp.id,
        'period_name', gp.period_name,
        'start_date', gp.start_date,
        'end_date', gp.end_date,
        'target_hours', gp.total_hours_target,
        'achieved_minutes', gp.total_minutes_achieved,
        'achieved_hours', round((gp.total_minutes_achieved::numeric / 60), 2),
        'progress_percent', case 
          when gp.total_hours_target > 0 
          then round((gp.total_minutes_achieved::numeric / (gp.total_hours_target * 60)) * 100, 1)
          else 0 
        end,
        'subjects', (
          select json_agg(
            json_build_object(
              'subject_id', gs.subject_id,
              'target_hours', gs.hours_target,
              'achieved_minutes', gs.minutes_achieved,
              'achieved_hours', round((gs.minutes_achieved::numeric / 60), 2),
              'progress_percent', case 
                when gs.hours_target > 0 
                then round((gs.minutes_achieved::numeric / (gs.hours_target * 60)) * 100, 1)
                else 0 
              end
            )
          )
          from vk_goal_subjects gs
          where gs.goal_period_id = gp.id
          order by gs.hours_target desc
        )
      )
      from vk_goal_periods gp
      where gp.user_id = p_user_id
        and gp.period_type = 'term'
        and gp.is_active = true
      limit 1
    )
  ) into result;
  
  return result;
end;
$$;

-- =====================================================
-- 6. RPC FUNCTION: SAVE GOALS (All Periods)
-- =====================================================
-- Saves or updates goals for weekly, monthly, and term periods
drop function if exists save_goals(uuid, json, json, json);
create or replace function save_goals(
  p_user_id uuid,
  p_weekly json,
  p_monthly json,
  p_term json
)
returns json
language plpgsql
as $$
declare
  v_weekly_id uuid;
  v_monthly_id uuid;
  v_term_id uuid;
  v_subject record;
begin
  -- ========== WEEKLY GOAL ==========
  if p_weekly is not null then
    -- Deactivate old weekly goals
    update vk_goal_periods
    set is_active = false
    where user_id = p_user_id
      and period_type = 'weekly'
      and is_active = true;
    
    -- Insert new weekly goal
    insert into vk_goal_periods (
      user_id, period_type, period_name, start_date, end_date, total_hours_target, is_active
    )
    values (
      p_user_id,
      'weekly',
      p_weekly->>'period_name',
      (p_weekly->>'start_date')::date,
      (p_weekly->>'end_date')::date,
      (p_weekly->>'total_hours')::numeric,
      true
    )
    returning id into v_weekly_id;
    
    -- Insert subject goals
    for v_subject in 
      select * from json_array_elements(p_weekly->'subjects')
    loop
      insert into vk_goal_subjects (goal_period_id, subject_id, hours_target)
      values (
        v_weekly_id,
        v_subject->>'subject_id',
        (v_subject->>'hours')::numeric
      );
    end loop;
  end if;
  
  -- ========== MONTHLY GOAL ==========
  if p_monthly is not null then
    -- Deactivate old monthly goals
    update vk_goal_periods
    set is_active = false
    where user_id = p_user_id
      and period_type = 'monthly'
      and is_active = true;
    
    -- Insert new monthly goal
    insert into vk_goal_periods (
      user_id, period_type, period_name, start_date, end_date, total_hours_target, is_active
    )
    values (
      p_user_id,
      'monthly',
      p_monthly->>'period_name',
      (p_monthly->>'start_date')::date,
      (p_monthly->>'end_date')::date,
      (p_monthly->>'total_hours')::numeric,
      true
    )
    returning id into v_monthly_id;
    
    -- Insert subject goals
    for v_subject in 
      select * from json_array_elements(p_monthly->'subjects')
    loop
      insert into vk_goal_subjects (goal_period_id, subject_id, hours_target)
      values (
        v_monthly_id,
        v_subject->>'subject_id',
        (v_subject->>'hours')::numeric
      );
    end loop;
  end if;
  
  -- ========== TERM GOAL ==========
  if p_term is not null then
    -- Deactivate old term goals
    update vk_goal_periods
    set is_active = false
    where user_id = p_user_id
      and period_type = 'term'
      and is_active = true;
    
    -- Insert new term goal
    insert into vk_goal_periods (
      user_id, period_type, period_name, start_date, end_date, total_hours_target, is_active
    )
    values (
      p_user_id,
      'term',
      p_term->>'period_name',
      (p_term->>'start_date')::date,
      (p_term->>'end_date')::date,
      (p_term->>'total_hours')::numeric,
      true
    )
    returning id into v_term_id;
    
    -- Insert subject goals
    for v_subject in 
      select * from json_array_elements(p_term->'subjects')
    loop
      insert into vk_goal_subjects (goal_period_id, subject_id, hours_target)
      values (
        v_term_id,
        v_subject->>'subject_id',
        (v_subject->>'hours')::numeric
      );
    end loop;
  end if;
  
  -- Recalculate progress
  perform calculate_goal_progress(p_user_id);
  
  return json_build_object(
    'success', true,
    'weekly_id', v_weekly_id,
    'monthly_id', v_monthly_id,
    'term_id', v_term_id
  );
end;
$$;

-- =====================================================
-- 7. RPC FUNCTION: GET GOAL HISTORY
-- =====================================================
-- Returns past weeks/months/terms for history view
drop function if exists get_goal_history(uuid, text, integer);
create or replace function get_goal_history(
  p_user_id uuid,
  p_period_type text default 'weekly',
  p_limit integer default 10
)
returns json
language plpgsql
as $$
declare
  result json;
begin
  select json_agg(
    json_build_object(
      'id', gp.id,
      'period_name', gp.period_name,
      'start_date', gp.start_date,
      'end_date', gp.end_date,
      'target_hours', gp.total_hours_target,
      'achieved_hours', round((gp.total_minutes_achieved::numeric / 60), 2),
      'progress_percent', case 
        when gp.total_hours_target > 0 
        then round((gp.total_minutes_achieved::numeric / (gp.total_hours_target * 60)) * 100, 1)
        else 0 
      end,
      'is_completed', gp.end_date < current_date,
      'is_active', gp.is_active
    )
    order by gp.start_date desc
  )
  into result
  from vk_goal_periods gp
  where gp.user_id = p_user_id
    and gp.period_type = p_period_type
  limit p_limit;
  
  return coalesce(result, '[]'::json);
end;
$$;

-- =====================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =====================================================
-- Allow anon users to manage their own goals
alter table vk_goal_periods enable row level security;
alter table vk_goal_subjects enable row level security;

-- Goal Periods Policies
create policy "allow_anon_select_goal_periods"
  on vk_goal_periods for select
  to anon
  using (true);

create policy "allow_anon_insert_goal_periods"
  on vk_goal_periods for insert
  to anon
  with check (true);

create policy "allow_anon_update_goal_periods"
  on vk_goal_periods for update
  to anon
  using (true);

create policy "allow_anon_delete_goal_periods"
  on vk_goal_periods for delete
  to anon
  using (true);

-- Goal Subjects Policies
create policy "allow_anon_select_goal_subjects"
  on vk_goal_subjects for select
  to anon
  using (true);

create policy "allow_anon_insert_goal_subjects"
  on vk_goal_subjects for insert
  to anon
  with check (true);

create policy "allow_anon_update_goal_subjects"
  on vk_goal_subjects for update
  to anon
  using (true);

create policy "allow_anon_delete_goal_subjects"
  on vk_goal_subjects for delete
  to anon
  using (true);

-- =====================================================
-- 9. SAMPLE DATA (Optional - for testing)
-- =====================================================
-- Uncomment to insert test data for a user
/*
-- Create sample weekly goal
insert into vk_goal_periods (user_id, period_type, period_name, start_date, end_date, total_hours_target, is_active)
values (
  'YOUR_USER_ID_HERE',
  'weekly',
  'Week 10-16 Feb 2026',
  '2026-02-10',
  '2026-02-16',
  25,
  true
) returning id;

-- Add subject goals (replace goal_period_id with the returned ID above)
insert into vk_goal_subjects (goal_period_id, subject_id, hours_target)
values
  ('WEEKLY_GOAL_ID_HERE', 'BIO', 4),
  ('WEEKLY_GOAL_ID_HERE', 'METHODS', 5),
  ('WEEKLY_GOAL_ID_HERE', 'CHEM', 4),
  ('WEEKLY_GOAL_ID_HERE', 'EN', 6),
  ('WEEKLY_GOAL_ID_HERE', 'LEGAL', 3);
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Usage Examples:
-- 
-- 1. Save goals:
--    SELECT save_goals(
--      'user_id',
--      '{"period_name":"Week 10-16 Feb","start_date":"2026-02-10","end_date":"2026-02-16","total_hours":25,"subjects":[{"subject_id":"BIO","hours":4}]}'::json,
--      '{"period_name":"February 2026","start_date":"2026-02-01","end_date":"2026-02-28","total_hours":100,"subjects":[{"subject_id":"BIO","hours":20}]}'::json,
--      '{"period_name":"Term 2 2026","start_date":"2026-02-01","end_date":"2026-06-30","total_hours":400,"subjects":[{"subject_id":"BIO","hours":80}]}'::json
--    );
--
-- 2. Get active goals:
--    SELECT get_active_goals('user_id');
--
-- 3. Get history:
--    SELECT get_goal_history('user_id', 'weekly', 10);
--
-- 4. Manually recalculate progress:
--    SELECT calculate_goal_progress('user_id');
-- =====================================================
