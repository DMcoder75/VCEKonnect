
// DalsiAI API Service for FairPrep
// API Documentation: https://api.neodalsi.com

import { getSupabaseClient } from '@/template';

const DALSI_API_KEY = 'sk-dalsi-b2b6c7d012b1cbac235c7aeef7c2b9191ec6fdbe7226bc3db1e1880ab8cd6bf6';
const DALSI_API_BASE = 'https://api.neodalsi.com';

// Use Edge Function proxy to bypass CORS in web preview
const USE_PROXY = true;

export type AIMode = 'short' | 'medium' | 'long' | 'detailed';

export interface AIRequest {
  message: string;
  mode?: AIMode;
  session_id?: string;
  user_id?: string;
}

export interface AIResponse {
  response: string;
  model: string;
  model_selection_reason: string;
  chat_id: string;
  user_id: string;
  session_id: string;
  timestamp: string;
  is_complete: boolean;
  is_continuation: boolean;
  completeness_score: number;
  followup_questions: string[];
  references: any[];
  missing_elements: any[];
  generation_params: {
    temperature: number;
    max_new_tokens: number;
    min_new_tokens: number;
    top_p: number;
    repetition_penalty: number;
    enable_eos: boolean;
  };
  powered_by: string;
}

/**
 * Generate AI response using DalsiAI API
 */
