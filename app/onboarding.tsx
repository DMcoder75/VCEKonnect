import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { CAREER_PATHS } from '@/constants/vceData';
import { getAllVCESubjects, getSubjectCategories, VCESubject } from '@/services/vceSubjectsService';
import { updateUserSubjects } from '@/services/userSubjectsService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  
  const [step, setStep] = useState(1);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [targetCareer, setTargetCareer] = useState<string>('');
  const [yearLevel, setYearLevel] = useState<11 | 12>(12);
  const [allSubjects, setAllSubjects] = useState<VCESubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    setIsLoading(true);
    const subjects = await getAllVCESubjects();
    setAllSubjects(subjects);
    setIsLoading(false);
  }

  function toggleSubject(subjectId: string) {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  }

  async function handleComplete() {
    if (!user) return;
    
    // Update user subjects in database
    await updateUserSubjects(user.id, selectedSubjects);
    
    // Update user profile
    await updateProfile({
      targetCareer,
      yearLevel,
    });
    
    router.replace('/(tabs)');
  }

  const subjectsByCategory = allSubjects.reduce((acc, subject) => {
    if (!acc[subject.category]) acc[subject.category] = [];
    acc[subject.category].push(subject);
    return acc;
  }, {} as Record<string, VCESubject[]>);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
        <Text style={styles.stepText}>Step {step} of 3</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <View>
            <Text style={styles.title}>What year level are you?</Text>
            <Text style={styles.description}>This helps us personalise your experience</Text>
            
            <View style={styles.yearSelector}>
              <Pressable
                style={[styles.yearCard, yearLevel === 11 && styles.yearCardSelected]}
                onPress={() => setYearLevel(11)}
              >
                <Text style={[styles.yearText, yearLevel === 11 && styles.yearTextSelected]}>
                  Year 11
                </Text>
              </Pressable>
              <Pressable
                style={[styles.yearCard, yearLevel === 12 && styles.yearCardSelected]}
                onPress={() => setYearLevel(12)}
              >
                <Text style={[styles.yearText, yearLevel === 12 && styles.yearTextSelected]}>
                  Year 12
                </Text>
              </Pressable>
            </View>
            
            <Button title="Next" onPress={() => setStep(2)} fullWidth />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.title}>Select your VCE subjects</Text>
            <Text style={styles.description}>
              Choose all subjects you're currently studying
            </Text>
            
            {Object.entries(subjectsByCategory).map(([category, subjects]) => (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                <View style={styles.subjectGrid}>
                  {subjects.map(subject => (
                    <Pressable
                      key={subject.id}
                      style={[
                        styles.subjectCard,
                        selectedSubjects.includes(subject.id) && styles.subjectCardSelected,
                      ]}
                      onPress={() => toggleSubject(subject.id)}
                    >
                      {selectedSubjects.includes(subject.id) && (
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color={colors.success}
                          style={styles.checkIcon}
                        />
                      )}
                      <Text style={[
                        styles.subjectName,
                        selectedSubjects.includes(subject.id) && styles.subjectNameSelected,
                      ]}>
                        {subject.name}
                      </Text>
                      <Text style={styles.subjectCode}>{subject.code}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            
            <View style={styles.buttonRow}>
              <Button title="Back" onPress={() => setStep(1)} variant="outline" />
              <Button
                title="Next"
                onPress={() => setStep(3)}
                disabled={selectedSubjects.length === 0}
              />
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.title}>What's your dream career?</Text>
            <Text style={styles.description}>
              We'll show you the best uni pathways to get there
            </Text>
            
            {CAREER_PATHS.map(career => (
              <Pressable
                key={career.id}
                style={[
                  styles.careerCard,
                  targetCareer === career.id && styles.careerCardSelected,
                ]}
                onPress={() => setTargetCareer(career.id)}
              >
                <View style={styles.careerHeader}>
                  <View style={styles.careerTitleContainer}>
                    <Text style={[
                      styles.careerName,
                      targetCareer === career.id && styles.careerNameSelected,
                    ]}>
                      {career.name}
                    </Text>
                    <Text style={styles.careerCategory}>{career.category}</Text>
                  </View>
                  {targetCareer === career.id && (
                    <MaterialIcons name="check-circle" size={24} color={colors.success} />
                  )}
                </View>
                <Text style={styles.careerDesc}>{career.description}</Text>
                <Text style={styles.careerAtar}>Typical ATAR: {career.typicalATAR}+</Text>
              </Pressable>
            ))}
            
            <View style={styles.buttonRow}>
              <Button title="Back" onPress={() => setStep(2)} variant="outline" />
              <Button
                title="Get Started"
                onPress={handleComplete}
                disabled={!targetCareer}
              />
            </View>
          </View>
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
  header: {
    padding: spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  yearSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  yearCard: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  yearCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  yearText: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  yearTextSelected: {
    color: colors.primary,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  subjectCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minWidth: '30%',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  subjectCardSelected: {
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  checkIcon: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  subjectName: {
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: typography.medium,
  },
  subjectNameSelected: {
    color: colors.textPrimary,
  },
  subjectCode: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  careerCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  careerCardSelected: {
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  careerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  careerTitleContainer: {
    flex: 1,
  },
  careerName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  careerNameSelected: {
    color: colors.textPrimary,
  },
  careerCategory: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  careerDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  careerAtar: {
    fontSize: typography.caption,
    color: colors.primary,
    fontWeight: typography.medium,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
