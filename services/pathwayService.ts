import { supabase } from '@/services/supabase.web';

export interface CareerPath {
  id: string;
  name: string;
  category: string;
  typical_atar: number;
  description: string;
}

export interface University {
  id: string;
  name: string;
  short_name: string;
  state: string;
}

export interface UniversityCourse {
  id: string;
  university_id: string;
  name: string;
  atar: number;
  career_path_ids: string[];
  prerequisites: string[];
  pathway?: string;
}

export interface PathwaySuggestion {
  career: {
    id: string;
    name: string;
    typicalATAR: number;
  };
  courses: {
    id: string;
    universityName: string;
    courseName: string;
    atar: number;
    isEligible: boolean;
    prerequisites: string[];
    pathway?: string;
  }[];
}

/**
 * Get all career paths from external Supabase
 */
export async function getAllCareerPaths(): Promise<CareerPath[]> {
  const { data, error } = await supabase
    .from('vk_career_paths')
    .select('*')
    .order('typical_atar', { ascending: false });

  if (error) {
    console.error('Error fetching career paths:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all universities from external Supabase
 */
export async function getAllUniversities(): Promise<University[]> {
  const { data, error } = await supabase
    .from('vk_universities')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching universities:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all university courses from external Supabase
 */
export async function getAllUniversityCourses(): Promise<UniversityCourse[]> {
  const { data, error } = await supabase
    .from('vk_university_courses')
    .select('*')
    .order('atar', { ascending: true });

  if (error) {
    console.error('Error fetching university courses:', error);
    return [];
  }

  return data || [];
}

/**
 * Get pathway suggestions based on career choice and predicted ATAR
 */
export async function getPathwaySuggestions(
  careerPathId: string,
  predictedATAR: number
): Promise<PathwaySuggestion | null> {
  // Fetch career from external Supabase
  const { data: careerData, error: careerError } = await supabase
    .from('vk_career_paths')
    .select('*')
    .eq('id', careerPathId)
    .single();

  if (careerError || !careerData) {
    console.error('Error fetching career:', careerError);
    return null;
  }

  // Fetch courses that match this career from external Supabase
  // Use cs (contains) filter for JSONB array containment
  const { data: coursesData, error: coursesError } = await supabase
    .from('vk_university_courses')
    .select('*')
    .filter('career_path_ids', 'cs', JSON.stringify([careerPathId]))
    .order('atar', { ascending: true });

  if (coursesError) {
    console.error('Error fetching courses:', coursesError);
    return null;
  }

  // Fetch universities from external Supabase
  const { data: universitiesData, error: universitiesError } = await supabase
    .from('vk_universities')
    .select('*');

  if (universitiesError) {
    console.error('Error fetching universities:', universitiesError);
    return null;
  }

  // Map courses with university names
  const courses = (coursesData || []).map(course => {
    const university = (universitiesData || []).find(u => u.id === course.university_id);
    return {
      id: course.id,
      universityName: university?.short_name || 'Unknown',
      courseName: course.name,
      atar: course.atar,
      isEligible: predictedATAR >= course.atar,
      prerequisites: course.prerequisites || [],
      pathway: course.pathway || undefined,
    };
  });

  return {
    career: {
      id: careerData.id,
      name: careerData.name,
      typicalATAR: careerData.typical_atar,
    },
    courses,
  };
}

/**
 * Get backup career suggestions if predicted ATAR is too low
 */
export async function getBackupCareerSuggestions(
  predictedATAR: number,
  excludeCareerIds: string[] = []
): Promise<{
  id: string;
  name: string;
  typicalATAR: number;
  description: string;
}[]> {
  // Fetch all career paths from external Supabase
  const { data: careersData, error } = await supabase
    .from('vk_career_paths')
    .select('*')
    .lte('typical_atar', predictedATAR + 5) // Within 5 points
    .order('typical_atar', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching backup careers:', error);
    return [];
  }

  return (careersData || [])
    .filter(career => !excludeCareerIds.includes(career.id))
    .slice(0, 3)
    .map(career => ({
      id: career.id,
      name: career.name,
      typicalATAR: career.typical_atar,
      description: career.description,
    }));
}
