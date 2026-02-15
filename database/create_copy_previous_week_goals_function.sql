-- ================================================================
-- CREATE: copy_previous_week_goals() function
-- ================================================================
-- Purpose: Copy previous week's goals to a new week
-- Returns: success status, copied count, new period info
-- ================================================================

DROP FUNCTION IF EXISTS copy_previous_week_goals(uuid, date);

CREATE OR REPLACE FUNCTION copy_previous_week_goals(
  p_user_id uuid,
  p_new_start_date date
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_previous_period record;
  v_new_period_id uuid;
  v_new_end_date date;
  v_new_period_name text;
  v_copied_count int := 0;
  v_subject record;
BEGIN
  -- Calculate new end date (7 days from start)
  v_new_end_date := p_new_start_date + interval '6 days';
  
  -- Generate period name (e.g., "Week 10-16 Feb")
  v_new_period_name := 'Week ' || 
    to_char(p_new_start_date, 'DD') || '-' || 
    to_char(v_new_end_date, 'DD Mon');
  
  -- Find the most recent inactive weekly goal
  SELECT *
  INTO v_previous_period
  FROM vk_goal_periods
  WHERE user_id = p_user_id
    AND period_type = 'weekly'
    AND is_active = false
  ORDER BY start_date DESC
  LIMIT 1;
  
  -- If no previous goals found
  IF v_previous_period IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No previous weekly goals found to copy',
      'copied_count', 0
    );
  END IF;
  
  -- Deactivate any existing active weekly goals for this user
  UPDATE vk_goal_periods
  SET is_active = false
  WHERE user_id = p_user_id
    AND period_type = 'weekly'
    AND is_active = true;
  
  -- Create new goal period
  INSERT INTO vk_goal_periods (
    user_id,
    period_type,
    period_name,
    start_date,
    end_date,
    total_hours_target,
    is_active
  )
  VALUES (
    p_user_id,
    'weekly',
    v_new_period_name,
    p_new_start_date,
    v_new_end_date,
    v_previous_period.total_hours_target,
    true
  )
  RETURNING id INTO v_new_period_id;
  
  -- Copy subject goals from previous period
  FOR v_subject IN
    SELECT subject_id, hours_target
    FROM vk_goal_subjects
    WHERE goal_period_id = v_previous_period.id
  LOOP
    INSERT INTO vk_goal_subjects (
      goal_period_id,
      subject_id,
      hours_target,
      minutes_achieved
    )
    VALUES (
      v_new_period_id,
      v_subject.subject_id,
      v_subject.hours_target,
      0 -- Start with zero minutes achieved
    );
    
    v_copied_count := v_copied_count + 1;
  END LOOP;
  
  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Goals copied successfully',
    'copied_count', v_copied_count,
    'new_period_id', v_new_period_id,
    'period_name', v_new_period_name
  );
END;
$$;

-- ================================================================
-- USAGE:
-- SELECT copy_previous_week_goals('user_id', '2026-02-17');
-- ================================================================

