-- ============================================
-- VCE Konnect - Pathway Data Migration (SAFE)
-- Purpose: Safely populate pathway data without destroying existing records
-- Tables: vk_career_paths, vk_universities, vk_university_courses
-- IMPORTANT: Non-destructive - preserves all existing data
-- ============================================

-- ============================================
-- 1. CREATE TABLES (only if they don't exist)
-- ============================================

-- Career Paths Table
create table if not exists public.vk_career_paths (
  id text primary key,
  name text not null,
  category text not null,
  typical_atar integer not null,
  description text not null,
  created_at timestamp with time zone default now()
);

-- Universities Table
create table if not exists public.vk_universities (
  id text primary key,
  name text not null,
  short_name text not null,
  state text not null,
  created_at timestamp with time zone default now()
);

-- University Courses Table
create table if not exists public.vk_university_courses (
  id text primary key,
  university_id text not null references public.vk_universities(id) on delete cascade,
  name text not null,
  atar integer not null,
  career_path_ids jsonb not null default '[]'::jsonb,
  prerequisites jsonb not null default '[]'::jsonb,
  pathway text,
  created_at timestamp with time zone default now()
);

-- Add state_requirements column (for national expansion compatibility)
alter table public.vk_university_courses
add column if not exists state_requirements jsonb default '{}'::jsonb;

comment on column public.vk_university_courses.state_requirements is 'State-specific entry requirements: {vic: {atar: 95}, nsw: {atar: 94}}';

-- ============================================
-- 2. CREATE INDEXES (if not exist)
-- ============================================
create index if not exists idx_vk_university_courses_university_id on public.vk_university_courses(university_id);
create index if not exists idx_vk_university_courses_atar on public.vk_university_courses(atar);
create index if not exists idx_vk_career_paths_typical_atar on public.vk_career_paths(typical_atar);

-- ============================================
-- 3. ENABLE RLS (idempotent)
-- ============================================
alter table public.vk_career_paths enable row level security;
alter table public.vk_universities enable row level security;
alter table public.vk_university_courses enable row level security;

-- ============================================
-- 4. CREATE RLS POLICIES (only if not exist)
-- ============================================

-- Career Paths - Public Read
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vk_career_paths' 
    and policyname = 'allow_anon_select_career_paths'
  ) then
    create policy "allow_anon_select_career_paths"
      on public.vk_career_paths for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vk_career_paths' 
    and policyname = 'allow_authenticated_select_career_paths'
  ) then
    create policy "allow_authenticated_select_career_paths"
      on public.vk_career_paths for select
      to authenticated
      using (true);
  end if;
end $$;

-- Universities - Public Read
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vk_universities' 
    and policyname = 'allow_anon_select_universities'
  ) then
    create policy "allow_anon_select_universities"
      on public.vk_universities for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vk_universities' 
    and policyname = 'allow_authenticated_select_universities'
  ) then
    create policy "allow_authenticated_select_universities"
      on public.vk_universities for select
      to authenticated
      using (true);
  end if;
end $$;

-- University Courses - Public Read
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vk_university_courses' 
    and policyname = 'allow_anon_select_university_courses'
  ) then
    create policy "allow_anon_select_university_courses"
      on public.vk_university_courses for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'vk_university_courses' 
    and policyname = 'allow_authenticated_select_university_courses'
  ) then
    create policy "allow_authenticated_select_university_courses"
      on public.vk_university_courses for select
      to authenticated
      using (true);
  end if;
end $$;

-- ============================================
-- 5. INSERT CAREER PATHS DATA (safe)
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
('pharmacy', 'Pharmacy', 'Health', 88, 'Pharmacist, Clinical Pharmacist')
on conflict (id) do nothing;

-- ============================================
-- 6. INSERT UNIVERSITIES DATA (safe)
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
('anu', 'Australian National University', 'ANU', 'ACT')
on conflict (id) do nothing;

-- ============================================
-- 7. INSERT UNIVERSITY COURSES DATA (safe)
-- ============================================

-- Medicine Pathways
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-md', 'unimelb', 'Doctor of Medicine', 99, '["medicine"]'::jsonb, '["UCAT", "Interview"]'::jsonb, 'Requires undergrad degree first'),
('monash-biomed', 'monash', 'Biomedicine', 95, '["medicine", "biomed"]'::jsonb, '["Chemistry"]'::jsonb, 'Pathway to Medicine'),
('unimelb-biomed', 'unimelb', 'Biomedicine', 96, '["medicine", "biomed"]'::jsonb, '["Chemistry"]'::jsonb, 'Pathway to Medicine')
on conflict (id) do nothing;

-- Dentistry
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-dent', 'unimelb', 'Doctor of Dental Surgery', 99, '["dentistry"]'::jsonb, '["Chemistry"]'::jsonb, 'Requires undergrad first'),
('latrobe-dent', 'latrobe', 'Dental Science', 96, '["dentistry"]'::jsonb, '["Chemistry"]'::jsonb, 'Direct entry')
on conflict (id) do nothing;

