import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAI } from '@/hooks/useAI';
import { useTypewriter } from '@/hooks/useTypewriter';
import { LoadingSpinner, Button } from '@/components/ui';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';

// Format AI response text (preserve structure, clean markdown)
function formatResponseText(text: string) {
  if (!text) return '';
  
  return text
    .replace(/### /g, '\n')
    .replace(/## /g, '\n')
    .replace(/# /g, '\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^- /gm, '  • ')
    .replace(/^\* /gm, '  • ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function AIQuestionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isLoading, error, response, generateQuestions } = useAI();
  
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<VCESubject | null>(null);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState('3');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const fadeAnim = useState(new Animated.Value(0.3))[0];

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

  // Fade-in effect when response arrives
  useEffect(() => {
    if (showFullText) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0.3);
    }
  }, [showFullText]);

  async function handleGenerateQuestions() {
    if (!user || !selectedSubject || !topic) return;
    
    setShowPlaceholder(true);
    setShowFullText(false);
    
    await generateQuestions(
      user.id,
      selectedSubject.code,
      selectedSubject.name,
      topic,
      difficulty,
      parseInt(questionCount) || 3
    );
    
    setShowPlaceholder(false);
    setTimeout(() => setShowFullText(true), 100);
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
        <View style={styles.premiumBadge}>
          <MaterialIcons name="auto-awesome" size={20} color={colors.warning} />
          <Text style={styles.premiumText}>AI Question Generator</Text>
        </View>

        {isLoadingData ? (
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
            <Button
              title={isLoading ? "Generating Questions..." : "Generate Practice Questions"}
              onPress={handleGenerateQuestions}
              disabled={!selectedSubject || !topic || isLoading}
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

            {/* Response */}
            {response && (
              <Animated.View style={[styles.responseCard, { opacity: fadeAnim }]}>
                <View style={styles.responseHeader}>
                  <MaterialIcons name="quiz" size={24} color={colors.success} />
                  <Text style={styles.responseTitle}>Practice Questions</Text>
                </View>
                
                <Text style={styles.responseText}>{formatResponseText(response.response)}</Text>
                
                {/* Metadata Info */}
                <View style={styles.modelInfo}>
                  <Text style={styles.modelText}>
                    {new Date(response.timestamp).toLocaleString()} • {response.metadata.response_length} characters
                    {response.metadata.search_performed && ' • Web search used'}
                  </Text>
                </View>
                
                {/* Tips */}
                <View style={styles.tipsCard}>
                  <MaterialIcons name="lightbulb-outline" size={20} color={colors.warning} />
                  <Text style={styles.tipsText}>
                    Practice these questions under timed conditions to simulate real exam pressure!
                  </Text>
                </View>
              </Animated.View>
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
});