export async function generateAIResponse(
  request: AIRequest
): Promise<{ data: AIResponse | null; error: string | null }> {
  try {
    let response: Response;

    if (USE_PROXY) {
      // Use Edge Function proxy (bypasses CORS)
      const supabase = getSupabaseClient();
      const { data: proxyData, error: proxyError } = await supabase.functions.invoke('dalsi-ai-proxy', {
        body: {
          message: request.message,
          mode: request.mode || 'medium',
          user_id: request.user_id,
        },
      });

      if (proxyError) {
        throw new Error(`Proxy error: ${proxyError.message}`);
      }

      // Edge function returns data directly, not a Response object
      return { data: proxyData as AIResponse, error: null };
    } else {
      // Direct API call (works on mobile, may fail on web due to CORS)
      response = await fetch(`${DALSI_API_BASE}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': DALSI_API_KEY,
        },
        body: JSON.stringify({
          message: request.message,
          mode: request.mode || 'medium',
          session_id: request.session_id,
          user_id: request.user_id,
        }),
      });

      if (!response.ok) {
        // Capture full error response for debugging
        let errorDetails = '';
        try {
          const errorText = await response.text();
          errorDetails = errorText;
        } catch (parseErr) {
          errorDetails = 'Could not parse error response';
        }

        const errorMessage = `API Error ${response.status}: ${response.statusText}\n\nFull Response:\n${errorDetails}`;

        if (response.status === 401) {
          return { data: null, error: `Invalid API key\n\n${errorMessage}` };
        } else if (response.status === 429) {
          return { data: null, error: `Rate limit exceeded\n\n${errorMessage}` };
        } else if (response.status === 524) {
          return { data: null, error: `Request timeout\n\n${errorMessage}` };
        } else {
          return { data: null, error: errorMessage };
        }
      }

      const data: AIResponse = await response.json();
      return { data, error: null };
    }
  } catch (err: any) {
    console.error('AI service error:', err);
    const detailedError = `Network Error: ${err.message}\n\nStack: ${err.stack || 'No stack trace'}`;
    return { data: null, error: detailedError };
  }
}

/**
 * Generate a personalized study plan based on user goals and subjects
 */
export async function generateStudyPlan(
  userId: string,
  subjects: { code: string; name: string }[],
  targetATAR: number,
  currentScores: { [subjectCode: string]: number },
  availableHoursPerWeek: number,
  examDate: string
): Promise<{ data: AIResponse | null; error: string | null }> {
  const subjectsList = subjects.map(s => `${s.code} (${s.name})`).join(', ');
  const scoresList = Object.entries(currentScores)
    .map(([code, score]) => `${code}: ${score}%`)
    .join(', ');

  const message = `Create a personalized VCE study plan for an Australian Year 12 student:

Target ATAR: ${targetATAR}
Subjects: ${subjectsList}
Current Scores: ${scoresList}
Available Study Time: ${availableHoursPerWeek} hours/week
Exam Date: ${examDate}

Generate a weekly study schedule that:
1. Prioritizes subjects with lowest scores
2. Allocates more time to high-scaling subjects (Specialist Maths, Chemistry, Physics)
3. Includes review sessions and practice exams
4. Suggests specific study techniques for each subject
5. Balances workload across the week

Format as a structured weekly plan with daily tasks.`;

  return await generateAIResponse({
    message,
    mode: 'long', // Use long mode for detailed study plan
    user_id: userId,
  });
}

/**
 * Get personalized study recommendations based on recent activity
 */
export async function getStudyRecommendations(
  userId: string,
  subjectCode: string,
  recentStudyMinutes: number,
  lastStudyDate: string,
  currentScore: number,
  examInDays: number
): Promise<{ data: AIResponse | null; error: string | null }> {
  const message = `Provide quick study recommendations for a VCE student:

Subject: ${subjectCode}
Recent Study: ${recentStudyMinutes} minutes
Last Studied: ${lastStudyDate}
Current Score: ${currentScore}%
Days Until Exam: ${examInDays}

Give 3-5 actionable recommendations to improve their study approach. Keep it concise and focused.`;

  return await generateAIResponse({
    message,
    mode: 'short', // Use short mode for quick recommendations
    user_id: userId,
  });
}

/**
 * Summarize notes using AI
 */
export async function summarizeNotes(
  userId: string,
  noteTitle: string,
  noteContent: string,
  subjectCode: string
): Promise<{ data: AIResponse | null; error: string | null }> {
  const message = `Summarize these VCE ${subjectCode} notes:

Title: ${noteTitle}

Content:
${noteContent}

Provide:
1. Key concepts (bullet points)
2. Important formulas or definitions
3. Exam tips
4. 2-3 practice questions

Keep the summary concise and exam-focused.`;

  return await generateAIResponse({
    message,
    mode: 'medium', // Use medium mode for summaries
    user_id: userId,
  });
}

/**
 * Generate practice SAC/exam questions
 */
export async function generatePracticeQuestions(
  userId: string,
  subjectCode: string,
  subjectName: string,
  topic: string,
  difficultyLevel: 'easy' | 'medium' | 'hard',
  questionCount: number
): Promise<{ data: AIResponse | null; error: string | null }> {
  const message = `Generate ${questionCount} VCE ${subjectName} (${subjectCode}) practice questions:

Topic: ${topic}
Difficulty: ${difficultyLevel}
Format: SAC/Exam style

For each question:
1. Write a clear, exam-style question
2. Provide the answer
3. Explain the working/reasoning
4. List key concepts tested

Follow official VCE exam format and difficulty standards.`;

  return await generateAIResponse({
    message,
    mode: 'long', // Use long mode for detailed questions
    user_id: userId,
  });
}

/**
 * Get exam preparation tips
 */
export async function getExamTips(
  userId: string,
  subjectCode: string,
  examType: 'SAC' | 'Exam 1' | 'Exam 2',
  daysUntilExam: number
): Promise<{ data: AIResponse | null; error: string | null }> {
  const message = `Provide exam preparation tips for VCE ${subjectCode} ${examType}:

Time until exam: ${daysUntilExam} days

Give specific advice on:
1. What to study in the remaining time
2. Practice exam strategies
3. Time management during the exam
4. Common mistakes to avoid
5. Last-minute revision tips

Focus on actionable, VCE-specific advice.`;

  return await generateAIResponse({
    message,
    mode: 'medium',
    user_id: userId,
  });
}
