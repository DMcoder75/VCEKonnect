import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { 
  startStudySession, 
  endStudySession, 
  getStudyTimeBySubject 
} from '@/services/studyService';

export function useStudyTimer() {
  const { user } = useAuth();
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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
    if (!user) return;

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
    setElapsedSeconds(0);
  }

  async function stopTimer() {
    if (!activeSubject || !activeSessionId || !startTime) return;

    const now = new Date();
    const durationMinutes = (now.getTime() - startTime.getTime()) / 1000 / 60;

    const { error } = await endStudySession(activeSessionId, durationMinutes);
    if (error) {
      console.error('Failed to stop timer:', error);
    }

    setActiveSubject(null);
    setActiveSessionId(null);
    setStartTime(null);
    setElapsedSeconds(0);
  }

  async function getTodayStudyTime(): Promise<{ [subjectId: string]: number }> {
    if (!user) return {};

    console.log('👤 Current user ID:', user.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999); // End of today

    console.log('📅 Fetching today sessions from', today.toISOString().split('T')[0], 'to', endOfToday.toISOString().split('T')[0]);

    const result = await getStudyTimeBySubject(user.id, today, endOfToday);
    console.log('⏱️ Today study time result:', result);
    return result;
  }

  async function getWeeklyStudyTime(): Promise<{ [subjectId: string]: number }> {
    if (!user) return {};

    console.log('👤 Current user ID:', user.id);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    console.log('📅 Fetching weekly sessions from', oneWeekAgo.toISOString().split('T')[0], 'to', today.toISOString().split('T')[0]);

    const result = await getStudyTimeBySubject(user.id, oneWeekAgo, today);
    console.log('📅 Weekly study time result:', result);
    return result;
  }

  return {
    activeSubject,
    elapsedSeconds,
    isRunning: !!activeSubject,
    startTimer,
    stopTimer,
    getTodayStudyTime,
    getWeeklyStudyTime,
  };
}
