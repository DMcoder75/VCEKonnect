// Platform-aware offline database entry point
// Export everything from native by default (works for iOS/Android)
// Web will override this with .web.ts extension
export {
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
} from './offlineDatabase.native';
