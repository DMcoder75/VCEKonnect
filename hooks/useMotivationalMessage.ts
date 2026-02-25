import { useMemo } from 'react';
import { colors } from '@/constants/theme';
import { ActiveGoalsResponse } from '@/services/studyGoalsService';
import { Streak } from '@/services/achievementsService';
import { VCESubject } from '@/services/vceSubjectsService';

interface MotivationalMessage {
  icon: string;
  iconColor: string;
  title: string;
  message: string;
  type: 'urgent' | 'warning' | 'success' | 'info' | 'quote';
}

interface UseMotivationalMessageParams {
  activeGoals: ActiveGoalsResponse | null;
  streaks: Streak[];
  userSubjects: VCESubject[];
  isRunning: boolean;
  currentATAR?: number;
  targetATAR?: number;
}

const MOTIVATIONAL_QUOTES = [
  "Your ATAR is built one study session at a time",
  "Consistency beats intensity - show up every day",
  "The difference between 85 and 95 is just 2 hours per week",
  "Success is the sum of small efforts repeated daily",
  "You do not have to be great to start, but you have to start to be great",
  "Study while they sleep, work while they party",
  "Hard work beats talent when talent does not work hard",
  "Your future self will thank you for the work you do today",
];

export function useMotivationalMessage(params: UseMotivationalMessageParams): MotivationalMessage {
  return useMemo(() => {
    const { activeGoals, streaks, userSubjects, isRunning, currentATAR, targetATAR } = params;

    // Priority 1: Streak at risk (if not studying today and has active streak)
    const weeklyStreak = streaks.find(s => s.streakType === 'weekly');
    if (weeklyStreak && weeklyStreak.currentStreak >= 3 && !isRunning) {
      const today = new Date().toISOString().split('T')[0];
      const lastCompletion = weeklyStreak.lastCompletionDate;
      const daysSinceLastCompletion = lastCompletion 
        ? Math.floor((new Date(today).getTime() - new Date(lastCompletion).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      if (daysSinceLastCompletion >= 6) {
        return {
          icon: 'local-fire-department',
          iconColor: colors.error,
          title: 'Streak at Risk!',
          message: `Your ${weeklyStreak.currentStreak}-week streak is at risk! Study today to keep it alive 🔥`,
          type: 'urgent',
        };
      }
    }

    // Priority 2: Weekly goal nearly complete (90%+)
    if (activeGoals?.weekly && activeGoals.weekly.progressPercent >= 90 && activeGoals.weekly.progressPercent < 100) {
      const remaining = activeGoals.weekly.targetHours - activeGoals.weekly.achievedHours;
      return {
        icon: 'flag',
        iconColor: colors.success,
        title: 'Almost There!',
        message: `Just ${remaining.toFixed(1)}h left to complete your weekly goal. You can do it! 💪`,
        type: 'success',
      };
    }

    // Priority 3: Subject falling behind (weekly goal <50% with <3 days left)
    if (activeGoals?.weekly?.subjects && activeGoals.weekly.subjects.length > 0) {
      const endDate = new Date(activeGoals.weekly.endDate);
      const today = new Date();
      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft <= 3) {
        const behindSubjects = activeGoals.weekly.subjects.filter(s => s.progressPercent < 50);
        if (behindSubjects.length > 0) {
          const subject = behindSubjects[0];
          const subjectName = userSubjects.find(us => us.id === subject.subjectId)?.code || 'Subject';
          const remaining = subject.targetHours - subject.achievedHours;
          
          return {
            icon: 'warning',
            iconColor: colors.warning,
            title: `${subjectName} Needs Attention`,
            message: `${remaining.toFixed(1)}h remaining in ${subjectName} with only ${daysLeft} days left this week`,
            type: 'warning',
          };
        }
      }
    }

    // Priority 4: ATAR gap (if current < target)
    if (currentATAR && targetATAR && currentATAR < targetATAR) {
      const gap = targetATAR - currentATAR;
      return {
        icon: 'trending-up',
        iconColor: colors.primary,
        title: 'ATAR Progress',
        message: `Current: ${currentATAR.toFixed(1)} | Target: ${targetATAR.toFixed(1)} | Gap: ${gap.toFixed(1)} points`,
        type: 'info',
      };
    }

    // Priority 5: Weekly goal ahead of pace
    if (activeGoals?.weekly && activeGoals.weekly.progressPercent > 100) {
      const overPercent = Math.round(activeGoals.weekly.progressPercent - 100);
      return {
        icon: 'emoji-events',
        iconColor: colors.premium,
        title: 'Crushing It!',
        message: `You are ${overPercent}% ahead of your weekly goal. Keep this energy going! 🚀`,
        type: 'success',
      };
    }

    // Priority 6: New streak milestone reached
    if (weeklyStreak && [5, 10, 15, 20, 30].includes(weeklyStreak.currentStreak)) {
      return {
        icon: 'local-fire-department',
        iconColor: colors.warning,
        title: `${weeklyStreak.currentStreak}-Week Streak!`,
        message: `You have completed ${weeklyStreak.currentStreak} consecutive weeks. Amazing consistency! 🔥`,
        type: 'success',
      };
    }

    // Fallback: Random motivational quote
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    return {
      icon: 'format-quote',
      iconColor: colors.primary,
      title: 'Daily Inspiration',
      message: randomQuote,
      type: 'quote',
    };
  }, [params]);
}
