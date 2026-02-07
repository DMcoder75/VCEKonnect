import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, SubjectScore, StudySession, Note, ATARPrediction } from '@/types';

const STORAGE_KEYS = {
  USER_PROFILE: 'vce_user_profile',
  SUBJECT_SCORES: 'vce_subject_scores',
  STUDY_SESSIONS: 'vce_study_sessions',
  NOTES: 'vce_notes',
  ATAR_PREDICTION: 'vce_atar_prediction',
  ACTIVE_TIMER: 'vce_active_timer',
} as const;

// User Profile
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
}

// Subject Scores
export async function saveSubjectScores(scores: SubjectScore[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.SUBJECT_SCORES, JSON.stringify(scores));
}

export async function getSubjectScores(): Promise<SubjectScore[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECT_SCORES);
  return data ? JSON.parse(data) : [];
}

// Study Sessions
export async function saveStudySession(session: StudySession): Promise<void> {
  const sessions = await getStudySessions();
  sessions.push(session);
  await AsyncStorage.setItem(STORAGE_KEYS.STUDY_SESSIONS, JSON.stringify(sessions));
}

export async function getStudySessions(): Promise<StudySession[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.STUDY_SESSIONS);
  return data ? JSON.parse(data) : [];
}

export async function getStudySessionsBySubject(subjectId: string): Promise<StudySession[]> {
  const sessions = await getStudySessions();
  return sessions.filter(s => s.subjectId === subjectId);
}

// Active Timer
export async function saveActiveTimer(timer: { subjectId: string; startTime: string } | null): Promise<void> {
  if (timer) {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER, JSON.stringify(timer));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_TIMER);
  }
}

export async function getActiveTimer(): Promise<{ subjectId: string; startTime: string } | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TIMER);
  return data ? JSON.parse(data) : null;
}

// Notes
export async function saveNote(note: Note): Promise<void> {
  const notes = await getNotes();
  const existingIndex = notes.findIndex(n => n.id === note.id);
  
  if (existingIndex >= 0) {
    notes[existingIndex] = note;
  } else {
    notes.push(note);
  }
  
  await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
}

export async function getNotes(): Promise<Note[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTES);
  return data ? JSON.parse(data) : [];
}

export async function getNotesBySubject(subjectId: string): Promise<Note[]> {
  const notes = await getNotes();
  return notes.filter(n => n.subjectId === subjectId);
}

export async function deleteNote(noteId: string): Promise<void> {
  const notes = await getNotes();
  const filtered = notes.filter(n => n.id !== noteId);
  await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(filtered));
}

// ATAR Prediction
export async function saveATARPrediction(prediction: ATARPrediction): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ATAR_PREDICTION, JSON.stringify(prediction));
}

export async function getATARPrediction(): Promise<ATARPrediction | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.ATAR_PREDICTION);
  return data ? JSON.parse(data) : null;
}

// Clear all data (for testing)
export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}
