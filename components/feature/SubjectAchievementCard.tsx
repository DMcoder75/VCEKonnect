import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface SubjectAchievementCardProps {
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  reward?: string;
}

export function SubjectAchievementCard({
  name,
  description,
  icon,
  earnedAt,
  reward,
}: SubjectAchievementCardProps) {
  // Determine badge color based on achievement type
  const getColorForIcon = (iconName: string): string => {
    if (iconName.includes('cookie')) return '#D4A574';
    if (iconName.includes('fire')) return colors.warning;
    if (iconName.includes('cake')) return '#FFB6C1';
    if (iconName.includes('events')) return colors.premium;
    if (iconName.includes('star')) return '#FFD700';
    if (iconName.includes('ice') || iconName.includes('cream')) return '#87CEEB';
    if (iconName.includes('military')) return '#FFD700';
    return colors.primary;
  };

  const badgeColor = getColorForIcon(icon);

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: badgeColor + '20' }]}>
        <MaterialIcons name={icon as any} size={40} color={badgeColor} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.description}>{description}</Text>
        
        {reward && (
          <View style={styles.rewardBadge}>
            <MaterialIcons name="redeem" size={14} color={colors.warning} />
            <Text style={styles.rewardText}>{reward}</Text>
          </View>
        )}
        
        <Text style={styles.date}>
          {new Date(earnedAt).toLocaleDateString('en-AU', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning + '15',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  rewardText: {
    fontSize: typography.caption,
    color: colors.warning,
    fontWeight: typography.semibold,
  },
  date: {
    fontSize: 10,
    color: colors.textTertiary,
  },
});
