import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { CalendarEvent } from '@/services/calendarService';

interface UpcomingAssessmentCardProps {
  event: CalendarEvent;
  index: number;
  onComplete: (eventId: string) => void;
  onUpdateScore?: (eventId: string, scoreAchieved: number, scoreTotal: number) => void;
  onPress?: (event: CalendarEvent) => void;
}

export function UpcomingAssessmentCard({
  event,
  index,
  onComplete,
  onUpdateScore,
  onPress,
}: UpcomingAssessmentCardProps) {
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreAchieved, setScoreAchieved] = useState(event.score_achieved?.toString() || '');
  const [scoreTotal, setScoreTotal] = useState(event.score_total?.toString() || '');
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

  const handleCheckPress = () => {
    if (event.is_completed) {
      // Already completed - just toggle off
      onComplete(event.id);
    } else {
      // Not completed - show score modal
      setShowScoreModal(true);
    }
  };

  const handleScoreSubmit = () => {
    const achieved = parseFloat(scoreAchieved);
    const total = parseFloat(scoreTotal);

    if (scoreAchieved && scoreTotal) {
      if (isNaN(achieved) || isNaN(total)) {
        Alert.alert('Invalid Score', 'Please enter valid numbers');
        return;
      }
      if (achieved > total) {
        Alert.alert('Invalid Score', 'Score achieved cannot be greater than total');
        return;
      }
      if (achieved < 0 || total <= 0) {
        Alert.alert('Invalid Score', 'Please enter positive numbers');
        return;
      }

      // Save score
      onUpdateScore?.(event.id, achieved, total);
      
      // Only mark complete if not already completed
      if (!event.is_completed) {
        onComplete(event.id);
      }
    } else {
      // No score entered
      if (!event.is_completed) {
        // If not complete, mark complete
        onComplete(event.id);
      } else {
        // If already complete, just close modal
        Alert.alert('No Score Entered', 'Please enter a score or click Cancel');
        return;
      }
    }
    
    setShowScoreModal(false);
  };

  const handleAddScore = (e: any) => {
    e.stopPropagation();
    setShowScoreModal(true);
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

      <View style={styles.actionsContainer}>
        {event.is_completed && event.score_percentage !== undefined && event.score_percentage !== null && (
          <View style={styles.scoreChip}>
            <Text style={styles.scoreText}>{event.score_percentage.toFixed(0)}%</Text>
          </View>
        )}
        
        {event.is_completed && !event.score_achieved && (
          <Pressable style={styles.addScoreButton} onPress={handleAddScore}>
            <MaterialIcons name="add" size={16} color={colors.primary} />
            <Text style={styles.addScoreText}>Score</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.checkButton}
          onPress={(e) => {
            e.stopPropagation();
            handleCheckPress();
          }}
        >
          <MaterialIcons
            name={event.is_completed ? 'check-circle' : 'radio-button-unchecked'}
            size={24}
            color={event.is_completed ? colors.success : colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Score Entry Modal */}
      <Modal
        visible={showScoreModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowScoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Score</Text>
              <Pressable onPress={() => setShowScoreModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.modalEventTitle}>{event.title}</Text>

            <View style={styles.scoreInputContainer}>
              <View style={styles.scoreInputWrapper}>
                <Text style={styles.inputLabel}>Score Achieved</Text>
                <TextInput
                  style={styles.scoreInput}
                  placeholder="e.g., 45"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={scoreAchieved}
                  onChangeText={setScoreAchieved}
                />
              </View>

              <Text style={styles.scoreDivider}>/</Text>

              <View style={styles.scoreInputWrapper}>
                <Text style={styles.inputLabel}>Total Score</Text>
                <TextInput
                  style={styles.scoreInput}
                  placeholder="e.g., 50"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={scoreTotal}
                  onChangeText={setScoreTotal}
                />
              </View>
            </View>

            <Text style={styles.scoreHint}>
              Optional: You can add your score now or skip and add it later
            </Text>

            <View style={styles.modalActions}>
              {!event.is_completed && (
                <Pressable
                  style={[styles.modalButton, styles.skipButton]}
                  onPress={() => {
                    onComplete(event.id);
                    setShowScoreModal(false);
                  }}
                >
                  <Text style={styles.skipButtonText}>Skip & Mark Complete</Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleScoreSubmit}
              >
                <Text style={styles.submitButtonText}>
                  {event.is_completed ? 'Update Score' : 'Save Score'}
                </Text>
              </Pressable>

              {event.is_completed && (
                <Pressable
                  style={[styles.modalButton, styles.skipButton]}
                  onPress={() => setShowScoreModal(false)}
                >
                  <Text style={styles.skipButtonText}>Cancel</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
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
    color: colors.textPrimary,
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
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreChip: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  addScoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  addScoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  modalEventTitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  scoreInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  scoreInputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  scoreInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  scoreDivider: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textSecondary,
    marginTop: 20,
  },
  scoreHint: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalActions: {
    gap: spacing.sm,
  },
  modalButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
});
