// Platform-aware offline database entry point
import { Platform } from 'react-native';

// Dynamically import the correct platform implementation
let offlineDB: any;

if (Platform.OS === 'web') {
  offlineDB = require('./offlineDatabase.web');
} else {
  offlineDB = require('./offlineDatabase.native');
}

export const {
  initDatabase,
  saveUserProfile,
  getUserProfile,
  saveUserSubjects,
  getUserSubjects,
  saveSubjectScores,
  getSubjectScores,
  saveStudySessions,
  getStudySessions,
  saveNotes,
  getNotes,
  saveCalendarEvents,
  getCalendarEvents,
  savePathwayCourses,
  getPathwayCourses,
  clearAllData,
} = offlineDB;
