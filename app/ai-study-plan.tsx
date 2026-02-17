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

// Format AI response text (preserve structure, clean markdown)
function formatResponseText(text: string) {
  if (!text) return '';
  
  return text
    .replace(/### /g, '\n') // Keep headers, remove ### marker
    .replace(/## /g, '\n') // Keep subheaders
    .replace(/# /g, '\n') // Keep main headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold markers
    .replace(/^- /gm, '  • ') // Convert - to indented bullets
    .replace(/^\* /gm, '  • ') // Convert * to indented bullets
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();
}

export default function AIStudyPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isLoading, error, response, setResponse, createStudyPlan } = useAI();
  
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [currentScores, setCurrentScores] = useState<{ [key: string]: number }>({});
  const [targetATAR, setTargetATAR] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [examDate, setExamDate] = useState('2026-11-01'); // Default VCE exam date
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [fullResponse, setFullResponse] = useState(''); // Combined response (original + continuations)
  const [displayResponse, setDisplayResponse] = useState(''); // What's currently being displayed
  const [showFullText, setShowFullText] = useState(false); // Fade-in effect trigger
  const [sessionId, setSessionId] = useState<string>(''); // Unique session ID for this conversation
  const displayedLengthRef = React.useRef(0); // Track how much we've already shown

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

  // Compact placeholder text (minimal vertical spacing)
  const placeholderText = useMemo(() => `📊 Analyzing your current situation...\n🎯 Identifying priority areas...\n📅 Creating your weekly schedule...\n✨ Personalizing study strategies...\n🔬 Optimizing time allocation...\n⏱️ Finalizing your plan...`, []);

  // Typewriter for placeholder with very slow pace (5 chars/sec)
  const placeholderTypewriter = useTypewriter({
    text: showPlaceholder ? placeholderText : '',
    speed: 5, // Very slow - 5 characters per second
    slowDownNearEnd: true,
  });

  // Typewriter for actual AI response (normal speed) with fade-in transition
  const responseTypewriter = useTypewriter({
    text: displayResponse,
    speed: 40,
    transitionText: 'Here is your complete study plan:',
    onComplete: () => {
      // After typewriter completes, trigger fade-in effect to show full text
      setTimeout(() => {
        setShowFullText(true);
        setShowPlaceholder(false); // Hide placeholder only after full text is revealed
      }, 300);
    },
  });

  // THREAD 2: Completion Thread (runs in background, independent)
  // Checks for incomplete responses and fetches continuations
  useEffect(() => {
    async function checkAndComplete() {
      if (!response || isCompleting) return;
      
      const trimmed = response.response.trim();
      if (!trimmed) return;
      
      // Advanced incomplete detection
      const lastChar = trimmed[trimmed.length - 1];
      const lastLine = trimmed.split('\n').pop()?.trim() || '';
      
      const endsWithNumberedList = /\(\d+\.?$/.test(trimmed);
      const endsWithBulletPoint = /^\s*[•\-\*]\s*$/.test(lastLine);
      const endsWithIncompleteMarker = ['-', '*', '#', ':', ',', '('].some(char => lastChar === char);
      const lastLineVeryShort = lastLine.length < 10 && lastLine.length > 0;
      const endsWithProperPunctuation = ['.', '!', '?'].includes(lastChar);
      
      // Check if all 7 weekdays are covered
      const weekdayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi;
      const weekdaysFound = (trimmed.match(weekdayPattern) || []).map(d => d.toLowerCase());
      const uniqueWeekdays = [...new Set(weekdaysFound)];
      const hasAllWeekdays = uniqueWeekdays.length >= 7;
      
      const isIncomplete = 
        endsWithNumberedList ||
        endsWithBulletPoint ||
        endsWithIncompleteMarker ||
        (lastLineVeryShort && !endsWithProperPunctuation) ||
        !hasAllWeekdays;
      
      console.log('🔍 [Thread 2] Checking completeness:', { isIncomplete, weekdays: uniqueWeekdays.length });
      
      if (isIncomplete && response.session_id) {
        console.log('⚙️ [Thread 2] Fetching continuation...');
        setIsCompleting(true);
        
        const result = await continueAIResponse(response.session_id, 'short');
        
        if (result.data) {
          const combined = response.response + ' ' + result.data.response;
          console.log('✅ [Thread 2] Continuation received, length:', combined.length);
          
          // Update response object to trigger recursive check
          setResponse({
            ...response,
            response: combined,
            metadata: { ...response.metadata, response_length: combined.length }
          });
          
          // Update fullResponse for Thread 1 to pick up
          setFullResponse(combined);
        } else {
          console.log('❌ [Thread 2] Continuation failed');
          setFullResponse(response.response);
        }
        
        setIsCompleting(false);
      } else {
        console.log('✅ [Thread 2] Response is complete');
        setFullResponse(response.response);
      }
    }
    
    checkAndComplete();
  }, [response]);

  // THREAD 1: Display Thread (UI rendering)
  // Only updates display when NEW content arrives (prevents jittery resets)
  useEffect(() => {
    if (!fullResponse) {
      displayedLengthRef.current = 0;
      setDisplayResponse('');
      setShowFullText(false);
      return;
    }
    
    // Only update if there's truly NEW content (not just re-render)
    const alreadyDisplayed = displayedLengthRef.current;
    const hasNewContent = fullResponse.length > alreadyDisplayed;
    
    if (hasNewContent) {
      console.log('🎨 [Thread 1] New content:', fullResponse.length - alreadyDisplayed, 'chars');
      setDisplayResponse(fullResponse);
      setShowFullText(false); // Reset fade-in for new content
      displayedLengthRef.current = fullResponse.length;
    }
  }, [fullResponse]);

  async function handleGeneratePlan() {
    if (!user || !targetATAR || !hoursPerWeek) return;
    
    // Start placeholder animation and clear previous response
    setShowPlaceholder(true);
    setFullResponse('');
    displayedLengthRef.current = 0; // Reset display tracker
    
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
    
    // Placeholder will hide automatically when response arrives
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

            {/* Placeholder Text (visible only during loading) */}
            {showPlaceholder && (
              <View style={styles.placeholderCard}>
                <View style={styles.placeholderHeader}>
                  <MaterialIcons name="auto-awesome" size={24} color={colors.primary} />
                  <Text style={styles.placeholderTitle}>Creating Your Study Plan</Text>
                </View>
                
                <Text style={styles.placeholderText}>{placeholderTypewriter.displayedText}</Text>
                
                {isLoading && (
                  <View style={styles.placeholderFooter}>
                    <LoadingSpinner message="" />
                    <Text style={styles.placeholderFooterText}>Powered by AI • Generating personalized plan...</Text>
                  </View>
                )}
              </View>
            )}

            {/* Response Display (Thread 1 output) */}
            {displayResponse && (
              <View style={styles.responseCard}>
                <View style={styles.responseHeader}>
                  <MaterialIcons name="auto-awesome" size={24} color={colors.success} />
                  <Text style={styles.responseTitle}>Your Personalized Study Plan</Text>
                </View>
                
                {isCompleting && (
                  <View style={styles.completingBanner}>
                    <LoadingSpinner message="" size={16} />
                    <Text style={styles.completingText}>Fetching more content...</Text>
                  </View>
                )}
                
                {/* Show either typewriter animation or full text with fade-in */}
                {showFullText ? (
                  <View style={[styles.fadeInContainer, { opacity: 1 }]}>
                    <Text style={styles.responseText}>{formatResponseText(fullResponse)}</Text>
                  </View>
                ) : (
                  <Text style={styles.responseText}>{formatResponseText(responseTypewriter.displayedText)}</Text>
                )}
                
                {/* Metadata Info */}
                {response && (
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelText}>
                      {new Date(response.timestamp).toLocaleString()} • {fullResponse.length} characters
                      {response.metadata.search_performed && ' • Web search used'}
                    </Text>
                  </View>
                )}
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
    marginBottom: spacing.sm,
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
    lineHeight: 22, // Compact line height
    marginBottom: spacing.sm,
    fontWeight: typography.semibold,
  },
  placeholderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  placeholderFooterText: {
    flex: 1,
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
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  completingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  completingText: {
    fontSize: typography.body,
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  fadeInContainer: {
    opacity: 1,
  },
  modelInfo: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  modelText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
});
