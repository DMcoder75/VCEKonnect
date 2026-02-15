import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Achievement } from '@/services/achievementsService';
import { AchievementLaunchToast } from './AchievementLaunchToast';

interface AchievementLaunchManagerProps {
  achievements: Achievement[];
}

export function AchievementLaunchManager({ achievements }: AchievementLaunchManagerProps) {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    // Filter achievements earned today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAchievements = achievements.filter(achievement => {
      const earnedDate = new Date(achievement.earnedAt);
      earnedDate.setHours(0, 0, 0, 0);
      return earnedDate.getTime() === today.getTime();
    });

    if (todayAchievements.length > 0) {
      setQueue(todayAchievements);
    }
  }, [achievements]);

  useEffect(() => {
    // Start showing achievements if queue has items and nothing is currently showing
    if (queue.length > 0 && !currentAchievement) {
      const [next, ...rest] = queue;
      setCurrentAchievement(next);
      setQueue(rest);
    }
  }, [queue, currentAchievement]);

  function handleComplete() {
    setCurrentAchievement(null);
    // The useEffect above will automatically pick the next one from queue
  }

  if (!currentAchievement) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <AchievementLaunchToast
        achievement={currentAchievement}
        onComplete={handleComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});
