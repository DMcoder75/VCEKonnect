-- =====================================================
-- CORRECT FIX: Update get_active_goals function
-- =====================================================
-- Issue: Function exists but returns null even though data exists
-- Solution: Recreate function with correct table names (vk_goal_periods, vk_goal_subjects)
-- =====================================================

-- Drop and recreate function with correct table names
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
        'period_type', gp.period_type,
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
        'period_type', gp.period_type,
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
        'period_type', gp.period_type,
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
-- FIX: Update calculate_goal_progress function
-- =====================================================
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
-- FIX: Update save_goals function
-- =====================================================
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
  v_subject json;
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
-- FIX: Update get_goal_history function
-- =====================================================
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
-- VERIFICATION QUERY
-- =====================================================
-- Run this to test if the function now works:
-- SELECT get_active_goals('580b9eb1-ea3c-4581-9103-780afbedcc83');
-- =====================================================
