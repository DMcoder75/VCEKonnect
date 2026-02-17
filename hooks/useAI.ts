import { useState } from 'react';
import {
  generateAIResponse,
  generateStudyPlan,
  getStudyRecommendations,
  summarizeNotes,
  generatePracticeQuestions,
  getExamTips,
  AIMode,
  AIResponse,
} from '@/services/aiService';

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AIResponse | null>(null);

  // Expose setResponse so caller can update response for recursive continuation
  function updateResponse(newResponse: AIResponse) {
    setResponse(newResponse);
  }

  async function generate(message: string, mode: AIMode = 'medium', userId?: string) {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const result = await generateAIResponse({ message, mode, user_id: userId });

    if (result.error) {
      setError(result.error);
    } else {
      setResponse(result.data);
    }

    setIsLoading(false);
    return result;
  }

  async function createStudyPlan(
    userId: string,
    subjects: { code: string; name: string }[],
    targetATAR: number,
    currentScores: { [subjectCode: string]: number },
    availableHoursPerWeek: number,
    examDate: string,
    sessionId?: string
  ) {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const result = await generateStudyPlan(
      userId,
      subjects,
      targetATAR,
      currentScores,
      availableHoursPerWeek,
      examDate,
      sessionId
    );

    if (result.error) {
      setError(result.error);
    } else {
      setResponse(result.data);
    }

    setIsLoading(false);
    return result;
  }

  async function getRecommendations(
    userId: string,
    subjectCode: string,
    subjectName: string,
    recentStudyMinutes: number,
    lastStudyDate: string,
    currentScore: number,
    examInDays: number
  ) {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const result = await getStudyRecommendations(
      userId,
      subjectCode,
      subjectName,
      recentStudyMinutes,
      lastStudyDate,
      currentScore,
      examInDays
    );

    if (result.error) {
      setError(result.error);
    } else {
      setResponse(result.data);
    }

    setIsLoading(false);
    return result;
  }

  async function summarize(
    userId: string,
    noteTitle: string,
    noteContent: string,
    subjectCode: string,
    subjectName: string
  ) {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const result = await summarizeNotes(userId, noteTitle, noteContent, subjectCode, subjectName);

    if (result.error) {
      setError(result.error);
    } else {
      setResponse(result.data);
    }

    setIsLoading(false);
    return result;
  }

  async function generateQuestions(
    userId: string,
    subjectCode: string,
    subjectName: string,
    topic: string,
    difficultyLevel: 'easy' | 'medium' | 'hard',
    questionCount: number
  ) {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const result = await generatePracticeQuestions(
      userId,
      subjectCode,
      subjectName,
      topic,
      difficultyLevel,
      questionCount
    );

    if (result.error) {
      setError(result.error);
    } else {
      setResponse(result.data);
    }

    setIsLoading(false);
    return result;
  }

  async function getExamPrep(
    userId: string,
    subjectCode: string,
    subjectName: string,
    examType: 'SAC' | 'Exam 1' | 'Exam 2',
    daysUntilExam: number
  ) {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const result = await getExamTips(userId, subjectCode, subjectName, examType, daysUntilExam);

    if (result.error) {
      setError(result.error);
    } else {
      setResponse(result.data);
    }

    setIsLoading(false);
    return result;
  }

  return {
    isLoading,
    error,
    response,
    setResponse: updateResponse, // Export setResponse for manual updates
    generate,
    createStudyPlan,
    getRecommendations,
    summarize,
    generateQuestions,
    getExamPrep,
  };
}
