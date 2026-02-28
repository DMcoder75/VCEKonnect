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
  state_id?: string; // Australian state/territory: vic, nsw, qld, wa, sa, tas, act, nt
  clientAppVersion?: string; // Current app version user is on
  clientPlatform?: 'ios' | 'android' | 'web'; // Platform user is using
  clientAppVersionUpdatedAt?: string; // Last time version was tracked
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

export interface NoteAttachment {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  url?: string;
}

export interface Note {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  contentFormat?: 'plain' | 'markdown' | 'html';
  tags: string[];
  attachments?: NoteAttachment[];
  isShared?: boolean;
  shareToken?: string;
  isVoiceNote?: boolean;
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
