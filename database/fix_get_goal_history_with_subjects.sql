-- =====================================================
-- FIX: Add per-subject breakdown to get_goal_history
-- =====================================================
-- Purpose: Return subject-level data in goal history for achievements page
-- Issue: Current function only returns aggregated totals, not subject breakdown
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
      'periodType', gp.period_type,
      'periodName', gp.period_name,
      'startDate', gp.start_date,
      'endDate', gp.end_date,
      'totalHoursTarget', gp.total_hours_target,
      'totalMinutesAchieved', gp.total_minutes_achieved,
      'isCompleted', gp.end_date < current_date,
      'isActive', gp.is_active,
      -- Add subjects array with per-subject breakdown
      'subjects', (
        select json_agg(
          json_build_object(
            'subjectId', gs.subject_id,
            'hoursTarget', gs.hours_target,
            'minutesAchieved', gs.minutes_achieved
          )
        )
        from vk_goal_subjects gs
        where gs.goal_period_id = gp.id
        order by gs.hours_target desc
      )
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
-- Verification Query (Optional - for testing)
-- =====================================================
-- Test with your user_id:
-- SELECT get_goal_history('YOUR_USER_ID_HERE', 'weekly', 5);
--
-- Expected output:
-- [
--   {
--     "id": "...",
--     "periodType": "weekly",
--     "periodName": "Week 10-16 Feb",
--     "startDate": "2026-02-10",
--     "endDate": "2026-02-16",
--     "totalHoursTarget": 25.00,
--     "totalMinutesAchieved": 1500,
--     "isCompleted": false,
--     "isActive": true,
--     "subjects": [
--       {"subjectId": "BIO", "hoursTarget": 5.00, "minutesAchieved": 300},
--       {"subjectId": "EAL", "hoursTarget": 3.00, "minutesAchieved": 180}
--     ]
--   }
-- ]
-- =====================================================
