import { useContext, useState, useEffect } from 'react';
import { StudyTimerContext } from '@/contexts/StudyTimerContext';

/**
 * Hook to access study timer context
 * Returns activeSubject, startTime, isRunning, and timer control functions
 */
export function useStudyTimer() {
  const context = useContext(StudyTimerContext);
  if (!context) {
    throw new Error('useStudyTimer must be used within StudyTimerProvider');
  }
  return context;
}

/**
 * Hook that provides elapsed seconds with 1-second precision
 * Only components that display elapsed time should use this
 * Other components should use useStudyTimer() to avoid unnecessary re-renders
 */
export function useElapsedTime() {
  const { startTime, isRunning } = useStudyTimer();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning || !startTime) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed time
    const updateElapsed = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(diff);
    };

    updateElapsed();

    // Update every second for smooth display
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime, isRunning]);

  return elapsedSeconds;
}
