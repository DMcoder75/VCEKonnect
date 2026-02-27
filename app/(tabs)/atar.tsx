import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useATAR } from '@/hooks/useATAR';
import { usePremium } from '@/hooks/usePremium';
import { useAlert } from '@/template';
import { getStateConfig } from '@/services/atarCalculator';
import { ATARDisplay, Input, Button, LoadingSpinner } from '@/components';
import { SubjectScoreCard, PremiumPaywall, PremiumBlurOverlay } from '@/components/feature';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';
import { useRouter, useFocusEffect } from 'expo-router';
import { canCreateWhatIfScenario, saveWhatIfScenario } from '@/services/premiumService';
import { exportATARToPDF } from '@/services/exportService';

export default function ATARScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { subjectScores, updateScore, getScenarios, getPrediction, reloadScores } = useATAR();
  const { tier, limits, isPremium, isLoading: isPremiumLoading } = usePremium();
  const { showAlert } = useAlert();
  
  // Get state configuration
  const stateId = (user?.stateId || 'VIC') as 'VIC' | 'NSW' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';
  const stateConfig = getStateConfig(stateId);
  
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [sacInput, setSacInput] = useState('');
  const [examInput, setExamInput] = useState('');
  const [rankInput, setRankInput] = useState('');
  
  // What-if calculator state
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [whatIfScores, setWhatIfScores] = useState<{ [subjectId: string]: { sac: number; exam: number } }>({});
  
  // Advanced tools state
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [targetATAR, setTargetATAR] = useState('');
  const [showScaling, setShowScaling] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Premium paywalls
  const [showRoadmapPaywall, setShowRoadmapPaywall] = useState(false);
  const [showWhatIfPaywall, setShowWhatIfPaywall] = useState(false);
  const [showAIStrategyPaywall, setShowAIStrategyPaywall] = useState(false);
  const [showAIAdvancedPaywall, setShowAIAdvancedPaywall] = useState(false);
  const [requiredAITier, setRequiredAITier] = useState<'basic' | 'pro'>('basic');

  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const prediction = getPrediction();
  const scenarios = getScenarios();
  
  // Calculate what-if ATAR
  const whatIfPrediction = showWhatIf ? calculateWhatIfATAR() : null;
  
  function calculateWhatIfATAR() {
    if (subjectScores.length === 0) {
      return { atar: 0, aggregate: 0 };
    }
    
    // Clone current scores and apply what-if changes
    const modifiedScores = subjectScores.map(score => {
      const whatIf = whatIfScores[score.subjectId];
      if (whatIf) {
        return {
          ...score,
          sacAverage: whatIf.sac || score.sacAverage || 0,
          examPrediction: whatIf.exam || score.examPrediction || 0,
        };
      }
      return score;
    });
    
    // Use the same calculation logic from useATAR
    return getPredictionFromScores(modifiedScores);
  }
  
  function getPredictionFromScores(scores: any[]) {
    if (!scores || scores.length === 0) {
      return { atar: 0, aggregate: 0 };
    }
    
    // Simplified ATAR calculation (using same logic as atarCalculator)
    const studyScores = scores
      .filter(s => {
        // Only include scores where at least one value is defined and not null
        return s && (
          (typeof s.sacAverage === 'number' && s.sacAverage >= 0) || 
          (typeof s.examPrediction === 'number' && s.examPrediction >= 0)
        );
      })
      .map(s => {
        const sac = typeof s.sacAverage === 'number' ? s.sacAverage : 0;
        const exam = typeof s.examPrediction === 'number' ? s.examPrediction : 0;
        const rank = typeof s.studyRank === 'number' ? s.studyRank : 50;
        
        // Simple weighted average
        const rawScore = sac * 0.4 + exam * 0.6;
        
        // Apply cohort scaling (simplified)
        const scaledScore = rawScore * (1 + (rank - 50) / 200);
        
        return Math.max(0, Math.min(50, scaledScore));
      })
      .sort((a, b) => b - a);
    
    if (studyScores.length === 0) {
      return { atar: 0, aggregate: 0 };
    }
    
    // Top 4 subjects (or all if less than 4)
    const top4 = studyScores.slice(0, 4);
    let aggregate = top4.reduce((sum, score) => sum + score, 0);
    
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

  async function handleSaveWhatIfScenario() {
    if (!user) return;

    // Check if user has premium access
    const { allowed, reason } = await canCreateWhatIfScenario(user.id);
    if (!allowed) {
      setShowWhatIfPaywall(true);
      return;
    }

    // Save the scenario
    const scenarioData = {
      userId: user.id,
      scenarioName: `What-If ${new Date().toLocaleDateString()}`,
      subjectScores: subjectScores.map(score => ({
        subjectId: score.subjectId,
        sacAverage: whatIfScores[score.subjectId]?.sac || score.sacAverage || 0,
        examPrediction: whatIfScores[score.subjectId]?.exam || score.examPrediction || 0,
        studyRank: score.studyRank || 50,
      })),
      predictedAtar: whatIfPrediction?.atar || 0,
      predictedAggregate: whatIfPrediction?.aggregate || 0,
      currentAtar: prediction.atar,
      atarDifference: (whatIfPrediction?.atar || 0) - prediction.atar,
    };

    const { data, error } = await saveWhatIfScenario(scenarioData);
    if (error) {
      console.error('Error saving scenario:', error);
    } else {
      alert('Scenario saved successfully!');
    }
  }
  
  // Calculate required improvements to reach target ATAR
  function calculateRoadmap() {
    if (!targetATAR || parseFloat(targetATAR) <= prediction.atar) {
      return null;
    }
    
    const target = parseFloat(targetATAR);
    const gap = target - prediction.atar;
    
    // Calculate required aggregate
    const currentAggregate = prediction.aggregate;
    const requiredAggregate = currentAggregate + (gap * 2); // Approximate conversion
    
    // Calculate score improvements needed per subject
    const improvements = subjectScores.map(score => {
      const currentStudyScore = score.predictedStudyScore;
      const improvementNeeded = (requiredAggregate - currentAggregate) / subjectScores.length;
      const targetStudyScore = Math.min(50, currentStudyScore + improvementNeeded);
      const scoreGap = targetStudyScore - currentStudyScore;
      
      // Convert study score gap to percentage improvement
      const percentageImprovement = (scoreGap / 50) * 100;
      
      return {
        subjectId: score.subjectId,
        current: currentStudyScore,
        target: targetStudyScore,
        improvementNeeded: scoreGap,
        percentageBoost: percentageImprovement,
      };
    }).sort((a, b) => b.improvementNeeded - a.improvementNeeded);
    
    return {
      targetATAR: target,
      currentATAR: prediction.atar,
      gap,
      requiredAggregate,
      improvements,
    };
  }
  
  // Get subject difficulty recommendations based on scaling data
  function getSubjectRecommendations() {
    if (userSubjects.length === 0) return [];
    
    const recommendations = userSubjects.map(subject => {
      const score = subjectScores.find(s => s.subjectId === subject.id);
      const scaledMean = subject.scaledMean || 30;
      const scaledStdDev = subject.scaledStdDev || 7;
      
      // Calculate difficulty rating (higher mean = harder/better scaling)
      const difficultyRating = scaledMean / 50; // Normalized to 0-1
      const scalingPotential = (scaledMean - 30) / 10; // Scaling advantage
      
      // Calculate current performance vs potential
      const currentPerformance = score ? (score.sacAverage + score.examPrediction) / 2 : 0;
      const potentialGain = scalingPotential * (100 - currentPerformance) / 100;
      
      let recommendation = '';
      let priority: 'high' | 'medium' | 'low' = 'medium';
      
      if (scaledMean >= 35) {
        recommendation = `High scaling subject! Even moderate scores get scaled up significantly.`;
        priority = 'high';
      } else if (scaledMean >= 30) {
        recommendation = `Average scaling. Focus on consistency and strong exam performance.`;
        priority = 'medium';
      } else {
        recommendation = `Lower scaling. Aim for very high raw scores (85%+) to maximize ATAR impact.`;
        priority = currentPerformance >= 80 ? 'medium' : 'high';
      }
      
      return {
        subject,
        scaledMean,
        scaledStdDev,
        difficultyRating,
        scalingPotential,
        currentPerformance,
        potentialGain,
        recommendation,
        priority,
      };
    }).sort((a, b) => b.scalingPotential - a.scalingPotential);
    
    return recommendations;
  }

  function handleAIStrategy() {
    if (!limits.atarAISubjectStrategy) {
      setRequiredAITier('basic');
      setShowAIStrategyPaywall(true);
      return;
    }
    // TODO: Navigate to AI Strategy page
    alert('AI Subject Strategy feature coming soon!');
  }

  function handleAIAdvancedStrategy() {
    if (!limits.atarAIAdvancedStrategy) {
      setRequiredAITier('pro');
      setShowAIAdvancedPaywall(true);
      return;
    }
    // TODO: Navigate to AI Advanced Strategy page
    alert('AI Advanced Strategy feature coming soon!');
  }
  
  const roadmap = calculateRoadmap();
  const recommendations = getSubjectRecommendations();

  async function handleExportPDF() {
    if (!user || subjectScores.length === 0) {
      showAlert('No Data', 'No ATAR data to export');
      return;
    }

    const exportData = {
      name: user.email,
      atar: prediction.atar,
      aggregate: prediction.aggregate,
      subjects: subjectScores.map(score => {
        const subject = userSubjects.find(s => s.id === score.subjectId);
        return {
          code: subject?.code || score.subjectId,
          name: subject?.name || 'Unknown',
          sacAverage: score.sacAverage,
          examPrediction: score.examPrediction,
          studyRank: score.studyRank,
          predictedStudyScore: score.predictedStudyScore,
        };
      }),
      stateConfig,
    };

    const result = await exportATARToPDF(exportData);

    if (result.success) {
      showAlert('Success', result.message);
    } else {
      showAlert('Error', result.message);
    }
  }

  // Get state-specific warning message
  function getStateWarning(state: StateID): string | null {
    const warnings: Record<StateID, string | null> = {
      VIC: null, // No warning - most comprehensive data
      NSW: 'NSW HSC uses UAC scaling. Predictions based on 2-unit subject equivalents.',
      ACT: 'ACT uses UAC scaling (same as NSW). Limited local scaling data available.',
      QLD: 'QLD uses QTAC with credit points system. Predictions are approximate conversions to ATAR scale.',
      WA: 'WA uses TISC scaling. Best 4 subjects counted. Predictions based on scaled scores.',
      SA: 'SA uses SATAC scaling. Best 5 subjects counted (or 4.5 with Research Project).',
      TAS: '⚠️ Limited scaling data for Tasmania. Predictions may be less accurate than mainland states.',
      NT: '⚠️ Very small cohort. Limited subject offerings. Predictions may not reflect actual ATAR outcomes.',
    };
    return warnings[state];
  }

  // Get calculation description for each state
  function getCalculationDescription(state: StateID): string {
    const descriptions: Record<StateID, string> = {
      VIC: 'VTAC uses your best 4 subjects (including English) plus 10% of your next 2 subjects. VCE subjects are scaled based on cohort performance.',
      NSW: 'UAC uses your best 10 units (usually 5 subjects including English). HSC marks are scaled based on student performance across all courses.',
      ACT: 'UAC uses your best 10 units (usually 5 subjects including English). ACT subjects follow NSW HSC scaling methodology.',
      QLD: 'QTAC uses your best 5 subjects including English. QCE subjects use credit points and scaled subject results rather than traditional study scores.',
      WA: 'TISC uses your best 4 subjects including an English course. WACE scaled scores are calculated differently from eastern states.',
      SA: 'SATAC uses your best 5 subjects (or 4.5 if including Research Project). SACE subjects are scaled based on cohort performance.',
      TAS: 'TASC uses your best 5 subjects including English. TCE scaling follows similar principles to other states but with a smaller cohort.',
      NT: 'NTBOS uses your best 5 subjects including English. Limited scaling data due to small cohort size means predictions are less reliable.',
    };
    return descriptions[state];
  }

  // Get subject count description
  function getSubjectCountDescription(state: StateID): string {
    const counts: Record<StateID, string> = {
      VIC: 'Best 4 subjects + 10% of next 2',
      NSW: 'Best 10 units (≈5 subjects)',
      ACT: 'Best 10 units (≈5 subjects)',
      QLD: 'Best 5 subjects',
      WA: 'Best 4 subjects',
      SA: 'Best 5 subjects',
      TAS: 'Best 5 subjects',
      NT: 'Best 5 subjects',
    };
    return counts[state];
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
    // Check premium limits for score editing
    if (!limits.atarSubjectScoreEditing) {
      alert('Subject score editing is a premium feature. Upgrade to Basic plan to unlock!');
      return;
    }

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

  const isLoading = isLoadingSubjects || isLoadingScores || isPremiumLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>ATAR Predictor</Text>
            <Text style={styles.stateBadge}>
              {stateConfig.stateName} ({stateConfig.scalingAuthority})
            </Text>
          </View>
          {!isLoading && subjectScores.length > 0 && (
            <Pressable style={styles.exportPdfButton} onPress={handleExportPDF}>
              <MaterialIcons name="picture-as-pdf" size={20} color={colors.background} />
              <Text style={styles.exportPdfButtonText}>Export PDF</Text>
            </Pressable>
          )}
        </View>

        {/* State-Specific Warnings */}
        {getStateWarning(stateId) && (
          <View style={[
            styles.stateWarningCard,
            stateId === 'TAS' || stateId === 'NT' ? styles.stateWarningCardHigh : styles.stateWarningCardMedium
          ]}>
            <MaterialIcons 
              name={stateId === 'TAS' || stateId === 'NT' ? 'warning' : 'info'} 
              size={20} 
              color={stateId === 'TAS' || stateId === 'NT' ? colors.warning : colors.primary} 
            />
            <Text style={styles.stateWarningText}>{getStateWarning(stateId)}</Text>
          </View>
        )}

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

            {/* Advanced Tools Grid */}
            <View style={styles.toolsGrid}>
              <Pressable
                style={[styles.toolCard, showWhatIf && styles.toolCardActive]}
                onPress={() => {
                  setShowWhatIf(!showWhatIf);
                  setShowRoadmap(false);
                  setShowScaling(false);
                  setShowRecommendations(false);
                }}
              >
                <MaterialIcons 
                  name="calculate" 
                  size={24} 
                  color={showWhatIf ? colors.background : colors.primary} 
                />
                <Text style={[styles.toolText, showWhatIf && styles.toolTextActive]}>What-If</Text>
              </Pressable>
              
              <Pressable
                style={[styles.toolCard, showRoadmap && styles.toolCardActive]}
                onPress={() => {
                  if (!limits.atarRoadmapAccess) {
                    setShowRoadmapPaywall(true);
                    return;
                  }
                  setShowRoadmap(!showRoadmap);
                  setShowWhatIf(false);
                  setShowScaling(false);
                  setShowRecommendations(false);
                }}
              >
                {!limits.atarRoadmapAccess && (
                  <MaterialIcons name="lock" size={12} color={colors.warning} style={styles.lockIcon} />
                )}
                <MaterialIcons 
                  name="route" 
                  size={24} 
                  color={showRoadmap ? colors.background : colors.success} 
                />
                <Text style={[styles.toolText, showRoadmap && styles.toolTextActive]}>Roadmap</Text>
              </Pressable>
              
              <Pressable
                style={[styles.toolCard, showRecommendations && styles.toolCardActive]}
                onPress={() => {
                  setShowRecommendations(!showRecommendations);
                  setShowWhatIf(false);
                  setShowRoadmap(false);
                  setShowScaling(false);
                }}
              >
                <MaterialIcons 
                  name="trending-up" 
                  size={24} 
                  color={showRecommendations ? colors.background : colors.warning} 
                />
                <Text style={[styles.toolText, showRecommendations && styles.toolTextActive]}>Tips</Text>
              </Pressable>
              
              <Pressable
                style={[styles.toolCard, showScaling && styles.toolCardActive]}
                onPress={() => {
                  setShowScaling(!showScaling);
                  setShowWhatIf(false);
                  setShowRoadmap(false);
                  setShowRecommendations(false);
                }}
              >
                <MaterialIcons 
                  name="show-chart" 
                  size={24} 
                  color={showScaling ? colors.background : colors.error} 
                />
                <Text style={[styles.toolText, showScaling && styles.toolTextActive]}>Scaling</Text>
              </Pressable>
            </View>

            {/* Target Score Roadmap */}
            {showRoadmap && limits.atarRoadmapAccess && (
              <View style={styles.roadmapCard}>
                <View style={styles.roadmapHeader}>
                  <MaterialIcons name="route" size={24} color={colors.success} />
                  <Text style={styles.roadmapTitle}>Target Score Roadmap</Text>
                </View>
                <Text style={styles.roadmapDesc}>Enter your target ATAR to see what you need</Text>
                
                <View style={styles.targetInputContainer}>
                  <Text style={styles.targetInputLabel}>Target ATAR:</Text>
                  <TextInput
                    style={styles.targetInput}
                    value={targetATAR}
                    onChangeText={setTargetATAR}
                    keyboardType="numeric"
                    placeholder="e.g., 95.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                
                {roadmap && (
                  <View style={styles.roadmapResults}>
                    <View style={styles.roadmapStats}>
                      <View style={styles.roadmapStat}>
                        <Text style={styles.roadmapStatLabel}>Current</Text>
                        <Text style={[styles.roadmapStatValue, { color: colors.primary }]}>
                          {roadmap.currentATAR.toFixed(2)}
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={24} color={colors.textSecondary} />
                      <View style={styles.roadmapStat}>
                        <Text style={styles.roadmapStatLabel}>Target</Text>
                        <Text style={[styles.roadmapStatValue, { color: colors.success }]}>
                          {roadmap.targetATAR.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.roadmapStat}>
                        <Text style={styles.roadmapStatLabel}>Gap</Text>
                        <Text style={[styles.roadmapStatValue, { color: colors.warning }]}>
                          +{roadmap.gap.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.improvementsTitle}>Required Improvements:</Text>
                    {roadmap.improvements.map((imp, idx) => {
                      const subject = userSubjects.find(s => s.id === imp.subjectId);
                      return (
                        <View key={imp.subjectId} style={styles.improvementItem}>
                          <View style={styles.improvementHeader}>
                            <Text style={styles.improvementSubject}>{subject?.code || imp.subjectId}</Text>
                            <Text style={styles.improvementValue}>+{imp.improvementNeeded.toFixed(1)} points</Text>
                          </View>
                          <View style={styles.improvementBar}>
                            <View style={styles.improvementBarBg}>
                              <View 
                                style={[
                                  styles.improvementBarFill, 
                                  { width: `${Math.min(100, (imp.target / 50) * 100)}%` }
                                ]} 
                              />
                            </View>
                            <Text style={styles.improvementText}>
                              {imp.current.toFixed(1)} → {imp.target.toFixed(1)} (≈{imp.percentageBoost.toFixed(0)}% boost)
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                    
                    <View style={styles.roadmapTip}>
                      <MaterialIcons name="lightbulb-outline" size={20} color={colors.warning} />
                      <Text style={styles.roadmapTipText}>
                        Focus on your weakest subjects first - they have the most room for improvement!
                      </Text>
                    </View>
                  </View>
                )}
                
                {targetATAR && !roadmap && (
                  <View style={styles.roadmapMessage}>
                    <Text style={styles.roadmapMessageText}>
                      Your current ATAR ({prediction.atar.toFixed(2)}) is already at or above your target!
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Subject Difficulty Recommendations */}
            {showRecommendations && (
              <View style={styles.recommendationsCard}>
                <View style={styles.recommendationsHeader}>
                  <MaterialIcons name="trending-up" size={24} color={colors.warning} />
                  <Text style={styles.recommendationsTitle}>Subject Strategy Tips</Text>
                </View>
                <Text style={styles.recommendationsDesc}>Smart recommendations based on VCE scaling</Text>
                
                {recommendations.map((rec, idx) => (
                  <View key={rec.subject.id} style={[
                    styles.recommendationItem,
                    rec.priority === 'high' && styles.recommendationItemHigh,
                  ]}>
                    <View style={styles.recommendationHeader}>
                      <View style={styles.recommendationSubjectInfo}>
                        <Text style={styles.recommendationSubject}>{rec.subject.name}</Text>
                        <Text style={styles.recommendationCode}>{rec.subject.code}</Text>
                      </View>
                      <View style={styles.recommendationStats}>
                        <View style={styles.recommendationStatItem}>
                          <Text style={styles.recommendationStatLabel}>Scaled Mean</Text>
                          <Text style={[
                            styles.recommendationStatValue,
                            { color: rec.scaledMean >= 35 ? colors.success : rec.scaledMean >= 30 ? colors.primary : colors.warning }
                          ]}>
                            {rec.scaledMean.toFixed(1)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.recommendationMeter}>
                      <Text style={styles.recommendationMeterLabel}>Scaling Potential:</Text>
                      <View style={styles.recommendationMeterBar}>
                        <View 
                          style={[
                            styles.recommendationMeterFill,
                            { 
                              width: `${Math.min(100, Math.max(0, ((rec.scaledMean - 20) / 30) * 100))}%`,
                              backgroundColor: rec.scaledMean >= 35 ? colors.success : rec.scaledMean >= 30 ? colors.primary : colors.warning,
                            }
                          ]} 
                        />
                      </View>
                    </View>
                    
                    <Text style={styles.recommendationText}>{rec.recommendation}</Text>
                    
                    {rec.priority === 'high' && (
                      <View style={styles.recommendationBadge}>
                        <MaterialIcons name="priority-high" size={16} color={colors.error} />
                        <Text style={styles.recommendationBadgeText}>High Priority</Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* AI Strategy Buttons */}
                <View style={styles.aiStrategyContainer}>
                  <Pressable
                    style={[styles.aiStrategyButton, styles.aiStrategyButtonBasic]}
                    onPress={handleAIStrategy}
                  >
                    <MaterialIcons name="psychology" size={20} color={colors.background} />
                    <Text style={styles.aiStrategyButtonText}>AI Subject Strategy</Text>
                    {!limits.atarAISubjectStrategy && (
                      <Text style={styles.premiumBadge}>Premium</Text>
                    )}
                  </Pressable>

                  <Pressable
                    style={[styles.aiStrategyButton, styles.aiStrategyButtonPro]}
                    onPress={handleAIAdvancedStrategy}
                  >
                    <MaterialIcons name="auto-awesome" size={20} color={colors.background} />
                    <Text style={styles.aiStrategyButtonText}>AI Advanced Strategy</Text>
                    {!limits.atarAIAdvancedStrategy && (
                      <Text style={styles.premiumBadge}>Premium</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
            
            {/* Historical Scaling Data Visualization */}
            {showScaling && (
              <View style={styles.scalingCard}>
                <View style={styles.scalingHeader}>
                  <MaterialIcons name="show-chart" size={24} color={colors.error} />
                  <Text style={styles.scalingTitle}>VCE Scaling Data (2024)</Text>
                </View>
                <Text style={styles.scalingDesc}>Compare your subjects' scaling metrics</Text>
                
                <View style={styles.scalingLegend}>
                  <View style={styles.scalingLegendItem}>
                    <View style={[styles.scalingLegendDot, { backgroundColor: colors.success }]} />
                    <Text style={styles.scalingLegendText}>High Scaling (35+)</Text>
                  </View>
                  <View style={styles.scalingLegendItem}>
                    <View style={[styles.scalingLegendDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.scalingLegendText}>Average (30-35)</Text>
                  </View>
                  <View style={styles.scalingLegendItem}>
                    <View style={[styles.scalingLegendDot, { backgroundColor: colors.warning }]} />
                    <Text style={styles.scalingLegendText}>Lower (&lt;30)</Text>
                  </View>
                </View>
                
                <View style={styles.scalingChart}>
                  {userSubjects
                    .sort((a, b) => (b.scaledMean || 30) - (a.scaledMean || 30))
                    .map(subject => {
                      const scaledMean = subject.scaledMean || 30;
                      const scaledStdDev = subject.scaledStdDev || 7;
                      const barColor = scaledMean >= 35 ? colors.success : scaledMean >= 30 ? colors.primary : colors.warning;
                      
                      return (
                        <View key={subject.id} style={styles.scalingBar}>
                          <View style={styles.scalingBarHeader}>
                            <Text style={styles.scalingBarSubject}>{subject.code}</Text>
                            <Text style={styles.scalingBarValue}>{scaledMean.toFixed(1)}</Text>
                          </View>
                          <View style={styles.scalingBarContainer}>
                            <View 
                              style={[
                                styles.scalingBarFill, 
                                { 
                                  width: `${(scaledMean / 50) * 100}%`,
                                  backgroundColor: barColor,
                                }
                              ]} 
                            />
                          </View>
                          <Text style={styles.scalingBarStdDev}>Std Dev: ±{scaledStdDev.toFixed(1)}</Text>
                        </View>
                      );
                    })}
                </View>
                
                <View style={styles.scalingInfo}>
                  <MaterialIcons name="info-outline" size={20} color={colors.primary} />
                  <Text style={styles.scalingInfoText}>
                    Higher scaled mean = better ATAR scaling. Lower std deviation = more consistent results.
                  </Text>
                </View>
              </View>
            )}
            
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
                <View style={styles.whatIfButtons}>
                  <Pressable style={styles.resetButton} onPress={resetWhatIf}>
                    <Text style={styles.resetButtonText}>Reset Changes</Text>
                  </Pressable>
                  <Pressable style={styles.saveButton} onPress={handleSaveWhatIfScenario}>
                    <MaterialIcons name="save" size={18} color={colors.background} />
                    <Text style={styles.saveButtonText}>Save Scenario</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Subject Scores - Hidden when Scaling view is active */}
            {!showScaling && (
              <>
                <Text style={styles.sectionTitle}>Subject Scores</Text>
                <Text style={styles.sectionDesc}>
                  {limits.atarSubjectScoreEditing 
                    ? 'Enter your SAC averages and predicted exam scores'
                    : '🔒 Score editing available in Premium plan'}
                </Text>
              </>
            )}

            {!showScaling && userSubjects.map(subject => {
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
                            value={whatIf?.sac?.toString() || (score.sacAverage || 0).toString()}
                            onChangeText={(v) => setWhatIfScore(subject.id, 'sac', v)}
                            keyboardType="numeric"
                            placeholder={(score.sacAverage || 0).toString()}
                            placeholderTextColor={colors.textTertiary}
                          />
                        </View>
                        <View style={styles.whatIfInputGroup}>
                          <Text style={styles.whatIfInputLabel}>Exam %</Text>
                          <TextInput
                            style={styles.whatIfInput}
                            value={whatIf?.exam?.toString() || (score.examPrediction || 0).toString()}
                            onChangeText={(v) => setWhatIfScore(subject.id, 'exam', v)}
                            keyboardType="numeric"
                            placeholder={(score.examPrediction || 0).toString()}
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
                      {!limits.atarSubjectScoreEditing && (
                        <MaterialIcons name="lock" size={24} color={colors.textTertiary} style={styles.addScoreLock} />
                      )}
                      <MaterialIcons name="add-circle-outline" size={32} color={colors.primary} />
                      <Text style={styles.addScoreText}>{subject.name}</Text>
                      <Text style={styles.addScoreDesc}>
                        {limits.atarSubjectScoreEditing ? 'Tap to add scores' : 'Premium feature'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            {!showScaling && userSubjects.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="assessment" size={64} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No subjects selected</Text>
                <Text style={styles.emptyDesc}>
                  Add subjects in onboarding to start tracking
                </Text>
              </View>
            )}

            {/* State-Specific Calculation Info */}
            <View style={styles.calculationInfoCard}>
              <View style={styles.calculationInfoHeader}>
                <MaterialIcons name="calculate" size={20} color={colors.primary} />
                <Text style={styles.calculationInfoTitle}>
                  {stateConfig.stateName} ATAR Calculation
                </Text>
              </View>
              <Text style={styles.calculationInfoText}>
                {getCalculationDescription(stateId)}
              </Text>
              <View style={styles.calculationDetailsList}>
                <View style={styles.calculationDetail}>
                  <MaterialIcons name="check-circle" size={16} color={colors.success} />
                  <Text style={styles.calculationDetailText}>
                    {stateConfig.requiresEnglish ? 'English required' : 'English optional'}
                  </Text>
                </View>
                <View style={styles.calculationDetail}>
                  <MaterialIcons name="check-circle" size={16} color={colors.success} />
                  <Text style={styles.calculationDetailText}>
                    {getSubjectCountDescription(stateId)}
                  </Text>
                </View>
                <View style={styles.calculationDetail}>
                  <MaterialIcons name="check-circle" size={16} color={colors.success} />
                  <Text style={styles.calculationDetailText}>
                    Calculated by {stateConfig.scalingAuthority}
                  </Text>
                </View>
              </View>
            </View>

            {/* General Disclaimer */}
            <View style={styles.infoCard}>
              <MaterialIcons name="info-outline" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                This ATAR prediction uses {stateConfig.scalingAuthority} scaling formulas for {stateConfig.stateName}. 
                Actual ATAR may vary based on cohort performance and official scaling. This is an estimate only.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Premium Paywalls */}
      <PremiumPaywall
        visible={showRoadmapPaywall}
        onClose={() => setShowRoadmapPaywall(false)}
        feature="ATAR Roadmap"
        description="Get personalized roadmaps showing exactly what scores you need to reach your target ATAR"
        requiredTier="basic"
        currentTier={tier}
      />

      <PremiumPaywall
        visible={showWhatIfPaywall}
        onClose={() => setShowWhatIfPaywall(false)}
        feature="What-If Scenarios"
        description="Save and compare unlimited what-if scenarios to plan your exam strategy"
        requiredTier="basic"
        currentTier={tier}
      />

      <PremiumPaywall
        visible={showAIStrategyPaywall}
        onClose={() => setShowAIStrategyPaywall(false)}
        feature="AI Subject Strategy"
        description="Get AI-powered subject-specific strategy recommendations based on your performance"
        requiredTier="basic"
        currentTier={tier}
      />

      <PremiumPaywall
        visible={showAIAdvancedPaywall}
        onClose={() => setShowAIAdvancedPaywall(false)}
        feature="AI Advanced Subject Strategy"
        description="Unlock advanced AI analysis with personalized study plans and performance predictions"
        requiredTier="pro"
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
  headerContainer: {
    marginBottom: spacing.lg,
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exportPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
  },
  exportPdfButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.background,
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
    position: 'relative',
  },
  addScoreLock: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
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
  stateWarningCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  stateWarningCardMedium: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  stateWarningCardHigh: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
  },
  stateWarningText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  calculationInfoCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calculationInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  calculationInfoTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  calculationInfoText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  calculationDetailsList: {
    gap: spacing.sm,
  },
  calculationDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  calculationDetailText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  stateBadge: {
    fontSize: typography.caption,
    color: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
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
  whatIfButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resetButton: {
    flex: 1,
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
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  saveButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.background,
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
  
  // Advanced Tools Grid
  toolsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toolCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  toolCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toolText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  toolTextActive: {
    color: colors.background,
  },
  lockIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  
  // Target Score Roadmap
  roadmapCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.success,
  },
  roadmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  roadmapTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  roadmapDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  targetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  targetInputLabel: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  targetInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.success,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: colors.success,
  },
  roadmapResults: {
    gap: spacing.md,
  },
  roadmapStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  roadmapStat: {
    alignItems: 'center',
  },
  roadmapStatLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  roadmapStatValue: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
  },
  improvementsTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  improvementItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  improvementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  improvementSubject: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  improvementValue: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.warning,
  },
  improvementBar: {
    gap: spacing.xs,
  },
  improvementBarBg: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  improvementBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  improvementText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  roadmapTip: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  roadmapTipText: {
    flex: 1,
    fontSize: typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  roadmapMessage: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  roadmapMessageText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // Subject Recommendations
  recommendationsCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.warning,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  recommendationsTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  recommendationsDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  recommendationItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendationItemHigh: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recommendationSubjectInfo: {
    flex: 1,
  },
  recommendationSubject: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  recommendationCode: {
    fontSize: typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  recommendationStats: {
    alignItems: 'flex-end',
  },
  recommendationStatItem: {
    alignItems: 'flex-end',
  },
  recommendationStatLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  recommendationStatValue: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    marginTop: 2,
  },
  recommendationMeter: {
    marginBottom: spacing.sm,
  },
  recommendationMeterLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  recommendationMeterBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  recommendationMeterFill: {
    height: '100%',
    borderRadius: 4,
  },
  recommendationText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  recommendationBadgeText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.error,
  },
  aiStrategyContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  aiStrategyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  aiStrategyButtonBasic: {
    backgroundColor: colors.primary,
  },
  aiStrategyButtonPro: {
    backgroundColor: colors.premium,
  },
  aiStrategyButtonText: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
    color: colors.background,
  },
  premiumBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.warning,
    fontSize: 8,
    fontWeight: typography.bold,
    color: colors.background,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  
  // Scaling Visualization
  scalingCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.error,
  },
  scalingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  scalingTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  scalingDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  scalingLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  scalingLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scalingLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scalingLegendText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  scalingChart: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scalingBar: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  scalingBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  scalingBarSubject: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  scalingBarValue: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  scalingBarContainer: {
    height: 20,
    backgroundColor: colors.background,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  scalingBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  scalingBarStdDev: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  scalingInfo: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  scalingInfoText: {
    flex: 1,
    fontSize: typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
