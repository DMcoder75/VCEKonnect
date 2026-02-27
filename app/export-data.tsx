import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { useAlert } from '@/template';
import { exportUserData, ExportOptions } from '@/services/exportService';
import { LoadingSpinner } from '@/components/ui';
import { PremiumPaywall } from '@/components/feature';

export default function ExportDataScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { tier, limits, isLoading: isPremiumLoading } = usePremium();
  const { showAlert } = useAlert();
  
  const [includeStudySessions, setIncludeStudySessions] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeScores, setIncludeScores] = useState(true);
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  async function handleExport() {
    if (!user) {
      showAlert('Error', 'Please log in to export data');
      return;
    }

    // Check premium access
    if (!limits.exportDataAccess) {
      setShowPaywall(true);
      return;
    }

    if (!includeStudySessions && !includeNotes && !includeScores) {
      showAlert('Warning', 'Please select at least one data type to export');
      return;
    }

    setIsExporting(true);
    
    const options: ExportOptions = {
      includeStudySessions,
      includeNotes,
      includeScores,
      format,
    };

    const result = await exportUserData(user.id, options);
    
    setIsExporting(false);

    if (result.success) {
      showAlert('Success', result.message);
    } else {
      showAlert('Error', result.message);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Export Data</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Premium Badge */}
        <View style={[
          styles.premiumBadge,
          tier === 'pro' && styles.premiumBadgePro,
          tier === 'basic' && styles.premiumBadgeBasic,
        ]}>
          <MaterialIcons name="workspace-premium" size={20} color={tier === 'free' ? colors.warning : colors.background} />
          <Text style={[
            styles.premiumText,
            tier !== 'free' && styles.premiumTextActive,
          ]}>
            {tier === 'pro' || tier === 'basic' ? 'Premium Feature Unlocked' : 'Premium Feature - Upgrade Required'}
          </Text>
        </View>

        {/* Locked Message for Free Tier */}
        {!limits.exportDataAccess && (
          <View style={styles.lockedCard}>
            <MaterialIcons name="lock" size={48} color={colors.warning} />
            <Text style={styles.lockedTitle}>Premium Feature</Text>
            <Text style={styles.lockedText}>
              Export Data is available in Basic ($20/6m) and Pro ($40/6m) plans. Upgrade to backup your study data and analyze it anywhere.
            </Text>
            <Pressable
              style={styles.upgradeButton}
              onPress={() => setShowPaywall(true)}
            >
              <MaterialIcons name="workspace-premium" size={20} color={colors.background} />
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </Pressable>
          </View>
        )}

        {/* Info Card */}
        {limits.exportDataAccess && (
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>About Data Export</Text>
            <Text style={styles.infoText}>
              Export your FairPrep data to keep a backup or analyze it elsewhere. 
              Choose what to include and your preferred format.
            </Text>
          </View>
        </View>
        )}

        {/* Data Selection - Only show if premium */}
        {limits.exportDataAccess && (
        <>
        <Text style={styles.sectionTitle}>Select Data to Export</Text>
        
        <View style={styles.optionCard}>
          <View style={styles.optionHeader}>
            <MaterialIcons name="schedule" size={24} color={colors.primary} />
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Study Sessions</Text>
              <Text style={styles.optionDesc}>All your study time records by subject</Text>
            </View>
          </View>
          <Switch
            value={includeStudySessions}
            onValueChange={setIncludeStudySessions}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>

        <View style={styles.optionCard}>
          <View style={styles.optionHeader}>
            <MaterialIcons name="note" size={24} color={colors.success} />
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Notes</Text>
              <Text style={styles.optionDesc}>All your subject notes with tags</Text>
            </View>
          </View>
          <Switch
            value={includeNotes}
            onValueChange={setIncludeNotes}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>

        <View style={styles.optionCard}>
          <View style={styles.optionHeader}>
            <MaterialIcons name="assessment" size={24} color={colors.warning} />
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>ATAR Scores</Text>
              <Text style={styles.optionDesc}>SAC averages and exam predictions</Text>
            </View>
          </View>
          <Switch
            value={includeScores}
            onValueChange={setIncludeScores}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>

        {/* Format Selection */}
        <Text style={styles.sectionTitle}>Export Format</Text>
        
        <View style={styles.formatButtons}>
          <Pressable
            style={[styles.formatButton, format === 'pdf' && styles.formatButtonActive]}
            onPress={() => setFormat('pdf')}
          >
            <MaterialIcons 
              name="picture-as-pdf" 
              size={24} 
              color={format === 'pdf' ? colors.background : colors.textSecondary} 
            />
            <Text style={[styles.formatText, format === 'pdf' && styles.formatTextActive]}>
              PDF
            </Text>
            <Text style={[styles.formatDesc, format === 'pdf' && styles.formatDescActive]}>
              Professional report, best for sharing
            </Text>
          </Pressable>

          <Pressable
            style={[styles.formatButton, format === 'json' && styles.formatButtonActive]}
            onPress={() => setFormat('json')}
          >
            <MaterialIcons 
              name="code" 
              size={24} 
              color={format === 'json' ? colors.background : colors.textSecondary} 
            />
            <Text style={[styles.formatText, format === 'json' && styles.formatTextActive]}>
              JSON
            </Text>
            <Text style={[styles.formatDesc, format === 'json' && styles.formatDescActive]}>
              Structured data, best for backups
            </Text>
          </Pressable>

          <Pressable
            style={[styles.formatButton, format === 'csv' && styles.formatButtonActive]}
            onPress={() => setFormat('csv')}
          >
            <MaterialIcons 
              name="table-chart" 
              size={24} 
              color={format === 'csv' ? colors.background : colors.textSecondary} 
            />
            <Text style={[styles.formatText, format === 'csv' && styles.formatTextActive]}>
              CSV
            </Text>
            <Text style={[styles.formatDesc, format === 'csv' && styles.formatDescActive]}>
              Spreadsheet format, easy to analyze
            </Text>
          </Pressable>
        </View>

        {/* Export Button */}
        <Pressable
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <MaterialIcons name="hourglass-empty" size={24} color={colors.background} />
              <Text style={styles.exportButtonText}>Exporting...</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="file-download" size={24} color={colors.background} />
              <Text style={styles.exportButtonText}>Export Data</Text>
            </>
          )}
        </Pressable>

        {/* Privacy Notice */}
        <View style={styles.privacyCard}>
          <MaterialIcons name="lock-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.privacyText}>
            Your data is exported locally to your device. FairPrep does not send your data to external servers.
          </Text>
        </View>
        </>
        )}
      </ScrollView>

      {/* Premium Paywall */}
      <PremiumPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Export Data"
        description="Backup your study data and analyze it anywhere with full data export in JSON or CSV format"
        requiredTier="basic"
        currentTier={tier}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  headerPlaceholder: {
    width: 40,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  optionDesc: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formatButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  formatButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  formatButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  formatText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  formatTextActive: {
    color: colors.background,
  },
  formatDesc: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  formatDescActive: {
    color: colors.background,
    opacity: 0.8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.background,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  privacyText: {
    flex: 1,
    fontSize: typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  premiumBadgeBasic: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  premiumBadgePro: {
    backgroundColor: colors.premium,
    borderColor: colors.premium,
  },
  premiumText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.warning,
  },
  premiumTextActive: {
    color: colors.background,
  },
  lockedCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.warning,
    marginBottom: spacing.lg,
  },
  lockedTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  lockedText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  upgradeButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.background,
  },
});
