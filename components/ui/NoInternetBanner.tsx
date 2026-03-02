import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface NoInternetBannerProps {
  message?: string;
  onRetry?: () => void;
}

export function NoInternetBanner({ 
  message = 'No Internet connection! Please try after sometime!',
  onRetry 
}: NoInternetBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="wifi-off" size={32} color={colors.error} />
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <MaterialIcons name="refresh" size={20} color={colors.primary} />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  message: {
    fontSize: typography.body,
    color: colors.error,
    textAlign: 'center',
    fontWeight: typography.semibold,
    marginBottom: spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryText: {
    fontSize: typography.bodySmall,
    color: colors.primary,
    fontWeight: typography.semibold,
  },
});
