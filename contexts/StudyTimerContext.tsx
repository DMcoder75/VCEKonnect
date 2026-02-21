import React, { createContext, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  startStudySession, 
  endStudySession, 
  getStudyTimeBySubject,
  updateGoalProgressAfterSession
} from '@/services/studyService';

interface StudyTimerContextType {
  activeSubject: string | null;
  startTime: Date | null;
  isRunning: boolean;
  startTimer: (subjectId: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  getTodayStudyTime: () => Promise<{ [subjectId: string]: number }>;
  getWeeklyStudyTime: () => Promise<{ [subjectId: string]: number }>;
}

export const StudyTimerContext = createContext<StudyTimerContextType | undefined>(undefined);

export function StudyTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  const startTimer = useCallback(async (subjectId: string) => {
    if (!user) {
      alert('Please log in to start the timer');
      return;
    }

    // Stop current timer if any
    if (activeSubject && activeSessionId) {
      await stopTimer();
    }

    const now = new Date();
    const { sessionId, error } = await startStudySession(user.id, subjectId);

    if (error || !sessionId) {
      alert(error || 'Failed to start timer');
      return;
    }

    setActiveSubject(subjectId);
    setActiveSessionId(sessionId);
    setStartTime(now);
  }, [user, activeSubject, activeSessionId]);

  const stopTimer = useCallback(async () => {
    if (!activeSubject || !activeSessionId || !startTime || !user || isStopping) return;

    // Immediate UI feedback - clear timer state first
    const sessionIdToEnd = activeSessionId;
    const subjectToUpdate = activeSubject;
    const startTimeSnapshot = startTime;
    
    setIsStopping(true);
    setActiveSubject(null);
    setActiveSessionId(null);
    setStartTime(null);

    // Then handle database operations in background
    const now = new Date();
    const durationMinutes = (now.getTime() - startTimeSnapshot.getTime()) / 1000 / 60;

    // Use Promise.all to run both operations in parallel
    const [sessionResult, _] = await Promise.all([
      endStudySession(sessionIdToEnd, user.id, durationMinutes),
      updateGoalProgressAfterSession(user.id, subjectToUpdate, durationMinutes)
    ]);
    
    if (sessionResult.error) {
      console.error('Failed to stop timer:', sessionResult.error);
    }

    setIsStopping(false);
  }, [activeSubject, activeSessionId, startTime, user, isStopping]);

  const getTodayStudyTime = useCallback(async (): Promise<{ [subjectId: string]: number }> => {
    if (!user) return {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return await getStudyTimeBySubject(user.id, today, endOfToday);
  }, [user]);

  const getWeeklyStudyTime = useCallback(async (): Promise<{ [subjectId: string]: number }> => {
    if (!user) return {};

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return await getStudyTimeBySubject(user.id, oneWeekAgo, today);
  }, [user]);

  return (
    <StudyTimerContext.Provider
      value={{
        activeSubject,
        startTime,
        isRunning: !!activeSubject,
        startTimer,
        stopTimer,
        getTodayStudyTime,
        getWeeklyStudyTime,
      }}
    >
      {children}
    </StudyTimerContext.Provider>
  );
}
