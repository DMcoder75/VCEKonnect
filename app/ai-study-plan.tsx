import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAI } from '@/hooks/useAI';
import { useTypewriter } from '@/hooks/useTypewriter';
import { continueAIResponse, generateUniqueSessionId } from '@/services/aiService';
import { LoadingSpinner, Button } from '@/components/ui';
import { getUserSubjects } from '@/services/userSubjectsService';
import { getSubjectScores } from '@/services/scoresService';
import { VCESubject } from '@/services/vceSubjectsService';
import { getUserPreferences, updateUserPreferences } from '@/services/userPreferencesService';
import { getActiveGoals } from '@/services/studyGoalsService';
import { calculateATAR } from '@/services/atarCalculator';

// Format AI response text (parse markdown-style formatting)
function formatResponseText(text: string) {
  if (!text) return '';
  
  // Simple formatting: convert **bold** to uppercase, ### headers to larger text
  // For now, just return cleaned text (proper formatting would need custom Text components)
  return text
    .replace(/###\s*/g, '\n') // Remove markdown headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold markers
    .replace(/^-\s+/gm, '• ') // Convert - to bullets
    .trim();
}

export default function AIStudyPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isLoading, error, response, createStudyPlan } = useAI();
  
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [currentScores, setCurrentScores] = useState<{ [key: string]: number }>({});
  const [targetATAR, setTargetATAR] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [examDate, setExamDate] = useState('2026-11-01'); // Default VCE exam date
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [placeholderStage, setPlaceholderStage] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [fullResponse, setFullResponse] = useState('');
  const [sessionId, setSessionId] = useState<string>(''); // Unique session ID for this conversation

  useEffect(() => {
    if (user) {
      // Generate unique session ID for this conversation
      const newSessionId = generateUniqueSessionId(user.id);
      setSessionId(newSessionId);
      console.log('Created new session:', newSessionId);
      
      loadUserData();
    }
  }, [user]);

  async function loadUserData() {
    if (!user) return;
    
    setIsLoadingData(true);
    
    // Load subjects first
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    
    // Load current scores
    const scores = await getSubjectScores(user.id);
    const scoresMap: { [key: string]: number } = {};
    scores.forEach(score => {
      const subject = subjects.find(s => s.id === score.subjectId);
      if (subject) {
        // Average of SAC and exam prediction
        const avg = (score.sacAverage + score.examPrediction) / 2;
        scoresMap[subject.code] = Math.round(avg);
      }
    });
    setCurrentScores(scoresMap);
    
    // Auto-fill Target ATAR from ATAR predictor
    if (scores.length > 0) {
      const { atar } = calculateATAR(scores);
      if (atar > 0) {
        setTargetATAR(atar.toFixed(2));
      }
    }
    
    // Auto-fill Study Hours Per Week from active weekly goals
    const activeGoals = await getActiveGoals(user.id);
    if (activeGoals?.weekly) {
      // Convert target hours to hours per week
      const weeklyHours = activeGoals.weekly.targetHours;
      setHoursPerWeek(weeklyHours.toString());
    }
    // If no active weekly goal, leave field blank (don't load from preferences)
    
    setIsLoadingData(false);
  }

  // Generate placeholder scaffolding text (max 6 lines, snail pace)
  const placeholderStages = useMemo(() => [
    `📊 Analyzing your current situation...`,
    
    `📊 Analyzing your current situation...\n🎯 Identifying priority areas...`,
    
    `📊 Analyzing your current situation...\n🎯 Identifying priority areas...\n📅 Creating your weekly schedule...`,
    
    `📊 Analyzing your current situation...\n🎯 Identifying priority areas...\n📅 Creating your weekly schedule...\n✨ Personalizing study strategies...`,
    
    `📊 Analyzing your current situation...\n🎯 Identifying priority areas...\n📅 Creating your weekly schedule...\n✨ Personalizing study strategies...\n🔬 Optimizing time allocation...`,
    
    `📊 Analyzing your current situation...\n🎯 Identifying priority areas...\n📅 Creating your weekly schedule...\n✨ Personalizing study strategies...\n🔬 Optimizing time allocation...\n⏱️ Finalizing your plan...`,
  ], []);

  // Cycle through placeholder stages while loading
  useEffect(() => {
    if (!showPlaceholder) {
      setPlaceholderStage(0);
      return;
    }

    const interval = setInterval(() => {
      setPlaceholderStage(prev => {
        if (prev < placeholderStages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000); // Change stage every 2 seconds

    return () => clearInterval(interval);
  }, [showPlaceholder, placeholderStages.length]);

  // Typewriter for placeholder with snail pace
  const placeholderTypewriter = useTypewriter({
    text: showPlaceholder ? placeholderStages[placeholderStage] : '',
    speed: 10,
    slowDownNearEnd: true,
    snailPace: true, // Very slow typing
  });

  // Typewriter for actual AI response (normal speed, no transition)
  const responseTypewriter = useTypewriter({
    text: fullResponse,
    speed: 30,
  });

  // Auto-detect incomplete response and request completion
  useEffect(() => {
    async function checkAndComplete() {
      if (!response) {
        setFullResponse('');
        return;
      }
      
      if (isCompleting) return; // Already completing
      
      // Check if response is incomplete
      const trimmed = response.response.trim();
      if (!trimmed) {
        setFullResponse('');
        return;
      }
      
      const lastChar = trimmed[trimmed.length - 1];
      const endsWithProperPunctuation = ['.', '!', '?', '"', "'"].includes(lastChar);
      const endsWithIncompleteMarker = trimmed.endsWith('-') || 
                                        trimmed.endsWith('*') || 
                                        trimmed.endsWith('#') ||
                                        trimmed.endsWith(':') ||
                                        trimmed.endsWith(',');
      
      const isIncomplete = !endsWithProperPunctuation || endsWithIncompleteMarker;
      
      console.log('Response check:', {
        lastChar,
        endsWithProperPunctuation,
        endsWithIncompleteMarker,
        isIncomplete,
        hasSessionId: !!response.session_id,
        sessionId: response.session_id
      });
      
      if (isIncomplete && response.session_id) {
        console.log('⚠️ Response is incomplete! Requesting continuation with session:', response.session_id);
        setIsCompleting(true);
        
        const result = await continueAIResponse(response.session_id, 'short');
        
        console.log('Continuation result:', result);
        
        if (result.data) {
          // Append continuation to original response
          const combined = response.response + ' ' + result.data.response;
          console.log('✅ Combined response length:', combined.length);
          setFullResponse(combined);
        } else {
          console.log('❌ Continuation failed:', result.error);
          // If continuation failed, just use original
          setFullResponse(response.response);
        }
        
        setIsCompleting(false);
      } else if (isIncomplete && !response.session_id) {
        console.log('⚠️ Response incomplete but no session_id available');
        setFullResponse(response.response);
      } else {
        console.log('✅ Response is complete');
        setFullResponse(response.response);
      }
    }
    
    checkAndComplete();
  }, [response, isCompleting]);

  async function handleGeneratePlan() {
    if (!user || !targetATAR || !hoursPerWeek) return;
    
    // Start placeholder animation
    setShowPlaceholder(true);
    setPlaceholderStage(0);
    setFullResponse('');
    
    // Save preferences for future use
    await updateUserPreferences(user.id, {
      targetATAR: parseFloat(targetATAR),
      studyHoursPerWeek: parseFloat(hoursPerWeek),
    });
    
    // Pass full subject names and codes with session ID
    await createStudyPlan(
      user.id,
      userSubjects.map(s => ({ code: s.code, name: s.name })),
      parseFloat(targetATAR),
      currentScores,
      parseFloat(hoursPerWeek),
      examDate,
      sessionId // Pass session ID to maintain conversation context
    );
    
    // Keep placeholder visible, response will append below
    // setShowPlaceholder(false); // Don't hide placeholder
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
          <Text style={styles.title}>AI Study Plan</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Premium Badge */}
        <View style={styles.premiumBadge}>
          <MaterialIcons name="auto-awesome" size={20} color={colors.warning} />
          <Text style={styles.premiumText}>AI-Powered Premium Feature</Text>
        </View>

        {isLoadingData ? (
          <LoadingSpinner message="Loading your data..." />
        ) : (
          <>
            {/* Input Form */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target ATAR</Text>
                <TextInput
                  style={styles.input}
                  value={targetATAR}
                  onChangeText={setTargetATAR}
                  keyboardType="numeric"
                  placeholder="e.g., 95.00"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Study Hours Per Week</Text>
                <TextInput
                  style={styles.input}
                  value={hoursPerWeek}
                  onChangeText={setHoursPerWeek}
                  keyboardType="numeric"
                  placeholder="e.g., 20"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Exam Start Date</Text>
                <TextInput
                  style={styles.input}
                  value={examDate}
                  onChangeText={setExamDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            {/* Current Subjects */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Subjects ({userSubjects.length})</Text>
              <View style={styles.subjectsGrid}>
                {userSubjects.map(subject => (
                  <View key={subject.id} style={styles.subjectChip}>
                    <Text style={styles.subjectCode}>{subject.code}</Text>
                    <Text style={styles.subjectScore}>
                      {currentScores[subject.code] || 0}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Generate Button */}
            <Button
              title={isLoading ? "Generating Plan..." : "Generate Study Plan"}
              onPress={handleGeneratePlan}
              disabled={!targetATAR || !hoursPerWeek || isLoading}
              fullWidth
            />

            {/* Error Display - Debug Panel */}
            {error && (
              <View style={styles.errorCard}>
                <View style={styles.errorHeader}>
                  <MaterialIcons name="error-outline" size={24} color={colors.error} />
                  <Text style={styles.errorTitle}>API Error (Debug)</Text>
                </View>
                <ScrollView style={styles.errorScrollView} nestedScrollEnabled>
                  <Text style={styles.errorText}>{error}</Text>
                </ScrollView>
              </View>
            )}

            {/* Placeholder Text (stays visible during and after loading) */}
            {showPlaceholder && (
              <View style={styles.placeholderCard}>
                <View style={styles.placeholderHeader}>
                  <MaterialIcons name="auto-awesome" size={24} color={colors.primary} />
                  <Text style={styles.placeholderTitle}>Creating Your Study Plan</Text>
                  {isLoading && <LoadingSpinner message="" />}
                </View>
                
                <Text style={styles.placeholderText}>{placeholderTypewriter.displayedText}</Text>
                
                {isLoading && (
                  <View style={styles.placeholderFooter}>
                    <Text style={styles.placeholderFooterText}>Powered by AI • Analyzing...</Text>
                  </View>
                )}
              </View>
            )}

            {/* Response with Typewriter Effect (appended below placeholder) */}
            {response && (
              <View style={styles.responseCard}>
                <View style={styles.responseHeader}>
                  <MaterialIcons name="auto-awesome" size={24} color={colors.success} />
                  <Text style={styles.responseTitle}>Your Personalized Study Plan</Text>
                </View>
                
                {isCompleting && (
                  <View style={styles.completingBanner}>
                    <MaterialIcons name="hourglass-empty" size={16} color={colors.primary} />
                    <Text style={styles.completingText}>Completing response...</Text>
                  </View>
                )}
                
                <Text style={styles.responseText}>{formatResponseText(responseTypewriter.displayedText)}</Text>
                
                {/* Metadata Info */}
                <View style={styles.modelInfo}>
                  <Text style={styles.modelText}>
                    {new Date(response.timestamp).toLocaleString()} • {response.metadata.response_length} characters
                    {response.metadata.search_performed && ' • Web search used'}
                  </Text>
                </View>
              </View>
            )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  premiumText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.warning,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  subjectChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 80,
  },
  subjectCode: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  subjectScore: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.error,
    maxHeight: 300,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.error,
  },
  errorScrollView: {
    maxHeight: 250,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  placeholderCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  placeholderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  placeholderTitle: {
    flex: 1,
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  placeholderText: {
    fontSize: typography.body,
    color: colors.primary,
    lineHeight: 28,
    marginBottom: spacing.md,
    fontWeight: typography.semibold,
  },
  placeholderFooter: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  placeholderFooterText: {
    fontSize: typography.caption,
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  responseCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.success,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  responseTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  responseText: {
    fontSize: typography.body,
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  completingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  completingText: {
    fontSize: typography.caption,
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  modelInfo: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  modelText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  followupSection: {
    marginTop: spacing.md,
  },
  followupTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  followupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  followupText: {
    flex: 1,
    fontSize: typography.caption,
    color: colors.textPrimary,
  },
});
