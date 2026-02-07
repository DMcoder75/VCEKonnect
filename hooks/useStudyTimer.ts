import { useState, useEffect } from 'react';
import { 
  getActiveTimer, 
  saveActiveTimer, 
  saveStudySession, 
  getStudySessions 
} from '@/services/storage';
import { StudySession } from '@/types';

export function useStudyTimer() {
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Load active timer on mount
  useEffect(() => {
    loadActiveTimer();
  }, []);

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

  async function loadActiveTimer() {
    const timer = await getActiveTimer();
    if (timer) {
      setActiveSubject(timer.subjectId);
      setStartTime(new Date(timer.startTime));
    }
  }

  async function startTimer(subjectId: string) {
    // Stop current timer if any
    if (activeSubject) {
      await stopTimer();
    }

    const now = new Date();
    setActiveSubject(subjectId);
    setStartTime(now);
    setElapsedSeconds(0);
    
    await saveActiveTimer({
      subjectId,
      startTime: now.toISOString(),
    });
  }

  async function stopTimer(): Promise<StudySession | null> {
    if (!activeSubject || !startTime) return null;

    const now = new Date();
    const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60); // minutes

    const session: StudySession = {
      id: 'session_' + Date.now(),
      subjectId: activeSubject,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      duration,
      date: now.toISOString().split('T')[0],
    };

    await saveStudySession(session);
    await saveActiveTimer(null);

    setActiveSubject(null);
    setStartTime(null);
    setElapsedSeconds(0);

    return session;
  }

  async function getTodayStudyTime(): Promise<{ [subjectId: string]: number }> {
    const today = new Date().toISOString().split('T')[0];
    const sessions = await getStudySessions();
    const todaySessions = sessions.filter(s => s.date === today);

    const timeBySubject: { [subjectId: string]: number } = {};
    todaySessions.forEach(session => {
      timeBySubject[session.subjectId] = (timeBySubject[session.subjectId] || 0) + session.duration;
    });

    return timeBySubject;
  }

  async function getWeeklyStudyTime(): Promise<{ [subjectId: string]: number }> {
    const sessions = await getStudySessions();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentSessions = sessions.filter(s => new Date(s.date) >= oneWeekAgo);

    const timeBySubject: { [subjectId: string]: number } = {};
    recentSessions.forEach(session => {
      timeBySubject[session.subjectId] = (timeBySubject[session.subjectId] || 0) + session.duration;
    });

    return timeBySubject;
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
