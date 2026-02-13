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
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCalendar } from '@/hooks/useCalendar';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';
import { supabase as supabaseClient } from '@/services/supabase.web';

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

  // Debug logs
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString('en-AU');
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }

  const eventTypes = [
    { value: 'SAC', label: 'SAC' },
    { value: 'Assessment', label: 'Assessment' },
    { value: 'Exam', label: 'Exam' },
    { value: 'MockExam', label: 'Mock Exam' },
    { value: 'GAT', label: 'GAT' },
  ];

  useEffect(() => {
    if (user) {
      addLog(`👤 User authenticated: ${user.id}`);
      addLog(`📧 User email: ${user.email}`);
      loadSubjects();
    } else {
      addLog('⚠️ No user found in useEffect');
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
    if (!user) {
      addLog('⚠️ updateTitleWithNumber: No user found');
      return;
    }

    addLog(`🔍 Getting next event number for: user=${user.id.substring(0, 8)}..., subject=${subjectId.substring(0, 8)}..., type=${type}`);

    try {
      const supabase = supabaseClient;
      
      // First, let's check how many events actually exist
      const { data: existingEvents, error: countError } = await supabase
        .from('vk_calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject_id', subjectId)
        .eq('event_type', type);

      addLog(`📊 Direct count query: ${existingEvents?.length || 0} events found`);
      if (existingEvents && existingEvents.length > 0) {
        addLog(`📝 Existing events: ${JSON.stringify(existingEvents.map(e => ({ title: e.title, date: e.event_date })))}`);
      }

      // Now call the RPC function
      const { data, error } = await supabase.rpc('get_next_event_number', {
        p_user_id: user.id,
        p_subject_id: subjectId,
        p_event_type: type,
      });

      if (error) {
        addLog(`❌ RPC Error: ${error.message}`);
        setTitle(`${subjectCode} ${type} 1`);
      } else {
        const nextNumber = data || 1;
        addLog(`🎯 RPC returned next number: ${nextNumber}`);
        setTitle(`${subjectCode} ${type} ${nextNumber}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 Exception in updateTitleWithNumber: ${errorMsg}`);
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

  function handleDateSelect(year: number, month: number, day: number) {
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    setEventDate(dateStr);
    const date = new Date(year, month - 1, day);
    setSelectedDate(date);
    setShowDatePicker(false);
  }

  function closeDatePicker() {
    setShowDatePicker(false);
  }

  function getCurrentYear() {
    return new Date().getFullYear();
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
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
    addLog('🚀 Submit button clicked');
    
    if (!selectedSubject || !eventDate) {
      addLog('❌ Validation failed: Missing subject or date');
      Alert.alert('Missing Information', 'Please select a subject and date');
      return;
    }

    addLog(`✅ Validation passed - Subject: ${selectedSubject}, Date: ${eventDate}`);
    
    const eventData = {
      subject_id: selectedSubject,
      event_date: eventDate,
      event_type: eventType,
      title: title || `${userSubjects.find(s => s.id === selectedSubject)?.code} ${eventType}`,
      notes: notes || undefined,
      duration_minutes: duration ? parseInt(duration) : undefined,
    };
    
    addLog(`📦 Preparing data: ${JSON.stringify(eventData, null, 2)}`);
    addLog(`👤 User ID: ${user?.id || 'NO USER'}`);

    setSubmitting(true);
    addLog('⏳ Calling addEvent service...');

    try {
      const { data, error } = await addEvent(eventData);
      
      addLog(`📥 Response received`);
      
      if (error) {
        addLog(`❌ Error: ${error}`);
        Alert.alert('Error', error);
      } else if (data) {
        addLog(`✅ Success! Event created with ID: ${data.id}`);
        Alert.alert('Success', 'Event added successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        addLog(`⚠️ No data and no error returned`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      addLog(`💥 Exception caught: ${errorMsg}`);
      Alert.alert('Exception', errorMsg);
    } finally {
      setSubmitting(false);
      addLog('✔️ Submit process completed');
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
          
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
            onRequestClose={closeDatePicker}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Date</Text>
                  <Pressable onPress={closeDatePicker}>
                    <MaterialIcons name="close" size={24} color={colors.textPrimary} />
                  </Pressable>
                </View>
                
                <SimpleDatePicker
                  selectedDate={selectedDate}
                  onSelectDate={handleDateSelect}
                />
              </View>
            </View>
          </Modal>
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

        {/* Debug Logs */}
        {debugLogs.length > 0 && (
          <View style={styles.debugSection}>
            <View style={styles.debugHeader}>
              <Text style={styles.debugTitle}>📋 Debug Logs</Text>
              <Pressable onPress={() => setDebugLogs([])}>
                <Text style={styles.debugClear}>Clear</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.debugScroll} nestedScrollEnabled>
              {debugLogs.map((log, index) => (
                <Text key={index} style={styles.debugLog}>
                  {log}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface SimpleDatePickerProps {
  selectedDate: Date;
  onSelectDate: (year: number, month: number, day: number) => void;
}

function SimpleDatePicker({ selectedDate, onSelectDate }: SimpleDatePickerProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(selectedDate.getFullYear() || currentYear);
  const [month, setMonth] = useState(selectedDate.getMonth() + 1 || 1);
  const [day, setDay] = useState(selectedDate.getDate() || 1);

  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);
  const months = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
  ];
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <View style={styles.pickerContent}>
      {/* Year */}
      <View style={styles.pickerSection}>
        <Text style={styles.pickerLabel}>Year</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickerScroll}
        >
          {years.map(y => (
            <Pressable
              key={y}
              style={[styles.pickerItem, year === y && styles.pickerItemActive]}
              onPress={() => setYear(y)}
            >
              <Text style={[styles.pickerItemText, year === y && styles.pickerItemTextActive]}>
                {y}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Month */}
      <View style={styles.pickerSection}>
        <Text style={styles.pickerLabel}>Month</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickerScroll}
        >
          {months.map(m => (
            <Pressable
              key={m.value}
              style={[styles.pickerItem, month === m.value && styles.pickerItemActive]}
              onPress={() => setMonth(m.value)}
            >
              <Text style={[styles.pickerItemText, month === m.value && styles.pickerItemTextActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Day */}
      <View style={styles.pickerSection}>
        <Text style={styles.pickerLabel}>Day</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickerScroll}
        >
          {days.map(d => (
            <Pressable
              key={d}
              style={[styles.pickerItem, day === d && styles.pickerItemActive]}
              onPress={() => setDay(d)}
            >
              <Text style={[styles.pickerItemText, day === d && styles.pickerItemTextActive]}>
                {d}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Pressable
        style={styles.confirmButton}
        onPress={() => onSelectDate(year, month, day)}
      >
        <Text style={styles.confirmButtonText}>Confirm Date</Text>
      </Pressable>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  pickerContent: {
    padding: spacing.md,
  },
  pickerSection: {
    marginBottom: spacing.lg,
  },
  pickerLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  pickerScroll: {
    gap: spacing.sm,
  },
  pickerItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 60,
    alignItems: 'center',
  },
  pickerItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerItemText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  pickerItemTextActive: {
    color: colors.textPrimary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  confirmButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  debugSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  debugTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  debugClear: {
    fontSize: typography.bodySmall,
    color: colors.primary,
  },
  debugScroll: {
    maxHeight: 300,
  },
  debugLog: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
});
