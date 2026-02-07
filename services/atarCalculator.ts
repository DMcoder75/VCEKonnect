import { SubjectScore } from '@/types';

// Simplified VTAC scaling algorithm based on historical percentiles
// Real VTAC uses complex statistical analysis; this is an approximation

const SCALING_TABLE: { [key: string]: { mean: number; sd: number } } = {
  // English subjects (lower scaling)
  'eng': { mean: 30, sd: 7 },
  'eal': { mean: 29, sd: 6 },
  'lit': { mean: 32, sd: 7 },
  
  // Mathematics (high scaling)
  'mathm': { mean: 32, sd: 8 },
  'spesh': { mean: 35, sd: 9 },
  'further': { mean: 28, sd: 6 },
  
  // Sciences (medium-high scaling)
  'bio': { mean: 30, sd: 7 },
  'chem': { mean: 33, sd: 8 },
  'phys': { mean: 34, sd: 8 },
  'psych': { mean: 29, sd: 7 },
  
  // Humanities (medium scaling)
  'hist': { mean: 30, sd: 7 },
  'legal': { mean: 29, sd: 7 },
  'bus': { mean: 28, sd: 6 },
  'acc': { mean: 30, sd: 7 },
  'econ': { mean: 31, sd: 7 },
  
  // Arts (lower-medium scaling)
  'art': { mean: 28, sd: 6 },
  'media': { mean: 28, sd: 6 },
  'drama': { mean: 28, sd: 6 },
  
  // Languages (varies, high scaling)
  'french': { mean: 33, sd: 8 },
  'chinese': { mean: 32, sd: 8 },
  'japanese': { mean: 32, sd: 8 },
};

// Default scaling for subjects not in table
const DEFAULT_SCALING = { mean: 30, sd: 7 };

/**
 * Calculate predicted study score from SAC and exam percentages
 * VCE: 50% SAC + 50% Exam = Raw Study Score → Scaled Study Score
 */
export function calculateStudyScore(
  subjectId: string,
  sacAverage: number,
  examPrediction: number,
  studyRank: number
): number {
  // Raw score: 50% SAC + 50% exam (out of 100)
  const rawPercentage = (sacAverage * 0.5) + (examPrediction * 0.5);
  
  // Convert to study score (0-50 scale)
  let rawStudyScore = (rawPercentage / 100) * 50;
  
  // Adjust for study rank (top 10% get bonus, bottom penalty)
  if (studyRank <= 10) {
    rawStudyScore += 2;
  } else if (studyRank >= 90) {
    rawStudyScore -= 2;
  }
  
  // Apply scaling based on subject
  const scaling = SCALING_TABLE[subjectId] || DEFAULT_SCALING;
  const scaledScore = Math.min(50, Math.max(0, rawStudyScore + (scaling.mean - 30)));
  
  return Math.round(scaledScore * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate ATAR from study scores using aggregate method
 * ATAR = based on aggregate of 4 best scores (scaled)
 * - English (or EAL/Lit) mandatory
 * - Next 3 highest scores
 * - 10% of 5th and 6th subjects
 */
export function calculateATAR(subjectScores: SubjectScore[]): {
  atar: number;
  aggregate: number;
  scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[];
} {
  if (subjectScores.length === 0) {
    return { atar: 0, aggregate: 0, scaledScores: [] };
  }
  
  // Separate English and other subjects
  const englishSubjects = ['eng', 'eal', 'lit'];
  const englishScore = subjectScores.find(s => englishSubjects.includes(s.subjectId));
  const otherScores = subjectScores.filter(s => !englishSubjects.includes(s.subjectId));
  
  // Sort other subjects by predicted study score (descending)
  const sortedOthers = [...otherScores].sort((a, b) => b.predictedStudyScore - a.predictedStudyScore);
  
  // Calculate aggregate
  let aggregate = 0;
  const scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[] = [];
  
  // English (mandatory, full contribution)
  if (englishScore) {
    const scaled = englishScore.predictedStudyScore;
    aggregate += scaled;
    scaledScores.push({
      subjectId: englishScore.subjectId,
      rawScore: (englishScore.sacAverage * 0.5) + (englishScore.examPrediction * 0.5),
      scaledScore: scaled,
    });
  }
  
  // Next 3 best subjects (full contribution)
  for (let i = 0; i < Math.min(3, sortedOthers.length); i++) {
    const subject = sortedOthers[i];
    const scaled = subject.predictedStudyScore;
    aggregate += scaled;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: scaled,
    });
  }
  
  // 5th and 6th subjects (10% contribution each)
  for (let i = 3; i < Math.min(5, sortedOthers.length); i++) {
    const subject = sortedOthers[i];
    const scaled = subject.predictedStudyScore * 0.1;
    aggregate += scaled;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: subject.predictedStudyScore,
    });
  }
  
  // Convert aggregate to ATAR (0-99.95 scale)
  // VTAC uses percentile tables; this is simplified
  // Aggregate ~170+ = ATAR 99+, ~150 = ATAR 90, ~130 = ATAR 80
  const atar = Math.min(99.95, Math.max(0, aggregateToATAR(aggregate)));
  
  return {
    atar: Math.round(atar * 100) / 100,
    aggregate: Math.round(aggregate * 10) / 10,
    scaledScores,
  };
}

function aggregateToATAR(aggregate: number): number {
  // Simplified conversion based on historical percentiles
  if (aggregate >= 180) return 99.95;
  if (aggregate >= 175) return 99.0;
  if (aggregate >= 170) return 98.0;
  if (aggregate >= 165) return 97.0;
  if (aggregate >= 160) return 96.0;
  if (aggregate >= 155) return 95.0;
  if (aggregate >= 150) return 94.0;
  if (aggregate >= 145) return 92.0;
  if (aggregate >= 140) return 90.0;
  if (aggregate >= 135) return 88.0;
  if (aggregate >= 130) return 85.0;
  if (aggregate >= 125) return 82.0;
  if (aggregate >= 120) return 80.0;
  if (aggregate >= 115) return 77.0;
  if (aggregate >= 110) return 75.0;
  if (aggregate >= 105) return 72.0;
  if (aggregate >= 100) return 70.0;
  if (aggregate >= 95) return 67.0;
  if (aggregate >= 90) return 65.0;
  if (aggregate >= 85) return 62.0;
  if (aggregate >= 80) return 60.0;
  
  // Linear interpolation below 80
  return Math.max(30, (aggregate / 80) * 60);
}

/**
 * Calculate best-case and worst-case ATAR scenarios
 */
export function calculateATARScenarios(subjectScores: SubjectScore[]): {
  current: number;
  bestCase: number;
  worstCase: number;
} {
  const current = calculateATAR(subjectScores).atar;
  
  // Best case: +10% on all exams
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
  
  // Worst case: -10% on all exams
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
