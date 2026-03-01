import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { VersionStatus, getCurrentAppVersion, openAppStore } from '@/services/versionService';
import { Button } from '@/components';

interface VersionCheckModalProps {
  versionStatus: VersionStatus;
  onDismiss?: () => void;
}

export function VersionCheckModal({ versionStatus, onDismiss }: VersionCheckModalProps) {
  const { updateRequired, updateAvailable, latestVersion, releaseNotes, updateUrl } = versionStatus;
  
  // Don't show modal if no update needed
  if (!updateRequired && !updateAvailable) {
    return null;
  }

  const currentVersion = getCurrentAppVersion();
  const canDismiss = !updateRequired;

  const handleUpdate = () => {
    openAppStore(updateUrl);
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={canDismiss ? onDismiss : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Close button - only if update is optional */}
          {canDismiss && onDismiss && (
            <Pressable style={styles.closeButton} onPress={onDismiss}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          )}

          {/* Icon */}
          <View style={[
            styles.iconContainer,
            updateRequired ? styles.iconContainerRequired : styles.iconContainerOptional
          ]}>
            <MaterialIcons 
              name={updateRequired ? 'warning' : 'info'} 
              size={36} 
              color={updateRequired ? colors.warning : colors.primary} 
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {updateRequired ? 'Update Required' : 'Update Available'}
          </Text>

          {/* Version Info */}
          <View style={styles.versionInfo}>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Current Version:</Text>
              <Text style={styles.versionValue}>{currentVersion}</Text>
            </View>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Latest Version:</Text>
              <Text style={[styles.versionValue, styles.versionLatest]}>{latestVersion}</Text>
            </View>
          </View>

          {/* Message */}
          <Text style={styles.message}>
            {updateRequired
              ? 'A critical update is required to continue using FairPrep. Please update to the latest version to access new features and improvements.'
              : 'A new version of FairPrep is available with improvements and new features. Update now for the best experience.'}
          </Text>

          {/* Release Notes */}
          {releaseNotes && (
            <ScrollView style={styles.releaseNotesContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.releaseNotesTitle}>What's New:</Text>
              <Text style={styles.releaseNotes}>{releaseNotes}</Text>
            </ScrollView>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Update Now"
              onPress={handleUpdate}
              fullWidth
              icon="system-update"
            />
            
            {canDismiss && onDismiss && (
              <Pressable style={styles.laterButton} onPress={onDismiss}>
                <Text style={styles.laterButtonText}>Maybe Later</Text>
              </Pressable>
            )}
          </View>

          {/* Required Update Warning */}
          {updateRequired && (
            <View style={styles.warningBox}>
              <MaterialIcons name="lock" size={16} color={colors.warning} />
              <Text style={styles.warningText}>
                You must update to continue using the app
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
    zIndex: 1,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  iconContainerRequired: {
    backgroundColor: `${colors.warning}20`,
  },
  iconContainerOptional: {
    backgroundColor: `${colors.primary}20`,
  },
  title: {
    fontSize: 18,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  versionInfo: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  versionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  versionValue: {
    fontSize: 13,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  versionLatest: {
    color: colors.success,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  releaseNotesContainer: {
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  releaseNotesTitle: {
    fontSize: 12,
    fontWeight: typography.semibold,
    color: colors.primary,
    marginBottom: 4,
  },
  releaseNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  actions: {
    gap: spacing.sm,
  },
  laterButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: typography.body,
    color: colors.textTertiary,
    fontWeight: typography.medium,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.warning}15`,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginTop: spacing.sm,
  },
  warningText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: typography.medium,
  },
});
