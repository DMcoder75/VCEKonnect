import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { CAREER_PATHS } from '@/constants/vceData';
import { getAllStates, getSubjectsByState, VCESubject, AustralianState } from '@/services/vceSubjectsService';
import { updateUserSubjects } from '@/services/userSubjectsService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading, updateProfile, refreshSubjects } = useAuth();
  
  // Authentication guard - redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      console.log('⚠️ Onboarding: User not authenticated -> redirecting to login');
      router.replace('/auth/login');
    }
  }, [user, isLoading]);
  
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [targetCareer, setTargetCareer] = useState<string>('');
  const [yearLevel, setYearLevel] = useState<11 | 12>(12);
  const [allStates, setAllStates] = useState<AustralianState[]>([]);
  const [allSubjects, setAllSubjects] = useState<VCESubject[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // DEBUG LOG STATE (TEMPORARY)
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  useEffect(() => {
    loadStates();
  }, []);

  useEffect(() => {
    if (selectedState) {
      loadSubjects();
    }
  }, [selectedState]);

  async function loadStates() {
    setIsLoadingData(true);
    setDebugLogs([]); // Clear previous logs
    addDebugLog('🚀 ONBOARDING: Loading states...');
    addDebugLog(`📍 Supabase URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL || 'MISSING'}`);
    
    try {
      addDebugLog('📍 Calling getAllStates() service...');
      const states = await getAllStates();
      addDebugLog(`✅ Loaded ${states.length} states`);
      
      if (states.length > 0) {
        addDebugLog(`✅ First state: ${JSON.stringify(states[0])}`);
      } else {
        addDebugLog('⚠️ WARNING: No states returned from database!');
      }
      
      setAllStates(states);
      addDebugLog('✅ States set successfully');
    } catch (error: any) {
      addDebugLog(`❌ FAILED to load states!`);
      addDebugLog(`❌ Error: ${error.message || error}`);
      addDebugLog(`❌ Error type: ${error.constructor.name}`);
      if (error.stack) {
        addDebugLog(`❌ Stack: ${error.stack.substring(0, 200)}`);
      }
    } finally {
      setIsLoadingData(false);
      addDebugLog('🏁 loadStates() finished');
    }
  }

  async function loadSubjects() {
    if (!selectedState) return;
    setIsLoadingData(true);
    const subjects = await getSubjectsByState(selectedState);
    setAllSubjects(subjects);
    setIsLoadingData(false);
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
    
    // Update user profile with state_id, career, and year level
    await updateProfile({
      state_id: selectedState,
      targetCareer,
      yearLevel,
    });
    
    // CRITICAL: Refresh subjects cache immediately so settings page sees them
    await refreshSubjects();
    
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
          <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
        </View>
        <Text style={styles.stepText}>Step {step} of {totalSteps}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <View>
            <Text style={styles.title}>Select your state</Text>
            <Text style={styles.description}>Choose your Australian state or territory</Text>
            
            {/* DEBUG LOG AREA (TEMPORARY) */}
            {debugLogs.length > 0 && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>🔍 DEBUG LOGS (TEMP)</Text>
                <ScrollView style={styles.debugScroll} nestedScrollEnabled>
                  {debugLogs.map((log, index) => (
                    <Text key={index} style={styles.debugLog}>
                      {log}
                    </Text>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {isLoadingData ? (
              <View style={styles.loadingContainer}>
                <MaterialIcons name="hourglass-empty" size={48} color={colors.textTertiary} />
                <Text style={styles.loadingText}>Loading states...</Text>
              </View>
            ) : (
              <View style={styles.stateGrid}>
                {allStates.map(state => (
                  <Pressable
                    key={state.id}
                    style={[
                      styles.stateCard,
                      selectedState === state.id && styles.stateCardSelected,
                    ]}
                    onPress={() => setSelectedState(state.id)}
                  >
                    {selectedState === state.id && (
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color={colors.success}
                        style={styles.stateCheckIcon}
                      />
                    )}
                    <Text style={[
                      styles.stateAbbr,
                      selectedState === state.id && styles.stateAbbrSelected,
                    ]}>
                      {state.abbreviation}
                    </Text>
                    <Text style={[
                      styles.stateName,
                      selectedState === state.id && styles.stateNameSelected,
                    ]}>
                      {state.name}
                    </Text>
                    <Text style={styles.stateSystem}>{state.educationSystem}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            
            <Button
              title="Next"
              onPress={() => setStep(2)}
              fullWidth
              disabled={!selectedState}
            />
          </View>
        )}

        {step === 2 && (
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
            
            <Button title="Next" onPress={() => setStep(3)} fullWidth />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.title}>Select your subjects</Text>
            <Text style={styles.description}>
              Choose all {allStates.find(s => s.id === selectedState)?.educationSystem || ''} subjects you're currently studying
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
              <Button title="Back" onPress={() => setStep(2)} variant="outline" />
              <Button
                title="Next"
                onPress={() => setStep(4)}
                disabled={selectedSubjects.length === 0}
              />
            </View>
          </View>
        )}

        {step === 4 && (
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
              <Button title="Back" onPress={() => setStep(3)} variant="outline" />
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
  // DEBUG STYLES (TEMPORARY)
  debugContainer: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: '#00ff00',
    marginBottom: spacing.sm,
  },
  debugScroll: {
    maxHeight: 150,
  },
  debugLog: {
    fontSize: 10,
    color: '#ccc',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 3,
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
  stateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  stateCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minWidth: '47%',
    maxWidth: '48%',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    position: 'relative',
  },
  stateCardSelected: {
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  stateCheckIcon: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  stateAbbr: {
    fontSize: 28,
    fontWeight: typography.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  stateAbbrSelected: {
    color: colors.success,
  },
  stateName: {
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: typography.semibold,
    textAlign: 'center',
    marginBottom: spacing.xxs,
  },
  stateNameSelected: {
    color: colors.textPrimary,
  },
  stateSystem: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textTertiary,
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
