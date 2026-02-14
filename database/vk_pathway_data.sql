-- ============================================
-- VCE Konnect - Pathway Data Migration
-- Purpose: Move hardcoded pathway data to external Supabase
-- Tables: vk_career_paths, vk_universities, vk_university_courses
-- ============================================

-- ============================================
-- 1. DROP EXISTING TABLES (if needed)
-- ============================================
drop table if exists public.vk_university_courses cascade;
drop table if exists public.vk_universities cascade;
drop table if exists public.vk_career_paths cascade;

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Career Paths Table
create table public.vk_career_paths (
  id text primary key,
  name text not null,
  category text not null,
  typical_atar integer not null,
  description text not null,
  created_at timestamp with time zone default now()
);

-- Universities Table
create table public.vk_universities (
  id text primary key,
  name text not null,
  short_name text not null,
  state text not null,
  created_at timestamp with time zone default now()
);

-- University Courses Table
create table public.vk_university_courses (
  id text primary key,
  university_id text not null references public.vk_universities(id) on delete cascade,
  name text not null,
  atar integer not null,
  career_path_ids jsonb not null default '[]'::jsonb,
  prerequisites jsonb not null default '[]'::jsonb,
  pathway text,
  created_at timestamp with time zone default now()
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================
create index idx_vk_university_courses_university_id on public.vk_university_courses(university_id);
create index idx_vk_university_courses_atar on public.vk_university_courses(atar);
create index idx_vk_career_paths_typical_atar on public.vk_career_paths(typical_atar);

-- ============================================
-- 4. ENABLE RLS
-- ============================================
alter table public.vk_career_paths enable row level security;
alter table public.vk_universities enable row level security;
alter table public.vk_university_courses enable row level security;

-- ============================================
-- 5. CREATE RLS POLICIES (Public Read Access)
-- ============================================

-- Career Paths - Public Read
create policy "allow_anon_select_career_paths"
  on public.vk_career_paths for select
  to anon
  using (true);

create policy "allow_authenticated_select_career_paths"
  on public.vk_career_paths for select
  to authenticated
  using (true);

-- Universities - Public Read
create policy "allow_anon_select_universities"
  on public.vk_universities for select
  to anon
  using (true);

create policy "allow_authenticated_select_universities"
  on public.vk_universities for select
  to authenticated
  using (true);

-- University Courses - Public Read
create policy "allow_anon_select_university_courses"
  on public.vk_university_courses for select
  to anon
  using (true);

create policy "allow_authenticated_select_university_courses"
  on public.vk_university_courses for select
  to authenticated
  using (true);

-- ============================================
-- 6. INSERT CAREER PATHS DATA
-- ============================================
insert into public.vk_career_paths (id, name, category, typical_atar, description) values
('medicine', 'Medicine', 'Health', 95, 'Doctor, GP, Surgeon'),
('dentistry', 'Dentistry', 'Health', 96, 'Dentist, Orthodontist'),
('engineering', 'Engineering', 'Technology', 85, 'Civil, Mechanical, Software Engineer'),
('law', 'Law', 'Legal', 92, 'Lawyer, Barrister, Solicitor'),
('commerce', 'Commerce/Finance', 'Business', 88, 'Accountant, Analyst, Consultant'),
('biomed', 'Biomedical Science', 'Science', 90, 'Research, Pathology, Lab Work'),
('teaching', 'Teaching', 'Education', 75, 'Primary/Secondary Teacher'),
('nursing', 'Nursing', 'Health', 70, 'Registered Nurse, Midwife'),
('psychology', 'Psychology', 'Health', 80, 'Psychologist, Counsellor'),
('it', 'Information Technology', 'Technology', 78, 'Software Developer, Data Analyst'),
('architecture', 'Architecture', 'Design', 85, 'Architect, Urban Designer'),
('pharmacy', 'Pharmacy', 'Health', 88, 'Pharmacist, Clinical Pharmacist');

-- ============================================
-- 7. INSERT UNIVERSITIES DATA
-- ============================================
insert into public.vk_universities (id, name, short_name, state) values
('unimelb', 'University of Melbourne', 'UniMelb', 'VIC'),
('monash', 'Monash University', 'Monash', 'VIC'),
('rmit', 'RMIT University', 'RMIT', 'VIC'),
('deakin', 'Deakin University', 'Deakin', 'VIC'),
('latrobe', 'La Trobe University', 'La Trobe', 'VIC'),
('swinburne', 'Swinburne University', 'Swinburne', 'VIC'),
('unsw', 'University of New South Wales', 'UNSW', 'NSW'),
('usyd', 'University of Sydney', 'USYD', 'NSW'),
('uq', 'University of Queensland', 'UQ', 'QLD'),
('adelaide', 'University of Adelaide', 'Adelaide', 'SA'),
('anu', 'Australian National University', 'ANU', 'ACT');

-- ============================================
-- 8. INSERT UNIVERSITY COURSES DATA
-- ============================================

-- Medicine Pathways
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-md', 'unimelb', 'Doctor of Medicine', 99, '["medicine"]'::jsonb, '["UCAT", "Interview"]'::jsonb, 'Requires undergrad degree first'),
('monash-biomed', 'monash', 'Biomedicine', 95, '["medicine", "biomed"]'::jsonb, '["Chemistry"]'::jsonb, 'Pathway to Medicine'),
('unimelb-biomed', 'unimelb', 'Biomedicine', 96, '["medicine", "biomed"]'::jsonb, '["Chemistry"]'::jsonb, 'Pathway to Medicine');

-- Dentistry
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-dent', 'unimelb', 'Doctor of Dental Surgery', 99, '["dentistry"]'::jsonb, '["Chemistry"]'::jsonb, 'Requires undergrad first'),
('latrobe-dent', 'latrobe', 'Dental Science', 96, '["dentistry"]'::jsonb, '["Chemistry"]'::jsonb, 'Direct entry');

-- Engineering
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('monash-eng', 'monash', 'Engineering (Honours)', 85, '["engineering"]'::jsonb, '["Maths Methods", "Physics/Chemistry"]'::jsonb, null),
('unimelb-eng', 'unimelb', 'Engineering', 90, '["engineering"]'::jsonb, '["Maths Methods", "Specialist Maths recommended"]'::jsonb, null),
('rmit-eng', 'rmit', 'Engineering (Various)', 80, '["engineering"]'::jsonb, '["Maths Methods"]'::jsonb, null);

-- Law
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-law', 'unimelb', 'Juris Doctor', 99, '["law"]'::jsonb, '["LSAT"]'::jsonb, 'Postgrad only'),
('monash-law', 'monash', 'Laws (Honours)', 96, '["law"]'::jsonb, '[]'::jsonb, 'Direct entry'),
('deakin-law', 'deakin', 'Laws', 88, '["law"]'::jsonb, '[]'::jsonb, null);

-- Commerce
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-comm', 'unimelb', 'Commerce', 95, '["commerce"]'::jsonb, '["Maths Methods recommended"]'::jsonb, null),
('monash-comm', 'monash', 'Commerce', 90, '["commerce"]'::jsonb, '[]'::jsonb, null),
('unsw-comm', 'unsw', 'Commerce', 92, '["commerce"]'::jsonb, '[]'::jsonb, null);

-- IT/Computer Science
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-cs', 'unimelb', 'Computing and Software Systems', 90, '["it", "engineering"]'::jsonb, '["Maths Methods"]'::jsonb, null),
('monash-it', 'monash', 'Information Technology', 80, '["it"]'::jsonb, '[]'::jsonb, null),
('rmit-cs', 'rmit', 'Computer Science', 78, '["it"]'::jsonb, '[]'::jsonb, null);

-- Nursing
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('monash-nurse', 'monash', 'Nursing', 70, '["nursing"]'::jsonb, '[]'::jsonb, null),
('deakin-nurse', 'deakin', 'Nursing', 68, '["nursing"]'::jsonb, '[]'::jsonb, null),
('latrobe-nurse', 'latrobe', 'Nursing', 65, '["nursing"]'::jsonb, '[]'::jsonb, null);

-- Psychology
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-psych', 'unimelb', 'Science (Psychology)', 85, '["psychology"]'::jsonb, '[]'::jsonb, 'Requires Masters for registration'),
('monash-psych', 'monash', 'Psychological Science', 80, '["psychology"]'::jsonb, '[]'::jsonb, null),
('deakin-psych', 'deakin', 'Psychology', 75, '["psychology"]'::jsonb, '[]'::jsonb, null);

-- Teaching
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('monash-teach', 'monash', 'Education (Honours)', 75, '["teaching"]'::jsonb, '[]'::jsonb, null),
('deakin-teach', 'deakin', 'Teaching', 70, '["teaching"]'::jsonb, '[]'::jsonb, null),
('latrobe-teach', 'latrobe', 'Education', 68, '["teaching"]'::jsonb, '[]'::jsonb, null);

-- Pharmacy
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('monash-pharm', 'monash', 'Pharmacy (Honours)', 90, '["pharmacy"]'::jsonb, '["Chemistry"]'::jsonb, null),
('latrobe-pharm', 'latrobe', 'Pharmacy', 85, '["pharmacy"]'::jsonb, '["Chemistry"]'::jsonb, null);

-- Architecture
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-arch', 'unimelb', 'Design (Architecture)', 88, '["architecture"]'::jsonb, '["Portfolio"]'::jsonb, 'Requires Masters'),
('monash-arch', 'monash', 'Architectural Design', 85, '["architecture"]'::jsonb, '["Portfolio"]'::jsonb, null),
('rmit-arch', 'rmit', 'Architecture', 82, '["architecture"]'::jsonb, '["Portfolio"]'::jsonb, null);

-- ============================================
-- 9. VERIFICATION QUERIES
-- ============================================
-- Uncomment to verify data after running:

-- select count(*) as career_paths_count from public.vk_career_paths;
-- select count(*) as universities_count from public.vk_universities;
-- select count(*) as courses_count from public.vk_university_courses;

-- Sample query to test relationships:
-- select 
--   c.name as course_name,
--   u.short_name as university,
--   c.atar,
--   c.career_path_ids
-- from public.vk_university_courses c
-- join public.vk_universities u on c.university_id = u.id
-- order by c.atar desc
-- limit 10;
