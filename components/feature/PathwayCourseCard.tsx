import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface PathwayCourseCardProps {
  universityName: string;
  courseName: string;
  atar: number;
  isEligible: boolean;
  prerequisites: string[];
  pathway?: string;
  onPress?: () => void;
}

export function PathwayCourseCard({
  universityName,
  courseName,
  atar,
  isEligible,
  prerequisites,
  pathway,
  onPress,
}: PathwayCourseCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isEligible && styles.cardEligible,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.university}>{universityName}</Text>
          <Text style={styles.course}>{courseName}</Text>
        </View>
        {isEligible && (
          <MaterialIcons name="check-circle" size={24} color={colors.success} />
        )}
      </View>

      <View style={styles.atarContainer}>
        <Text style={styles.atarLabel}>Required ATAR:</Text>
        <Text style={[styles.atarValue, isEligible && styles.atarEligible]}>
          {atar.toFixed(2)}
        </Text>
      </View>

      {prerequisites.length > 0 && (
        <View style={styles.prerequisites}>
          <Text style={styles.prereqLabel}>Prerequisites:</Text>
          <Text style={styles.prereqText}>{prerequisites.join(', ')}</Text>
        </View>
      )}

      {pathway && (
        <View style={styles.pathway}>
          <MaterialIcons name="info-outline" size={14} color={colors.primary} />
          <Text style={styles.pathwayText}>{pathway}</Text>
        </View>
      )}
    </Pressable>
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
  cardEligible: {
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  cardPressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  university: {
    fontSize: typography.bodySmall,
    color: colors.primary,
    fontWeight: typography.semibold,
    marginBottom: 2,
  },
  course: {
    fontSize: typography.body,
    color: colors.textPrimary,
    fontWeight: typography.semibold,
  },
  atarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  atarLabel: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  atarValue: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  atarEligible: {
    color: colors.success,
  },
  prerequisites: {
    marginTop: spacing.xs,
  },
  prereqLabel: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  prereqText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  pathway: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pathwayText: {
    fontSize: typography.caption,
    color: colors.primary,
    fontStyle: 'italic',
    flex: 1,
  },
});
