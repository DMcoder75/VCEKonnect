import { SubjectScore } from '@/types';
import { ATAR_TO_AGGREGATE } from '@/constants/vceData';

/**
 * Calculate predicted study score from SAC and exam percentages using 2024 VTAC scaling data
 * VCE Formula: Raw score → Scaled study score using subject-specific scaling factors
 */
export function calculateStudyScore(
  subjectId: string,
  sacAverage: number,
  examPrediction: number,
  studyRank: number,
  scaledMean: number = 30,
  scaledStdDev: number = 7
): number {
  // Use provided scaling data or defaults
  
  // Raw score: 50% SAC + 50% exam (out of 100)
  const rawPercentage = (sacAverage * 0.5) + (examPrediction * 0.5);
  
  // Convert to study score (0-50 scale) with cohort adjustment
  // Study rank affects relative positioning in cohort
  const rankAdjustment = ((100 - studyRank) / 100) * 2; // ±2 points based on rank
  let rawStudyScore = (rawPercentage / 100) * 50 + rankAdjustment;
  
  // Apply VTAC scaling using 2024 mean and standard deviation
  // Higher mean subjects get scaling boost (e.g., Specialist Maths mean=41.6)
  const scalingFactor = (scaledMean - 30) / scaledStdDev;
  const scaledScore = rawStudyScore + (scalingFactor * scaledStdDev * 0.5);
  
  return Math.min(50, Math.max(0, Math.round(scaledScore * 10) / 10));
}

/**
 * Calculate ATAR from study scores using official VTAC 2024 aggregation method
 * Rules:
 * - English (EN/EF/EG/L) is mandatory
 * - Primary 4: Best English + Best 3 subjects (full contribution)
 * - Increments: 10% of 5th and 6th subjects
 */
export function calculateATAR(subjectScores: SubjectScore[]): {
  atar: number;
  aggregate: number;
  scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[];
} {
  if (subjectScores.length === 0) {
    return { atar: 0, aggregate: 0, scaledScores: [] };
  }
  
  // Identify English subjects (mandatory)
  const englishSubjects = ['en', 'ef', 'eg', 'l'];
  const englishScore = subjectScores.find(s => englishSubjects.includes(s.subjectId));
  const otherScores = subjectScores.filter(s => !englishSubjects.includes(s.subjectId));
  
  // Sort non-English subjects by scaled study score (descending)
  const sortedOthers = [...otherScores].sort((a, b) => b.predictedStudyScore - a.predictedStudyScore);
  
  // Calculate aggregate
  let aggregate = 0;
  const scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[] = [];
  
  // 1. English (mandatory, full contribution)
  if (englishScore) {
    aggregate += englishScore.predictedStudyScore;
    scaledScores.push({
      subjectId: englishScore.subjectId,
      rawScore: (englishScore.sacAverage * 0.5) + (englishScore.examPrediction * 0.5),
      scaledScore: englishScore.predictedStudyScore,
    });
  } else {
    // No English = cannot calculate ATAR
    return { atar: 0, aggregate: 0, scaledScores: [] };
  }
  
  // 2. Next 3 best subjects (full contribution)
  for (let i = 0; i < Math.min(3, sortedOthers.length); i++) {
    const subject = sortedOthers[i];
    aggregate += subject.predictedStudyScore;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: subject.predictedStudyScore,
    });
  }
  
  // 3. 5th and 6th subjects (10% contribution each)
  for (let i = 3; i < Math.min(5, sortedOthers.length); i++) {
    const subject = sortedOthers[i];
    const increment = subject.predictedStudyScore * 0.1;
    aggregate += increment;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: subject.predictedStudyScore,
    });
  }
  
  // Convert aggregate to ATAR using 2024 VTAC table
  const atar = aggregateToATAR(aggregate);
  
  return {
    atar: Math.round(atar * 100) / 100,
    aggregate: Math.round(aggregate * 10) / 10,
    scaledScores,
  };
}

/**
 * Convert scaled aggregate to ATAR using 2024 official VTAC conversion table
 */
function aggregateToATAR(aggregate: number): number {
  // Find closest aggregate value in lookup table
  const atarKeys = Object.keys(ATAR_TO_AGGREGATE)
    .map(k => parseFloat(k))
    .sort((a, b) => b - a); // Descending order
  
  for (let i = 0; i < atarKeys.length; i++) {
    const atar = atarKeys[i];
    const minAggregate = ATAR_TO_AGGREGATE[atar];
    
    if (aggregate >= minAggregate) {
      // Linear interpolation between this and next bracket
      if (i === 0) return atar; // Top bracket
      
      const nextATAR = atarKeys[i - 1];
      const nextAggregate = ATAR_TO_AGGREGATE[nextATAR];
      
      const ratio = (aggregate - minAggregate) / (nextAggregate - minAggregate);
      return atar + (ratio * (nextATAR - atar));
    }
  }
  
  // Below minimum aggregate (40.00 ATAR = 79.51 aggregate)
  return Math.max(30, (aggregate / 79.51) * 40);
}

/**
 * Calculate best-case and worst-case ATAR scenarios (±10% on exams)
 */
export function calculateATARScenarios(subjectScores: SubjectScore[]): {
  current: number;
  bestCase: number;
  worstCase: number;
} {
  const current = calculateATAR(subjectScores).atar;
  
  // Best case: +10 percentage points on all exams
  const bestScores = subjectScores.map(s => ({
    ...s,
    examPrediction: Math.min(100, s.examPrediction + 10),
    predictedStudyScore: calculateStudyScore(
      s.subjectId,
      s.sacAverage,
      Math.min(100, s.examPrediction + 10),
      s.studyRank
    ),
  }));
  const bestCase = calculateATAR(bestScores).atar;
  
  // Worst case: -10 percentage points on all exams
  const worstScores = subjectScores.map(s => ({
    ...s,
    examPrediction: Math.max(0, s.examPrediction - 10),
    predictedStudyScore: calculateStudyScore(
      s.subjectId,
      s.sacAverage,
      Math.max(0, s.examPrediction - 10),
      s.studyRank
    ),
  }));
  const worstCase = calculateATAR(worstScores).atar;
  
  return { current, bestCase, worstCase };
}
