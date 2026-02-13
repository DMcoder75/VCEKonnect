import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getSubjectScores, saveSubjectScore } from '@/services/scoresService';
import { getUserSubjects } from '@/services/userSubjectsService';
import { calculateStudyScore, calculateATAR, calculateATARScenarios } from '@/services/atarCalculator';
import { SubjectScore } from '@/types';
import { VCESubject } from '@/services/vceSubjectsService';

export function useATAR() {
  const { user } = useAuth();
  const [subjectScores, setSubjectScores] = useState<SubjectScore[]>([]);
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    if (!user) return;
    
    try {
      const [scores, subjects] = await Promise.all([
        getSubjectScores(user.id),
        getUserSubjects(user.id)
      ]);
      setSubjectScores(scores);
      setUserSubjects(subjects);
    } catch (error) {
      console.error('Failed to load data:', error);
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
    if (!user) return;

    // Get subject scaling data
    const subject = userSubjects.find(s => s.id === subjectId);
    const scaledMean = subject?.scaledMean ?? 30;
    const scaledStdDev = subject?.scaledStdDev ?? 7;

    const predictedStudyScore = calculateStudyScore(
      subjectId,
      sacAverage,
      examPrediction,
      studyRank,
      scaledMean,
      scaledStdDev
    );

    // Save to database
    const { error } = await saveSubjectScore(
      user.id,
      subjectId,
      sacAverage,
      examPrediction,
      studyRank,
      predictedStudyScore
    );

    if (error) {
      alert(error);
      return;
    }

    // Update local state
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
  }

  async function removeScore(subjectId: string): Promise<void> {
    if (!user) return;

    const { deleteSubjectScore } = await import('@/services/scoresService');
    const { error } = await deleteSubjectScore(user.id, subjectId);

    if (error) {
      alert(error);
      return;
    }

    const filtered = subjectScores.filter(s => s.subjectId !== subjectId);
    setSubjectScores(filtered);
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
    reloadScores: loadData,
  };
}
