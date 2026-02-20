import { SubjectScore } from '@/types';
import { ATAR_TO_AGGREGATE } from '@/constants/vceData';

// State-specific ATAR calculation types
export type StateID = 'VIC' | 'NSW' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

export interface StateATARConfig {
  stateId: StateID;
  stateName: string;
  scalingAuthority: string; // VTAC, UAC, QTAC, TISC, SATAC, TASC
  requiresEnglish: boolean;
  primarySubjects: number; // Full contribution count
  incrementSubjects: number; // Partial contribution count
  incrementPercentage: number; // Contribution % for increment subjects
}

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
 * Get state-specific ATAR calculation configuration
 */
export function getStateConfig(stateId: StateID): StateATARConfig {
  const configs: Record<StateID, StateATARConfig> = {
    VIC: {
      stateId: 'VIC',
      stateName: 'Victoria',
      scalingAuthority: 'VTAC',
      requiresEnglish: true,
      primarySubjects: 4, // English + 3 best
      incrementSubjects: 2, // 5th and 6th
      incrementPercentage: 10,
    },
    NSW: {
      stateId: 'NSW',
      stateName: 'New South Wales',
      scalingAuthority: 'UAC',
      requiresEnglish: true,
      primarySubjects: 10, // Best 10 units (usually 5 subjects)
      incrementSubjects: 0,
      incrementPercentage: 0,
    },
    ACT: {
      stateId: 'ACT',
      stateName: 'Australian Capital Territory',
      scalingAuthority: 'UAC',
      requiresEnglish: true,
      primarySubjects: 10, // Best 10 units (UAC system)
      incrementSubjects: 0,
      incrementPercentage: 0,
    },
    QLD: {
      stateId: 'QLD',
      stateName: 'Queensland',
      scalingAuthority: 'QTAC',
      requiresEnglish: true,
      primarySubjects: 5, // Best 5 subjects
      incrementSubjects: 0,
      incrementPercentage: 0,
    },
    WA: {
      stateId: 'WA',
      stateName: 'Western Australia',
      scalingAuthority: 'TISC',
      requiresEnglish: true,
      primarySubjects: 4, // Best 4 subjects
      incrementSubjects: 0,
      incrementPercentage: 0,
    },
    SA: {
      stateId: 'SA',
      stateName: 'South Australia',
      scalingAuthority: 'SATAC',
      requiresEnglish: true,
      primarySubjects: 5, // Best 5 subjects (or 4.5 with Research Project)
      incrementSubjects: 0,
      incrementPercentage: 0,
    },
    TAS: {
      stateId: 'TAS',
      stateName: 'Tasmania',
      scalingAuthority: 'TASC',
      requiresEnglish: true,
      primarySubjects: 5, // Best 5 subjects
      incrementSubjects: 0,
      incrementPercentage: 0,
    },
    NT: {
      stateId: 'NT',
      stateName: 'Northern Territory',
      scalingAuthority: 'NTBOS',
      requiresEnglish: true,
      primarySubjects: 5, // Best 5 subjects
      incrementSubjects: 0,
      incrementPercentage: 0,
    },
  };
  
  return configs[stateId];
}

/**
 * Calculate ATAR from study scores using state-specific aggregation method
 * Supports all 8 Australian states/territories
 */
export function calculateATAR(
  subjectScores: SubjectScore[],
  stateId: StateID = 'VIC'
): {
  atar: number;
  aggregate: number;
  scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[];
} {
  if (subjectScores.length === 0) {
    return { atar: 0, aggregate: 0, scaledScores: [] };
  }
  
  const config = getStateConfig(stateId);
  
  // Use state-specific calculation method
  switch (stateId) {
    case 'VIC':
      return calculateVICATAR(subjectScores);
    case 'NSW':
    case 'ACT':
      return calculateNSWATAR(subjectScores);
    case 'QLD':
      return calculateQLDATAR(subjectScores);
    case 'WA':
      return calculateWAATAR(subjectScores);
    case 'SA':
      return calculateSAATAR(subjectScores);
    case 'TAS':
      return calculateTASATAR(subjectScores);
    case 'NT':
      return calculateNTATAR(subjectScores);
    default:
      return calculateVICATAR(subjectScores); // Fallback to VIC
  }
}

/**
 * VIC (VTAC) - Best 4 + 10% of next 2
 */
