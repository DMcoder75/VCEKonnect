
// DalsiAI API Service for FairPrep
// API Documentation: https://api.neodalsi.com

const DALSI_API_KEY = 'sk-dalsi-b2b6c7d012b1cbac235c7aeef7c2b9191ec6fdbe7226bc3db1e1880ab8cd6bf6';
const DALSI_API_BASE = 'https://api.neodalsi.com';
const APP_ID = 'fairprep_mobile_v1';

export type AIMode = 'short' | 'medium' | 'long' | 'detailed';

export interface AIRequest {
  message: string;
  mode?: AIMode;
  session_id?: string;
  app_id?: string;
}

export interface AIResponse {
  response: string;
  session_id: string;
  timestamp: string;
  metadata: {
    search_performed: boolean;
    response_length: number;
    processing_time_ms: number;
    app_id: string;
  };
}

/**
 * Check if a response appears incomplete (doesn't end with proper punctuation)
 */
function isResponseIncomplete(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  // Check if ends with sentence-ending punctuation
  const lastChar = trimmed[trimmed.length - 1];
  const endsWithPunctuation = ['.', '!', '?', '"', "'"].includes(lastChar);
  
  // Also check if it ends mid-word or with incomplete markdown
  const endsWithIncompleteMarker = trimmed.endsWith('-') || 
                                    trimmed.endsWith('*') || 
                                    trimmed.endsWith('#') ||
                                    trimmed.endsWith(':');
  
  return !endsWithPunctuation || endsWithIncompleteMarker;
}

/**
 * Continue an incomplete AI response using session_id
 */
export async function continueAIResponse(
  sessionId: string,
  mode: AIMode = 'short'
): Promise<{ data: AIResponse | null; error: string | null }> {
  return await generateAIResponse({
    message: 'Please continue and complete your previous response.',
    mode,
    session_id: sessionId,
  });
}

/**
 * Generate AI response using DalsiChat API
 */
