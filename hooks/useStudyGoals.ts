import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getActiveGoals,
  saveGoals,
  getGoalHistory,
  recalculateProgress,
  ActiveGoalsResponse,
  GoalPeriod,
  SaveGoalsPayload,
} from '@/services/studyGoalsService';

export function useStudyGoals() {
  const { user } = useAuth();
  const [activeGoals, setActiveGoals] = useState<ActiveGoalsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (user && isMounted) {
      loadActiveGoals();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  const loadActiveGoals = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const goals = await getActiveGoals(user.id);
      setActiveGoals(goals || null);
    } catch (error) {
      console.error('Error loading active goals:', error);
      setActiveGoals(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  async function saveUserGoals(payload: SaveGoalsPayload): Promise<{ error: string | null }> {
    if (!user) return { error: 'User not authenticated' };
    
    const result = await saveGoals(user.id, payload);
    
    if (!result.error) {
      // Reload active goals after saving
      await loadActiveGoals();
    }
    
    return { error: result.error };
  }

  async function refreshProgress(): Promise<void> {
    if (!user) return;
    
    // Recalculate progress and reload
    await recalculateProgress(user.id);
    await loadActiveGoals();
  }

  async function loadHistory(
    periodType: 'weekly' | 'monthly' | 'term' = 'weekly',
    limit: number = 10
  ): Promise<GoalPeriod[]> {
    if (!user) return [];
    return await getGoalHistory(user.id, periodType, limit);
  }

  return {
    activeGoals,
    isLoading,
    loadActiveGoals,
    saveUserGoals,
    refreshProgress,
    loadHistory,
  };
}
