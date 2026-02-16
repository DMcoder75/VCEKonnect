import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getStudySessions } from './studyService';
import { getNotes } from './notesService';
import { getSubjectScores } from './scoresService';
import { getUserSubjects } from './userSubjectsService';

export interface ExportOptions {
  includeStudySessions: boolean;
  includeNotes: boolean;
  includeScores: boolean;
  format: 'json' | 'csv';
}

// Export all user data to JSON or CSV
export async function exportUserData(
  userId: string,
  options: ExportOptions
): Promise<{ success: boolean; message: string; filePath?: string }> {
  try {
    const exportData: any = {
      exportDate: new Date().toISOString(),
      userId,
    };

    // Load subjects first (needed for readable names)
    const subjects = await getUserSubjects(userId);
    const subjectMap: { [id: string]: any } = {};
    subjects.forEach(s => {
      subjectMap[s.id] = { code: s.code, name: s.name };
    });

    // Load study sessions
    if (options.includeStudySessions) {
      const sessions = await getStudySessions(userId);
      exportData.studySessions = sessions.map(s => ({
        date: s.date,
        subjectCode: subjectMap[s.subjectId]?.code || s.subjectId,
        subjectName: subjectMap[s.subjectId]?.name || 'Unknown',
        durationMinutes: s.duration,
        startTime: s.startTime,
        endTime: s.endTime,
      }));
    }

    // Load notes
    if (options.includeNotes) {
      const notes = await getNotes(userId);
      exportData.notes = notes.map(n => ({
        title: n.title,
        content: n.content,
        subjectCode: subjectMap[n.subjectId]?.code || n.subjectId,
        subjectName: subjectMap[n.subjectId]?.name || 'Unknown',
        tags: n.tags || [],
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }));
    }

    // Load scores
    if (options.includeScores) {
      const scores = await getSubjectScores(userId);
      exportData.atarScores = scores.map(s => ({
        subjectCode: subjectMap[s.subjectId]?.code || s.subjectId,
        subjectName: subjectMap[s.subjectId]?.name || 'Unknown',
        sacAverage: s.sacAverage,
        examPrediction: s.examPrediction,
        studyRank: s.studyRank,
        predictedStudyScore: s.predictedStudyScore,
      }));
    }

    let fileContent: string;
    let fileName: string;
    let mimeType: string;

    if (options.format === 'json') {
      fileContent = JSON.stringify(exportData, null, 2);
      fileName = `fairprep_export_${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      // CSV format
      fileContent = convertToCSV(exportData);
      fileName = `fairprep_export_${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    }

    // Save to file
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, fileContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType,
        dialogTitle: 'Export FairPrep Data',
        UTI: mimeType,
      });
    }

    return {
      success: true,
      message: `Data exported successfully to ${fileName}`,
      filePath,
    };
  } catch (error: any) {
    console.error('Export error:', error);
    return {
      success: false,
      message: error.message || 'Failed to export data',
    };
  }
}

// Convert export data to CSV format
function convertToCSV(data: any): string {
  let csv = '';

  // Study Sessions CSV
  if (data.studySessions && data.studySessions.length > 0) {
    csv += 'STUDY SESSIONS\n';
    csv += 'Date,Subject Code,Subject Name,Duration (minutes),Start Time,End Time\n';
    data.studySessions.forEach((s: any) => {
      csv += `${s.date},${s.subjectCode},${escapeCsvField(s.subjectName)},${s.durationMinutes},${s.startTime},${s.endTime}\n`;
    });
    csv += '\n';
  }

  // Notes CSV
  if (data.notes && data.notes.length > 0) {
    csv += 'NOTES\n';
    csv += 'Title,Subject Code,Subject Name,Tags,Content,Created,Updated\n';
    data.notes.forEach((n: any) => {
      csv += `${escapeCsvField(n.title)},${n.subjectCode},${escapeCsvField(n.subjectName)},${escapeCsvField((n.tags || []).join('; '))},${escapeCsvField(n.content)},${n.createdAt},${n.updatedAt}\n`;
    });
    csv += '\n';
  }

  // ATAR Scores CSV
  if (data.atarScores && data.atarScores.length > 0) {
    csv += 'ATAR SCORES\n';
    csv += 'Subject Code,Subject Name,SAC Average,Exam Prediction,Study Rank,Predicted Study Score\n';
    data.atarScores.forEach((s: any) => {
      csv += `${s.subjectCode},${escapeCsvField(s.subjectName)},${s.sacAverage},${s.examPrediction},${s.studyRank},${s.predictedStudyScore}\n`;
    });
    csv += '\n';
  }

  csv += `Export Date: ${data.exportDate}\n`;
  csv += `User ID: ${data.userId}\n`;

  return csv;
}

// Escape CSV fields that contain commas or quotes
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
