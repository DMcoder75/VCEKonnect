-- ================================================================
-- CREATE: deactivate_expired_goals() function (TIMEZONE-AWARE)
-- ================================================================
-- Purpose: Automatically set is_active = false for goals past their end_date
-- Called: On app launch to clean up expired goals
-- Updated: Now accepts current_date from frontend to ensure timezone consistency
-- ================================================================

DROP FUNCTION IF EXISTS deactivate_expired_goals(uuid);
DROP FUNCTION IF EXISTS deactivate_expired_goals(uuid, date);

CREATE OR REPLACE FUNCTION deactivate_expired_goals(
  p_user_id uuid,
  p_current_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_deactivated_count int := 0;
  v_weekly_deactivated int := 0;
  v_monthly_deactivated int := 0;
  v_term_deactivated int := 0;
BEGIN
  -- Deactivate all goals where end_date < current_date (using passed date from frontend)
  WITH deactivated AS (
    UPDATE vk_goal_periods
    SET is_active = false
    WHERE user_id = p_user_id
      AND is_active = true
      AND end_date < p_current_date  -- Use frontend's date for timezone consistency
    RETURNING period_type
  )
  SELECT COUNT(*) INTO v_deactivated_count FROM deactivated;

  -- Count by type (for just-deactivated goals)
  WITH just_deactivated AS (
    SELECT period_type
    FROM vk_goal_periods
    WHERE user_id = p_user_id
      AND is_active = false
      AND end_date < p_current_date
      AND updated_at >= p_current_date
  )
  SELECT 
    COUNT(*) FILTER (WHERE period_type = 'weekly'),
    COUNT(*) FILTER (WHERE period_type = 'monthly'),
    COUNT(*) FILTER (WHERE period_type = 'term')
  INTO v_weekly_deactivated, v_monthly_deactivated, v_term_deactivated
  FROM just_deactivated;

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
-- Frontend passes the current date in user's timezone:
-- SELECT deactivate_expired_goals('user_id', '2026-02-16');
--
-- Or let database use server date (fallback):
-- SELECT deactivate_expired_goals('user_id');
-- ================================================================
