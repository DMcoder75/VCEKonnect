export interface VCESubject {
  id: string;
  name: string;
  code: string;
  category: 'English' | 'Mathematics' | 'Science' | 'Humanities' | 'Languages' | 'Arts' | 'Technology' | 'Other';
  scaledMean?: number;
  scaledStdDev?: number;
}

// Complete VCE Subjects List - 2024 Scaling Report
export const VCE_SUBJECTS: VCESubject[] = [
  // === ENGLISH (Mandatory - at least one required) ===
  { id: 'en', name: 'English', code: 'EN', category: 'English', scaledMean: 28.2, scaledStdDev: 7.6 },
  { id: 'ef', name: 'English as an Additional Language', code: 'EF', category: 'English', scaledMean: 27.7, scaledStdDev: 8.3 },
  { id: 'eg', name: 'English Language', code: 'EG', category: 'English', scaledMean: 32.6, scaledStdDev: 7.1 },
  { id: 'l', name: 'Literature', code: 'L', category: 'English', scaledMean: 31.2, scaledStdDev: 7.3 },
  
  // === MATHEMATICS ===
  { id: 'ma10', name: 'Foundation Mathematics', code: 'MA10', category: 'Mathematics', scaledMean: 21.3, scaledStdDev: 6.9 },
  { id: 'nf', name: 'General Mathematics', code: 'NF', category: 'Mathematics', scaledMean: 27.8, scaledStdDev: 7.2 },
  { id: 'nj', name: 'Mathematical Methods', code: 'NJ', category: 'Mathematics', scaledMean: 34.5, scaledStdDev: 8.4 },
  { id: 'ns', name: 'Specialist Mathematics', code: 'NS', category: 'Mathematics', scaledMean: 41.6, scaledStdDev: 8.3 },
  
  // === SCIENCES ===
  { id: 'bi', name: 'Biology', code: 'BI', category: 'Science', scaledMean: 30.4, scaledStdDev: 7.4 },
  { id: 'ch', name: 'Chemistry', code: 'CH', category: 'Science', scaledMean: 33.7, scaledStdDev: 7.3 },
  { id: 'ph', name: 'Physics', code: 'PH', category: 'Science', scaledMean: 32.2, scaledStdDev: 7.4 },
  { id: 'py', name: 'Psychology', code: 'PY', category: 'Science', scaledMean: 28.4, scaledStdDev: 7.5 },
  { id: 'ev', name: 'Environmental Science', code: 'EV', category: 'Science', scaledMean: 28.0, scaledStdDev: 7.0 },
  
  // === HUMANITIES ===
  { id: 'ac', name: 'Accounting', code: 'AC', category: 'Humanities', scaledMean: 30.8, scaledStdDev: 7.4 },
  { id: 'bm', name: 'Business Management', code: 'BM', category: 'Humanities', scaledMean: 27.1, scaledStdDev: 7.3 },
  { id: 'ec', name: 'Economics', code: 'EC', category: 'Humanities', scaledMean: 31.5, scaledStdDev: 7.1 },
  { id: 'ge', name: 'Geography', code: 'GE', category: 'Humanities', scaledMean: 28.5, scaledStdDev: 7.4 },
  { id: 'hi17', name: 'History: Ancient History', code: 'HI17', category: 'Humanities', scaledMean: 27.9, scaledStdDev: 8.0 },
  { id: 'ha', name: 'History: Australian History', code: 'HA', category: 'Humanities', scaledMean: 27.8, scaledStdDev: 8.2 },
  { id: 'hr', name: 'History: Revolutions', code: 'HR', category: 'Humanities', scaledMean: 28.6, scaledStdDev: 7.7 },
  { id: 'ls', name: 'Legal Studies', code: 'LS', category: 'Humanities', scaledMean: 28.4, scaledStdDev: 7.6 },
  { id: 'pl', name: 'Philosophy', code: 'PL', category: 'Humanities', scaledMean: 29.6, scaledStdDev: 7.4 },
  { id: 'ps03', name: 'Politics: Australian Politics', code: 'PS03', category: 'Humanities', scaledMean: 32.2, scaledStdDev: 7.1 },
  { id: 'ps05', name: 'Politics: Global Politics', code: 'PS05', category: 'Humanities', scaledMean: 32.2, scaledStdDev: 7.1 },
  { id: 'rs', name: 'Religion and Society', code: 'RS', category: 'Humanities', scaledMean: 28.3, scaledStdDev: 7.8 },
  { id: 'so03', name: 'Sociology', code: 'SO03', category: 'Humanities', scaledMean: 26.0, scaledStdDev: 7.0 },
  { id: 'hh', name: 'Health and Human Development', code: 'HH', category: 'Humanities', scaledMean: 26.3, scaledStdDev: 7.3 },
  { id: 'cc', name: 'Classical Studies', code: 'CC', category: 'Humanities', scaledMean: 30.4, scaledStdDev: 7.6 },
  
  // === ARTS ===
  { id: 'at', name: 'Art Creative Practice', code: 'AT', category: 'Arts', scaledMean: 27.5, scaledStdDev: 7.5 },
  { id: 'sa', name: 'Art Making and Exhibiting', code: 'SA', category: 'Arts', scaledMean: 26.6, scaledStdDev: 7.3 },
  { id: 'da', name: 'Dance', code: 'DA', category: 'Arts', scaledMean: 28.0, scaledStdDev: 7.0 },
  { id: 'dr', name: 'Drama', code: 'DR', category: 'Arts', scaledMean: 28.3, scaledStdDev: 7.2 },
  { id: 'me', name: 'Media', code: 'ME', category: 'Arts', scaledMean: 27.1, scaledStdDev: 7.1 },
  { id: 'md', name: 'Music: Composition', code: 'MD', category: 'Arts', scaledMean: 31.2, scaledStdDev: 7.3 },
  { id: 'mc06', name: 'Music: Contemporary Performance', code: 'MC06', category: 'Arts', scaledMean: 27.5, scaledStdDev: 6.9 },
  { id: 'mc05', name: 'Music: Inquiry', code: 'MC05', category: 'Arts', scaledMean: 27.7, scaledStdDev: 7.0 },
  { id: 'mc04', name: 'Music: Repertoire Performance', code: 'MC04', category: 'Arts', scaledMean: 32.4, scaledStdDev: 6.7 },
  
  // === TECHNOLOGY ===
  { id: 'al03', name: 'Algorithmics (HESS)', code: 'AL03', category: 'Technology', scaledMean: 37.9, scaledStdDev: 6.6 },
  { id: 'it02', name: 'Applied Computing: Data Analytics', code: 'IT02', category: 'Technology', scaledMean: 26.9, scaledStdDev: 7.2 },
  { id: 'it03', name: 'Applied Computing: Software Development', code: 'IT03', category: 'Technology', scaledMean: 28.8, scaledStdDev: 7.1 },
  { id: 'dt', name: 'Product Design and Technologies', code: 'DT', category: 'Technology', scaledMean: 25.4, scaledStdDev: 7.4 },
  
  // === OTHER ===
  { id: 'ah', name: 'Agricultural & Horticultural Studies', code: 'AH', category: 'Other', scaledMean: 24.7, scaledStdDev: 6.5 },
  { id: 'ft', name: 'Food Studies', code: 'FT', category: 'Other', scaledMean: 24.1, scaledStdDev: 7.3 },
  { id: 'ie', name: 'Industry and Enterprise', code: 'IE', category: 'Other', scaledMean: 22.1, scaledStdDev: 7.1 },
  { id: 'os', name: 'Outdoor and Environmental Studies', code: 'OS', category: 'Other', scaledMean: 25.5, scaledStdDev: 7.1 },
  { id: 'pe', name: 'Physical Education', code: 'PE', category: 'Other', scaledMean: 27.5, scaledStdDev: 7.3 },
  { id: 'xi03', name: 'Extended Investigation', code: 'XI03', category: 'Other', scaledMean: 32.5, scaledStdDev: 6.8 },
  
  // === LANGUAGES ===
  { id: 'ar', name: 'Arabic', code: 'AR', category: 'Languages', scaledMean: 30.0, scaledStdDev: 7.4 },
  { id: 'au', name: 'Auslan', code: 'AU', category: 'Languages', scaledMean: 29.6, scaledStdDev: 6.8 },
  { id: 'cn', name: 'Chinese First Language', code: 'CN', category: 'Languages', scaledMean: 34.8, scaledStdDev: 6.1 },
  { id: 'lo57', name: 'Chinese Language Culture and Society', code: 'LO57', category: 'Languages', scaledMean: 37.5, scaledStdDev: 7.6 },
  { id: 'ck', name: 'Chinese Second Language Advanced', code: 'CK', category: 'Languages', scaledMean: 40.6, scaledStdDev: 6.5 },
  { id: 'cl', name: 'Chinese Second Language', code: 'CL', category: 'Languages', scaledMean: 31.0, scaledStdDev: 7.0 },
  { id: 'fr', name: 'French', code: 'FR', category: 'Languages', scaledMean: 33.1, scaledStdDev: 6.9 },
  { id: 'gm', name: 'German', code: 'GM', category: 'Languages', scaledMean: 35.1, scaledStdDev: 6.5 },
  { id: 'gk', name: 'Greek', code: 'GK', category: 'Languages', scaledMean: 34.8, scaledStdDev: 6.2 },
  { id: 'he', name: 'Hebrew', code: 'HE', category: 'Languages', scaledMean: 33.9, scaledStdDev: 6.8 },
  { id: 'hi', name: 'Hindi', code: 'HI', category: 'Languages', scaledMean: 33.4, scaledStdDev: 6.6 },
  { id: 'in', name: 'Indonesian First Language', code: 'IN', category: 'Languages', scaledMean: 31.9, scaledStdDev: 7.1 },
  { id: 'is', name: 'Indonesian Second Language', code: 'IS', category: 'Languages', scaledMean: 38.2, scaledStdDev: 6.8 },
  { id: 'it', name: 'Italian', code: 'IT', category: 'Languages', scaledMean: 34.6, scaledStdDev: 6.7 },
  { id: 'jp', name: 'Japanese First Language', code: 'JP', category: 'Languages', scaledMean: 39.2, scaledStdDev: 6.3 },
  { id: 'js', name: 'Japanese Second Language', code: 'JS', category: 'Languages', scaledMean: 40.9, scaledStdDev: 6.7 },
  { id: 'kh', name: 'Khmer', code: 'KH', category: 'Languages', scaledMean: 32.2, scaledStdDev: 6.9 },
  { id: 'ko', name: 'Korean First Language', code: 'KO', category: 'Languages', scaledMean: 36.2, scaledStdDev: 5.7 },
  { id: 'ks', name: 'Korean Second Language', code: 'KS', category: 'Languages', scaledMean: 45.0, scaledStdDev: 6.3 },
  { id: 'ma', name: 'Macedonian', code: 'MA', category: 'Languages', scaledMean: 29.4, scaledStdDev: 7.6 },
  { id: 'l049', name: 'Punjabi', code: 'L049', category: 'Languages', scaledMean: 33.1, scaledStdDev: 6.6 },
  { id: 'ru', name: 'Russian', code: 'RU', category: 'Languages', scaledMean: 34.3, scaledStdDev: 5.4 },
  { id: 'se', name: 'Serbian', code: 'SE', category: 'Languages', scaledMean: 29.5, scaledStdDev: 6.7 },
  { id: 'si', name: 'Sinhala', code: 'SI', category: 'Languages', scaledMean: 36.9, scaledStdDev: 5.9 },
  { id: 'sp', name: 'Spanish', code: 'SP', category: 'Languages', scaledMean: 34.9, scaledStdDev: 7.3 },
  { id: 'tu', name: 'Turkish', code: 'TU', category: 'Languages', scaledMean: 28.2, scaledStdDev: 6.5 },
  { id: 'lo54', name: 'Vietnamese First Language', code: 'LO54', category: 'Languages', scaledMean: 32.1, scaledStdDev: 6.7 },
  { id: 'lo31', name: 'Vietnamese Second Language', code: 'LO31', category: 'Languages', scaledMean: 36.0, scaledStdDev: 6.4 },
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

// 2024 ATAR to Aggregate Conversion Table (from official VTAC data)
export const ATAR_TO_AGGREGATE: { [atar: number]: number } = {
  99.90: 208.16,
  99.80: 205.09,
  99.70: 202.15,
  99.60: 199.80,
  99.50: 198.02,
  99.25: 194.97,
  99.00: 192.07,
  98.50: 187.35,
  98.00: 183.84,
  97.50: 180.73,
  97.00: 178.13,
  96.00: 173.65,
  95.00: 169.54,
  94.00: 166.18,
  93.00: 162.88,
  92.00: 159.98,
  91.00: 157.43,
  90.00: 154.85,
  88.00: 150.38,
  86.00: 146.34,
  85.00: 144.51,
  84.00: 142.60,
  82.00: 138.99,
  80.00: 135.55,
  78.00: 132.20,
  76.00: 129.25,
  75.00: 127.72,
  74.00: 126.28,
  72.00: 123.25,
  70.00: 120.37,
  68.00: 117.59,
  66.00: 114.90,
  65.00: 113.43,
  64.00: 112.08,
  62.00: 109.61,
  60.00: 106.90,
  55.00: 100.30,
  50.00: 93.66,
  45.00: 86.80,
  40.00: 79.51,
};
