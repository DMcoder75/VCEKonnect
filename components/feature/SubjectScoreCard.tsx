import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { VCE_SUBJECTS } from '@/constants/vceData';

interface SubjectScoreCardProps {
  subjectId: string;
  sacAverage: number;
  examPrediction: number;
  predictedStudyScore: number;
  onPress?: () => void;
}

export function SubjectScoreCard({
  subjectId,
  sacAverage,
  examPrediction,
  predictedStudyScore,
}: SubjectScoreCardProps) {
  const subject = VCE_SUBJECTS.find(s => s.id === subjectId);

  const getScoreColor = (score: number) => {
    if (score >= 40) return colors.atarHigh;
    if (score >= 30) return colors.atarMid;
    return colors.atarLow;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectName}>{subject?.name || subjectId}</Text>
          <Text style={styles.subjectCode}>{subject?.code || ''}</Text>
        </View>
        <View style={styles.scoreCircle}>
          <Text style={[styles.studyScore, { color: getScoreColor(predictedStudyScore) }]}>
            {predictedStudyScore.toFixed(1)}
          </Text>
          <Text style={styles.scoreLabel}>Study Score</Text>
        </View>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <MaterialIcons name="assessment" size={16} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>SAC Average:</Text>
          <Text style={styles.detailValue}>{sacAverage}%</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="school" size={16} color={colors.textSecondary} />
          <Text style={styles.detailLabel}>Exam Prediction:</Text>
          <Text style={styles.detailValue}>{examPrediction}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  subjectCode: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  scoreCircle: {
    alignItems: 'center',
  },
  studyScore: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
  },
  scoreLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  details: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
});
