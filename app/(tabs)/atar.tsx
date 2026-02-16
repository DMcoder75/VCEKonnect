
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useATAR } from '@/hooks/useATAR';
import { ATARDisplay, Input, Button, LoadingSpinner } from '@/components';
import { SubjectScoreCard } from '@/components/feature';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';
import { useRouter, useFocusEffect } from 'expo-router';

export default function ATARScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { subjectScores, updateScore, getScenarios, getPrediction, reloadScores } = useATAR();
  
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [sacInput, setSacInput] = useState('');
  const [examInput, setExamInput] = useState('');
  const [rankInput, setRankInput] = useState('');
  
  // What-if calculator state
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [whatIfScores, setWhatIfScores] = useState<{ [subjectId: string]: { sac: number; exam: number } }>({});

  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const prediction = getPrediction();
  const scenarios = getScenarios();
  
  // Calculate what-if ATAR
  const whatIfPrediction = showWhatIf ? calculateWhatIfATAR() : null;
  
  function calculateWhatIfATAR() {
    // Clone current scores and apply what-if changes
    const modifiedScores = subjectScores.map(score => {
      const whatIf = whatIfScores[score.subjectId];
      if (whatIf) {
        return {
          ...score,
          sacAverage: whatIf.sac,
          examPrediction: whatIf.exam,
        };
      }
      return score;
    });
    
    // Use the same calculation logic from useATAR
    return getPredictionFromScores(modifiedScores);
  }
  
  function getPredictionFromScores(scores: any[]) {
    if (scores.length === 0) {
      return { atar: 0, aggregate: 0 };
    }
    
    // Simplified ATAR calculation (using same logic as atarCalculator)
    const studyScores = scores
      .map(s => {
        const sac = s.sacAverage || 0;
        const exam = s.examPrediction || 0;
        const rank = s.studyRank || 50;
        
        // Simple weighted average
        const rawScore = sac * 0.4 + exam * 0.6;
        
        // Apply cohort scaling (simplified)
        const scaledScore = rawScore * (1 + (rank - 50) / 200);
        
        return Math.max(0, Math.min(50, scaledScore));
      })
      .sort((a, b) => b - a);
    
    // Top 4 subjects (or all if less than 4)
    const top4 = studyScores.slice(0, 4);
    const aggregate = top4.reduce((sum, score) => sum + score, 0);
    
    // Add 10% of 5th and 6th subjects if available
    if (studyScores[4]) aggregate += studyScores[4] * 0.1;
    if (studyScores[5]) aggregate += studyScores[5] * 0.1;
    
    // Convert aggregate to ATAR (simplified)
    const atar = Math.min(99.95, Math.max(0, aggregate / 2));
    
    return { atar, aggregate };
  }
  
  function setWhatIfScore(subjectId: string, field: 'sac' | 'exam', value: string) {
    const numValue = parseFloat(value) || 0;
    setWhatIfScores(prev => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] || { sac: 0, exam: 0 }),
        [field]: numValue,
      },
    }));
  }
  
  function resetWhatIf() {
    setWhatIfScores({});
    setShowWhatIf(false);
  }

  useEffect(() => {
    loadSubjects();
  }, [user]);

  useEffect(() => {
    if (subjectScores) {
      setIsLoadingScores(false);
    }
  }, [subjectScores]);

  // Reload scores when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        reloadScores();
      }
    }, [user])
  );

  async function loadSubjects() {
    if (!user) return;
    setIsLoadingSubjects(true);
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    setIsLoadingSubjects(false);
  }

  function handleEditSubject(subjectId: string) {
    const existing = subjectScores.find(s => s.subjectId === subjectId);
    setEditingSubject(subjectId);
    setSacInput(existing?.sacAverage.toString() || '');
    setExamInput(existing?.examPrediction.toString() || '');
    setRankInput(existing?.studyRank.toString() || '');
  }

  async function handleSaveScore() {
    if (!editingSubject) return;
    
    const sac = parseFloat(sacInput) || 0;
    const exam = parseFloat(examInput) || 0;
    const rank = parseFloat(rankInput) || 50;

    await updateScore(editingSubject, sac, exam, rank);
    setEditingSubject(null);
    setSacInput('');
    setExamInput('');
    setRankInput('');
  }

  const isLoading = isLoadingSubjects || isLoadingScores;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ATAR Predictor</Text>
        </View>

        {isLoading ? (
          <LoadingSpinner message="Loading your ATAR data..." />
        ) : (
          <>
            {/* Main ATAR Display */}
            <View style={styles.atarCard}>
              <ATARDisplay atar={prediction.atar} size="large" />
              <Text style={styles.aggregateText}>
                Aggregate: {prediction.aggregate.toFixed(1)}
              </Text>
            </View>

            {/* What-If Calculator Toggle */}
            <Pressable
              style={[styles.whatIfToggle, showWhatIf && styles.whatIfToggleActive]}
              onPress={() => setShowWhatIf(!showWhatIf)}
            >
              <MaterialIcons 
                name="calculate" 
                size={20} 
                color={showWhatIf ? colors.background : colors.primary} 
              />
              <Text style={[styles.whatIfText, showWhatIf && styles.whatIfTextActive]}>
                {showWhatIf ? 'Exit What-If Mode' : 'Try What-If Calculator'}
              </Text>
            </Pressable>

            {/* What-If Results */}
            {showWhatIf && whatIfPrediction && (
              <View style={styles.whatIfCard}>
                <View style={styles.whatIfHeader}>
                  <MaterialIcons name="lightbulb-outline" size={24} color={colors.warning} />
                  <Text style={styles.whatIfTitle}>What-If Scenario</Text>
                </View>
                <View style={styles.whatIfResults}>
                  <View style={styles.whatIfResult}>
                    <Text style={styles.whatIfLabel}>Predicted ATAR</Text>
                    <Text style={[styles.whatIfValue, { color: colors.success }]}>
                      {whatIfPrediction.atar.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.whatIfDivider} />
                  <View style={styles.whatIfResult}>
                    <Text style={styles.whatIfLabel}>Difference</Text>
                    <Text style={[
                      styles.whatIfValue,
                      { color: whatIfPrediction.atar >= prediction.atar ? colors.success : colors.error }
                    ]}>
                      {whatIfPrediction.atar >= prediction.atar ? '+' : ''}
                      {(whatIfPrediction.atar - prediction.atar).toFixed(2)}
                    </Text>
                  </View>
                </View>
                <Pressable style={styles.resetButton} onPress={resetWhatIf}>
                  <Text style={styles.resetButtonText}>Reset Changes</Text>
                </Pressable>
              </View>
            )}

            {/* Scenarios */}
            <View style={styles.scenariosCard}>
              <Text style={styles.sectionTitle}>ATAR Scenarios</Text>
              <View style={styles.scenarioRow}>
                <View style={styles.scenarioItem}>
                  <Text style={[styles.scenarioValue, { color: colors.success }]}>
                    {scenarios.bestCase.toFixed(2)}
                  </Text>
                  <Text style={styles.scenarioLabel}>Best Case</Text>
                  <Text style={styles.scenarioDesc}>+10% all exams</Text>
                </View>
                <View style={styles.scenarioDivider} />
                <View style={styles.scenarioItem}>
                  <Text style={[styles.scenarioValue, { color: colors.atarMid }]}>
                    {scenarios.current.toFixed(2)}
                  </Text>
                  <Text style={styles.scenarioLabel}>Current</Text>
                  <Text style={styles.scenarioDesc}>Based on inputs</Text>
                </View>
                <View style={styles.scenarioDivider} />
                <View style={styles.scenarioItem}>
                  <Text style={[styles.scenarioValue, { color: colors.warning }]}>
                    {scenarios.worstCase.toFixed(2)}
                  </Text>
                  <Text style={styles.scenarioLabel}>Worst Case</Text>
                  <Text style={styles.scenarioDesc}>-10% all exams</Text>
                </View>
              </View>
            </View>

            {/* Subject Scores */}
            <Text style={styles.sectionTitle}>Subject Scores</Text>
            <Text style={styles.sectionDesc}>
              Enter your SAC averages and predicted exam scores
            </Text>

            {userSubjects.map(subject => {
              const score = subjectScores.find(s => s.subjectId === subject.id);
              const isEditing = editingSubject === subject.id;
              const whatIf = whatIfScores[subject.id];
              const displaySac = showWhatIf && whatIf ? whatIf.sac : score?.sacAverage || 0;
              const displayExam = showWhatIf && whatIf ? whatIf.exam : score?.examPrediction || 0;

              return (
                <View key={subject.id} style={styles.subjectContainer}>
                  {showWhatIf && score ? (
                    <View style={[styles.whatIfSubjectCard, whatIf && styles.whatIfSubjectCardActive]}>
                      <Text style={styles.whatIfSubjectName}>{subject.name}</Text>
                      <View style={styles.whatIfInputs}>
                        <View style={styles.whatIfInputGroup}>
                          <Text style={styles.whatIfInputLabel}>SAC %</Text>
                          <TextInput
                            style={styles.whatIfInput}
                            value={whatIf?.sac?.toString() || score.sacAverage.toString()}
                            onChangeText={(v) => setWhatIfScore(subject.id, 'sac', v)}
                            keyboardType="numeric"
                            placeholder={score.sacAverage.toString()}
                            placeholderTextColor={colors.textTertiary}
                          />
                        </View>
                        <View style={styles.whatIfInputGroup}>
                          <Text style={styles.whatIfInputLabel}>Exam %</Text>
                          <TextInput
                            style={styles.whatIfInput}
                            value={whatIf?.exam?.toString() || score.examPrediction.toString()}
                            onChangeText={(v) => setWhatIfScore(subject.id, 'exam', v)}
                            keyboardType="numeric"
                            placeholder={score.examPrediction.toString()}
                            placeholderTextColor={colors.textTertiary}
                          />
                        </View>
                      </View>
                    </View>
                  ) : !isEditing && score ? (
                    <Pressable onPress={() => handleEditSubject(subject.id)}>
                      <SubjectScoreCard
                        subjectId={subject.id}
                        subjectName={subject.name}
                        subjectCode={subject.code}
                        sacAverage={score.sacAverage}
                        examPrediction={score.examPrediction}
                        predictedStudyScore={score.predictedStudyScore}
                      />
                    </Pressable>
                  ) : isEditing ? (
                    <View style={styles.editCard}>
                      <View style={styles.editHeader}>
                        <Text style={styles.editTitle}>{subject.name}</Text>
                        <Pressable onPress={() => setEditingSubject(null)}>
                          <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                      
                      <Input
                        label="SAC Average (%)"
                        value={sacInput}
                        onChangeText={setSacInput}
                        keyboardType="numeric"
                        placeholder="e.g., 85"
                      />
                      
                      <Input
                        label="Predicted Exam Score (%)"
                        value={examInput}
                        onChangeText={setExamInput}
                        keyboardType="numeric"
                        placeholder="e.g., 80"
                      />
                      
                      <Input
                        label="Study Rank (percentile, 1-100)"
                        value={rankInput}
                        onChangeText={setRankInput}
                        keyboardType="numeric"
                        placeholder="e.g., 50 (average)"
                      />
                      
                      <Button title="Save Score" onPress={handleSaveScore} fullWidth />
                    </View>
                  ) : (
                    <Pressable
                      style={styles.addScoreCard}
                      onPress={() => handleEditSubject(subject.id)}
                    >
                      <MaterialIcons name="add-circle-outline" size={32} color={colors.primary} />
                      <Text style={styles.addScoreText}>{subject.name}</Text>
                      <Text style={styles.addScoreDesc}>Tap to add scores</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            {userSubjects.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="assessment" size={64} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No subjects selected</Text>
                <Text style={styles.emptyDesc}>
                  Add subjects in onboarding to start tracking
                </Text>
              </View>
            )}

            {/* Info Card */}
            <View style={styles.infoCard}>
              <MaterialIcons name="info-outline" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                This ATAR prediction uses simplified VTAC scaling formulas. 
                Actual ATAR may vary based on cohort performance and official scaling.
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
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  atarCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  aggregateText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  scenariosCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  scenarioRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  scenarioItem: {
    flex: 1,
    alignItems: 'center',
  },
  scenarioValue: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
  },
  scenarioLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scenarioDesc: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },
  scenarioDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
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
  subjectContainer: {
    marginBottom: spacing.md,
  },
  editCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  addScoreCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  addScoreText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  addScoreDesc: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyDesc: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
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
  whatIfToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  whatIfToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  whatIfText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  whatIfTextActive: {
    color: colors.background,
  },
  whatIfCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.warning,
  },
  whatIfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  whatIfTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  whatIfResults: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  whatIfResult: {
    flex: 1,
    alignItems: 'center',
  },
  whatIfLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  whatIfValue: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
  },
  whatIfDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  resetButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  whatIfSubjectCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  whatIfSubjectCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  whatIfSubjectName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  whatIfInputs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  whatIfInputGroup: {
    flex: 1,
  },
  whatIfInputLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  whatIfInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
});
