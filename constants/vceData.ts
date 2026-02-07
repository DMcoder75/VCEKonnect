export interface VCESubject {
  id: string;
  name: string;
  code: string;
  category: 'English' | 'Mathematics' | 'Science' | 'Humanities' | 'Languages' | 'Arts' | 'Other';
}

export const VCE_SUBJECTS: VCESubject[] = [
  // English (mandatory)
  { id: 'eng', name: 'English', code: 'ENG', category: 'English' },
  { id: 'eal', name: 'English as Additional Language', code: 'EAL', category: 'English' },
  { id: 'lit', name: 'Literature', code: 'LIT', category: 'English' },
  
  // Mathematics
  { id: 'mathm', name: 'Mathematical Methods', code: 'MATHM', category: 'Mathematics' },
  { id: 'spesh', name: 'Specialist Mathematics', code: 'SPESH', category: 'Mathematics' },
  { id: 'further', name: 'Further Mathematics', code: 'FURTHER', category: 'Mathematics' },
  
  // Sciences
  { id: 'bio', name: 'Biology', code: 'BIO', category: 'Science' },
  { id: 'chem', name: 'Chemistry', code: 'CHEM', category: 'Science' },
  { id: 'phys', name: 'Physics', code: 'PHYS', category: 'Science' },
  { id: 'psych', name: 'Psychology', code: 'PSYCH', category: 'Science' },
  
  // Humanities
  { id: 'hist', name: 'History: Revolutions', code: 'HIST', category: 'Humanities' },
  { id: 'legal', name: 'Legal Studies', code: 'LEGAL', category: 'Humanities' },
  { id: 'bus', name: 'Business Management', code: 'BUS', category: 'Humanities' },
  { id: 'acc', name: 'Accounting', code: 'ACC', category: 'Humanities' },
  { id: 'econ', name: 'Economics', code: 'ECON', category: 'Humanities' },
  
  // Arts
  { id: 'art', name: 'Studio Arts', code: 'ART', category: 'Arts' },
  { id: 'media', name: 'Media', code: 'MEDIA', category: 'Arts' },
  { id: 'drama', name: 'Drama', code: 'DRAMA', category: 'Arts' },
  
  // Languages
  { id: 'french', name: 'French', code: 'FRENCH', category: 'Languages' },
  { id: 'chinese', name: 'Chinese', code: 'CHINESE', category: 'Languages' },
  { id: 'japanese', name: 'Japanese', code: 'JAPANESE', category: 'Languages' },
];

export interface CareerPath {
  id: string;
  name: string;
  category: string;
  typicalATAR: number;
  description: string;
}

export const CAREER_PATHS: CareerPath[] = [
  { id: 'medicine', name: 'Medicine', category: 'Health', typicalATAR: 95, description: 'Doctor, GP, Surgeon' },
  { id: 'dentistry', name: 'Dentistry', category: 'Health', typicalATAR: 96, description: 'Dentist, Orthodontist' },
  { id: 'engineering', name: 'Engineering', category: 'Technology', typicalATAR: 85, description: 'Civil, Mechanical, Software Engineer' },
  { id: 'law', name: 'Law', category: 'Legal', typicalATAR: 92, description: 'Lawyer, Barrister, Solicitor' },
  { id: 'commerce', name: 'Commerce/Finance', category: 'Business', typicalATAR: 88, description: 'Accountant, Analyst, Consultant' },
  { id: 'biomed', name: 'Biomedical Science', category: 'Science', typicalATAR: 90, description: 'Research, Pathology, Lab Work' },
  { id: 'teaching', name: 'Teaching', category: 'Education', typicalATAR: 75, description: 'Primary/Secondary Teacher' },
  { id: 'nursing', name: 'Nursing', category: 'Health', typicalATAR: 70, description: 'Registered Nurse, Midwife' },
  { id: 'psychology', name: 'Psychology', category: 'Health', typicalATAR: 80, description: 'Psychologist, Counsellor' },
  { id: 'it', name: 'Information Technology', category: 'Technology', typicalATAR: 78, description: 'Software Developer, Data Analyst' },
  { id: 'architecture', name: 'Architecture', category: 'Design', typicalATAR: 85, description: 'Architect, Urban Designer' },
  { id: 'pharmacy', name: 'Pharmacy', category: 'Health', typicalATAR: 88, description: 'Pharmacist, Clinical Pharmacist' },
];

