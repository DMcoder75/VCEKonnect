import { supabase } from './supabase.web';
import { SubjectScore } from '@/types';
import { checkConnection } from './networkService';
import { saveSubjectScores as saveOfflineScores, getSubjectScores as getOfflineScores } from './offlineDatabase';

// Get all subject scores for current user
export async function getSubjectScores(userId: string): Promise<SubjectScore[]> {
  try {
    const hasConnection = await checkConnection();
    
    if (hasConnection) {
      const { data, error } = await supabase
        .from('vk_subject_scores')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to fetch scores:', error);
        // Try to load from offline cache
        console.log('📡 Loading scores from offline cache');
        const cachedScores = await getOfflineScores(userId);
        return cachedScores.map(row => ({
          subjectId: row.subjectId,
          sacAverage: parseFloat(String(row.sacAverage)) || 0,
          examPrediction: parseFloat(String(row.examPrediction)) || 0,
          studyRank: parseFloat(String(row.studyRank)) || 50,
          predictedStudyScore: parseFloat(String(row.predictedStudyScore)) || 0,
        }));
      }

      const scores = (data || []).map(row => ({
        subjectId: row.subject_id,
        sacAverage: parseFloat(row.sac_average) || 0,
        examPrediction: parseFloat(row.exam_prediction) || 0,
        studyRank: parseFloat(row.study_rank) || 50,
        predictedStudyScore: parseFloat(row.predicted_study_score) || 0,
      }));
      
      // Cache the scores for offline use
      await saveOfflineScores(userId, scores.map(s => ({
        id: s.subjectId,
        subjectId: s.subjectId,
        sacAverage: s.sacAverage,
        examPrediction: s.examPrediction,
        studyRank: s.studyRank,
        predictedStudyScore: s.predictedStudyScore,
      })));
      
      return scores;
    } else {
      // Offline - load from cache
      console.log('📡 Offline: Loading scores from cache');
      const cachedScores = await getOfflineScores(userId);
      return cachedScores.map(row => ({
        subjectId: row.subjectId,
        sacAverage: parseFloat(String(row.sacAverage)) || 0,
        examPrediction: parseFloat(String(row.examPrediction)) || 0,
        studyRank: parseFloat(String(row.studyRank)) || 50,
        predictedStudyScore: parseFloat(String(row.predictedStudyScore)) || 0,
      }));
    }
  } catch (err) {
    console.error('Error fetching scores:', err);
    // Try offline cache as last resort
    try {
      const cachedScores = await getOfflineScores(userId);
      return cachedScores.map(row => ({
        subjectId: row.subjectId,
        sacAverage: parseFloat(String(row.sacAverage)) || 0,
        examPrediction: parseFloat(String(row.examPrediction)) || 0,
        studyRank: parseFloat(String(row.studyRank)) || 50,
        predictedStudyScore: parseFloat(String(row.predictedStudyScore)) || 0,
      }));
    } catch {
      return [];
    }
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
    const hasConnection = await checkConnection();
    
    if (!hasConnection) {
      return { error: 'No Internet connection! Please try after sometime!' };
    }
    
    const { error } = await supabase
      .from('vk_subject_scores')
      .upsert({
        user_id: userId,
        subject_id: subjectId,
        sac_average: sacAverage,
        exam_prediction: examPrediction,
        study_rank: studyRank,
        predicted_study_score: predictedStudyScore,
      }, {
        onConflict: 'user_id,subject_id',
      });

    if (error) return { error: error.message };
    
    // Update offline cache after successful save
    const allScores = await getSubjectScores(userId);
    await saveOfflineScores(userId, allScores.map(s => ({
      id: s.subjectId,
      subjectId: s.subjectId,
      sacAverage: s.sacAverage,
      examPrediction: s.examPrediction,
      studyRank: s.studyRank,
      predictedStudyScore: s.predictedStudyScore,
    })));
    
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
