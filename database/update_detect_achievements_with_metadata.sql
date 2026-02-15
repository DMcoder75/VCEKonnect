-- ================================================================
-- UPDATE: detect_subject_achievements() to store subject_code in metadata
-- ================================================================
-- Purpose: Ensure subject information is stored in achievement metadata
-- so the frontend can display "Completed EAL weekly goal" instead of
-- generic "Completed your first subject goal"
-- ================================================================

CREATE OR REPLACE FUNCTION detect_subject_achievements(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_completions int;
  v_perfect_week_count int;
  v_result jsonb := '{"newAchievements":[],"totalSubjectCompletions":0,"perfectWeek":false}'::jsonb;
  v_new_achievements jsonb := '[]'::jsonb;
  v_achievement_name text;
  v_subject_code text;
BEGIN
  -- Count total subject completions (100%+) for this user
  SELECT COUNT(DISTINCT subject_id)
  INTO v_total_completions
  FROM vk_subject_completions
  WHERE user_id = p_user_id;

  -- Update result with total
  v_result := jsonb_set(v_result, '{totalSubjectCompletions}', to_jsonb(v_total_completions));

  -- Get the most recently completed subject's code for personalization
  SELECT subject_id INTO v_subject_code
  FROM vk_subject_completions
  WHERE user_id = p_user_id
  ORDER BY completed_at DESC
  LIMIT 1;

  -- Achievement 1: First subject completed (Cookie Time!)
  IF v_total_completions >= 1 THEN
    INSERT INTO vk_achievements (
      user_id, achievement_type, achievement_name, achievement_description, icon_name, metadata
    ) VALUES (
      p_user_id,
      'subject_first_completion',
      'Cookie Time! 🍪',
      'Completed your first subject goal - treat yourself!',
      'cookie',
      jsonb_build_object('subject_code', v_subject_code, 'subject_id', v_subject_code)
    )
    ON CONFLICT (user_id, achievement_type) DO NOTHING
    RETURNING achievement_name INTO v_achievement_name;
    
    IF v_achievement_name IS NOT NULL THEN
      v_new_achievements := v_new_achievements || jsonb_build_object(
        'name', 'Cookie Time! 🍪',
        'description', 'Completed your first subject goal - treat yourself!',
        'icon', 'cookie'
      );
    END IF;
  END IF;

  -- Achievement 2: 5 subjects completed (Sweet Streak!)
  IF v_total_completions >= 5 THEN
    INSERT INTO vk_achievements (
      user_id, achievement_type, achievement_name, achievement_description, icon_name, metadata
    ) VALUES (
      p_user_id,
      'subject_5_completions',
      'Sweet Streak! 🍭',
      'Completed 5 subject goals - have some ice cream!',
      'ice-cream',
      jsonb_build_object('subject_code', v_subject_code, 'subject_id', v_subject_code, 'total_completions', 5)
    )
    ON CONFLICT (user_id, achievement_type) DO NOTHING
    RETURNING achievement_name INTO v_achievement_name;
    
    IF v_achievement_name IS NOT NULL THEN
      v_new_achievements := v_new_achievements || jsonb_build_object(
        'name', 'Sweet Streak! 🍭',
        'description', 'Completed 5 subject goals - have some ice cream!',
        'icon', 'ice-cream'
      );
    END IF;
  END IF;

  -- Achievement 3: 10 subjects completed (Snack Master!)
  IF v_total_completions >= 10 THEN
    INSERT INTO vk_achievements (
      user_id, achievement_type, achievement_name, achievement_description, icon_name, metadata
    ) VALUES (
      p_user_id,
      'subject_10_completions',
      'Snack Master! 🎂',
      'Completed 10 subject goals - celebrate with pizza!',
      'pizza',
      jsonb_build_object('subject_code', v_subject_code, 'subject_id', v_subject_code, 'total_completions', 10)
    )
    ON CONFLICT (user_id, achievement_type) DO NOTHING
    RETURNING achievement_name INTO v_achievement_name;
    
    IF v_achievement_name IS NOT NULL THEN
      v_new_achievements := v_new_achievements || jsonb_build_object(
        'name', 'Snack Master! 🎂',
        'description', 'Completed 10 subject goals - celebrate with pizza!',
        'icon', 'pizza'
      );
    END IF;
  END IF;

  -- Check for perfect week (all active weekly subjects at 100%+)
  SELECT COUNT(*)
  INTO v_perfect_week_count
  FROM vk_goal_subjects gs
  JOIN vk_goal_periods gp ON gs.goal_period_id = gp.id
  WHERE gp.user_id = p_user_id
    AND gp.period_type = 'weekly'
    AND gp.is_active = true
    AND ((gs.achieved_minutes::numeric / 60) / gs.hours_target) >= 1.0;

  -- Achievement 4: Perfect Week (all subjects 100%+)
  IF v_perfect_week_count > 0 THEN
    DECLARE
      v_active_subject_count int;
    BEGIN
      SELECT COUNT(*)
      INTO v_active_subject_count
      FROM vk_goal_subjects gs
      JOIN vk_goal_periods gp ON gs.goal_period_id = gp.id
      WHERE gp.user_id = p_user_id
        AND gp.period_type = 'weekly'
        AND gp.is_active = true;

      IF v_perfect_week_count = v_active_subject_count AND v_active_subject_count > 0 THEN
        INSERT INTO vk_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_name, metadata
        ) VALUES (
          p_user_id,
          'subject_perfect_week',
          'Perfect Week! 🏆',
          'Completed ALL subject goals this week - chocolate time!',
          'trophy',
          jsonb_build_object('subject_code', v_subject_code, 'subject_id', v_subject_code, 'subjects_count', v_active_subject_count)
        )
        ON CONFLICT (user_id, achievement_type) DO NOTHING
        RETURNING achievement_name INTO v_achievement_name;
        
        IF v_achievement_name IS NOT NULL THEN
          v_new_achievements := v_new_achievements || jsonb_build_object(
            'name', 'Perfect Week! 🏆',
            'description', 'Completed ALL subject goals this week - chocolate time!',
            'icon', 'trophy'
          );
          v_result := jsonb_set(v_result, '{perfectWeek}', 'true'::jsonb);
        END IF;
      END IF;
    END;
  END IF;

  -- Achievement 5: Overachiever (150%+ on any subject)
  DECLARE
    v_overachiever_count int;
  BEGIN
    SELECT COUNT(*)
    INTO v_overachiever_count
    FROM vk_subject_completions
    WHERE user_id = p_user_id
      AND completion_percent >= 150;

    IF v_overachiever_count > 0 THEN
      INSERT INTO vk_achievements (
        user_id, achievement_type, achievement_name, achievement_description, icon_name, metadata
      ) VALUES (
        p_user_id,
        'subject_overachiever',
        'Overachiever! ⭐',
        'Completed a subject at 150%+ - anything you want!',
        'star',
        jsonb_build_object('subject_code', v_subject_code, 'subject_id', v_subject_code)
      )
      ON CONFLICT (user_id, achievement_type) DO NOTHING
      RETURNING achievement_name INTO v_achievement_name;
      
      IF v_achievement_name IS NOT NULL THEN
        v_new_achievements := v_new_achievements || jsonb_build_object(
          'name', 'Overachiever! ⭐',
          'description', 'Completed a subject at 150%+ - anything you want!',
          'icon', 'star'
        );
      END IF;
    END IF;
  END;

  -- Check subject streaks and award badges
  DECLARE
    v_streak_record RECORD;
  BEGIN
    FOR v_streak_record IN
      SELECT subject_id, current_streak
      FROM vk_subject_streaks
      WHERE user_id = p_user_id
        AND current_streak >= 3
    LOOP
      -- Get subject code for this streak
      v_subject_code := v_streak_record.subject_id;

      -- 3-week streak
      IF v_streak_record.current_streak >= 3 THEN
        INSERT INTO vk_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_name, metadata
        ) VALUES (
          p_user_id,
          'subject_streak_3_' || v_streak_record.subject_id,
          '3-Week Champ! 🥉',
          '3 consecutive weeks at 100%+ - bronze medal!',
          'medal',
          jsonb_build_object('subject_code', v_subject_code, 'subject_id', v_streak_record.subject_id, 'streak', 3)
        )
        ON CONFLICT (user_id, achievement_type) DO NOTHING
        RETURNING achievement_name INTO v_achievement_name;
        
        IF v_achievement_name IS NOT NULL THEN
          v_new_achievements := v_new_achievements || jsonb_build_object(
            'name', '3-Week Champ! 🥉',
            'description', '3 consecutive weeks at 100%+ - bronze medal!',
            'icon', 'medal'
          );
        END IF;
      END IF;

      -- 5-week streak
      IF v_streak_record.current_streak >= 5 THEN
        INSERT INTO vk_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_name, metadata
        ) VALUES (
          p_user_id,
          'subject_streak_5_' || v_streak_record.subject_id,
          '5-Week Master! 🥈',
          '5 consecutive weeks at 100%+ - silver medal!',
          'medal',
          jsonb_build_object('subject_code', v_subject_code, 'subject_id', v_streak_record.subject_id, 'streak', 5)
        )
        ON CONFLICT (user_id, achievement_type) DO NOTHING
        RETURNING achievement_name INTO v_achievement_name;
        
        IF v_achievement_name IS NOT NULL THEN
          v_new_achievements := v_new_achievements || jsonb_build_object(
            'name', '5-Week Master! 🥈',
            'description', '5 consecutive weeks at 100%+ - silver medal!',
            'icon', 'medal'
          );
        END IF;
      END IF;

      -- 10-week streak
      IF v_streak_record.current_streak >= 10 THEN
        INSERT INTO vk_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_name, metadata
        ) VALUES (
          p_user_id,
          'subject_streak_10_' || v_streak_record.subject_id,
          '10-Week Legend! 🥇',
          '10 consecutive weeks at 100%+ - gold medal!',
          'medal',
          jsonb_build_object('subject_code', v_subject_code, 'subject_id', v_streak_record.subject_id, 'streak', 10)
        )
        ON CONFLICT (user_id, achievement_type) DO NOTHING
        RETURNING achievement_name INTO v_achievement_name;
        
        IF v_achievement_name IS NOT NULL THEN
          v_new_achievements := v_new_achievements || jsonb_build_object(
            'name', '10-Week Legend! 🥇',
            'description', '10 consecutive weeks at 100%+ - gold medal!',
            'icon', 'medal'
          );
        END IF;
      END IF;
    END LOOP;
  END;

  -- Set new achievements in result
  v_result := jsonb_set(v_result, '{newAchievements}', v_new_achievements);

  RETURN v_result;
END;
$$;

-- ================================================================
-- USAGE: Run this to update the function, then test:
-- SELECT detect_subject_achievements('YOUR_USER_ID');
-- ================================================================
