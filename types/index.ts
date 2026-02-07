export interface UserProfile {
  id: string;
  email: string;
  name: string;
  yearLevel: 11 | 12;
  selectedSubjects: string[];
  targetCareer?: string;
  targetUniversities: string[];
  isPremium: boolean;
  premiumExpiry?: string;
}

export interface SubjectScore {
  subjectId: string;
  sacAverage: number;
  examPrediction: number;
  studyRank: number;
  predictedStudyScore: number;
}

export interface StudySession {
  id: string;
  subjectId: string;
  startTime: string;
  endTime?: string;
  duration: number; // minutes
  date: string;
}

export interface Note {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ATARPrediction {
  atar: number;
  aggregate: number;
  subjectScores: {
    subjectId: string;
    rawScore: number;
    scaledScore: number;
  }[];
  lastUpdated: string;
}
