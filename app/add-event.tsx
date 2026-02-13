import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCalendar } from '@/hooks/useCalendar';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';

export default function AddEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addEvent } = useCalendar(user?.id);

  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [eventType, setEventType] = useState<'SAC1' | 'SAC2' | 'Exam1' | 'Exam2' | 'Mock' | 'GAT'>('SAC1');
  const [eventDate, setEventDate] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');

  const eventTypes = [
    { value: 'SAC1', label: 'SAC 1' },
    { value: 'SAC2', label: 'SAC 2' },
    { value: 'Exam1', label: 'Exam 1' },
    { value: 'Exam2', label: 'Exam 2' },
    { value: 'Mock', label: 'Mock Exam' },
    { value: 'GAT', label: 'GAT' },
  ];

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    if (!user) return;
    setLoading(true);
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    if (subjects.length > 0) {
      setSelectedSubject(subjects[0].id);
      updateTitle(subjects[0].code, eventType);
    }
    setLoading(false);
  }

  function updateTitle(subjectCode: string, type: string) {
    setTitle(`${subjectCode} ${type}`);
  }

  function handleSubjectChange(subjectId: string) {
    setSelectedSubject(subjectId);
    const subject = userSubjects.find(s => s.id === subjectId);
    if (subject) {
      updateTitle(subject.code, eventType);
    }
  }

  function handleEventTypeChange(type: typeof eventType) {
    setEventType(type);
    const subject = userSubjects.find(s => s.id === selectedSubject);
    if (subject) {
      updateTitle(subject.code, type);
    }
  }

  async function handleSubmit() {
    if (!selectedSubject || !eventDate) {
      Alert.alert('Missing Information', 'Please select a subject and date');
      return;
    }

    setSubmitting(true);

    const { data, error } = await addEvent({
      subject_id: selectedSubject,
      event_date: eventDate,
      event_type: eventType,
      title: title || `${userSubjects.find(s => s.id === selectedSubject)?.code} ${eventType}`,
      notes: notes || undefined,
      duration_minutes: duration ? parseInt(duration) : undefined,
    });

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Success', 'Event added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Event</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subject Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Subject *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subjectScroll}
          >
            {userSubjects.map(subject => (
              <Pressable
                key={subject.id}
                style={[
                  styles.subjectChip,
                  selectedSubject === subject.id && styles.subjectChipActive,
                ]}
                onPress={() => handleSubjectChange(subject.id)}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    selectedSubject === subject.id && styles.subjectChipTextActive,
                  ]}
                >
                  {subject.code}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Event Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Type *</Text>
          <View style={styles.typeGrid}>
            {eventTypes.map(type => (
              <Pressable
                key={type.value}
                style={[
                  styles.typeChip,
                  eventType === type.value && styles.typeChipActive,
                ]}
                onPress={() => handleEventTypeChange(type.value as typeof eventType)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    eventType === type.value && styles.typeChipTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Date *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (e.g., 2026-03-15)"
            placeholderTextColor={colors.textTertiary}
            value={eventDate}
            onChangeText={setEventDate}
          />
          <Text style={styles.hint}>Format: YYYY-MM-DD</Text>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title (auto-generated)</Text>
          <TextInput
            style={styles.input}
            placeholder="Event title"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.label}>Duration (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Minutes (e.g., 90)"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            value={duration}
            onChangeText={setDuration}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add notes about this assessment..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <>
              <MaterialIcons name="add" size={20} color={colors.textPrimary} />
              <Text style={styles.submitButtonText}>Add Event</Text>
            </>
          )}
        </Pressable>
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
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
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
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  subjectScroll: {
    gap: spacing.sm,
  },
  subjectChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  subjectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  subjectChipText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  subjectChipTextActive: {
    color: colors.textPrimary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: '30%',
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: colors.textPrimary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
});
