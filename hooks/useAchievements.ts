import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getUserAchievements,
  getUserStreaks,
  getSubjectCompletions,
  getSubjectStreaks,
  Achievement,
  GoalStreak,
  SubjectCompletion,
  SubjectStreak,
} from '@/services/achievementsService';

export function useAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streaks, setStreaks] = useState<GoalStreak[]>([]);
  const [subjectCompletions, setSubjectCompletions] = useState<SubjectCompletion[]>([]);
  const [subjectStreaks, setSubjectStreaks] = useState<SubjectStreak[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAchievements = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    const [
      achievementsData,
      streaksData,
      subjectCompletionsData,
      subjectStreaksData,
    ] = await Promise.all([
      getUserAchievements(user.id),
      getUserStreaks(user.id),
      getSubjectCompletions(user.id),
      getSubjectStreaks(user.id),
    ]);

    setAchievements(achievementsData);
    setStreaks(streaksData);
    setSubjectCompletions(subjectCompletionsData);
    setSubjectStreaks(subjectStreaksData);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAchievements();
    }
  }, [user, loadAchievements]);

  function getWeeklyStreak(): GoalStreak | undefined {
    return streaks.find(s => s.streakType === 'weekly');
  }

  function getMonthlyStreak(): GoalStreak | undefined {
    return streaks.find(s => s.streakType === 'monthly');
  }

  function getRecentAchievements(limit: number = 5): Achievement[] {
    return achievements.slice(0, limit);
  }

  return {
    achievements,
    streaks,
    subjectCompletions,
    subjectStreaks,
    isLoading,
    loadAchievements,
    getWeeklyStreak,
    getMonthlyStreak,
    getRecentAchievements,
  };
}
