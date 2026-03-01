import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '@/types';
import { VCESubject } from './vceSubjectsService';
import { SubjectScore } from '@/types';

// Cache keys
const CACHE_KEYS = {
  USER_PROFILE: '@fairprep/user_profile',
  USER_SUBJECTS: '@fairprep/user_subjects',
  STATE_SUBJECTS: '@fairprep/state_subjects',
  SUBJECT_SCORES: '@fairprep/subject_scores',
  LAST_SYNC: '@fairprep/last_sync',
};

// =====================================================
// USER PROFILE CACHE
// =====================================================

export async function cacheUserProfile(user: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.USER_PROFILE, JSON.stringify(user));
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (error) {
    console.error('Failed to cache user profile:', error);
  }
}

export async function getCachedUserProfile(): Promise<UserProfile | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.USER_PROFILE);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Failed to get cached user profile:', error);
    return null;
  }
}

// =====================================================
// USER SUBJECTS CACHE
// =====================================================

export async function cacheUserSubjects(subjects: VCESubject[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.USER_SUBJECTS, JSON.stringify(subjects));
  } catch (error) {
    console.error('Failed to cache user subjects:', error);
  }
}

export async function getCachedUserSubjects(): Promise<VCESubject[]> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.USER_SUBJECTS);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Failed to get cached user subjects:', error);
    return [];
  }
}

// =====================================================
// STATE SUBJECTS CACHE
// =====================================================

export async function cacheStateSubjects(subjects: VCESubject[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.STATE_SUBJECTS, JSON.stringify(subjects));
  } catch (error) {
    console.error('Failed to cache state subjects:', error);
  }
}

export async function getCachedStateSubjects(): Promise<VCESubject[]> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.STATE_SUBJECTS);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Failed to get cached state subjects:', error);
    return [];
  }
}

// =====================================================
// SUBJECT SCORES CACHE
// =====================================================

export async function cacheSubjectScores(scores: SubjectScore[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.SUBJECT_SCORES, JSON.stringify(scores));
  } catch (error) {
    console.error('Failed to cache subject scores:', error);
  }
}

export async function getCachedSubjectScores(): Promise<SubjectScore[]> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.SUBJECT_SCORES);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Failed to get cached subject scores:', error);
    return [];
  }
}

// =====================================================
// CACHE STATUS
// =====================================================

export async function getLastSyncTime(): Promise<Date | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
    return cached ? new Date(cached) : null;
  } catch (error) {
    console.error('Failed to get last sync time:', error);
    return null;
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(CACHE_KEYS));
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

export async function isOffline(): Promise<boolean> {
  // Simple check - in production, use NetInfo
  try {
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      cache: 'no-cache',
    });
    return !response.ok;
  } catch {
    return true;
  }
}
