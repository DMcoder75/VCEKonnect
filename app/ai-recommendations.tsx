import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAI } from '@/hooks/useAI';
import { usePremium } from '@/hooks/usePremium';
import { useAlert } from '@/template';
import { LoadingSpinner } from '@/components/ui';
import { PremiumPaywall } from '@/components/feature';
import { getUserSubjects } from '@/services/userSubjectsService';
import { getSubjectScores } from '@/services/scoresService';
import { getStudyTimeBySubject } from '@/services/studyService';
import { VCESubject } from '@/services/vceSubjectsService';
import { canCreateAIRecommendation, saveAIRecommendation } from '@/services/premiumService';
import { exportRecommendationsToPDF } from '@/services/exportService';

export default function AIRecommendationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { error, getRecommendations } = useAI();
  const { tier, limits, isPremium, isLoading: isPremiumLoading } = usePremium();
  const { showAlert } = useAlert();
  
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [recommendations, setRecommendations] = useState<{ [subjectId: string]: any }>({});
  const [loadingSubjects, setLoadingSubjects] = useState<{ [subjectId: string]: boolean }>({});
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Premium paywall states
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState('');
  const [currentSubjectId, setCurrentSubjectId] = useState('');
  const [disabledSubjects, setDisabledSubjects] = useState<Set<string>>(new Set());
  const [isGeneratingForFree, setIsGeneratingForFree] = useState(false); // Track if free user is generating
  const [isCheckingLimits, setIsCheckingLimits] = useState(true); // Track initial limit check

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  useEffect(() => {
    if (user && userSubjects.length > 0 && tier === 'free') {
      checkFreeTrialUsed();
    }
  }, [user, userSubjects, tier]);

  async function checkFreeTrialUsed() {
    if (!user || tier !== 'free') {
      setIsCheckingLimits(false);
      return;
    }
    
    setIsCheckingLimits(true);
    // For free tier, check if ANY subject has been used
    const disabledSet = new Set<string>();
    for (const subject of userSubjects) {
      const check = await canCreateAIRecommendation(user.id, subject.id);
      if (!check.allowed) {
        disabledSet.add(subject.id);
      }
    }
    setDisabledSubjects(disabledSet);
    setIsCheckingLimits(false);
  }

  async function loadUserData() {
    if (!user) return;
    
    setIsLoadingData(true);
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    setIsLoadingData(false);
  }

  async function handleExportAllPDF() {
    if (Object.keys(recommendations).length === 0) {
      showAlert('No Data', 'No recommendations to export');
      return;
    }

    const exportData = Object.entries(recommendations).map(([subjectId, rec]) => {
      const subject = userSubjects.find(s => s.id === subjectId);
      return {
        subjectCode: subject?.code || 'Unknown',
        subjectName: subject?.name || 'Unknown',
        recommendation: rec.response,
        timestamp: rec.timestamp,
      };
    });

    const result = await exportRecommendationsToPDF(exportData);

    if (result.success) {
      showAlert('Success', result.message);
    } else {
      showAlert('Error', result.message);
    }
  }

  async function handleGetRecommendations(subjectId: string, subjectCode: string, subjectName: string) {
    if (!user) return;
    
    // Check if subject is disabled (free trial already used)
    if (disabledSubjects.has(subjectId)) {
      setCurrentSubjectId(subjectId);
      setPaywallMessage('Free tier limited to 1 subject recommendation. Upgrade to Basic ($20/6m) for all subjects with 5 tries each!');
      setShowPaywall(true);
      return;
    }
    
    // Check premium limits before generating
    const check = await canCreateAIRecommendation(user.id, subjectId);
    if (!check.allowed) {
      setCurrentSubjectId(subjectId);
      setPaywallMessage(check.reason);
      setShowPaywall(true);
      // Add to disabled list
      setDisabledSubjects(prev => new Set(prev).add(subjectId));
      return;
    }
    
    // CRITICAL: For free tier, disable ALL buttons immediately when generating
    if (tier === 'free') {
      setIsGeneratingForFree(true);
    }
    
    // Set loading state for this specific subject
    setLoadingSubjects(prev => ({ ...prev, [subjectId]: true }));
    
    try {
      // Get study time
      const studyTime = await getStudyTimeBySubject(user.id);
      const recentMinutes = studyTime[subjectId] || 0;
      
      // Get current score
      const scores = await getSubjectScores(user.id);
      const score = scores.find(s => s.subjectId === subjectId);
      const currentScore = score ? (score.sacAverage + score.examPrediction) / 2 : 0;
      
      // Calculate days until exam (VCE exams typically in November)
      const examDate = new Date('2026-11-01');
      const today = new Date();
      const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const result = await getRecommendations(
        user.id,
        subjectCode,
        subjectName,
        recentMinutes,
        'Recently',
        Math.round(currentScore),
        daysUntilExam
      );
      
      if (result.data) {
        setRecommendations(prev => ({
          ...prev,
          [subjectId]: result.data,
        }));

        // CRITICAL: Auto-save to database to track usage (required for limit enforcement)
        // This ensures free tier users can't spam generate after their first use
        const initialResponse = result.data.response || '';
        const recommendationData = {
          userId: user.id,
          subjectId,
          recommendationType: 'study_strategy',
          recommendationContent: {
            response: initialResponse,
            metadata: result.data.metadata,
          },
          recommendationSummary: initialResponse.substring(0, 200) + '...',
          contextData: {
            recentMinutes,
            currentScore,
            daysUntilExam,
          },
        };

        await saveAIRecommendation(recommendationData);
        
        // CRITICAL: For free tier, after response is received, lock ALL subjects
        if (tier === 'free') {
          const allSubjectIds = new Set(userSubjects.map(s => s.id));
          setDisabledSubjects(allSubjectIds);
        } else {
          // For paid tiers, re-check limits for this specific subject
          await checkFreeTrialUsed();
        }
      }
    } finally {
      // Clear loading state for this subject
      setLoadingSubjects(prev => ({ ...prev, [subjectId]: false }));
      
      // Clear free tier generation lock
      if (tier === 'free') {
        setIsGeneratingForFree(false);
      }
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
          <Text style={styles.title}>AI Recommendations</Text>
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
            {tier === 'pro' ? 'Pro Plan - Unlimited Recommendations' : tier === 'basic' ? 'Basic Plan - 5 Per Subject' : 'Free: 1 Subject Only'}
          </Text>
        </View>

        <Text style={styles.description}>
          Get personalized study recommendations for each subject based on your progress and upcoming exams.
        </Text>

        {isLoadingData || isPremiumLoading || isCheckingLimits ? (
          <LoadingSpinner message="Loading subjects..." />
        ) : (
          <>
            {/* Export All Button - Show when there are recommendations */}
            {Object.keys(recommendations).length > 0 && (
              <Pressable style={styles.exportAllButton} onPress={handleExportAllPDF}>
                <MaterialIcons name="picture-as-pdf" size={20} color={colors.background} />
                <Text style={styles.exportAllButtonText}>Export All to PDF</Text>
              </Pressable>
            )}
            {/* Limit Reached Banner - Show above subject list for free tier */}
            {disabledSubjects.size > 0 && tier === 'free' && (
              <View style={styles.limitReachedBanner}>
                <MaterialIcons name="lock" size={20} color={colors.warning} />
                <Text style={styles.limitReachedText}>
                  Free tier limited to 1 subject recommendation. Upgrade to Basic ($20/6m) for all subjects with 5 tries each or Pro ($40/6m) for unlimited!
                </Text>
                <Pressable
                  style={styles.upgradeButtonSmall}
                  onPress={() => setShowPaywall(true)}
                >
                  <Text style={styles.upgradeButtonSmallText}>Upgrade Now</Text>
                </Pressable>
              </View>
            )}
            {/* Basic Tier Limit Banner */}
            {disabledSubjects.size > 0 && tier === 'basic' && (
              <View style={styles.limitReachedBanner}>
                <MaterialIcons name="lock" size={20} color={colors.premium} />
                <Text style={styles.limitReachedText}>
                  Basic plan limit reached for some subjects (5/5 used). Upgrade to Pro ($40/6m) for unlimited AI recommendations on all subjects!
                </Text>
                <Pressable
                  style={[styles.upgradeButtonSmall, styles.upgradeButtonPro]}
                  onPress={() => setShowPaywall(true)}
                >
                  <Text style={styles.upgradeButtonSmallText}>Upgrade to Pro</Text>
                </Pressable>
              </View>
            )}

            {userSubjects.map(subject => {
              const subjectRec = recommendations[subject.id];
              const isLoadingSubject = loadingSubjects[subject.id] || false;
              const isDisabled = isLoadingSubject || disabledSubjects.has(subject.id) || isGeneratingForFree;
              const isLocked = disabledSubjects.has(subject.id);
              
              return (
                <View key={subject.id} style={styles.subjectCard}>
                  <View style={styles.subjectHeader}>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName}>{subject.name}</Text>
                      <Text style={styles.subjectCode}>{subject.code}</Text>
                    </View>
                    
                    <Pressable
                      style={[
                        styles.generateButton, 
                        isDisabled && styles.generateButtonDisabled
                      ]}
                      onPress={() => {
                        if (isLocked) {
                          setCurrentSubjectId(subject.id);
                          setPaywallMessage('Free tier limited to 1 subject recommendation. Upgrade to Basic ($20/6m) for all subjects with 5 tries each!');
                          setShowPaywall(true);
                        } else {
                          handleGetRecommendations(subject.id, subject.code, subject.name);
                        }
                      }}
                      disabled={isDisabled}
                    >
                      <MaterialIcons 
                        name={isLocked ? "lock" : isLoadingSubject ? "hourglass-empty" : "auto-awesome"} 
                        size={20} 
                        color={colors.background} 
                      />
                      <Text style={styles.generateButtonText}>
                        {isLocked ? "Locked" : isLoadingSubject ? "Loading..." : "Get Tips"}
                      </Text>
                    </Pressable>
                  </View>
                  
                  {isLoadingSubject && (
                    <View style={styles.loadingSection}>
                      <LoadingSpinner message="Analyzing your progress..." />
                    </View>
                  )}
                  
                  {subjectRec && (
                    <View style={styles.recommendationSection}>
                      <Text style={styles.recommendationText}>{subjectRec.response}</Text>
                      
                      <View style={styles.metaInfo}>
                        <Text style={styles.metaText}>
                          Generated {new Date(subjectRec.timestamp).toLocaleTimeString()}
                          {subjectRec.metadata?.search_performed && ' • Web search used'}
                          {limits.aiRecommendationsStorage && ' • Saved'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

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
      </ScrollView>

      {/* Premium Paywall */}
      <PremiumPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="AI Recommendations"
        description={paywallMessage || "Get AI-powered subject recommendations for all your subjects"}
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
  description: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  subjectCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  subjectCode: {
    fontSize: typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.background,
  },
  loadingSection: {
    paddingVertical: spacing.md,
  },
  recommendationSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  recommendationText: {
    fontSize: typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  metaInfo: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  limitReachedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: spacing.sm,
  },
  limitReachedText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  upgradeButtonSmall: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  upgradeButtonSmallText: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
    color: colors.background,
  },
  upgradeButtonPro: {
    backgroundColor: colors.premium,
  },
  exportAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  exportAllButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
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
});
