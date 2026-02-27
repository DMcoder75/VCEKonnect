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
import { continueAIResponse, generateUniqueSessionId } from '@/services/aiService';
import { LoadingSpinner, Button } from '@/components/ui';
import { PremiumPaywall } from '@/components/feature';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';
import { canCreateAIPracticeQuestions, saveAIPracticeQuestions } from '@/services/premiumService';

// Format AI response text (preserve structure, clean markdown & LaTeX)
function formatResponseText(text: string) {
  if (!text) return '';
  
  return text
    // Remove LaTeX delimiters
    .replace(/\\\[\s*/g, '') // Remove \[
    .replace(/\s*\\\]/g, '') // Remove \]
    .replace(/\\\(\s*/g, '') // Remove \(
    .replace(/\s*\\\)/g, '') // Remove \)
    .replace(/\$\$/g, '') // Remove $$
    .replace(/\$/g, '') // Remove single $
    // Clean LaTeX commands
    .replace(/\\text\{([^}]+)\}/g, '$1') // \text{...} → ...
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)') // \frac{a}{b} → (a/b)
    .replace(/\\quad/g, ' ') // \quad → space
    .replace(/\\,/g, '') // \, → remove
    .replace(/\\\\/g, '') // Remove remaining backslashes
    // Clean markdown with proper spacing
    .replace(/###\s*Question\s*(\d+)/gi, '\n\nQuestion $1') // Question headers
    .replace(/###\s*/g, '\n\n') // Other headers
    .replace(/##\s*/g, '\n\n')
    .replace(/#\s*/g, '\n\n')
    // Bold text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // Bullet points with proper indentation
    .replace(/^\s*-\s+/gm, '  • ')
    .replace(/^\s*\*\s+/gm, '  • ')
    // Clean excessive newlines (max 2)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function AIQuestionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isLoading, error, response, generateQuestions } = useAI();
  const { tier, limits, isPremium, isLoading: isPremiumLoading } = usePremium();
  
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<VCESubject | null>(null);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState('3');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [fullResponse, setFullResponse] = useState('');
  const [showFullText, setShowFullText] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  
  // Premium paywall states
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState('');
  const [canGenerate, setCanGenerate] = useState(true);
  const [isCheckingLimits, setIsCheckingLimits] = useState(true);
  
  // Background completion tracking (no state updates, no re-renders)
  const completionInProgress = React.useRef(false);

  useEffect(() => {
    if (user) {
      // Generate unique session ID for this conversation
      const newSessionId = generateUniqueSessionId(user.id);
      setSessionId(newSessionId);
      loadUserData();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedSubject) {
      checkInitialLimits();
    }
  }, [user, selectedSubject]);

  async function checkInitialLimits() {
    if (!user || !selectedSubject) return;
    
    setIsCheckingLimits(true);
    const check = await canCreateAIPracticeQuestions(user.id, selectedSubject.id);
    setCanGenerate(check.allowed);
    if (!check.allowed) {
      setPaywallMessage(check.reason || 'Upgrade to generate more practice questions');
    }
    setIsCheckingLimits(false);
  }

  async function loadUserData() {
    if (!user) return;
    
    setIsLoadingData(true);
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    if (subjects.length > 0) {
      setSelectedSubject(subjects[0]);
    }
    setIsLoadingData(false);
  }

  // Placeholder text for loading state
  const placeholderText = useMemo(() => `🎯 Analyzing topic complexity...\n📚 Consulting VCE study design...\n✍️ Crafting ${questionCount} practice questions...\n📊 Setting difficulty level...\n✅ Adding solutions and marking criteria...`, [questionCount]);

  const placeholderTypewriter = useTypewriter({
    text: showPlaceholder ? placeholderText : '',
    speed: 5,
    slowDownNearEnd: true,
  });

  // Background completion checker - ensure all questions are complete
  useEffect(() => {
    async function checkAndComplete() {
      if (!response || completionInProgress.current) return;
      
      completionInProgress.current = true;
      
      // Start with original response
      let currentText = response.response;
      let currentSessionId = response.session_id;
      let continuesFetched = 0;
      const maxContinuations = 10;
      const expectedQuestions = parseInt(questionCount) || 3;
      
      // Silent background loop - accumulate all continuations
      while (continuesFetched < maxContinuations) {
        const trimmed = currentText.trim();
        if (!trimmed) break;
        
        // Check if we have all questions
        const questionMatches = trimmed.match(/Question\s*(\d+)/gi) || [];
        const questionNumbers = questionMatches.map(m => {
          const match = m.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        });
        const maxQuestionFound = Math.max(0, ...questionNumbers);
        const hasAllQuestions = maxQuestionFound >= expectedQuestions;
        
        // Check if response seems incomplete
        const lastChar = trimmed[trimmed.length - 1];
        const endsWithProperPunctuation = ['.', '!', '?', ')'].includes(lastChar);
        const endsWithIncompleteMarker = ['-', '*', '#', ':', ',', '('].some(char => lastChar === char);
        
        const isIncomplete = !hasAllQuestions || endsWithIncompleteMarker || !endsWithProperPunctuation;
        
        if (!isIncomplete || !currentSessionId) break;
        
        // Fetch continuation silently
        const result = await continueAIResponse(currentSessionId, 'short');
        
        if (result.data) {
          currentText = currentText + ' ' + result.data.response;
          continuesFetched++;
        } else {
          break;
        }
      }
      
      // Update UI with final complete text
      setFullResponse(currentText);
      setShowPlaceholder(false);
      
      // Trigger fade-in animation after brief delay
      setTimeout(() => {
        setShowFullText(true);
      }, 100);
      
      completionInProgress.current = false;
    }
    
    checkAndComplete();
  }, [response, questionCount]);

  async function handleGenerateQuestions() {
    if (!user || !selectedSubject || !topic) return;
    
    // Check premium limits before generating
    const check = await canCreateAIPracticeQuestions(user.id, selectedSubject.id);
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
    
    // Pass session ID for continuation support
    const result = await generateQuestions(
      user.id,
      selectedSubject.code,
      selectedSubject.name,
      topic,
      difficulty,
      parseInt(questionCount) || 3,
      sessionId // Pass session ID to enable continuation
    );
    
    // CRITICAL: Auto-save to database to track usage (required for limit enforcement)
    // This ensures free tier users can't spam generate after their first use
    if (result.data) {
      const initialResponse = result.data.response || ''; // Use immediate response, not fullResponse
      const questionsData = {
        userId: user.id,
        subjectId: selectedSubject.id,
        topic,
        difficultyLevel: difficulty,
        questionsContent: {
          response: initialResponse,
          topic,
          difficulty,
        },
        questionCount: parseInt(questionCount) || 3,
      };

      await saveAIPracticeQuestions(questionsData);
    }
    
    // Re-check limits after generation to update button state
    setTimeout(async () => {
      await checkInitialLimits();
    }, 1000);
    
    // Placeholder will hide automatically when response arrives
  }

  async function handleSaveQuestions() {
    if (!user || !selectedSubject || !fullResponse) return;

    // Save practice questions to database
    const questionsData = {
      userId: user.id,
      subjectId: selectedSubject.id,
      topic,
      difficultyLevel: difficulty,
      questionsContent: {
        response: fullResponse,
        topic,
        difficulty,
      },
      questionCount: parseInt(questionCount) || 3,
    };

    const { data, error } = await saveAIPracticeQuestions(questionsData);
    if (error) {
      console.error('Error saving practice questions:', error);
      alert('Failed to save questions: ' + error);
    } else {
      alert('Practice questions saved successfully!');
      // Re-check limits after saving to update UI
      await checkInitialLimits();
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
          <Text style={styles.title}>Practice Questions</Text>
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
            {tier === 'pro' ? 'Pro Plan - Unlimited Questions' : tier === 'basic' ? 'Basic Plan - 5 Per Subject' : 'Free: 1 Subject Only'}
          </Text>
        </View>

        {isLoadingData || isPremiumLoading || isCheckingLimits ? (
          <LoadingSpinner message="Loading subjects..." />
        ) : (
          <>
            {/* Subject Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
                {userSubjects.map(subject => (
                  <Pressable
                    key={subject.id}
                    style={[
                      styles.subjectChip,
                      selectedSubject?.id === subject.id && styles.subjectChipActive,
                    ]}
                    onPress={() => setSelectedSubject(subject)}
                  >
                    <Text
                      style={[
                        styles.subjectChipText,
                        selectedSubject?.id === subject.id && styles.subjectChipTextActive,
                      ]}
                    >
                      {subject.code}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Topic Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Topic</Text>
              <TextInput
                style={styles.input}
                value={topic}
                onChangeText={setTopic}
                placeholder="e.g., Quadratic equations, Photosynthesis, Treaty of Versailles"
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>

            {/* Difficulty Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Difficulty Level</Text>
              <View style={styles.difficultyRow}>
                {(['easy', 'medium', 'hard'] as const).map(level => (
                  <Pressable
                    key={level}
                    style={[
                      styles.difficultyChip,
                      difficulty === level && styles.difficultyChipActive,
                    ]}
                    onPress={() => setDifficulty(level)}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        difficulty === level && styles.difficultyTextActive,
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Question Count */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Number of Questions</Text>
              <TextInput
                style={styles.input}
                value={questionCount}
                onChangeText={setQuestionCount}
                keyboardType="numeric"
                placeholder="3"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {/* Generate Button */}
            {!canGenerate && tier === 'free' && (
              <View style={styles.limitReachedCard}>
                <MaterialIcons name="lock" size={24} color={colors.warning} />
                <Text style={styles.limitReachedText}>
                  Free trial used. Upgrade to Basic ($20/6m) for all subjects with 5 question sets each or Pro ($40/6m) for unlimited!
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
            {!canGenerate && tier === 'basic' && selectedSubject && (
              <View style={styles.limitReachedCard}>
                <MaterialIcons name="lock" size={24} color={colors.premium} />
                <Text style={styles.limitReachedText}>
                  Basic plan limit reached for {selectedSubject.code} (5/5 used). Upgrade to Pro ($40/6m) for unlimited AI practice questions on all subjects!
                </Text>
                <Pressable
                  style={[styles.upgradeButton, styles.upgradeButtonPro]}
                  onPress={() => setShowPaywall(true)}
                >
                  <MaterialIcons name="workspace-premium" size={20} color={colors.background} />
                  <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                </Pressable>
              </View>
            )}
            <Button
              title={isLoading ? "Generating Questions..." : canGenerate ? "Generate Practice Questions" : "Limit Reached - Upgrade"}
              onPress={canGenerate ? handleGenerateQuestions : () => setShowPaywall(true)}
              disabled={!selectedSubject || !topic || isLoading || isCheckingLimits || !canGenerate}
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

            {/* Placeholder Text */}
            {showPlaceholder && (
              <View style={styles.placeholderCard}>
                <View style={styles.placeholderHeader}>
                  <MaterialIcons name="auto-awesome" size={24} color={colors.primary} />
                  <Text style={styles.placeholderTitle}>Generating Practice Questions</Text>
                </View>
                
                <Text style={styles.placeholderText}>{placeholderTypewriter.displayedText}</Text>
                
                {isLoading && (
                  <View style={styles.placeholderFooter}>
                    <LoadingSpinner message="" />
                    <Text style={styles.placeholderFooterText}>Powered by AI • Creating VCE-style questions...</Text>
                  </View>
                )}
              </View>
            )}

            {/* Response Display */}
            {fullResponse && (
              <View style={[styles.responseCard, showFullText && styles.fadeInCard]}>
                <View style={styles.responseHeader}>
                  <MaterialIcons name="quiz" size={24} color={colors.success} />
                  <Text style={styles.responseTitle}>Practice Questions</Text>
                </View>
                
                <Text style={styles.responseText}>{formatResponseText(fullResponse)}</Text>
                
                {/* Metadata Info */}
                {response && (
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelText}>
                      {new Date(response.timestamp).toLocaleString()} • {fullResponse.length} characters
                      {response.metadata.search_performed && ' • Web search used'}
                      {limits.aiPracticeQuestionsStorage && ' • Saved'}
                    </Text>
                  </View>
                )}
                
                {/* Save Button - Only show for Basic/Pro tiers */}
                {limits.aiPracticeQuestionsStorage && (
                  <Pressable style={styles.saveButton} onPress={handleSaveQuestions}>
                    <MaterialIcons name="save" size={20} color={colors.background} />
                    <Text style={styles.saveButtonText}>Save Questions</Text>
                  </Pressable>
                )}

                {/* Tips */}
                <View style={styles.tipsCard}>
                  <MaterialIcons name="lightbulb-outline" size={20} color={colors.warning} />
                  <Text style={styles.tipsText}>
                    Practice these questions under timed conditions to simulate real exam pressure!
                  </Text>
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
        feature="AI Practice Questions"
        description={paywallMessage || "Get AI-generated VCE-style practice questions for all your subjects"}
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
  subjectScroll: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  subjectChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  subjectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  subjectChipText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  subjectChipTextActive: {
    color: colors.background,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 50,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  difficultyChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  difficultyChipActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  difficultyText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  difficultyTextActive: {
    color: colors.background,
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
    lineHeight: 22,
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
    opacity: 0.3,
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
    marginBottom: spacing.md,
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  saveButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.background,
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  tipsText: {
    flex: 1,
    fontSize: typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
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
  upgradeButtonPro: {
    backgroundColor: colors.premium,
  },
});