-- Engineering
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('monash-eng', 'monash', 'Engineering (Honours)', 85, '["engineering"]'::jsonb, '["Maths Methods", "Physics/Chemistry"]'::jsonb, null),
('unimelb-eng', 'unimelb', 'Engineering', 90, '["engineering"]'::jsonb, '["Maths Methods", "Specialist Maths recommended"]'::jsonb, null),
('rmit-eng', 'rmit', 'Engineering (Various)', 80, '["engineering"]'::jsonb, '["Maths Methods"]'::jsonb, null)
on conflict (id) do nothing;

-- Law
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-law', 'unimelb', 'Juris Doctor', 99, '["law"]'::jsonb, '["LSAT"]'::jsonb, 'Postgrad only'),
('monash-law', 'monash', 'Laws (Honours)', 96, '["law"]'::jsonb, '[]'::jsonb, 'Direct entry'),
('deakin-law', 'deakin', 'Laws', 88, '["law"]'::jsonb, '[]'::jsonb, null)
on conflict (id) do nothing;

-- Commerce
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-comm', 'unimelb', 'Commerce', 95, '["commerce"]'::jsonb, '["Maths Methods recommended"]'::jsonb, null),
('monash-comm', 'monash', 'Commerce', 90, '["commerce"]'::jsonb, '[]'::jsonb, null),
('unsw-comm', 'unsw', 'Commerce', 92, '["commerce"]'::jsonb, '[]'::jsonb, null)
on conflict (id) do nothing;

-- IT/Computer Science
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-cs', 'unimelb', 'Computing and Software Systems', 90, '["it", "engineering"]'::jsonb, '["Maths Methods"]'::jsonb, null),
('monash-it', 'monash', 'Information Technology', 80, '["it"]'::jsonb, '[]'::jsonb, null),
('rmit-cs', 'rmit', 'Computer Science', 78, '["it"]'::jsonb, '[]'::jsonb, null)
on conflict (id) do nothing;

-- Nursing
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('monash-nurse', 'monash', 'Nursing', 70, '["nursing"]'::jsonb, '[]'::jsonb, null),
('deakin-nurse', 'deakin', 'Nursing', 68, '["nursing"]'::jsonb, '[]'::jsonb, null),
('latrobe-nurse', 'latrobe', 'Nursing', 65, '["nursing"]'::jsonb, '[]'::jsonb, null)
on conflict (id) do nothing;

-- Psychology
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-psych', 'unimelb', 'Science (Psychology)', 85, '["psychology"]'::jsonb, '[]'::jsonb, 'Requires Masters for registration'),
('monash-psych', 'monash', 'Psychological Science', 80, '["psychology"]'::jsonb, '[]'::jsonb, null),
('deakin-psych', 'deakin', 'Psychology', 75, '["psychology"]'::jsonb, '[]'::jsonb, null)
on conflict (id) do nothing;

-- Teaching
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('monash-teach', 'monash', 'Education (Honours)', 75, '["teaching"]'::jsonb, '[]'::jsonb, null),
('deakin-teach', 'deakin', 'Teaching', 70, '["teaching"]'::jsonb, '[]'::jsonb, null),
('latrobe-teach', 'latrobe', 'Education', 68, '["teaching"]'::jsonb, '[]'::jsonb, null)
on conflict (id) do nothing;

-- Pharmacy
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('monash-pharm', 'monash', 'Pharmacy (Honours)', 90, '["pharmacy"]'::jsonb, '["Chemistry"]'::jsonb, null),
('latrobe-pharm', 'latrobe', 'Pharmacy', 85, '["pharmacy"]'::jsonb, '["Chemistry"]'::jsonb, null)
on conflict (id) do nothing;

-- Architecture
insert into public.vk_university_courses (id, university_id, name, atar, career_path_ids, prerequisites, pathway) values
('unimelb-arch', 'unimelb', 'Design (Architecture)', 88, '["architecture"]'::jsonb, '["Portfolio"]'::jsonb, 'Requires Masters'),
('monash-arch', 'monash', 'Architectural Design', 85, '["architecture"]'::jsonb, '["Portfolio"]'::jsonb, null),
('rmit-arch', 'rmit', 'Architecture', 82, '["architecture"]'::jsonb, '["Portfolio"]'::jsonb, null)
on conflict (id) do nothing;

-- ============================================
-- 8. COMPLETION SUMMARY
-- ============================================

do $$
declare
  career_count integer;
  uni_count integer;
  course_count integer;
begin
  select count(*) into career_count from public.vk_career_paths;
  select count(*) into uni_count from public.vk_universities;
  select count(*) into course_count from public.vk_university_courses;
  
  raise notice '========================================';
  raise notice 'Pathway Data Migration Complete (SAFE)';
  raise notice '========================================';
  raise notice 'Career Paths: % records', career_count;
  raise notice 'Universities: % records', uni_count;
  raise notice 'University Courses: % records', course_count;
  raise notice '';
  raise notice '✅ All operations safe and idempotent';
  raise notice '✅ Existing data preserved';
  raise notice '✅ No DROP statements used';
  raise notice '✅ ON CONFLICT protects duplicates';
  raise notice '========================================';
end $$;
