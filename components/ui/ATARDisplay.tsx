import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

interface ATARDisplayProps {
  atar: number;
  size?: 'small' | 'large';
}

export function ATARDisplay({ atar, size = 'large' }: ATARDisplayProps) {
  const getColor = () => {
    if (atar >= 90) return colors.atarHigh;
    if (atar >= 70) return colors.atarMid;
    return colors.atarLow;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.atar, size === 'small' && styles.atarSmall, { color: getColor() }]}>
        {atar > 0 ? atar.toFixed(2) : '--'}
      </Text>
      <Text style={[styles.label, size === 'small' && styles.labelSmall]}>
        Predicted ATAR
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  atar: {
    fontSize: 48,
    fontWeight: typography.bold,
    color: colors.atarHigh,
  },
  atarSmall: {
    fontSize: 28,
  },
  label: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontWeight: typography.medium,
  },
  labelSmall: {
    fontSize: typography.caption,
  },
});
