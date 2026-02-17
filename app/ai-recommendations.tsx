import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAI } from '@/hooks/useAI';
import { LoadingSpinner } from '@/components/ui';
import { getUserSubjects } from '@/services/userSubjectsService';
import { getSubjectScores } from '@/services/scoresService';
import { getStudyTimeBySubject } from '@/services/studyService';
import { VCESubject } from '@/services/vceSubjectsService';

export default function AIRecommendationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isLoading, error, getRecommendations } = useAI();
  
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [recommendations, setRecommendations] = useState<{ [subjectId: string]: any }>({});
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  async function loadUserData() {
    if (!user) return;
    
    setIsLoadingData(true);
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    setIsLoadingData(false);
  }

  async function handleGetRecommendations(subjectId: string, subjectCode: string) {
    if (!user) return;
    
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
        <View style={styles.premiumBadge}>
          <MaterialIcons name="auto-awesome" size={20} color={colors.warning} />
          <Text style={styles.premiumText}>AI-Powered Study Insights</Text>
        </View>

        <Text style={styles.description}>
          Get personalized study recommendations for each subject based on your progress and upcoming exams.
        </Text>

        {isLoadingData ? (
          <LoadingSpinner message="Loading subjects..." />
        ) : (
          <>
            {userSubjects.map(subject => {
              const subjectRec = recommendations[subject.id];
              const isLoadingSubject = isLoading && !subjectRec;
              
              return (
                <View key={subject.id} style={styles.subjectCard}>
                  <View style={styles.subjectHeader}>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName}>{subject.name}</Text>
                      <Text style={styles.subjectCode}>{subject.code}</Text>
                    </View>
                    
                    <Pressable
                      style={[styles.generateButton, isLoadingSubject && styles.generateButtonDisabled]}
                      onPress={() => handleGetRecommendations(subject.id, subject.code)}
                      disabled={isLoadingSubject}
                    >
                      <MaterialIcons 
                        name={isLoadingSubject ? "hourglass-empty" : "auto-awesome"} 
                        size={20} 
                        color={colors.background} 
                      />
                      <Text style={styles.generateButtonText}>
                        {isLoadingSubject ? "Loading..." : "Get Tips"}
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
  premiumText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.warning,
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
  followupSection: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  followupItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  followupText: {
    flex: 1,
    fontSize: typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
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
