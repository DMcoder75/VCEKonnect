
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAI } from '@/hooks/useAI';
import { usePremium } from '@/hooks/usePremium';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useAlert } from '@/template';
import { continueAIResponse, generateUniqueSessionId } from '@/services/aiService';
import { LoadingSpinner, Button } from '@/components/ui';
import { PremiumPaywall } from '@/components/feature';
import { getUserSubjects } from '@/services/userSubjectsService';
import { getSubjectScores } from '@/services/scoresService';
import { VCESubject } from '@/services/vceSubjectsService';
import { getUserPreferences, updateUserPreferences } from '@/services/userPreferencesService';
import { getActiveGoals } from '@/services/studyGoalsService';
import { calculateATAR } from '@/services/atarCalculator';
import { canCreateAIStudyPlan, saveAIStudyPlan } from '@/services/premiumService';
import { exportStudyPlanToPDF } from '@/services/exportService';

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
  const { tier, limits, isPremium, isLoading: isPremiumLoading } = usePremium();
  const { showAlert } = useAlert();
  
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [currentScores, setCurrentScores] = useState<{ [key: string]: number }>({});
  const [targetATAR, setTargetATAR] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [examDate, setExamDate] = useState('2026-11-01'); // Default VCE exam date
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [fullResponse, setFullResponse] = useState(''); // Complete accumulated response
  const [showFullText, setShowFullText] = useState(false); // Fade-in effect trigger
  const [sessionId, setSessionId] = useState<string>(''); // Unique session ID for this conversation
  const [isContinuing, setIsContinuing] = useState(false); // Track if continuation is in progress
  
  // Premium paywall states
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState('');
  const [canGenerate, setCanGenerate] = useState(true); // Track if user can generate based on limits
  const [isCheckingLimits, setIsCheckingLimits] = useState(true); // Track initial limit check
  
  // Background completion tracking (no state updates, no re-renders)
  const completionInProgress = React.useRef(false);

  useEffect(() => {
    if (user) {
      // Generate unique session ID for this conversation
      const newSessionId = generateUniqueSessionId(user.id);
      setSessionId(newSessionId);
      console.log('Created new session:', newSessionId);
      
      loadUserData();
      checkInitialLimits();
    }
  }, [user]);

  async function checkInitialLimits() {
    if (!user) return;
    
    setIsCheckingLimits(true);
    const check = await canCreateAIStudyPlan(user.id);
    setCanGenerate(check.allowed);
    if (!check.allowed) {
      setPaywallMessage(check.reason || 'Upgrade to generate more AI study plans');
    }
    setIsCheckingLimits(false);
  }

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

  // Background completion checker (runs silently, updates text as it completes)
  useEffect(() => {
    async function checkAndComplete() {
      if (!response || completionInProgress.current) return;
      
      completionInProgress.current = true;
      
      // ✅ Immediately hide placeholder and show initial response
      setShowPlaceholder(false);
      setFullResponse(response.response); // Show immediately
      setShowFullText(true); // Trigger fade-in immediately
      
      // Start with original response
      let currentText = response.response;
      let sessionId = response.session_id;
      let continuesFetched = 0;
      const maxContinuations = 10;
      
      // Show continuation indicator
      setIsContinuing(true);
      
      // Silent background loop - accumulate all continuations
      while (continuesFetched < maxContinuations) {
        const trimmed = currentText.trim();
        if (!trimmed) break;
        
        // Check if incomplete
        const lastChar = trimmed[trimmed.length - 1];
        const lastLine = trimmed.split('\n').pop()?.trim() || '';
        const endsWithNumberedList = /\(\d+\.?$/.test(trimmed);
        const endsWithBulletPoint = /^\s*[•\-\*]\s*$/.test(lastLine);
        const endsWithIncompleteMarker = ['-', '*', '#', ':', ',', '('].some(char => lastChar === char);
        const lastLineVeryShort = lastLine.length < 10 && lastLine.length > 0;
        const endsWithProperPunctuation = ['.', '!', '?'].includes(lastChar);
        
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
        
        if (!isIncomplete || !sessionId) break;
        
        // Fetch continuation silently
        const result = await continueAIResponse(sessionId, 'short');
        
        if (result.data) {
          currentText = currentText + ' ' + result.data.response;
          continuesFetched++;
          // Update UI with growing text (user sees it completing in real-time)
          setFullResponse(currentText);
        } else {
          break;
        }
      }
      
      // Hide continuation indicator when done
      setIsContinuing(false);
      completionInProgress.current = false;
    }
    
    checkAndComplete();
  }, [response]);

  async function handleGeneratePlan() {
    if (!user || !targetATAR || !hoursPerWeek) return;
    
    // Check premium limits before generating
    const check = await canCreateAIStudyPlan(user.id);
    if (!check.allowed) {
      setPaywallMessage(check.reason);
      setShowPaywall(true);
      return;
    }
    
    // Reset state
    setShowPlaceholder(true);
    setFullResponse('');
    setShowFullText(false);
    completionInProgress.current = false;
    
    // Save preferences for future use
    await updateUserPreferences(user.id, {
      targetATAR: parseFloat(targetATAR),
      studyHoursPerWeek: parseFloat(hoursPerWeek),
    });
    
    // Pass full subject names and codes with session ID
    const result = await createStudyPlan(
      user.id,
      userSubjects.map(s => ({ code: s.code, name: s.name })),
      parseFloat(targetATAR),
      currentScores,
      parseFloat(hoursPerWeek),
      examDate,
      sessionId // Pass session ID to maintain conversation context
    );
    
    // CRITICAL: Auto-save to database to track usage (required for limit enforcement)
    // This ensures free tier users can't spam generate after their first use
    if (result.data) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // End of week (Saturday)

      const initialResponse = result.data.response || ''; // Use immediate response, not fullResponse
      
      const planData = {
        userId: user.id,
        weekStartDate: weekStart.toISOString().split('T')[0],
        weekEndDate: weekEnd.toISOString().split('T')[0],
        planContent: {
          subjects: userSubjects.map(s => ({ code: s.code, name: s.name })),
          targetATAR: parseFloat(targetATAR),
          hoursPerWeek: parseFloat(hoursPerWeek),
          examDate,
          generatedPlan: initialResponse,
        },
        planSummary: initialResponse.substring(0, 200) + '...', // First 200 chars
        contextData: {
          currentScores,
          totalSubjects: userSubjects.length,
        },
      };

      await saveAIStudyPlan(planData);
    }
    
    // Re-check limits after generation completes to update button state
    setTimeout(async () => {
      await checkInitialLimits();
    }, 1000);
    
    // Placeholder will hide automatically when response arrives
  }

  async function handleSavePlan() {
    if (!user || !fullResponse) return;

    // Save the study plan to database
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // End of week (Saturday)

    const planData = {
      userId: user.id,
      weekStartDate: weekStart.toISOString().split('T')[0],
      weekEndDate: weekEnd.toISOString().split('T')[0],
      planContent: {
        subjects: userSubjects.map(s => ({ code: s.code, name: s.name })),
        targetATAR: parseFloat(targetATAR),
        hoursPerWeek: parseFloat(hoursPerWeek),
        examDate,
        generatedPlan: fullResponse,
      },
      planSummary: fullResponse.substring(0, 200) + '...', // First 200 chars
      contextData: {
        currentScores,
        totalSubjects: userSubjects.length,
      },
    };

    const { data, error } = await saveAIStudyPlan(planData);
    if (error) {
      console.error('Error saving study plan:', error);
      showAlert('Error', 'Failed to save study plan: ' + error);
    } else {
      showAlert('Success', 'Study plan saved successfully!');
      // Re-check limits after saving to update UI
      await checkInitialLimits();
    }
  }

  async function handleExportPDF() {
    if (!fullResponse) return;

    const result = await exportStudyPlanToPDF(fullResponse, {
      targetATAR,
      hoursPerWeek,
      subjects: userSubjects,
    });

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
          <Text style={styles.title}>AI Study Plan</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Premium Badge */}
        <View style={[
          styles.premiumBadge,
          tier === 'pro' && styles.premiumBadgePro,
          tier === 'basic' && styles.premiumBadgeBasic,
        ]}>
          <MaterialIcons name="auto-awesome" size={20} color={tier === 'free' ? colors.warning : colors.background} />
          <Text style={[
            styles.premiumText,
            tier !== 'free' && styles.premiumTextActive,
          ]}>
            {tier === 'pro' ? 'Pro Plan - Unlimited AI Plans' : tier === 'basic' ? 'Basic Plan - 5 Plans Stored' : 'Free: 1 Trial Only'}
          </Text>
        </View>

        {isLoadingData || isPremiumLoading || isCheckingLimits ? (
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
            {!canGenerate && tier === 'free' && (
              <View style={styles.limitReachedCard}>
                <MaterialIcons name="lock" size={24} color={colors.warning} />
                <Text style={styles.limitReachedText}>
                  Free trial used. Upgrade to Basic for 5 stored plans or Pro for unlimited!
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
            <Button
              title={isLoading ? "Generating Plan..." : canGenerate ? "Generate Study Plan" : "Limit Reached - Upgrade"}
              onPress={canGenerate ? handleGeneratePlan : () => setShowPaywall(true)}
              disabled={!targetATAR || !hoursPerWeek || isLoading || isCheckingLimits || !canGenerate}
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

            {/* Response Display - Fade-in effect only */}
            {fullResponse && (
              <View style={[styles.responseCard, showFullText && styles.fadeInCard]}>
                <View style={styles.responseHeader}>
                  <MaterialIcons name="auto-awesome" size={24} color={colors.success} />
                  <Text style={styles.responseTitle}>Your Personalized Study Plan</Text>
                </View>
                
                {/* Display full text with fade-in animation (no typewriter) */}
                <Text style={styles.responseText}>{formatResponseText(fullResponse)}</Text>
                
                {/* Continuation Loading Indicator */}
                {isContinuing && (
                  <View style={styles.continuationIndicator}>
                    <LoadingSpinner message="" />
                    <Text style={styles.continuationText}>Completing response...</Text>
                  </View>
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

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <Pressable style={styles.exportButton} onPress={handleExportPDF}>
                    <MaterialIcons name="picture-as-pdf" size={20} color={colors.background} />
                    <Text style={styles.exportButtonText}>Export PDF</Text>
                  </Pressable>
                  
                  {limits.aiStudyPlanStorage && (
                    <Pressable style={styles.saveButton} onPress={handleSavePlan}>
                      <MaterialIcons name="save" size={20} color={colors.background} />
                      <Text style={styles.saveButtonText}>Save to Library</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Premium Paywall */}
      <PremiumPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="AI Study Plans"
        description={paywallMessage || "Get AI-generated personalized weekly study plans based on your progress and goals"}
        requiredTier={tier === 'free' ? 'basic' : 'pro'}
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
    opacity: 0,
  },
  fadeInCard: {
    opacity: 1,
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
  continuationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  continuationText: {
    fontSize: typography.bodySmall,
    color: colors.primary,
    fontWeight: typography.semibold,
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
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  exportButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.background,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  saveButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.background,
  },
  limitReachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.warning,
    gap: spacing.sm,
  },
  limitReachedText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  upgradeButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.background,
  },
});
