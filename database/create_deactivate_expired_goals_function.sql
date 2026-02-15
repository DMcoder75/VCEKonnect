-- ================================================================
-- CREATE: deactivate_expired_goals() function
-- ================================================================
-- Purpose: Automatically set is_active = false for goals past their end_date
-- Called: On app launch to clean up expired goals
-- ================================================================

DROP FUNCTION IF EXISTS deactivate_expired_goals(uuid);

CREATE OR REPLACE FUNCTION deactivate_expired_goals(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_deactivated_count int := 0;
  v_weekly_deactivated int := 0;
  v_monthly_deactivated int := 0;
  v_term_deactivated int := 0;
BEGIN
  -- Deactivate all goals where end_date < current_date
  WITH deactivated AS (
    UPDATE vk_goal_periods
    SET is_active = false
    WHERE user_id = p_user_id
      AND is_active = true
      AND end_date < current_date
    RETURNING period_type
  )
  SELECT COUNT(*) INTO v_deactivated_count FROM deactivated;

  -- Count by type
  SELECT COUNT(*) INTO v_weekly_deactivated
  FROM vk_goal_periods
  WHERE user_id = p_user_id
    AND period_type = 'weekly'
    AND is_active = false
    AND end_date < current_date
    AND updated_at >= current_date;

  SELECT COUNT(*) INTO v_monthly_deactivated
  FROM vk_goal_periods
  WHERE user_id = p_user_id
    AND period_type = 'monthly'
    AND is_active = false
    AND end_date < current_date
    AND updated_at >= current_date;

  SELECT COUNT(*) INTO v_term_deactivated
  FROM vk_goal_periods
  WHERE user_id = p_user_id
    AND period_type = 'term'
    AND is_active = false
    AND end_date < current_date
    AND updated_at >= current_date;

  RETURN jsonb_build_object(
    'success', true,
    'total_deactivated', v_deactivated_count,
    'weekly_deactivated', v_weekly_deactivated,
    'monthly_deactivated', v_monthly_deactivated,
    'term_deactivated', v_term_deactivated
  );
END;
$$;

-- ================================================================
-- USAGE:
-- SELECT deactivate_expired_goals('user_id');
-- ================================================================
