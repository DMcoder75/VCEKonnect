import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`]]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  
  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  
  // Sizes
  small: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  medium: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  large: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  
  // States
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  fullWidth: {
    width: '100%',
  },
  
  // Text
  text: {
    fontWeight: typography.semibold,
  },
  primaryText: {
    color: colors.textPrimary,
    fontSize: typography.body,
  },
  secondaryText: {
    color: colors.textPrimary,
    fontSize: typography.body,
  },
  outlineText: {
    color: colors.primary,
    fontSize: typography.body,
  },
  smallText: {
    fontSize: typography.bodySmall,
  },
  mediumText: {
    fontSize: typography.body,
  },
  largeText: {
    fontSize: typography.h3,
  },
});
