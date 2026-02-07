import { useState, useEffect } from 'react';
import { getSubjectScores, saveSubjectScores } from '@/services/storage';
import { calculateStudyScore, calculateATAR, calculateATARScenarios } from '@/services/atarCalculator';
import { SubjectScore } from '@/types';

export function useATAR() {
  const [subjectScores, setSubjectScores] = useState<SubjectScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadScores();
  }, []);

  async function loadScores() {
    try {
      const scores = await getSubjectScores();
      setSubjectScores(scores);
    } catch (error) {
      console.error('Failed to load scores:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateScore(
    subjectId: string,
    sacAverage: number,
    examPrediction: number,
    studyRank: number
  ): Promise<void> {
    const predictedStudyScore = calculateStudyScore(
      subjectId,
      sacAverage,
      examPrediction,
      studyRank
    );

    const existingIndex = subjectScores.findIndex(s => s.subjectId === subjectId);
    let updatedScores: SubjectScore[];

    if (existingIndex >= 0) {
      updatedScores = [...subjectScores];
      updatedScores[existingIndex] = {
        subjectId,
        sacAverage,
        examPrediction,
        studyRank,
        predictedStudyScore,
      };
    } else {
      updatedScores = [
        ...subjectScores,
        {
          subjectId,
          sacAverage,
          examPrediction,
          studyRank,
          predictedStudyScore,
        },
      ];
    }

    setSubjectScores(updatedScores);
    await saveSubjectScores(updatedScores);
  }

  async function removeScore(subjectId: string): Promise<void> {
    const filtered = subjectScores.filter(s => s.subjectId !== subjectId);
    setSubjectScores(filtered);
    await saveSubjectScores(filtered);
  }

  function getPrediction() {
    return calculateATAR(subjectScores);
  }

  function getScenarios() {
    return calculateATARScenarios(subjectScores);
  }

  function getScoreForSubject(subjectId: string): SubjectScore | undefined {
    return subjectScores.find(s => s.subjectId === subjectId);
  }

  return {
    subjectScores,
    isLoading,
    updateScore,
    removeScore,
    getPrediction,
    getScenarios,
    getScoreForSubject,
  };
}