function calculateVICATAR(subjectScores: SubjectScore[]): {
  atar: number;
  aggregate: number;
  scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[];
} {
  const englishSubjects = ['EN', 'EAL'];
  const englishScore = subjectScores.find(s => englishSubjects.includes(s.subjectId.toUpperCase()));
  const otherScores = subjectScores.filter(s => !englishSubjects.includes(s.subjectId));
  
  const sortedOthers = [...otherScores].sort((a, b) => b.predictedStudyScore - a.predictedStudyScore);
  
  let aggregate = 0;
  const scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[] = [];
  
  if (englishScore) {
    aggregate += englishScore.predictedStudyScore;
    scaledScores.push({
      subjectId: englishScore.subjectId,
      rawScore: (englishScore.sacAverage * 0.5) + (englishScore.examPrediction * 0.5),
      scaledScore: englishScore.predictedStudyScore,
    });
  } else {
    return { atar: 0, aggregate: 0, scaledScores: [] };
  }
  
  // Next 3 best (full)
  for (let i = 0; i < Math.min(3, sortedOthers.length); i++) {
    const subject = sortedOthers[i];
    aggregate += subject.predictedStudyScore;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: subject.predictedStudyScore,
    });
  }
  
  // 5th and 6th (10% each)
  for (let i = 3; i < Math.min(5, sortedOthers.length); i++) {
    const subject = sortedOthers[i];
    aggregate += subject.predictedStudyScore * 0.1;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: subject.predictedStudyScore,
    });
  }
  
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
 * NSW/ACT (UAC) - Best 10 units
 */
function calculateNSWATAR(subjectScores: SubjectScore[]): {
  atar: number;
  aggregate: number;
  scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[];
} {
  const englishSubjects = ['EN', 'EAL', 'ENGADV', 'ENGSTD'];
  const hasEnglish = subjectScores.some(s => 
    englishSubjects.some(e => s.subjectId.toUpperCase().includes(e))
  );
  
  if (!hasEnglish) {
    return { atar: 0, aggregate: 0, scaledScores: [] };
  }
  
  // Sort all subjects by scaled score
  const sorted = [...subjectScores].sort((a, b) => b.predictedStudyScore - a.predictedStudyScore);
  
  // Take best 10 units (assuming 2 units per subject = 5 subjects)
  const bestSubjects = sorted.slice(0, 5);
  
  let aggregate = 0;
  const scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[] = [];
  
  bestSubjects.forEach(subject => {
    aggregate += subject.predictedStudyScore;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: subject.predictedStudyScore,
    });
  });
  
  const atar = aggregateToATAR(aggregate);
  return { atar: Math.round(atar * 100) / 100, aggregate: Math.round(aggregate * 10) / 10, scaledScores };
}

/**
 * QLD (QTAC) - Best 5 subjects
 */
function calculateQLDATAR(subjectScores: SubjectScore[]): {
  atar: number;
  aggregate: number;
  scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[];
} {
  const englishSubjects = ['EN', 'EAL', 'ENGEN'];
  const hasEnglish = subjectScores.some(s => 
    englishSubjects.some(e => s.subjectId.toUpperCase().includes(e))
  );
  
  if (!hasEnglish) {
    return { atar: 0, aggregate: 0, scaledScores: [] };
  }
  
  const sorted = [...subjectScores].sort((a, b) => b.predictedStudyScore - a.predictedStudyScore);
  const bestSubjects = sorted.slice(0, 5);
  
  let aggregate = 0;
  const scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[] = [];
  
  bestSubjects.forEach(subject => {
    aggregate += subject.predictedStudyScore;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: subject.predictedStudyScore,
    });
  });
  
  const atar = aggregateToATAR(aggregate);
  return { atar: Math.round(atar * 100) / 100, aggregate: Math.round(aggregate * 10) / 10, scaledScores };
}

/**
 * WA (TISC) - Best 4 subjects
 */
function calculateWAATAR(subjectScores: SubjectScore[]): {
  atar: number;
  aggregate: number;
  scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[];
} {
  const englishSubjects = ['EN', 'EAL', 'ENGATAR'];
  const hasEnglish = subjectScores.some(s => 
    englishSubjects.some(e => s.subjectId.toUpperCase().includes(e))
  );
  
  if (!hasEnglish) {
    return { atar: 0, aggregate: 0, scaledScores: [] };
  }
  
  const sorted = [...subjectScores].sort((a, b) => b.predictedStudyScore - a.predictedStudyScore);
  const bestSubjects = sorted.slice(0, 4);
  
  let aggregate = 0;
  const scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[] = [];
  
  bestSubjects.forEach(subject => {
    aggregate += subject.predictedStudyScore;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: subject.predictedStudyScore,
    });
  });
  
  const atar = aggregateToATAR(aggregate);
  return { atar: Math.round(atar * 100) / 100, aggregate: Math.round(aggregate * 10) / 10, scaledScores };
}

