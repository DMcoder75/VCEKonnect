-- =====================================================
-- TARGETED FIX: Update calculate_goal_progress function ONLY
-- =====================================================
-- Issue: Function is using wrong table name (vk_study_goal_periods)
-- Correct table name: vk_goal_periods
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
-- VERIFICATION: Test the function after applying fix
-- =====================================================
-- Run this to verify the fix worked:
-- SELECT get_active_goals('580b9eb1-ea3c-4581-9103-780afbedcc83');
-- =====================================================
