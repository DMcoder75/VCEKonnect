import { useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  requestNotificationPermissions,
  hasNotificationPermissions,
  scheduleStudyReminder,
  scheduleExamReminder,
  scheduleGoalReminder,
  scheduleDailyStudyReminder,
  cancelNotification,
  cancelAllNotifications,
  getAllScheduledNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from '@/services/notificationService';

export function useNotifications() {
  const router = useRouter();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // When notification is received while app is foregrounded
    const receivedSubscription = addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // When user taps notification
    const responseSubscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      handleNotificationTap(data);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  async function checkPermissions() {
    const granted = await hasNotificationPermissions();
    setPermissionGranted(granted);
    if (granted) {
      updateScheduledCount();
    }
  }

  async function requestPermissions() {
    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
    if (granted) {
      updateScheduledCount();
    }
    return granted;
  }

  async function updateScheduledCount() {
    const scheduled = await getAllScheduledNotifications();
    setScheduledCount(scheduled.length);
  }

  function handleNotificationTap(data: any) {
    // Navigate based on notification type
    switch (data.type) {
      case 'study':
        router.push('/(tabs)/study');
        break;
      case 'exam':
        router.push('/(tabs)/calendar');
        break;
      case 'goal':
        router.push('/goals');
        break;
      case 'daily':
        router.push('/(tabs)/study');
        break;
      default:
        router.push('/(tabs)');
    }
  }

  const scheduleStudy = useCallback(
    async (subjectName: string, triggerDate: Date, data?: any) => {
      const id = await scheduleStudyReminder(subjectName, triggerDate, data);
      if (id) updateScheduledCount();
      return id;
    },
    []
  );

  const scheduleExam = useCallback(
    async (eventTitle: string, eventDate: Date, hoursBefore?: number, data?: any) => {
      const id = await scheduleExamReminder(eventTitle, eventDate, hoursBefore, data);
      if (id) updateScheduledCount();
      return id;
    },
    []
  );

  const scheduleGoal = useCallback(
    async (goalTitle: string, deadlineDate: Date, hoursBefore?: number, data?: any) => {
      const id = await scheduleGoalReminder(goalTitle, deadlineDate, hoursBefore, data);
      if (id) updateScheduledCount();
      return id;
    },
    []
  );

  const scheduleDailyReminder = useCallback(async (hour?: number, minute?: number) => {
    const id = await scheduleDailyStudyReminder(hour, minute);
    if (id) updateScheduledCount();
    return id;
  }, []);

  const cancelScheduled = useCallback(async (notificationId: string) => {
    await cancelNotification(notificationId);
    updateScheduledCount();
  }, []);

  const cancelAll = useCallback(async () => {
    await cancelAllNotifications();
    updateScheduledCount();
  }, []);

  return {
    // State
    permissionGranted,
    scheduledCount,

    // Actions
    requestPermissions,
    checkPermissions,
    scheduleStudy,
    scheduleExam,
    scheduleGoal,
    scheduleDailyReminder,
    cancelScheduled,
    cancelAll,
    updateScheduledCount,
  };
}
