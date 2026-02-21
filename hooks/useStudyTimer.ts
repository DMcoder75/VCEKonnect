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
    console.log('useElapsedTime effect:', { isRunning, hasStartTime: !!startTime, startTime });
    
    if (!isRunning || !startTime) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed time
    const updateElapsed = () => {
      // Handle both Date objects and date strings
      let startDate: Date;
      if (startTime instanceof Date) {
        startDate = startTime;
      } else if (typeof startTime === 'string') {
        startDate = new Date(startTime);
      } else {
        console.error('❌ Invalid startTime type:', typeof startTime, startTime);
        setElapsedSeconds(0);
        return;
      }
      
      // Validate the date
      if (isNaN(startDate.getTime())) {
        console.error('❌ Invalid startTime value:', startTime);
        setElapsedSeconds(0);
        return;
      }
      
      const now = new Date();
      const diff = Math.floor((now.getTime() - startDate.getTime()) / 1000);
      const validDiff = isNaN(diff) || diff < 0 ? 0 : diff;
      
      console.log('⏱️ Timer update:', { elapsed: validDiff, start: startDate.toISOString() });
      setElapsedSeconds(validDiff);
    };

    updateElapsed();

    // Update every second for smooth display
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime, isRunning]);

  return elapsedSeconds;
}
