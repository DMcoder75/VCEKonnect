-- =====================================================
-- FINAL FIX: Remove ORDER BY from json_agg subquery
-- =====================================================
-- Issue: PostgreSQL error "column must appear in GROUP BY clause"
-- Cause: ORDER BY inside json_agg() aggregate function without GROUP BY
-- Solution: Remove ORDER BY from aggregate subquery
-- =====================================================

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
-- VERIFICATION QUERY
-- =====================================================
-- After running this fix, test with:
-- SELECT get_active_goals('580b9eb1-ea3c-4581-9103-780afbedcc83');
-- 
-- Expected output: JSON with weekly, monthly, and term goals populated
-- =====================================================