/**
 * SA (SATAC) - Best 5 subjects
 */
function calculateSAATAR(subjectScores: SubjectScore[]): {
  atar: number;
  aggregate: number;
  scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[];
} {
  const englishSubjects = ['EN', 'EAL', 'ENGAS', 'ENGAL'];
  const hasEnglish = subjectScores.some(s => 
    englishSubjects.some(e => s.subjectId.toUpperCase().includes(e))
  );
  
  if (!hasEnglish) {
    return { atar: 0, aggregate: 0, scaledScores: [] };
  }
  
  const sorted = [...subjectScores].sort((a, b) => b.predictedStudyScore - a.predictedStudyScore);
  const bestSubjects = sorted.slice(0, 5);
  
  let aggregate = 0;
  const scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[] = [];
  
  bestSubjects.forEach(subject => {
    aggregate += subject.predictedStudyScore;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: subject.predictedStudyScore,
    });
  });
  
  const atar = aggregateToATAR(aggregate);
  return { atar: Math.round(atar * 100) / 100, aggregate: Math.round(aggregate * 10) / 10, scaledScores };
}

/**
 * TAS (TASC) - Best 5 subjects
 */
function calculateTASATAR(subjectScores: SubjectScore[]): {
  atar: number;
  aggregate: number;
  scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[];
} {
  const englishSubjects = ['EN', 'EAL', 'ENGW', 'ENGR'];
  const hasEnglish = subjectScores.some(s => 
    englishSubjects.some(e => s.subjectId.toUpperCase().includes(e))
  );
  
  if (!hasEnglish) {
    return { atar: 0, aggregate: 0, scaledScores: [] };
  }
  
  const sorted = [...subjectScores].sort((a, b) => b.predictedStudyScore - a.predictedStudyScore);
  const bestSubjects = sorted.slice(0, 5);
  
  let aggregate = 0;
  const scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[] = [];
  
  bestSubjects.forEach(subject => {
    aggregate += subject.predictedStudyScore;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: subject.predictedStudyScore,
    });
  });
  
  const atar = aggregateToATAR(aggregate);
  return { atar: Math.round(atar * 100) / 100, aggregate: Math.round(aggregate * 10) / 10, scaledScores };
}

/**
 * NT (NTBOS) - Best 5 subjects
 */
function calculateNTATAR(subjectScores: SubjectScore[]): {
  atar: number;
  aggregate: number;
  scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[];
} {
  const englishSubjects = ['EN', 'EAL', 'ENGEN'];
  const hasEnglish = subjectScores.some(s => 
    englishSubjects.some(e => s.subjectId.toUpperCase().includes(e))
  );
  
  if (!hasEnglish) {
    return { atar: 0, aggregate: 0, scaledScores: [] };
  }
  
  const sorted = [...subjectScores].sort((a, b) => b.predictedStudyScore - a.predictedStudyScore);
  const bestSubjects = sorted.slice(0, 5);
  
  let aggregate = 0;
  const scaledScores: { subjectId: string; rawScore: number; scaledScore: number }[] = [];
  
  bestSubjects.forEach(subject => {
    aggregate += subject.predictedStudyScore;
    scaledScores.push({
      subjectId: subject.subjectId,
      rawScore: (subject.sacAverage * 0.5) + (subject.examPrediction * 0.5),
      scaledScore: subject.predictedStudyScore,
    });
  });
  
  const atar = aggregateToATAR(aggregate);
  return { atar: Math.round(atar * 100) / 100, aggregate: Math.round(aggregate * 10) / 10, scaledScores };
}

/**
 * Calculate best-case and worst-case ATAR scenarios (±10% on exams)
 */
export function calculateATARScenarios(
  subjectScores: SubjectScore[],
  stateId: StateID = 'VIC'
): {
  current: number;
  bestCase: number;
  worstCase: number;
} {
  const current = calculateATAR(subjectScores, stateId).atar;
  
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
  const bestCase = calculateATAR(bestScores, stateId).atar;
  
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
  const worstCase = calculateATAR(worstScores, stateId).atar;
  
  return { current, bestCase, worstCase };
}
