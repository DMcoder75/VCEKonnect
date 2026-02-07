import { CAREER_PATHS, UNIVERSITY_COURSES, UNIVERSITIES } from '@/constants/vceData';

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
 * Get pathway suggestions based on career choice and predicted ATAR
 */
export function getPathwaySuggestions(
  careerPathId: string,
  predictedATAR: number
): PathwaySuggestion | null {
  const career = CAREER_PATHS.find(c => c.id === careerPathId);
  if (!career) return null;
  
  // Find all courses matching this career
  const matchingCourses = UNIVERSITY_COURSES.filter(course =>
    course.careerPathIds.includes(careerPathId)
  );
  
  // Sort by ATAR (ascending) and format
  const courses = matchingCourses
    .sort((a, b) => a.atar - b.atar)
    .map(course => {
      const university = UNIVERSITIES.find(u => u.id === course.universityId);
      return {
        id: course.id,
        universityName: university?.shortName || 'Unknown',
        courseName: course.name,
        atar: course.atar,
        isEligible: predictedATAR >= course.atar,
        prerequisites: course.prerequisites,
        pathway: course.pathway,
      };
    });
  
  return {
    career: {
      id: career.id,
      name: career.name,
      typicalATAR: career.typicalATAR,
    },
    courses,
  };
}

/**
 * Get backup career suggestions if predicted ATAR is too low
 */
export function getBackupCareerSuggestions(predictedATAR: number, excludeCareerIds: string[] = []): {
  id: string;
  name: string;
  typicalATAR: number;
  description: string;
}[] {
  return CAREER_PATHS
    .filter(career => 
      !excludeCareerIds.includes(career.id) &&
      career.typicalATAR <= predictedATAR + 5 // Within 5 points
    )
    .sort((a, b) => b.typicalATAR - a.typicalATAR)
    .slice(0, 3)
    .map(career => ({
      id: career.id,
      name: career.name,
      typicalATAR: career.typicalATAR,
      description: career.description,
    }));
}
