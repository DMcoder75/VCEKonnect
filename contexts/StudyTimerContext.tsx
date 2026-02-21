import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  startStudySession, 
  endStudySession, 
  getStudyTimeBySubject,
  updateGoalProgressAfterSession
} from '@/services/studyService';

interface StudyTimerContextType {
  activeSubject: string | null;
  elapsedSeconds: number;
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Debug: Log user state changes
  useEffect(() => {
    console.log('📱 StudyTimerContext user state:', user ? `User ID: ${user.id}` : 'No user');
  }, [user]);

  // Update elapsed time every second
  useEffect(() => {
    if (!activeSubject || !startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSubject, startTime]);

  async function startTimer(subjectId: string) {
    console.log('🚀 startTimer called:', { subjectId, hasUser: !!user, userId: user?.id });
    
    if (!user) {
      console.error('❌ Cannot start timer: No user logged in');
      alert('Please log in to start the timer');
      return;
    }

    // Stop current timer if any
    if (activeSubject && activeSessionId) {
      console.log('⏸️ Stopping current timer before starting new one');
      await stopTimer();
    }

    const now = new Date();
    console.log('📞 Calling startStudySession with:', { userId: user.id, subjectId });
    const { sessionId, error } = await startStudySession(user.id, subjectId);
    console.log('📞 startStudySession result:', { sessionId, error });

    if (error || !sessionId) {
      console.error('❌ Failed to start timer:', error);
      alert(error || 'Failed to start timer');
      return;
    }

    console.log('✅ Timer started successfully:', { sessionId, subjectId });
    setActiveSubject(subjectId);
    setActiveSessionId(sessionId);
    setStartTime(now);
    setElapsedSeconds(0);
  }

  async function stopTimer() {
    if (!activeSubject || !activeSessionId || !startTime || !user) return;

    const now = new Date();
    const durationMinutes = (now.getTime() - startTime.getTime()) / 1000 / 60;

    console.log(`⏱️ Stopping timer: ${Math.round(durationMinutes)} minutes for subject ${activeSubject}`);

    // Step 1: End the study session and detect achievements
    const { error, newAchievements } = await endStudySession(
      activeSessionId,
      user.id,
      durationMinutes
    );
    
    if (error) {
      console.error('Failed to stop timer:', error);
    }

    // Log new achievements (if any)
    if (newAchievements && newAchievements.length > 0) {
      console.log('🎉 New achievements unlocked:', newAchievements);
    }

    // Step 2: Update goal progress
    const { error: goalError } = await updateGoalProgressAfterSession(
      user.id,
      activeSubject,
      durationMinutes
    );
    
    if (goalError) {
      console.error('Failed to update goal progress:', goalError);
    } else {
      console.log('✅ Goal progress updated successfully');
    }

    setActiveSubject(null);
    setActiveSessionId(null);
    setStartTime(null);
    setElapsedSeconds(0);
  }

  async function getTodayStudyTime(): Promise<{ [subjectId: string]: number }> {
    if (!user) return {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return await getStudyTimeBySubject(user.id, today, endOfToday);
  }

  async function getWeeklyStudyTime(): Promise<{ [subjectId: string]: number }> {
    if (!user) return {};

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return await getStudyTimeBySubject(user.id, oneWeekAgo, today);
  }

  return (
    <StudyTimerContext.Provider
      value={{
        activeSubject,
        elapsedSeconds,
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
