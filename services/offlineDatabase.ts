import * as SQLite from 'expo-sqlite';
import { UserProfile, Note } from '@/types';
import { VCESubject } from './vceSubjectsService';

const DB_NAME = 'fairprep_offline.db';
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize SQLite database with tables
 */
export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Create tables
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      -- User profile table
      CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        year_level INTEGER,
        state_id TEXT,
        target_career TEXT,
        is_premium INTEGER DEFAULT 0,
        premium_tier TEXT DEFAULT 'free',
        ai_summary_usage INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );
      
      -- User subjects table
      CREATE TABLE IF NOT EXISTS user_subjects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        subject_code TEXT NOT NULL,
        subject_name TEXT NOT NULL,
        category TEXT,
        state_id TEXT,
        scaled_mean REAL,
        scaled_std_dev REAL
      );
      
      -- Subject scores table
      CREATE TABLE IF NOT EXISTS subject_scores (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        sac_average REAL DEFAULT 0,
        exam_prediction REAL DEFAULT 0,
        study_rank REAL DEFAULT 50,
        predicted_study_score REAL DEFAULT 0,
        updated_at TEXT
      );
      
      -- Study sessions table
      CREATE TABLE IF NOT EXISTS study_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_minutes INTEGER DEFAULT 0,
        session_date TEXT NOT NULL,
        created_at TEXT
      );
      
      -- Notes table
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        tags TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      
      -- Calendar events table
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        event_date TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        duration_minutes INTEGER,
        is_completed INTEGER DEFAULT 0,
        score_achieved REAL,
        score_total REAL,
        created_at TEXT
      );
    `);
    
    console.log('✅ SQLite database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

// ==================== USER PROFILE ====================

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (!db) await initDatabase();
  
  await db!.runAsync(
    `INSERT OR REPLACE INTO user_profile 
    (id, email, name, year_level, state_id, target_career, is_premium, premium_tier, ai_summary_usage, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.id,
      profile.email,
      profile.name,
      profile.yearLevel || null,
      profile.state_id || null,
      profile.targetCareer || null,
      profile.isPremium ? 1 : 0,
      profile.premiumTier || 'free',
      profile.ai_summary_usage || 0,
      profile.createdAt || new Date().toISOString(),
      profile.updatedAt || new Date().toISOString(),
    ]
  );
}