export async function generateAIResponse(
  request: AIRequest
): Promise<{ data: AIResponse | null; error: string | null; isIncomplete?: boolean }> {
  try {
    // Direct API call to DalsiChat endpoint
    const response = await fetch(`${DALSI_API_BASE}/dalsichat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DALSI_API_KEY,
      },
      body: JSON.stringify({
        message: request.message,
        mode: request.mode || 'medium',
        session_id: request.session_id || undefined,
        app_id: request.app_id || APP_ID,
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

      if (response.status === 400) {
        return { data: null, error: `Bad Request: ${errorDetails}` };
      } else if (response.status === 401) {
        return { data: null, error: `Invalid API key: ${errorDetails}` };
      } else if (response.status === 500) {
        return { data: null, error: `Server error: ${errorDetails}` };
      } else {
        return { data: null, error: `API Error ${response.status}: ${errorDetails}` };
      }
    }

    const data: AIResponse = await response.json();
    const isIncomplete = isResponseIncomplete(data.response);
    return { data, error: null, isIncomplete };
  } catch (err: any) {
    console.error('AI service error:', err);
    return { data: null, error: `Network Error: ${err.message}` };
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
  // Build natural language subject descriptions with full names and current scores
  const subjectDescriptions = subjects.map(s => {
    const score = currentScores[s.code] || 0;
    return `${s.name} (${s.code}) - currently scoring ${score}%`;
  }).join(', ');

  const message = `I'm a Victorian Certificate of Education (VCE) student in Australia, and I need your help creating a personalized weekly study plan. Here's my current situation:

I'm aiming for an ATAR score of ${targetATAR}, and I'm studying the following subjects: ${subjectDescriptions}.

I have ${availableHoursPerWeek} hours available per week for study outside of school, and my final exams begin on ${examDate}.

Based on this information, please create a realistic and balanced weekly study schedule that:
- Allocates more time to subjects where I'm currently scoring lower
- Includes specific daily study blocks for each day of the week (Monday through Sunday)
- Prioritizes the subjects that will have the biggest impact on reaching my target ATAR
- Includes practical study techniques and strategies for each subject
- Takes into account the time remaining until exams

Please provide a clear, day-by-day breakdown that I can follow immediately.`;

  return await generateAIResponse({
    message,
    mode: 'short', // Use short mode for 300 tokens (~2-5 seconds)
    session_id: undefined,
    app_id: APP_ID,
  });
}

/**
 * Get personalized study recommendations based on recent activity
 */
export async function getStudyRecommendations(
  userId: string,
  subjectCode: string,
  subjectName: string,
  recentStudyMinutes: number,
  lastStudyDate: string,
  currentScore: number,
  examInDays: number
): Promise<{ data: AIResponse | null; error: string | null }> {
  const hoursStudied = Math.floor(recentStudyMinutes / 60);
  const minutesRemainder = recentStudyMinutes % 60;
  const timeDescription = hoursStudied > 0 
    ? `${hoursStudied} hour${hoursStudied > 1 ? 's' : ''} and ${minutesRemainder} minutes`
    : `${minutesRemainder} minutes`;

  const message = `I'm a VCE student studying ${subjectName}, and I'd like some personalized recommendations to improve my study approach for this subject.

Here's my current situation with ${subjectName}:
- My recent study session lasted ${timeDescription}
- I last studied this subject ${lastStudyDate}
- My current score in this subject is ${currentScore}%
- I have ${examInDays} days remaining until the exam

Based on my study pattern and current performance, please give me 3 to 5 specific, actionable recommendations that will help me:
1. Improve my understanding of the subject material
2. Manage my study time more effectively
3. Boost my score before the exam
4. Address any gaps or weaknesses in my preparation

Please focus on practical strategies I can implement immediately.`;

  return await generateAIResponse({
    message,
    mode: 'short', // Use short mode for 300 tokens (~2-5 seconds)
    session_id: undefined,
    app_id: APP_ID,
  });
}

/**
 * Summarize notes using AI
 */
export async function summarizeNotes(
  userId: string,
  noteTitle: string,
  noteContent: string,
  subjectCode: string,
  subjectName: string
): Promise<{ data: AIResponse | null; error: string | null }> {
  const message = `I'm a VCE student, and I've taken detailed notes for ${subjectName}. I need your help to create a concise, exam-focused summary that I can use for quick revision.

Here are my notes:

Title: "${noteTitle}"

Content:
${noteContent}

---

Please analyze these notes and provide:

1. A clear summary of the key concepts and main ideas (in bullet point format)
2. Any important formulas, definitions, or terminology that I need to memorize
3. Specific exam tips related to this topic - what examiners typically look for and common mistakes to avoid
4. 2-3 practice questions based on this content that reflect VCE exam style and difficulty

Please make the summary concise but comprehensive enough that I can use it as a standalone revision resource before my ${subjectName} exam.`;

  return await generateAIResponse({
    message,
    mode: 'medium', // Use medium mode for 800 tokens (~5-10 seconds)
    session_id: undefined,
    app_id: APP_ID,
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
  const difficultyDescription = difficultyLevel === 'easy' 
    ? 'introductory level, suitable for building foundational understanding'
    : difficultyLevel === 'medium'
    ? 'moderate difficulty, similar to typical SAC questions'
    : 'challenging level, comparable to difficult exam questions';

  const message = `I'm a VCE student preparing for my ${subjectName} exam, and I need practice questions to test my understanding and improve my exam technique.

Please generate ${questionCount} practice questions on the following topic:

Topic: ${topic}
Subject: ${subjectName}
Difficulty Level: ${difficultyLevel} (${difficultyDescription})

I need these questions to follow the official VCE exam format and standards. For each question, please provide:

1. A clear, well-formatted question that matches the style and structure of actual VCE ${subjectName} SAC and exam questions
2. The complete answer or solution
3. Detailed step-by-step working and reasoning that explains how to arrive at the answer
4. A list of the key concepts being tested in that question
5. Mark allocation (how many marks this question would be worth in a real exam)

The questions should help me practice both my knowledge and my exam technique. Please ensure they cover different aspects of the topic where possible.`;

  return await generateAIResponse({
    message,
    mode: 'long', // Use long mode for 1500 tokens (~10-20 seconds)
    session_id: undefined,
    app_id: APP_ID,
  });
}

/**
 * Get exam preparation tips
 */
export async function getExamTips(
  userId: string,
  subjectCode: string,
  subjectName: string,
  examType: 'SAC' | 'Exam 1' | 'Exam 2',
  daysUntilExam: number
): Promise<{ data: AIResponse | null; error: string | null }> {
  const urgencyContext = daysUntilExam <= 7
    ? 'With only a week left, I need to focus on the most high-yield revision strategies.'
    : daysUntilExam <= 30
    ? 'I have a few weeks to prepare, so I want to make sure I use this time effectively.'
    : 'I have some time to prepare thoroughly and build a strong foundation.';

  const message = `I'm a VCE student preparing for my ${subjectName} ${examType}, and I need expert guidance on how to prepare effectively.

Here's my situation:
- I have ${daysUntilExam} days remaining until the exam
- ${urgencyContext}
- I want to maximize my performance and feel confident going into the exam

Please provide comprehensive, VCE-specific advice covering:

1. Study Plan: What specific topics and content should I focus on in the remaining ${daysUntilExam} days? How should I prioritize my revision?

2. Practice Strategy: How should I use practice exams and past papers? What's the best approach to reviewing my mistakes?

3. Exam Technique: What time management strategies work best for VCE ${subjectName} ${examType}? How should I approach different question types?

4. Common Pitfalls: What are the most common mistakes that students make in ${subjectName} ${examType}, and how can I avoid them?

5. Final Preparation: What should I do in the last few days before the exam? Any last-minute revision tips that actually work?

Please give me practical, actionable advice that's specific to VCE ${subjectName} rather than generic exam tips.`;

  return await generateAIResponse({
    message,
    mode: 'medium', // Use medium mode for 800 tokens (~5-10 seconds)
    session_id: undefined,
    app_id: APP_ID,
  });
}