export interface University {
  id: string;
  name: string;
  shortName: string;
  state: string;
}

export const UNIVERSITIES: University[] = [
  { id: 'unimelb', name: 'University of Melbourne', shortName: 'UniMelb', state: 'VIC' },
  { id: 'monash', name: 'Monash University', shortName: 'Monash', state: 'VIC' },
  { id: 'rmit', name: 'RMIT University', shortName: 'RMIT', state: 'VIC' },
  { id: 'deakin', name: 'Deakin University', shortName: 'Deakin', state: 'VIC' },
  { id: 'latrobe', name: 'La Trobe University', shortName: 'La Trobe', state: 'VIC' },
  { id: 'swinburne', name: 'Swinburne University', shortName: 'Swinburne', state: 'VIC' },
  { id: 'unsw', name: 'University of New South Wales', shortName: 'UNSW', state: 'NSW' },
  { id: 'usyd', name: 'University of Sydney', shortName: 'USYD', state: 'NSW' },
  { id: 'uq', name: 'University of Queensland', shortName: 'UQ', state: 'QLD' },
  { id: 'adelaide', name: 'University of Adelaide', shortName: 'Adelaide', state: 'SA' },
  { id: 'anu', name: 'Australian National University', shortName: 'ANU', state: 'ACT' },
];

export interface UniversityCourse {
  id: string;
  universityId: string;
  name: string;
  atar: number;
  careerPathIds: string[];
  prerequisites: string[];
  pathway?: string;
}

