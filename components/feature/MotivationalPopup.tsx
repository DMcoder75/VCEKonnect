import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { BlurView } from 'expo-blur';

interface MotivationalMessage {
  icon: string;
  iconColor: string;
  title: string;
  message: string;
  type: 'urgent' | 'warning' | 'success' | 'info' | 'quote';
}

interface MotivationalPopupProps {
  visible: boolean;
  message: MotivationalMessage;
  onDismiss: () => void;
}

export function MotivationalPopup({ visible, message, onDismiss }: MotivationalPopupProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <BlurView intensity={20} style={styles.blurContainer}>
          <Pressable style={styles.popup} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.iconContainer, { backgroundColor: message.iconColor + '20' }]}>
              <MaterialIcons name={message.icon as any} size={40} color={message.iconColor} />
            </View>
            
            <Text style={styles.title}>{message.title}</Text>
            <Text style={styles.message}>{message.message}</Text>
            
            <Pressable style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissText}>Got it!</Text>
            </Pressable>
          </Pressable>
        </BlurView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  blurContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  popup: {
    backgroundColor: colors.surfaceElevated + 'E6', // 90% opacity
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  dismissButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 120,
  },
  dismissText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.background,
    textAlign: 'center',
  },
});
