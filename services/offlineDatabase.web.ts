import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, Note } from '@/types';
import { VCESubject } from './vceSubjectsService';

const KEYS = {
  USER_PROFILE: 'fairprep_user_profile',
  USER_SUBJECTS: 'fairprep_user_subjects',
  SUBJECT_SCORES: 'fairprep_subject_scores',
  STUDY_SESSIONS: 'fairprep_study_sessions',
  NOTES: 'fairprep_notes',
  CALENDAR_EVENTS: 'fairprep_calendar_events',
  PATHWAY_COURSES: 'fairprep_pathway_courses',
};

/**
 * Initialize database (no-op for web, uses AsyncStorage)
 */
export async function initDatabase(): Promise<void> {
  console.log('✅ Web offline storage initialized (AsyncStorage)');
}

// ==================== USER PROFILE ====================

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
}

// ==================== USER SUBJECTS ====================

export async function saveUserSubjects(subjects: VCESubject[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_SUBJECTS, JSON.stringify(subjects));
}

export async function getUserSubjects(): Promise<VCESubject[]> {
  const data = await AsyncStorage.getItem(KEYS.USER_SUBJECTS);
  return data ? JSON.parse(data) : [];
}

// ==================== SUBJECT SCORES ====================

export async function saveSubjectScores(userId: string, scores: any[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SUBJECT_SCORES, JSON.stringify(scores));
}

export async function getSubjectScores(userId: string): Promise<any[]> {
  const data = await AsyncStorage.getItem(KEYS.SUBJECT_SCORES);
  return data ? JSON.parse(data) : [];
}

// ==================== STUDY SESSIONS ====================

export async function saveStudySessions(sessions: any[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.STUDY_SESSIONS, JSON.stringify(sessions));
}

export async function getStudySessions(userId: string): Promise<any[]> {
  const data = await AsyncStorage.getItem(KEYS.STUDY_SESSIONS);
  const allSessions = data ? JSON.parse(data) : [];
  return allSessions.filter((s: any) => s.userId === userId);
}

// ==================== NOTES ====================

export async function saveNotes(notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
}

export async function getNotes(userId: string): Promise<Note[]> {
  const data = await AsyncStorage.getItem(KEYS.NOTES);
  const allNotes = data ? JSON.parse(data) : [];
  return allNotes.filter((n: Note) => n.userId === userId);
}

// ==================== CALENDAR EVENTS ====================

export async function saveCalendarEvents(events: any[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CALENDAR_EVENTS, JSON.stringify(events));
}

export async function getCalendarEvents(userId: string): Promise<any[]> {
  const data = await AsyncStorage.getItem(KEYS.CALENDAR_EVENTS);
  const allEvents = data ? JSON.parse(data) : [];
  return allEvents.filter((e: any) => e.userId === userId);
}

// ==================== PATHWAY COURSES ====================

export async function savePathwayCourses(courses: any[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.PATHWAY_COURSES, JSON.stringify(courses));
}

export async function getPathwayCourses(): Promise<any[]> {
  const data = await AsyncStorage.getItem(KEYS.PATHWAY_COURSES);
  return data ? JSON.parse(data) : [];
}

// ==================== UTILITY ====================

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.USER_PROFILE,
    KEYS.USER_SUBJECTS,
    KEYS.SUBJECT_SCORES,
    KEYS.STUDY_SESSIONS,
    KEYS.NOTES,
    KEYS.CALENDAR_EVENTS,
    KEYS.PATHWAY_COURSES,
  ]);
  console.log('✅ All offline data cleared (Web)');
}
