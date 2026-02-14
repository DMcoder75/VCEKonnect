import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, typography } from '@/constants/theme';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingSpinner({ message, size = 'large' }: LoadingSpinnerProps) {
  const spinnerSize = size === 'large' ? 80 : 60;
  const fontSize = size === 'large' ? 14 : 12;

  return (
    <View style={styles.container}>
      <View style={[styles.spinnerWrapper, { width: spinnerSize, height: spinnerSize }]}>
        <ActivityIndicator size={size} color={colors.primary} />
        <View style={styles.textOverlay}>
          <Text style={[styles.brandText, { fontSize }]}>FairPrep</Text>
        </View>
      </View>
      {message && <Text style={styles.messageText}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  spinnerWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
});
