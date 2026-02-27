import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import { getStudySessions } from './studyService';
import { getNotes } from './notesService';
import { getSubjectScores } from './scoresService';
import { getUserSubjects } from './userSubjectsService';

export interface ExportOptions {
  includeStudySessions: boolean;
  includeNotes: boolean;
  includeScores: boolean;
  format: 'json' | 'csv' | 'pdf';
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
    let filePath: string;

    if (options.format === 'pdf') {
      // PDF format using expo-print
      const html = convertToPDFHtml(exportData);
      const { uri } = await Print.printToFileAsync({ html });
      filePath = uri;
      fileName = `fairprep_export_${new Date().toISOString().split('T')[0]}.pdf`;
      mimeType = 'application/pdf';
    } else if (options.format === 'json') {
      fileContent = JSON.stringify(exportData, null, 2);
      fileName = `fairprep_export_${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
      filePath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, fileContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } else {
      // CSV format
      fileContent = convertToCSV(exportData);
      fileName = `fairprep_export_${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
      filePath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, fileContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

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

// Convert export data to PDF HTML format
function convertToPDFHtml(data: any): string {
  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 40px;
        color: #1a1a1a;
        background: white;
      }
      h1 {
        color: #6366f1;
        font-size: 28px;
        margin-bottom: 8px;
      }
      .subtitle {
        color: #666;
        font-size: 14px;
        margin-bottom: 32px;
      }
      h2 {
        color: #4b5563;
        font-size: 20px;
        margin-top: 32px;
        margin-bottom: 16px;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 8px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 32px;
      }
      th {
        background: #f3f4f6;
        color: #374151;
        padding: 12px;
        text-align: left;
        font-weight: 600;
        font-size: 14px;
        border-bottom: 2px solid #d1d5db;
      }
      td {
        padding: 10px 12px;
        border-bottom: 1px solid #e5e7eb;
        font-size: 13px;
      }
      tr:hover {
        background: #f9fafb;
      }
      .note-content {
        max-width: 400px;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .tags {
        color: #6366f1;
        font-size: 12px;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        color: #9ca3af;
        font-size: 12px;
      }
    </style>
  `;

  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>FairPrep Data Export</title>
        ${styles}
      </head>
      <body>
        <h1>FairPrep Data Export</h1>
        <p class="subtitle">Generated on ${new Date(data.exportDate).toLocaleString()}</p>
  `;

  // Study Sessions Table
  if (data.studySessions && data.studySessions.length > 0) {
    html += `
      <h2>Study Sessions</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Subject</th>
            <th>Duration</th>
            <th>Time Period</th>
          </tr>
        </thead>
        <tbody>
    `;
    data.studySessions.forEach((s: any) => {
      html += `
        <tr>
          <td>${new Date(s.date).toLocaleDateString()}</td>
          <td>${s.subjectCode} - ${s.subjectName}</td>
          <td>${s.durationMinutes} minutes</td>
          <td>${s.startTime} - ${s.endTime}</td>
        </tr>
      `;
    });
    html += `
        </tbody>
      </table>
    `;
  }

  // Notes Table
  if (data.notes && data.notes.length > 0) {
    html += `
      <h2>Notes</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Subject</th>
            <th>Tags</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
    `;
    data.notes.forEach((n: any) => {
      html += `
        <tr>
          <td><strong>${n.title}</strong><br/><span class="note-content">${n.content.substring(0, 150)}${n.content.length > 150 ? '...' : ''}</span></td>
          <td>${n.subjectCode} - ${n.subjectName}</td>
          <td class="tags">${(n.tags || []).join(', ')}</td>
          <td>${new Date(n.createdAt).toLocaleDateString()}</td>
        </tr>
      `;
    });
    html += `
        </tbody>
      </table>
    `;
  }

  // ATAR Scores Table
  if (data.atarScores && data.atarScores.length > 0) {
    html += `
      <h2>ATAR Scores</h2>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>SAC Average</th>
            <th>Exam Prediction</th>
            <th>Study Rank</th>
            <th>Predicted Score</th>
          </tr>
        </thead>
        <tbody>
    `;
    data.atarScores.forEach((s: any) => {
      html += `
        <tr>
          <td>${s.subjectCode} - ${s.subjectName}</td>
          <td>${s.sacAverage}%</td>
          <td>${s.examPrediction}%</td>
          <td>${s.studyRank}</td>
          <td>${s.predictedStudyScore}</td>
        </tr>
      `;
    });
    html += `
        </tbody>
      </table>
    `;
  }

  html += `
        <div class="footer">
          <p>FairPrep - Your Academic Progress Tracker</p>
          <p>User ID: ${data.userId}</p>
        </div>
      </body>
    </html>
  `;

  return html;
}

// ===================================
// PDF EXPORT FOR INDIVIDUAL PAGES
// ===================================

// Export ATAR prediction to PDF
export async function exportATARToPDF(
  userData: {
    name: string;
    atar: number;
    aggregate: number;
    subjects: Array<{
      code: string;
      name: string;
      sacAverage: number;
      examPrediction: number;
      studyRank: number;
      predictedStudyScore: number;
    }>;
    stateConfig: { stateName: string; scalingAuthority: string };
  }
): Promise<{ success: boolean; message: string; uri?: string }> {
  try {
    if (!userData || !userData.subjects || userData.subjects.length === 0) {
      return { success: false, message: 'No data available to export' };
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>ATAR Prediction Report</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1a1a1a;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            h1 {
              color: #6366f1;
              font-size: 32px;
              margin-bottom: 8px;
            }
            .atar-box {
              background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              color: white;
              padding: 24px;
              border-radius: 12px;
              text-align: center;
              margin: 32px 0;
            }
            .atar-value {
              font-size: 48px;
              font-weight: bold;
            }
            .aggregate {
              font-size: 18px;
              opacity: 0.9;
              margin-top: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 24px 0;
            }
            th {
              background: #f3f4f6;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              border-bottom: 2px solid #d1d5db;
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #9ca3af;
              font-size: 12px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ATAR Prediction Report</h1>
            <p>${userData.stateConfig.stateName} • ${userData.stateConfig.scalingAuthority}</p>
          </div>

          <div class="atar-box">
            <div class="atar-value">${userData.atar.toFixed(2)}</div>
            <div class="aggregate">Aggregate: ${userData.aggregate.toFixed(1)}</div>
          </div>

          <h2>Subject Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>SAC</th>
                <th>Exam</th>
                <th>Rank</th>
                <th>Study Score</th>
              </tr>
            </thead>
            <tbody>
              ${userData.subjects.map(s => `
                <tr>
                  <td><strong>${s.code}</strong><br/>${s.name}</td>
                  <td>${s.sacAverage}%</td>
                  <td>${s.examPrediction}%</td>
                  <td>${s.studyRank}</td>
                  <td><strong>${s.predictedStudyScore.toFixed(1)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Generated by FairPrep on ${new Date().toLocaleDateString()}</p>
            <p>This is an estimate based on current data. Actual ATAR may vary.</p>
          </div>
        </body>
      </html>
    `;

    const printResult = await Print.printToFileAsync({ html });
    
    if (!printResult || !printResult.uri) {
      return { success: false, message: 'Failed to generate PDF file' };
    }

    const { uri } = printResult;
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share ATAR Report',
      });
    }

    return { success: true, message: 'ATAR report exported successfully', uri };
  } catch (error: any) {
    console.error('PDF export error:', error);
    return { success: false, message: error.message || 'Failed to export PDF' };
  }
}

// Export AI Study Plan to PDF
export async function exportStudyPlanToPDF(
  plan: string,
  metadata: {
    targetATAR: string;
    hoursPerWeek: string;
    subjects: Array<{ code: string; name: string }>;
  }
): Promise<{ success: boolean; message: string; uri?: string }> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>AI Study Plan</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1a1a1a;
              line-height: 1.6;
            }
            h1 {
              color: #6366f1;
              font-size: 28px;
              margin-bottom: 16px;
            }
            .metadata {
              background: #f3f4f6;
              padding: 16px;
              border-radius: 8px;
              margin-bottom: 24px;
            }
            .metadata p {
              margin: 4px 0;
              font-size: 14px;
            }
            .plan-content {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-size: 14px;
              line-height: 1.8;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #9ca3af;
              font-size: 12px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h1>📚 Your Personalized Study Plan</h1>
          <div class="metadata">
            <p><strong>Target ATAR:</strong> ${metadata.targetATAR}</p>
            <p><strong>Study Hours/Week:</strong> ${metadata.hoursPerWeek}</p>
            <p><strong>Subjects:</strong> ${metadata.subjects.map(s => s.code).join(', ')}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div class="plan-content">${plan}</div>
          <div class="footer">
            <p>Generated by FairPrep AI Study Planner</p>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Study Plan',
      });
    }

