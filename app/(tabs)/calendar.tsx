import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCalendar } from '@/hooks/useCalendar';
import { UpcomingAssessmentCard } from '@/components/feature';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { upcomingEvents, loading, completeEvent } = useCalendar(user?.id);
  const [view, setView] = useState<'list' | 'week' | 'month'>('list');

  async function handleCompleteEvent(eventId: string) {
    await completeEvent(eventId);
  }

  const pendingEvents = upcomingEvents.filter(e => !e.is_completed);
  const completedEvents = upcomingEvents.filter(e => e.is_completed);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SAC & Exam Calendar</Text>
          <Text style={styles.subtitle}>
            {pendingEvents.length} upcoming · {completedEvents.length} completed
          </Text>
        </View>
        <Pressable 
          style={styles.addButton}
          onPress={() => router.push('/add-event')}
        >
          <MaterialIcons name="add" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* View Switcher */}
      <View style={styles.viewSwitcher}>
        <Pressable
          style={[styles.viewButton, view === 'list' && styles.viewButtonActive]}
          onPress={() => setView('list')}
        >
          <MaterialIcons
            name="list"
            size={20}
            color={view === 'list' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.viewButtonText,
              view === 'list' && styles.viewButtonTextActive,
            ]}
          >
            List
          </Text>
        </Pressable>
        <Pressable
          style={[styles.viewButton, view === 'week' && styles.viewButtonActive]}
          onPress={() => setView('week')}
        >
          <MaterialIcons
            name="view-week"
            size={20}
            color={view === 'week' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.viewButtonText,
              view === 'week' && styles.viewButtonTextActive,
            ]}
          >
            Week
          </Text>
        </Pressable>
        <Pressable
          style={[styles.viewButton, view === 'month' && styles.viewButtonActive]}
          onPress={() => setView('month')}
        >
          <MaterialIcons
            name="calendar-today"
            size={20}
            color={view === 'month' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.viewButtonText,
              view === 'month' && styles.viewButtonTextActive,
            ]}
          >
            Month
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {view === 'list' && (
          <>
            {/* Pending Events */}
            {pendingEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                {pendingEvents.map((event, index) => (
                  <UpcomingAssessmentCard
                    key={event.id}
                    event={event}
                    index={index + 1}
                    onComplete={handleCompleteEvent}
                  />
                ))}
              </View>
            )}

            {/* Completed Events */}
            {completedEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completed</Text>
                {completedEvents.map((event, index) => (
                  <UpcomingAssessmentCard
                    key={event.id}
                    event={event}
                    index={index + 1}
                    onComplete={handleCompleteEvent}
                  />
                ))}
              </View>
            )}

            {upcomingEvents.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="event" size={64} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No Events Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add your SACs and exams to start tracking
                </Text>
                <Pressable 
                  style={styles.emptyButton}
                  onPress={() => router.push('/add-event')}
                >
                  <MaterialIcons name="add" size={20} color={colors.textPrimary} />
                  <Text style={styles.emptyButtonText}>Add First Event</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {view === 'week' && (
          <View style={styles.comingSoon}>
            <MaterialIcons name="view-week" size={48} color={colors.textTertiary} />
            <Text style={styles.comingSoonText}>Weekly View Coming Soon</Text>
          </View>
        )}

        {view === 'month' && (
          <View style={styles.comingSoon}>
            <MaterialIcons name="calendar-today" size={48} color={colors.textTertiary} />
            <Text style={styles.comingSoonText}>Monthly View Coming Soon</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewSwitcher: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewButtonActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primary,
  },
  viewButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  viewButtonTextActive: {
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  comingSoon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  comingSoonText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
