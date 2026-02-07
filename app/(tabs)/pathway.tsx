import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useATAR } from '@/hooks/useATAR';
import { getPathwaySuggestions, getBackupCareerSuggestions } from '@/services/pathwayService';
import { PathwayCourseCard } from '@/components/feature';
import { CAREER_PATHS } from '@/constants/vceData';

export default function PathwayScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getPrediction } = useATAR();
  
  const prediction = getPrediction();
  const targetCareer = user?.targetCareer || 'medicine';
  const pathway = getPathwaySuggestions(targetCareer, prediction.atar);
  const backups = getBackupCareerSuggestions(prediction.atar, [targetCareer]);

  const career = CAREER_PATHS.find(c => c.id === targetCareer);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Uni Pathway</Text>
          <MaterialIcons name="school" size={32} color={colors.primary} />
        </View>

        {/* Career Target */}
        <View style={styles.careerCard}>
          <Text style={styles.careerLabel}>Your Dream Career</Text>
          <Text style={styles.careerName}>{career?.name || 'Not Set'}</Text>
          <Text style={styles.careerDesc}>{career?.description || ''}</Text>
          <View style={styles.atarRequirement}>
            <Text style={styles.atarLabel}>Typical ATAR Required:</Text>
            <Text style={[
              styles.atarValue,
              prediction.atar >= (career?.typicalATAR || 0) ? { color: colors.success } : { color: colors.warning }
            ]}>
              {career?.typicalATAR.toFixed(0) || '--'}
            </Text>
          </View>
        </View>

        {/* Pathway Courses */}
        {pathway && (
          <>
            <Text style={styles.sectionTitle}>Available Pathways</Text>
            <Text style={styles.sectionDesc}>
              Based on your predicted ATAR: {prediction.atar.toFixed(2)}
            </Text>

            {pathway.courses.map(course => (
              <PathwayCourseCard
                key={course.id}
                universityName={course.universityName}
                courseName={course.courseName}
                atar={course.atar}
                isEligible={course.isEligible}
                prerequisites={course.prerequisites}
                pathway={course.pathway}
              />
            ))}
          </>
        )}

        {/* Backup Careers */}
        {backups.length > 0 && prediction.atar < (career?.typicalATAR || 0) && (
          <>
            <Text style={styles.sectionTitle}>Alternative Careers</Text>
            <Text style={styles.sectionDesc}>
              Consider these careers within your ATAR range
            </Text>

            {backups.map(backup => (
              <View key={backup.id} style={styles.backupCard}>
                <Text style={styles.backupName}>{backup.name}</Text>
                <Text style={styles.backupDesc}>{backup.description}</Text>
                <Text style={styles.backupAtar}>
                  Typical ATAR: {backup.typicalATAR}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            ATAR cutoffs change yearly based on demand. 
            Check VTAC for the latest official requirements.
          </Text>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  careerCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  careerLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  careerName: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  careerDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  atarRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  atarLabel: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  atarValue: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  backupCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backupName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  backupDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  backupAtar: {
    fontSize: typography.caption,
    color: colors.primary,
    marginTop: spacing.sm,
    fontWeight: typography.medium,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
