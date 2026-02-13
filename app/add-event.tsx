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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCalendar } from '@/hooks/useCalendar';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';
import { getSupabaseClient } from '@/services/supabase.web';

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
  const [eventType, setEventType] = useState<'SAC' | 'Assessment' | 'Exam' | 'MockExam' | 'GAT'>('SAC');
  const [eventDate, setEventDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');

  const eventTypes = [
    { value: 'SAC', label: 'SAC' },
    { value: 'Assessment', label: 'Assessment' },
    { value: 'Exam', label: 'Exam' },
    { value: 'MockExam', label: 'Mock Exam' },
    { value: 'GAT', label: 'GAT' },
  ];

  useEffect(() => {
    if (user) {
      loadSubjects();
    }
  }, [user]);

  async function loadSubjects() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const subjects = await getUserSubjects(user.id);
      setUserSubjects(subjects);
      if (subjects.length > 0) {
        setSelectedSubject(subjects[0].id);
        await updateTitleWithNumber(subjects[0].id, subjects[0].code, eventType);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      Alert.alert('Error', 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }

  async function updateTitleWithNumber(subjectId: string, subjectCode: string, type: string) {
    if (!user) return;

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('get_next_event_number', {
        p_user_id: user.id,
        p_subject_id: subjectId,
        p_event_type: type,
      });

      if (error) {
        console.error('Error getting next event number:', error);
        setTitle(`${subjectCode} ${type} 1`);
      } else {
        const nextNumber = data || 1;
        setTitle(`${subjectCode} ${type} ${nextNumber}`);
      }
    } catch (error) {
      console.error('Error in updateTitleWithNumber:', error);
      setTitle(`${subjectCode} ${type} 1`);
    }
  }

  async function handleSubjectChange(subjectId: string) {
    setSelectedSubject(subjectId);
    const subject = userSubjects.find(s => s.id === subjectId);
    if (subject) {
      await updateTitleWithNumber(subjectId, subject.code, eventType);
    }
  }

  async function handleEventTypeChange(type: typeof eventType) {
    setEventType(type);
    const subject = userSubjects.find(s => s.id === selectedSubject);
    if (subject) {
      await updateTitleWithNumber(selectedSubject, subject.code, type);
    }
  }

  function handleDateChange(event: any, date?: Date) {
    const currentDate = date || selectedDate;
    
    // On Android, check if user dismissed or confirmed
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      
      // Only update if user confirmed (event.type === 'set')
      if (event.type === 'dismissed') {
        return;
      }
    }
    
    // Update the selected date and formatted string
    setSelectedDate(currentDate);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    setEventDate(`${year}-${month}-${day}`);
  }

  function formatDateDisplay(dateString: string): string {
    if (!dateString) return 'Select date';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
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
          <Pressable
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialIcons name="event" size={20} color={colors.textSecondary} />
            <Text style={styles.datePickerText}>
              {formatDateDisplay(eventDate)}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
              themeVariant="dark"
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <Pressable
              style={styles.datePickerDone}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerDoneText}>Done</Text>
            </Pressable>
          )}
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title (editable)</Text>
          <TextInput
            style={styles.input}
            placeholder="Event title"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
          <Text style={styles.hint}>Auto-generated, but you can edit it</Text>
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
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  datePickerText: {
    flex: 1,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  datePickerDone: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  datePickerDoneText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
});
