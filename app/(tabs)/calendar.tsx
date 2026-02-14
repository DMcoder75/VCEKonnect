import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCalendar } from '@/hooks/useCalendar';
import { UpcomingAssessmentCard } from '@/components/feature';
import { LoadingSpinner } from '@/components/ui';
import { CalendarEvent } from '@/services/calendarService';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { upcomingEvents, loading, completeEvent, updateScore, loadUpcomingEvents, loadEventsByWeek } = useCalendar(user?.id);
  const [view, setView] = useState<'list' | 'week' | 'month'>('list');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([]);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Refresh events when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      async function loadInitialData() {
        setInitialLoading(true);
        await loadUpcomingEvents();
        if (view === 'week') {
          await loadWeekEvents();
        }
        setInitialLoading(false);
      }
      loadInitialData();
    }, [loadUpcomingEvents, view])
  );

  // Load week events when week changes
  useEffect(() => {
    if (view === 'week') {
      loadWeekEvents();
    }
  }, [weekStart, view]);

  // Load month events when month changes
  useEffect(() => {
    if (view === 'month') {
      loadMonthEvents();
    }
  }, [monthDate, view]);

  function getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday as start of week
    d.setDate(diff);
    return formatDateForDB(d);
  }

  function formatDateForDB(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async function loadWeekEvents() {
    if (!user) return;
    setLoadingWeek(true);
    const { data } = await loadEventsByWeek(weekStart);
    setWeekEvents(data || []);
    setLoadingWeek(false);
  }

  function goToPreviousWeek() {
    const current = new Date(weekStart);
    current.setDate(current.getDate() - 7);
    setWeekStart(formatDateForDB(current));
  }

  function goToNextWeek() {
    const current = new Date(weekStart);
    current.setDate(current.getDate() + 7);
    setWeekStart(formatDateForDB(current));
  }

  function goToToday() {
    setWeekStart(getWeekStart(new Date()));
  }

  // Month view functions
  function goToPreviousMonth() {
    const [year, month] = monthDate.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    setMonthDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  function goToNextMonth() {
    const [year, month] = monthDate.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + 1);
    setMonthDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  function goToCurrentMonth() {
    const now = new Date();
    setMonthDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }

  function isCurrentMonth(): boolean {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return monthDate === currentMonth;
  }

  function getMonthName(): string {
    const [year, month] = monthDate.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  }

  function getMonthDays(): Array<{ date: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }> {
    const [year, month] = monthDate.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const today = formatDateForDB(new Date());

    const days = [];

    // Add previous month's trailing days
    const prevMonth = new Date(year, month - 2, 1);
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), dayNum);
      days.push({
        date: formatDateForDB(date),
        dayNum,
        isCurrentMonth: false,
        isToday: formatDateForDB(date) === today,
      });
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month - 1, i);
      days.push({
        date: formatDateForDB(date),
        dayNum: i,
        isCurrentMonth: true,
        isToday: formatDateForDB(date) === today,
      });
    }

    // Add next month's leading days to complete the grid (up to 42 days - 6 weeks)
    const remainingDays = 42 - days.length;
    const nextMonth = new Date(year, month, 1);
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i);
      days.push({
        date: formatDateForDB(date),
        dayNum: i,
        isCurrentMonth: false,
        isToday: formatDateForDB(date) === today,
      });
    }

    return days;
  }

  async function loadMonthEvents() {
    if (!user) return;
    setLoadingMonth(true);
    const [year, month] = monthDate.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    // Get first Sunday of the calendar grid
    const startDayOfWeek = firstDay.getDay();
    const calendarStart = new Date(firstDay);
    calendarStart.setDate(firstDay.getDate() - startDayOfWeek);
    
    // Get all events from calendar start for 42 days (6 weeks)
    const events: CalendarEvent[] = [];
    for (let i = 0; i < 6; i++) {
      const weekStart = new Date(calendarStart);
      weekStart.setDate(calendarStart.getDate() + (i * 7));
      const { data } = await loadEventsByWeek(formatDateForDB(weekStart));
      if (data) {
        events.push(...data);
      }
    }
    
    setMonthEvents(events);
    setLoadingMonth(false);
  }

  function isCurrentWeek(): boolean {
    const currentWeekStart = getWeekStart(new Date());
    return weekStart === currentWeekStart;
  }

  function getWeekDays(): Array<{ date: string; dayName: string; dayNum: string; isToday: boolean }> {
    const days = [];
    const start = new Date(weekStart);
    const today = formatDateForDB(new Date());

    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const dateStr = formatDateForDB(current);

      days.push({
        date: dateStr,
        dayName: current.toLocaleDateString('en-AU', { weekday: 'short' }),
        dayNum: current.getDate().toString(),
        isToday: dateStr === today,
      });
    }

    return days;
  }

  function getEventsForDay(date: string): CalendarEvent[] {
    return weekEvents.filter(event => event.event_date === date);
  }

  function getWeekRangeText(): string {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startMonth = start.toLocaleDateString('en-AU', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-AU', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  }

  async function handleCompleteEvent(eventId: string) {
    await completeEvent(eventId);
  }

  async function handleUpdateScore(eventId: string, scoreAchieved: number, scoreTotal: number) {
    await updateScore(eventId, scoreAchieved, scoreTotal);
  }

  function handleEventPress(event: CalendarEvent) {
    router.push({
      pathname: '/edit-event',
      params: { eventId: event.id },
    });
  }

  const pendingEvents = upcomingEvents.filter(e => !e.is_completed);
  const completedEvents = upcomingEvents.filter(e => e.is_completed);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
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
        {(initialLoading && view === 'list') ? (
          <LoadingSpinner message="Loading calendar..." />
        ) : view === 'list' && (
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
                    onUpdateScore={handleUpdateScore}
                    onPress={handleEventPress}
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
                    onUpdateScore={handleUpdateScore}
                    onPress={handleEventPress}
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
          <>
            {/* Week Navigation */}
            <View style={styles.weekNav}>
              <Pressable style={styles.weekNavButton} onPress={goToPreviousWeek}>
                <MaterialIcons name="chevron-left" size={24} color={colors.textPrimary} />
              </Pressable>

              <View style={styles.weekNavCenter}>
                <Text style={styles.weekRangeText}>{getWeekRangeText()}</Text>
                {!isCurrentWeek() && (
                  <Pressable style={styles.todayButton} onPress={goToToday}>
                    <Text style={styles.todayButtonText}>Today</Text>
                  </Pressable>
                )}
              </View>

              <Pressable style={styles.weekNavButton} onPress={goToNextWeek}>
                <MaterialIcons name="chevron-right" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            {loadingWeek ? (
              <LoadingSpinner message="Loading week..." />
            ) : (
              <View style={styles.weekGrid}>
                {getWeekDays().map((day) => {
                  const dayEvents = getEventsForDay(day.date);
                  return (
                    <View
                      key={day.date}
                      style={[
                        styles.dayColumn,
                        day.isToday && styles.dayColumnToday,
                      ]}
                    >
                      {/* Day Header */}
                      <View style={[styles.dayHeader, day.isToday && styles.dayHeaderToday]}>
                        <Text
                          style={[
                            styles.dayName,
                            day.isToday && styles.dayNameToday,
                          ]}
                        >
                          {day.dayName}
                        </Text>
                        <View
                          style={[
                            styles.dayNumCircle,
                            day.isToday && styles.dayNumCircleToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNum,
                              day.isToday && styles.dayNumToday,
                            ]}
                          >
                            {day.dayNum}
                          </Text>
                        </View>
                      </View>

                      {/* Day Events */}
                      <View style={styles.dayEvents}>
                        {dayEvents.length === 0 ? (
                          <View style={styles.noEvents}>
                            <Text style={styles.noEventsText}>No events</Text>
                          </View>
                        ) : (
                          dayEvents.map((event) => (
                            <Pressable
                              key={event.id}
                              style={[
                                styles.weekEventCard,
                                event.is_completed && styles.weekEventCardCompleted,
                              ]}
                              onPress={() => {
                                // Could open event details modal
                              }}
                            >
                              <View style={styles.weekEventHeader}>
                                <Text style={styles.weekEventCode} numberOfLines={1}>
                                  {event.subject_code}
                                </Text>
                                {event.is_completed ? (
                                  <MaterialIcons
                                    name="check-circle"
                                    size={14}
                                    color={colors.success}
                                  />
                                ) : (
                                  event.urgency_level && (
                                    <View
                                      style={[
                                        styles.urgencyDot,
                                        {
                                          backgroundColor:
                                            event.urgency_level === 'red'
                                              ? colors.error
                                              : event.urgency_level === 'orange'
                                              ? '#FF9500'
                                              : event.urgency_level === 'yellow'
                                              ? '#FFD60A'
                                              : colors.success,
                                        },
                                      ]}
                                    />
                                  )
                                )}
                              </View>
                              <Text style={styles.weekEventType} numberOfLines={1}>
                                {event.event_type}
                              </Text>
                              {event.score_percentage !== undefined &&
                                event.score_percentage !== null && (
                                  <View style={styles.weekEventScore}>
                                    <Text style={styles.weekEventScoreText}>
                                      {event.score_percentage.toFixed(0)}%
                                    </Text>
                                  </View>
                                )}
                            </Pressable>
                          ))
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {view === 'month' && (
          <>
            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <Pressable style={styles.monthNavButton} onPress={goToPreviousMonth}>
                <MaterialIcons name="chevron-left" size={24} color={colors.textPrimary} />
              </Pressable>

              <View style={styles.monthNavCenter}>
                <Text style={styles.monthNameText}>{getMonthName()}</Text>
                {!isCurrentMonth() && (
                  <Pressable style={styles.todayButton} onPress={goToCurrentMonth}>
                    <Text style={styles.todayButtonText}>Today</Text>
                  </Pressable>
                )}
              </View>

              <Pressable style={styles.monthNavButton} onPress={goToNextMonth}>
                <MaterialIcons name="chevron-right" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            {loadingMonth ? (
              <LoadingSpinner message="Loading month..." />
            ) : (
              <>
                {/* Weekday Headers */}
                <View style={styles.weekdayHeaders}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <View key={day} style={styles.weekdayHeader}>
                      <Text style={styles.weekdayHeaderText}>{day}</Text>
                    </View>
                  ))}
                </View>

                {/* Month Grid */}
                <View style={styles.monthGrid}>
                  {getMonthDays().map((day, index) => {
                    const dayEvents = monthEvents.filter(e => e.event_date === day.date);
                    return (
                      <View
                        key={`${day.date}-${index}`}
                        style={[
                          styles.monthDayCell,
                          !day.isCurrentMonth && styles.monthDayCellOtherMonth,
                          day.isToday && styles.monthDayCellToday,
                        ]}
                      >
                        {/* Day Number */}
                        <View
                          style={[
                            styles.monthDayNum,
                            day.isToday && styles.monthDayNumToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.monthDayNumText,
                              !day.isCurrentMonth && styles.monthDayNumTextOther,
                              day.isToday && styles.monthDayNumTextToday,
                            ]}
                          >
                            {day.dayNum}
                          </Text>
                        </View>

                        {/* Events */}
                        <View style={styles.monthDayEvents}>
                          {dayEvents.slice(0, 3).map((event) => (
                            <Pressable
                              key={event.id}
                              style={[
                                styles.monthEventDot,
                                event.is_completed && styles.monthEventDotCompleted,
                                {
                                  backgroundColor: event.is_completed
                                    ? colors.success
                                    : event.urgency_level === 'red'
                                    ? colors.error
                                    : event.urgency_level === 'orange'
                                    ? '#FF9500'
                                    : event.urgency_level === 'yellow'
                                    ? '#FFD60A'
                                    : colors.primary,
                                },
                              ]}
                              onPress={() => handleEventPress(event)}
                            >
                              <Text style={styles.monthEventDotText} numberOfLines={1}>
                                {event.subject_code}
                              </Text>
                            </Pressable>
                          ))}
                          {dayEvents.length > 3 && (
                            <Text style={styles.monthEventMore}>+{dayEvents.length - 3}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
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
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  weekNavButton: {
    padding: spacing.xs,
  },
  weekNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weekRangeText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  todayButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  todayButtonText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  weekGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayColumn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  dayColumnToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayHeader: {
    padding: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayHeaderToday: {
    backgroundColor: colors.primary + '15',
  },
  dayName: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dayNameToday: {
    color: colors.primary,
  },
  dayNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumCircleToday: {
    backgroundColor: colors.primary,
  },
  dayNum: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  dayNumToday: {
    color: colors.textPrimary,
  },
  dayEvents: {
    padding: spacing.xs,
    gap: spacing.xs,
  },
  noEvents: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  noEventsText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  weekEventCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekEventCardCompleted: {
    opacity: 0.7,
  },
  weekEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  weekEventCode: {
    fontSize: 11,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekEventType: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  weekEventScore: {
    marginTop: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: colors.success + '20',
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  weekEventScoreText: {
    fontSize: 9,
    fontWeight: typography.semibold,
    color: colors.success,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  monthNavButton: {
    padding: spacing.xs,
  },
  monthNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  monthNameText: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  weekdayHeaders: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekdayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayHeaderText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  monthDayCell: {
    width: 'calc((100% - 12px) / 7)',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthDayCellOtherMonth: {
    backgroundColor: colors.background,
    opacity: 0.5,
  },
  monthDayCellToday: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  monthDayNum: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  monthDayNumToday: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
  },
  monthDayNumText: {
    fontSize: 12,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  monthDayNumTextOther: {
    color: colors.textTertiary,
  },
  monthDayNumTextToday: {
    color: colors.textPrimary,
  },
  monthDayEvents: {
    gap: 2,
  },
  monthEventDot: {
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  monthEventDotCompleted: {
    opacity: 0.6,
  },
  monthEventDotText: {
    fontSize: 8,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  monthEventMore: {
    fontSize: 8,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});