export const UNIVERSITY_COURSES: UniversityCourse[] = [
  // Medicine pathways
  { id: 'unimelb-md', universityId: 'unimelb', name: 'Doctor of Medicine', atar: 99.5, careerPathIds: ['medicine'], prerequisites: ['UCAT', 'Interview'], pathway: 'Requires undergrad degree first' },
  { id: 'monash-biomed', universityId: 'monash', name: 'Biomedicine', atar: 95, careerPathIds: ['medicine', 'biomed'], prerequisites: ['Chemistry'], pathway: 'Pathway to Medicine' },
  { id: 'unimelb-biomed', universityId: 'unimelb', name: 'Biomedicine', atar: 96, careerPathIds: ['medicine', 'biomed'], prerequisites: ['Chemistry'], pathway: 'Pathway to Medicine' },
  
  // Dentistry
  { id: 'unimelb-dent', universityId: 'unimelb', name: 'Doctor of Dental Surgery', atar: 99, careerPathIds: ['dentistry'], prerequisites: ['Chemistry'], pathway: 'Requires undergrad first' },
  { id: 'latrobe-dent', universityId: 'latrobe', name: 'Dental Science', atar: 96, careerPathIds: ['dentistry'], prerequisites: ['Chemistry'], pathway: 'Direct entry' },
  
  // Engineering
  { id: 'monash-eng', universityId: 'monash', name: 'Engineering (Honours)', atar: 85, careerPathIds: ['engineering'], prerequisites: ['Maths Methods', 'Physics/Chemistry'], pathway: '' },
  { id: 'unimelb-eng', universityId: 'unimelb', name: 'Engineering', atar: 90, careerPathIds: ['engineering'], prerequisites: ['Maths Methods', 'Specialist Maths recommended'], pathway: '' },
  { id: 'rmit-eng', universityId: 'rmit', name: 'Engineering (Various)', atar: 80, careerPathIds: ['engineering'], prerequisites: ['Maths Methods'], pathway: '' },
  
  // Law
  { id: 'unimelb-law', universityId: 'unimelb', name: 'Juris Doctor', atar: 99, careerPathIds: ['law'], prerequisites: ['LSAT'], pathway: 'Postgrad only' },
  { id: 'monash-law', universityId: 'monash', name: 'Laws (Honours)', atar: 96, careerPathIds: ['law'], prerequisites: [], pathway: 'Direct entry' },
  { id: 'deakin-law', universityId: 'deakin', name: 'Laws', atar: 88, careerPathIds: ['law'], prerequisites: [], pathway: '' },
  
  // Commerce
  { id: 'unimelb-comm', universityId: 'unimelb', name: 'Commerce', atar: 95, careerPathIds: ['commerce'], prerequisites: ['Maths Methods recommended'], pathway: '' },
  { id: 'monash-comm', universityId: 'monash', name: 'Commerce', atar: 90, careerPathIds: ['commerce'], prerequisites: [], pathway: '' },
  { id: 'unsw-comm', universityId: 'unsw', name: 'Commerce', atar: 92, careerPathIds: ['commerce'], prerequisites: [], pathway: '' },
  
  // IT/Computer Science
  { id: 'unimelb-cs', universityId: 'unimelb', name: 'Computing and Software Systems', atar: 90, careerPathIds: ['it', 'engineering'], prerequisites: ['Maths Methods'], pathway: '' },
  { id: 'monash-it', universityId: 'monash', name: 'Information Technology', atar: 80, careerPathIds: ['it'], prerequisites: [], pathway: '' },
  { id: 'rmit-cs', universityId: 'rmit', name: 'Computer Science', atar: 78, careerPathIds: ['it'], prerequisites: [], pathway: '' },
  
  // Nursing
  { id: 'monash-nurse', universityId: 'monash', name: 'Nursing', atar: 70, careerPathIds: ['nursing'], prerequisites: [], pathway: '' },
  { id: 'deakin-nurse', universityId: 'deakin', name: 'Nursing', atar: 68, careerPathIds: ['nursing'], prerequisites: [], pathway: '' },
  { id: 'latrobe-nurse', universityId: 'latrobe', name: 'Nursing', atar: 65, careerPathIds: ['nursing'], prerequisites: [], pathway: '' },
  
  // Psychology
  { id: 'unimelb-psych', universityId: 'unimelb', name: 'Science (Psychology)', atar: 85, careerPathIds: ['psychology'], prerequisites: [], pathway: 'Requires Masters for registration' },
  { id: 'monash-psych', universityId: 'monash', name: 'Psychological Science', atar: 80, careerPathIds: ['psychology'], prerequisites: [], pathway: '' },
  { id: 'deakin-psych', universityId: 'deakin', name: 'Psychology', atar: 75, careerPathIds: ['psychology'], prerequisites: [], pathway: '' },
  
  // Teaching
  { id: 'monash-teach', universityId: 'monash', name: 'Education (Honours)', atar: 75, careerPathIds: ['teaching'], prerequisites: [], pathway: '' },
  { id: 'deakin-teach', universityId: 'deakin', name: 'Teaching', atar: 70, careerPathIds: ['teaching'], prerequisites: [], pathway: '' },
  { id: 'latrobe-teach', universityId: 'latrobe', name: 'Education', atar: 68, careerPathIds: ['teaching'], prerequisites: [], pathway: '' },
  
  // Pharmacy
  { id: 'monash-pharm', universityId: 'monash', name: 'Pharmacy (Honours)', atar: 90, careerPathIds: ['pharmacy'], prerequisites: ['Chemistry'], pathway: '' },
  { id: 'latrobe-pharm', universityId: 'latrobe', name: 'Pharmacy', atar: 85, careerPathIds: ['pharmacy'], prerequisites: ['Chemistry'], pathway: '' },
  
  // Architecture
  { id: 'unimelb-arch', universityId: 'unimelb', name: 'Design (Architecture)', atar: 88, careerPathIds: ['architecture'], prerequisites: ['Portfolio'], pathway: 'Requires Masters' },
  { id: 'monash-arch', universityId: 'monash', name: 'Architectural Design', atar: 85, careerPathIds: ['architecture'], prerequisites: ['Portfolio'], pathway: '' },
  { id: 'rmit-arch', universityId: 'rmit', name: 'Architecture', atar: 82, careerPathIds: ['architecture'], prerequisites: ['Portfolio'], pathway: '' },
];