    return { success: true, message: 'Study plan exported successfully', uri };
  } catch (error: any) {
    console.error('PDF export error:', error);
    return { success: false, message: error.message || 'Failed to export PDF' };
  }
}

// Export AI Recommendations to PDF
export async function exportRecommendationsToPDF(
  recommendations: Array<{
    subjectCode: string;
    subjectName: string;
    recommendation: string;
    timestamp: string;
  }>
): Promise<{ success: boolean; message: string; uri?: string }> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>AI Study Recommendations</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1a1a1a;
            }
            h1 {
              color: #6366f1;
              font-size: 28px;
              margin-bottom: 32px;
            }
            .recommendation {
              background: #f9fafb;
              border-left: 4px solid #6366f1;
              padding: 20px;
              margin-bottom: 24px;
              border-radius: 8px;
            }
            .subject {
              font-size: 18px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 8px;
            }
            .content {
              white-space: pre-wrap;
              line-height: 1.6;
              font-size: 14px;
            }
            .timestamp {
              color: #9ca3af;
              font-size: 12px;
              margin-top: 12px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #9ca3af;
              font-size: 12px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h1>✨ AI Study Recommendations</h1>
          ${recommendations.map(r => `
            <div class="recommendation">
              <div class="subject">${r.subjectCode} - ${r.subjectName}</div>
              <div class="content">${r.recommendation}</div>
              <div class="timestamp">Generated: ${new Date(r.timestamp).toLocaleString()}</div>
            </div>
          `).join('')}
          <div class="footer">
            <p>Generated by FairPrep AI Recommendations</p>
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Recommendations',
      });
    }

    return { success: true, message: 'Recommendations exported successfully', uri };
  } catch (error: any) {
    console.error('PDF export error:', error);
    return { success: false, message: error.message || 'Failed to export PDF' };
  }
}
