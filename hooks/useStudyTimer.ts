import { useContext } from 'react';
import { StudyTimerContext } from '@/contexts/StudyTimerContext';

export function useStudyTimer() {
  const context = useContext(StudyTimerContext);
  if (!context) {
    throw new Error('useStudyTimer must be used within StudyTimerProvider');
  }
  return context;
}
