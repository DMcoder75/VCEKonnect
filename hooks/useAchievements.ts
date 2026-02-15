import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getUserAchievements,
  getUserStreaks,
  Achievement,
  GoalStreak,
} from '@/services/achievementsService';

export function useAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streaks, setStreaks] = useState<GoalStreak[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAchievements = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    const [achievementsData, streaksData] = await Promise.all([
      getUserAchievements(user.id),
      getUserStreaks(user.id),
    ]);

    setAchievements(achievementsData);
    setStreaks(streaksData);
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
    isLoading,
    loadAchievements,
    getWeeklyStreak,
    getMonthlyStreak,
    getRecentAchievements,
  };
}
