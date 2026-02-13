import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCalendar } from '@/hooks/useCalendar';
import { CalendarEvent } from '@/services/calendarService';
import { useAlert } from '@/template';

export default function EditEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const { upcomingEvents, editEvent, removeEvent, loading } = useCalendar(user?.id);
  const { showAlert } = useAlert();

  const eventId = params.eventId as string;
  const event = upcomingEvents.find((e) => e.id === eventId);

  const [eventType, setEventType] = useState<'SAC' | 'Assessment' | 'Exam' | 'MockExam' | 'GAT'>('SAC');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const eventTypes: Array<'SAC' | 'Assessment' | 'Exam' | 'MockExam' | 'GAT'> = [
    'SAC',
    'Assessment',
    'Exam',
    'MockExam',
    'GAT',
  ];

  useEffect(() => {
    if (event) {
      setEventType(event.event_type);
      setTitle(event.title);
      setNotes(event.notes || '');
      setSelectedDate(event.event_date);
    }
  }, [event]);

  function formatDateForDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function formatDateForDB(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function getDateOptions() {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      options.push({
        value: formatDateForDB(date),
        label: formatDateForDisplay(formatDateForDB(date)),
      });
    }
    return options;
  }

  async function handleSave() {
    if (!user || !event) return;

    if (!title.trim()) {
      showAlert('Error', 'Please enter a title');
      return;
    }

    if (!selectedDate) {
      showAlert('Error', 'Please select a date');
      return;
    }

    setSaving(true);

    const updates = {
      event_type: eventType,
      title: title.trim(),
      notes: notes.trim() || undefined,
      event_date: selectedDate,
    };

    const { error } = await editEvent(eventId, updates);

    setSaving(false);

    if (error) {
      showAlert('Error', error);
      return;
    }

    router.back();
  }

  async function handleDelete() {
    if (!user || !event) return;

    showAlert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await removeEvent(eventId);
            setDeleting(false);

            if (error) {
              showAlert('Error', error);
              return;
            }

            router.back();
          },
        },
      ]
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Event Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Edit Event</Text>
        {!event.is_completed && (
          <Pressable
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <MaterialIcons name="delete" size={24} color={colors.error} />
            )}
          </Pressable>
        )}
        {event.is_completed && <View style={{ width: 40 }} />}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subject Display (Read-only) */}
        <View style={styles.section}>
          <Text style={styles.label}>Subject</Text>
          <View style={styles.subjectDisplay}>
            <Text style={styles.subjectText}>
              {event.subject_code} - {event.subject_name}
            </Text>
          </View>
          <Text style={styles.hint}>Subject cannot be changed</Text>
        </View>

        {/* Event Type Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Event Type</Text>
          <View style={styles.typeGrid}>
            {eventTypes.map((type) => (
              <Pressable
                key={type}
                style={[styles.typeButton, eventType === type && styles.typeButtonActive]}
                onPress={() => setEventType(type)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    eventType === type && styles.typeButtonTextActive,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., EAL SAC 1"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Date Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <Pressable style={styles.dateButton} onPress={() => setShowDateModal(true)}>
            <MaterialIcons name="event" size={20} color={colors.textSecondary} />
            <Text style={styles.dateButtonText}>
              {selectedDate ? formatDateForDisplay(selectedDate) : 'Select date'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Notes Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Add any additional notes..."
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Status Display */}
        {event.is_completed && (
          <View style={styles.statusCard}>
            <MaterialIcons name="check-circle" size={24} color={colors.success} />
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>Event Completed</Text>
              {event.score_percentage !== undefined && event.score_percentage !== null && (
                <Text style={styles.statusScore}>Score: {event.score_percentage.toFixed(0)}%</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color={colors.textPrimary} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <Pressable onPress={() => setShowDateModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView style={styles.dateList} showsVerticalScrollIndicator={false}>
              {getDateOptions().map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.dateOption,
                    selectedDate === option.value && styles.dateOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedDate(option.value);
                    setShowDateModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dateOptionText,
                      selectedDate === option.value && styles.dateOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedDate === option.value && (
                    <MaterialIcons name="check" size={24} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
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
  label: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  subjectDisplay: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  subjectText: {
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  dateButtonText: {
    flex: 1,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.success,
  },
  statusScore: {
    fontSize: typography.bodySmall,
    color: colors.success,
    marginTop: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  dateList: {
    flex: 1,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateOptionActive: {
    backgroundColor: colors.surfaceElevated,
  },
  dateOptionText: {
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  dateOptionTextActive: {
    fontWeight: typography.semibold,
    color: colors.primary,
  },
});