export async function getUserProfile(): Promise<UserProfile | null> {
  if (!db) await initDatabase();
  
  const result = await db!.getFirstAsync<any>('SELECT * FROM user_profile LIMIT 1');
  
  if (!result) return null;
  
  return {
    id: result.id,
    email: result.email,
    name: result.name,
    yearLevel: result.year_level,
    state_id: result.state_id,
    targetCareer: result.target_career,
    isPremium: result.is_premium === 1,
    premiumTier: result.premium_tier,
    ai_summary_usage: result.ai_summary_usage,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

// ==================== USER SUBJECTS ====================

export async function saveUserSubjects(subjects: VCESubject[]): Promise<void> {
  if (!db) await initDatabase();
  
  // Clear existing subjects
  await db!.runAsync('DELETE FROM user_subjects');
  
  // Insert new subjects
  for (const subject of subjects) {
    await db!.runAsync(
      `INSERT INTO user_subjects 
      (id, user_id, subject_id, subject_code, subject_name, category, state_id, scaled_mean, scaled_std_dev)
      VALUES (?, '', ?, ?, ?, ?, ?, ?, ?)`,
      [
        subject.id,
        subject.id,
        subject.code,
        subject.name,
        subject.category,
        subject.stateId,
        subject.scaledMean || null,
        subject.scaledStdDev || null,
      ]
    );
  }
}

export async function getUserSubjects(): Promise<VCESubject[]> {
  if (!db) await initDatabase();
  
  const results = await db!.getAllAsync<any>('SELECT * FROM user_subjects');
  
  return results.map(row => ({
    id: row.subject_id,
    code: row.subject_code,
    name: row.subject_name,
    category: row.category,
    stateId: row.state_id,
    scaledMean: row.scaled_mean,
    scaledStdDev: row.scaled_std_dev,
  }));
}

// ==================== SUBJECT SCORES ====================

export async function saveSubjectScores(userId: string, scores: any[]): Promise<void> {
  if (!db) await initDatabase();
  
  for (const score of scores) {
    await db!.runAsync(
      `INSERT OR REPLACE INTO subject_scores 
      (id, user_id, subject_id, sac_average, exam_prediction, study_rank, predicted_study_score, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        score.id,
        userId,
        score.subjectId,
        score.sacAverage || 0,
        score.examPrediction || 0,
        score.studyRank || 50,
        score.predictedStudyScore || 0,
        new Date().toISOString(),
      ]
    );
  }
}

export async function getSubjectScores(userId: string): Promise<any[]> {
  if (!db) await initDatabase();
  
  const results = await db!.getAllAsync<any>('SELECT * FROM subject_scores WHERE user_id = ?', [userId]);
  
  return results.map(row => ({
    id: row.id,
    subjectId: row.subject_id,
    sacAverage: row.sac_average,
    examPrediction: row.exam_prediction,
    studyRank: row.study_rank,
    predictedStudyScore: row.predicted_study_score,
  }));
}

// ==================== STUDY SESSIONS ====================

export async function saveStudySessions(sessions: any[]): Promise<void> {
  if (!db) await initDatabase();
  
  for (const session of sessions) {
    await db!.runAsync(
      `INSERT OR REPLACE INTO study_sessions 
      (id, user_id, subject_id, start_time, end_time, duration_minutes, session_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.userId,
        session.subjectId,
        session.startTime,
        session.endTime || null,
        session.durationMinutes || 0,
        session.sessionDate,
        session.createdAt,
      ]
    );
  }
}

export async function getStudySessions(userId: string): Promise<any[]> {
  if (!db) await initDatabase();
  
  const results = await db!.getAllAsync<any>(
    'SELECT * FROM study_sessions WHERE user_id = ? ORDER BY session_date DESC',
    [userId]
  );
  
  return results.map(row => ({
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    sessionDate: row.session_date,
    createdAt: row.created_at,
  }));
}

// ==================== NOTES ====================

export async function saveNotes(notes: Note[]): Promise<void> {
  if (!db) await initDatabase();
  
  for (const note of notes) {
    await db!.runAsync(
      `INSERT OR REPLACE INTO notes 
      (id, user_id, subject_id, title, content, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        note.id,
        note.userId,
        note.subjectId,
        note.title,
        note.content,
        JSON.stringify(note.tags || []),
        note.createdAt,
        note.updatedAt,
      ]
    );
  }
}

export async function getNotes(userId: string): Promise<Note[]> {
  if (!db) await initDatabase();
  
  const results = await db!.getAllAsync<any>(
    'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  );
  
  return results.map(row => ({
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// ==================== CALENDAR EVENTS ====================

export async function saveCalendarEvents(events: any[]): Promise<void> {
  if (!db) await initDatabase();
  
  for (const event of events) {
    await db!.runAsync(
      `INSERT OR REPLACE INTO calendar_events 
      (id, user_id, subject_id, event_date, event_type, title, notes, duration_minutes, is_completed, score_achieved, score_total, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.userId,
        event.subjectId,
        event.eventDate,
        event.eventType,
        event.title,
        event.notes || null,
        event.durationMinutes || null,
        event.isCompleted ? 1 : 0,
        event.scoreAchieved || null,
        event.scoreTotal || null,
        event.createdAt,
      ]
    );
  }
}

export async function getCalendarEvents(userId: string): Promise<any[]> {
  if (!db) await initDatabase();
  
  const results = await db!.getAllAsync<any>(
    'SELECT * FROM calendar_events WHERE user_id = ? ORDER BY event_date DESC',
    [userId]
  );
  
  return results.map(row => ({
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    eventDate: row.event_date,
    eventType: row.event_type,
    title: row.title,
    notes: row.notes,
    durationMinutes: row.duration_minutes,
    isCompleted: row.is_completed === 1,
    scoreAchieved: row.score_achieved,
    scoreTotal: row.score_total,
    createdAt: row.created_at,
  }));
}

// ==================== UTILITY ====================

export async function clearAllData(): Promise<void> {
  if (!db) await initDatabase();
  
  await db!.execAsync(`
    DELETE FROM user_profile;
    DELETE FROM user_subjects;
    DELETE FROM subject_scores;
    DELETE FROM study_sessions;
    DELETE FROM notes;
    DELETE FROM calendar_events;
  `);
  
  console.log('✅ All offline data cleared');
}
