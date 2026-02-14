import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useATAR } from '@/hooks/useATAR';
import { getPathwaySuggestions, getBackupCareerSuggestions } from '@/services/pathwayService';
import { PathwayCourseCard } from '@/components/feature';
import { CAREER_PATHS } from '@/constants/vceData';
import { updateUserProfile } from '@/services/authService';

export default function PathwayScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getPrediction } = useATAR();
  const [isSelectingCareer, setIsSelectingCareer] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState(user?.targetCareer || '');
  
  const prediction = getPrediction();
  const targetCareer = selectedCareer || user?.targetCareer || 'medicine';
  const pathway = getPathwaySuggestions(targetCareer, prediction.atar);
  const backups = getBackupCareerSuggestions(prediction.atar, [targetCareer]);

  const career = CAREER_PATHS.find(c => c.id === targetCareer);

  async function handleSaveCareer(careerId: string) {
    if (!user) return;
    setSelectedCareer(careerId);
    await updateUserProfile(user.id, { target_career: careerId });
    setIsSelectingCareer(false);
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
          <View style={styles.headerPlaceholder} />
          <Text style={styles.title}>Uni Pathway</Text>
          <Pressable
            style={styles.settingsButton}
            onPress={() => setIsSelectingCareer(!isSelectingCareer)}
          >
            <MaterialIcons name="settings" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Career Selection */}
        {isSelectingCareer ? (
          <View style={styles.selectionContainer}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>Select Your Dream Career</Text>
              <Pressable onPress={() => setIsSelectingCareer(false)}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            {CAREER_PATHS.map(careerOption => (
              <Pressable
                key={careerOption.id}
                style={[
                  styles.careerOption,
                  selectedCareer === careerOption.id && styles.careerOptionActive,
                ]}
                onPress={() => handleSaveCareer(careerOption.id)}
              >
                <View style={styles.careerOptionContent}>
                  <Text style={[
                    styles.careerOptionName,
                    selectedCareer === careerOption.id && styles.careerOptionNameActive,
                  ]}>
                    {careerOption.name}
                  </Text>
                  <Text style={styles.careerOptionDesc}>{careerOption.description}</Text>
                  <Text style={styles.careerOptionAtar}>
                    Typical ATAR: {careerOption.typicalATAR}
                  </Text>
                </View>
                {selectedCareer === careerOption.id && (
                  <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        ) : (
          <>
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
          </>
        )}
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
    paddingHorizontal: spacing.md,
  },
  headerPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  careerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  careerOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  careerOptionContent: {
    flex: 1,
  },
  careerOptionName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  careerOptionNameActive: {
    color: colors.primary,
  },
  careerOptionDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  careerOptionAtar: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
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
