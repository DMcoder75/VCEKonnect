import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  trigger: Date | number; // Date object or seconds from now
  data?: any;
}

/**
 * Request notification permissions
 * Required before scheduling any notifications
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions denied');
      return false;
    }

    // Android-specific: Create notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });

      await Notifications.setNotificationChannelAsync('study', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('exams', {
        name: 'Exam Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
      });

      await Notifications.setNotificationChannelAsync('goals', {
        name: 'Goal Deadlines',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Check if notification permissions are granted
 */
export async function hasNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a local notification
 */
export async function scheduleNotification(
  notification: ScheduledNotification,
  channelId: 'default' | 'study' | 'exams' | 'goals' = 'default'
): Promise<string | null> {
  try {
    const hasPermission = await hasNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permissions, skipping schedule');
      return null;
    }

    const trigger =
      notification.trigger instanceof Date
        ? notification.trigger
        : { seconds: notification.trigger };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Schedule study reminder
 */
export async function scheduleStudyReminder(
  subjectName: string,
  triggerDate: Date,
  data?: any
): Promise<string | null> {
  return scheduleNotification(
    {
      id: `study-${Date.now()}`,
      title: `Time to study ${subjectName}! 📚`,
      body: `Don't forget your scheduled study session`,
      trigger: triggerDate,
      data: { type: 'study', subject: subjectName, ...data },
    },
    'study'
  );
}

/**
 * Schedule exam/SAC reminder
 */
export async function scheduleExamReminder(
  eventTitle: string,
  eventDate: Date,
  hoursBefore: number = 24,
  data?: any
): Promise<string | null> {
  const reminderDate = new Date(eventDate);
  reminderDate.setHours(reminderDate.getHours() - hoursBefore);

  // Don't schedule if reminder time is in the past
  if (reminderDate < new Date()) {
    return null;
  }

  const timeText = hoursBefore >= 24 ? `${hoursBefore / 24} day(s)` : `${hoursBefore} hour(s)`;

  return scheduleNotification(
    {
      id: `exam-${Date.now()}`,
      title: `Exam Reminder: ${eventTitle} 📝`,
      body: `Coming up in ${timeText}. Time to prepare!`,
      trigger: reminderDate,
      data: { type: 'exam', event: eventTitle, ...data },
    },
    'exams'
  );
}

/**
 * Schedule goal deadline reminder
 */
export async function scheduleGoalReminder(
  goalTitle: string,
  deadlineDate: Date,
  hoursBefore: number = 12,
  data?: any
): Promise<string | null> {
  const reminderDate = new Date(deadlineDate);
  reminderDate.setHours(reminderDate.getHours() - hoursBefore);

  if (reminderDate < new Date()) {
    return null;
  }

  return scheduleNotification(
    {
      id: `goal-${Date.now()}`,
      title: `Goal Deadline: ${goalTitle} 🎯`,
      body: `${hoursBefore} hours left to complete your goal!`,
      trigger: reminderDate,
      data: { type: 'goal', goal: goalTitle, ...data },
    },
    'goals'
  );
}

/**
 * Schedule daily study reminder
 */
export async function scheduleDailyStudyReminder(
  hour: number = 18,
  minute: number = 0
): Promise<string | null> {
  const now = new Date();
  const trigger = new Date();
  trigger.setHours(hour, minute, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (trigger < now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  return scheduleNotification(
    {
      id: `daily-study-${Date.now()}`,
      title: `Daily Study Reminder 📖`,
      body: `Time for your daily study session. Keep up the great work!`,
      trigger,
      data: { type: 'daily', repeating: true },
    },
    'study'
  );
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Present immediate notification (no scheduling)
 */
export async function presentNotification(
  title: string,
  body: string,
  data?: any
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: null, // Immediate
  });
}
