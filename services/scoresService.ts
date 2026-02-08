import { supabase } from './supabase';
import { SubjectScore } from '@/types';

// Get all subject scores for current user
export async function getSubjectScores(userId: string): Promise<SubjectScore[]> {
  try {
    const { data, error } = await supabase
      .from('vk_subject_scores')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch scores:', error);
      return [];
    }

    return (data || []).map(row => ({
      subjectId: row.subject_id,
      sacAverage: parseFloat(row.sac_average) || 0,
      examPrediction: parseFloat(row.exam_prediction) || 0,
      studyRank: parseFloat(row.study_rank) || 50,
      predictedStudyScore: parseFloat(row.predicted_study_score) || 0,
    }));
  } catch (err) {
    console.error('Error fetching scores:', err);
    return [];
  }
}

// Save or update subject score
export async function saveSubjectScore(
  userId: string,
  subjectId: string,
  sacAverage: number,
  examPrediction: number,
  studyRank: number,
  predictedStudyScore: number
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('vk_subject_scores')
      .upsert({
        user_id: userId,
        subject_id: subjectId,
        sac_average: sacAverage,
        exam_prediction: examPrediction,
        study_rank: studyRank,
        predicted_study_score: predictedStudyScore,
      });

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to save score' };
  }
}

// Delete subject score
export async function deleteSubjectScore(
  userId: string,
  subjectId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('vk_subject_scores')
      .delete()
      .eq('user_id', userId)
      .eq('subject_id', subjectId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete score' };
  }
}
