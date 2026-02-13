import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';
import { CalendarEvent } from '@/services/calendarService';

interface UpcomingAssessmentCardProps {
  event: CalendarEvent;
  index: number;
  onComplete: (eventId: string) => void;
  onPress?: (event: CalendarEvent) => void;
}

export function UpcomingAssessmentCard({
  event,
  index,
  onComplete,
  onPress,
}: UpcomingAssessmentCardProps) {
  const getUrgencyColor = () => {
    switch (event.urgency_level) {
      case 'red':
        return colors.error;
      case 'orange':
        return '#FF9500';
      case 'yellow':
        return '#FFD60A';
      case 'green':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getDaysText = () => {
    if (event.days_remaining === 0) return 'Today';
    if (event.days_remaining === 1) return 'Tomorrow';
    return `${event.days_remaining} days`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress?.(event)}
    >
      <View style={styles.indexContainer}>
        <Text style={styles.indexText}>{index}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {event.subject_code} {event.event_type}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {event.title}
        </Text>
      </View>

      <View style={styles.rightContent}>
        <View style={styles.urgencyContainer}>
          <Text style={[styles.daysText, { color: getUrgencyColor() }]}>
            {getDaysText()}
          </Text>
          <Text style={styles.dateText}>({formatDate(event.event_date)})</Text>
        </View>

        {event.days_remaining !== undefined && event.days_remaining <= 3 && (
          <MaterialIcons name="notifications-active" size={16} color={getUrgencyColor()} />
        )}
      </View>

      <Pressable
        style={styles.checkButton}
        onPress={(e) => {
          e.stopPropagation();
          onComplete(event.id);
        }}
      >
        <MaterialIcons
          name={event.is_completed ? 'check-circle' : 'radio-button-unchecked'}
          size={24}
          color={event.is_completed ? colors.success : colors.textSecondary}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: colors.surface,
  },
  indexContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  indexText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  rightContent: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  urgencyContainer: {
    alignItems: 'flex-end',
  },
  daysText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  checkButton: {
    padding: 4,
  },
});
