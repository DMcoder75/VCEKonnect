-- =====================================================
-- National Expansion: Multi-State Support
-- =====================================================
-- Purpose: Extend FairPrep from VIC (VCE) to all Australian states
-- Affected: Core tables, subjects, scaling, users
-- States: NSW, VIC, QLD, WA, SA, TAS, ACT, NT
-- =====================================================

-- =====================================================
-- STEP 1: Create States Reference Table
-- =====================================================

create table if not exists public.vk_states (
  id text primary key,
  name text not null,
  abbreviation text not null unique,
  education_system text not null, -- 'VCE', 'HSC', 'QCE', 'WACE', 'SACE', 'TCE', 'BSSS', 'NTCET'
  authority_name text not null, -- 'VCAA', 'NESA', 'QCAA', 'SCSA', 'SACE Board', 'TASC', 'BSSS', 'NT Dept Education'
  authority_website text,
  uses_atar boolean not null default true, -- false for QLD (uses OP), TAS (uses TCE ranks)
  scaling_system text not null, -- 'VTAC', 'UAC', 'QTAC', 'TISC', 'SATAC', 'TASC', 'UAC-ACT', 'NTCET'
  year_levels jsonb default '["11", "12"]'::jsonb,
  exam_period text, -- 'Oct-Nov', 'Nov-Dec', etc.
  created_at timestamp with time zone default now()
);

comment on table public.vk_states is 'Australian states and territories with education systems';

-- Insert state data
insert into public.vk_states (id, name, abbreviation, education_system, authority_name, authority_website, uses_atar, scaling_system, exam_period) values
  ('vic', 'Victoria', 'VIC', 'VCE', 'VCAA', 'https://www.vcaa.vic.edu.au', true, 'VTAC', 'October-November'),
  ('nsw', 'New South Wales', 'NSW', 'HSC', 'NESA', 'https://educationstandards.nsw.edu.au', true, 'UAC', 'October-November'),
  ('qld', 'Queensland', 'QLD', 'QCE', 'QCAA', 'https://www.qcaa.qld.edu.au', false, 'QTAC', 'October-November'),
  ('wa', 'Western Australia', 'WA', 'WACE', 'SCSA', 'https://www.scsa.wa.edu.au', true, 'TISC', 'October-November'),
  ('sa', 'South Australia', 'SA', 'SACE', 'SACE Board', 'https://www.sace.sa.edu.au', true, 'SATAC', 'October-November'),
  ('tas', 'Tasmania', 'TAS', 'TCE', 'TASC', 'https://www.tasc.tas.gov.au', false, 'TASC', 'October-November'),
  ('act', 'Australian Capital Territory', 'ACT', 'ACT Senior Secondary', 'BSSS', 'https://www.bsss.act.edu.au', true, 'UAC', 'October-November'),
  ('nt', 'Northern Territory', 'NT', 'NTCET', 'NT Dept Education', 'https://nt.gov.au/learning', false, 'NTCET', 'October-November')
on conflict (id) do nothing;

-- Enable RLS
alter table public.vk_states enable row level security;

-- Public read access to states
create policy "allow_public_read_states"
on public.vk_states for select
using (true);

-- =====================================================
-- STEP 2: Add State to Users Table
-- =====================================================

alter table public.vk_users 
add column if not exists state_id text references public.vk_states(id) default 'vic';

comment on column public.vk_users.state_id is 'User''s state/territory for education system';

-- Create index for performance
create index if not exists idx_vk_users_state_id on public.vk_users(state_id);

-- =====================================================
-- STEP 3: Rename VCE Subjects Table & Add State Column
-- =====================================================

-- Rename existing table to reflect VIC-only
alter table if exists public.vk_vce_subjects rename to vk_subjects_vic;

-- Add state_id to existing VIC subjects table
alter table public.vk_subjects_vic 
add column if not exists state_id text default 'vic' references public.vk_states(id);

comment on table public.vk_subjects_vic is 'VCE subjects for Victoria';

-- =====================================================
-- STEP 4: Create NSW HSC Subjects Table
-- =====================================================

create table if not exists public.vk_subjects_nsw (
  id text primary key,
  code text not null,
  name text not null,
  category text not null, -- 'English', 'Mathematics', 'Science', 'HSIE', 'Languages', 'Creative Arts', 'PDHPE', 'Technologies', 'VET'
  scaled_mean numeric(5,2),
  scaled_std_dev numeric(5,2),
  state_id text default 'nsw' references public.vk_states(id),
  created_at timestamp with time zone default now()
);

comment on table public.vk_subjects_nsw is 'HSC subjects for New South Wales';

-- Sample NSW HSC subjects (120+ subjects - starting with core ones)
insert into public.vk_subjects_nsw (id, code, name, category, scaled_mean, scaled_std_dev) values
  ('nsw_english_advanced', 'ENG-ADV', 'English Advanced', 'English', 30.0, 7.0),
  ('nsw_english_standard', 'ENG-STD', 'English Standard', 'English', 26.0, 6.5),
  ('nsw_english_ext1', 'ENG-EX1', 'English Extension 1', 'English', 40.0, 5.0),
  ('nsw_english_ext2', 'ENG-EX2', 'English Extension 2', 'English', 42.0, 4.5),
  ('nsw_math_advanced', 'MATH-ADV', 'Mathematics Advanced', 'Mathematics', 32.0, 7.5),
  ('nsw_math_standard1', 'MATH-ST1', 'Mathematics Standard 1', 'Mathematics', 24.0, 6.0),
  ('nsw_math_standard2', 'MATH-ST2', 'Mathematics Standard 2', 'Mathematics', 26.0, 6.5),
  ('nsw_math_ext1', 'MATH-EX1', 'Mathematics Extension 1', 'Mathematics', 39.0, 6.0),
  ('nsw_math_ext2', 'MATH-EX2', 'Mathematics Extension 2', 'Mathematics', 42.0, 5.0),
  ('nsw_physics', 'PHYS', 'Physics', 'Science', 32.0, 7.0),
  ('nsw_chemistry', 'CHEM', 'Chemistry', 'Science', 33.0, 7.0),
  ('nsw_biology', 'BIOL', 'Biology', 'Science', 30.0, 6.5),
  ('nsw_ancient_history', 'ANC-HIST', 'Ancient History', 'HSIE', 30.0, 6.5),
  ('nsw_modern_history', 'MOD-HIST', 'Modern History', 'HSIE', 30.0, 6.5),
  ('nsw_economics', 'ECON', 'Economics', 'HSIE', 32.0, 7.0),
  ('nsw_legal_studies', 'LEGAL', 'Legal Studies', 'HSIE', 29.0, 6.5),
  ('nsw_business_studies', 'BUS', 'Business Studies', 'HSIE', 28.0, 6.5),
  ('nsw_geography', 'GEO', 'Geography', 'HSIE', 29.0, 6.5),
  ('nsw_pdhpe', 'PDHPE', 'Personal Development, Health and Physical Education', 'PDHPE', 27.0, 6.0),
  ('nsw_visual_arts', 'VIS-ART', 'Visual Arts', 'Creative Arts', 31.0, 6.0)
on conflict (id) do nothing;

-- Enable RLS
alter table public.vk_subjects_nsw enable row level security;

create policy "allow_public_read_nsw_subjects"
on public.vk_subjects_nsw for select
using (true);

-- =====================================================
-- STEP 5: Create QLD QCE Subjects Table
-- =====================================================

create table if not exists public.vk_subjects_qld (
  id text primary key,
  code text not null,
  name text not null,
  category text not null,
  credit_points integer default 4, -- QCE uses credit points system
  state_id text default 'qld' references public.vk_states(id),
  created_at timestamp with time zone default now()
);

comment on table public.vk_subjects_qld is 'QCE subjects for Queensland';

-- Sample QLD subjects (80+ subjects)
insert into public.vk_subjects_qld (id, code, name, category, credit_points) values
  ('qld_english', 'ENG', 'English', 'English', 4),
  ('qld_general_mathematics', 'GEN-MATH', 'General Mathematics', 'Mathematics', 4),
  ('qld_mathematical_methods', 'MATH-METH', 'Mathematical Methods', 'Mathematics', 4),
  ('qld_specialist_mathematics', 'SPEC-MATH', 'Specialist Mathematics', 'Mathematics', 4),
  ('qld_physics', 'PHYS', 'Physics', 'Science', 4),
  ('qld_chemistry', 'CHEM', 'Chemistry', 'Science', 4),
  ('qld_biology', 'BIOL', 'Biology', 'Science', 4),
  ('qld_ancient_history', 'ANC-HIST', 'Ancient History', 'Humanities', 4),
  ('qld_modern_history', 'MOD-HIST', 'Modern History', 'Humanities', 4),
  ('qld_geography', 'GEO', 'Geography', 'Humanities', 4),
  ('qld_legal_studies', 'LEGAL', 'Legal Studies', 'Humanities', 4),
  ('qld_business', 'BUS', 'Business', 'Business', 4),
  ('qld_digital_solutions', 'DIG-SOL', 'Digital Solutions', 'Technologies', 4),
  ('qld_visual_art', 'VIS-ART', 'Visual Art', 'Arts', 4),
  ('qld_drama', 'DRAMA', 'Drama', 'Arts', 4)
on conflict (id) do nothing;

alter table public.vk_subjects_qld enable row level security;

create policy "allow_public_read_qld_subjects"
on public.vk_subjects_qld for select
using (true);

-- =====================================================
-- STEP 6: Create WA WACE Subjects Table
-- =====================================================

create table if not exists public.vk_subjects_wa (
  id text primary key,
  code text not null,
  name text not null,
  category text not null,
  scaled_mean numeric(5,2),
  scaled_std_dev numeric(5,2),
  state_id text default 'wa' references public.vk_states(id),
  created_at timestamp with time zone default now()
);

comment on table public.vk_subjects_wa is 'WACE subjects for Western Australia';

-- Sample WA subjects (70+ subjects)
insert into public.vk_subjects_wa (id, code, name, category, scaled_mean, scaled_std_dev) values
  ('wa_english_atar', 'ENG', 'English ATAR', 'English', 30.0, 7.0),
  ('wa_mathematics_applications', 'MATH-APP', 'Mathematics Applications ATAR', 'Mathematics', 28.0, 6.5),
  ('wa_mathematics_methods', 'MATH-METH', 'Mathematics Methods ATAR', 'Mathematics', 32.0, 7.0),
  ('wa_mathematics_specialist', 'MATH-SPEC', 'Mathematics Specialist ATAR', 'Mathematics', 38.0, 6.5),
  ('wa_physics', 'PHYS', 'Physics ATAR', 'Science', 32.0, 7.0),
  ('wa_chemistry', 'CHEM', 'Chemistry ATAR', 'Science', 33.0, 7.0),
  ('wa_biology', 'BIOL', 'Biology ATAR', 'Science', 30.0, 6.5),
  ('wa_human_biology', 'HUM-BIOL', 'Human Biology ATAR', 'Science', 29.0, 6.5),
  ('wa_modern_history', 'MOD-HIST', 'Modern History ATAR', 'Humanities', 30.0, 6.5),
  ('wa_economics', 'ECON', 'Economics ATAR', 'Humanities', 31.0, 6.5),
  ('wa_geography', 'GEO', 'Geography ATAR', 'Humanities', 29.0, 6.5),
  ('wa_literature', 'LIT', 'Literature ATAR', 'English', 32.0, 6.0),
  ('wa_psychology', 'PSYCH', 'Psychology ATAR', 'Humanities', 30.0, 6.5)
on conflict (id) do nothing;

alter table public.vk_subjects_wa enable row level security;

create policy "allow_public_read_wa_subjects"
on public.vk_subjects_wa for select
using (true);

-- =====================================================
-- STEP 7: Create SA SACE Subjects Table
-- =====================================================

create table if not exists public.vk_subjects_sa (
  id text primary key,
  code text not null,
  name text not null,
  category text not null,
  scaled_mean numeric(5,2),
  scaled_std_dev numeric(5,2),
  state_id text default 'sa' references public.vk_states(id),
  created_at timestamp with time zone default now()
);

comment on table public.vk_subjects_sa is 'SACE subjects for South Australia';

-- Sample SA subjects (60+ subjects)
insert into public.vk_subjects_sa (id, code, name, category, scaled_mean, scaled_std_dev) values
  ('sa_english', 'ENG', 'English', 'English', 30.0, 7.0),
  ('sa_english_literary_studies', 'ENG-LIT', 'English Literary Studies', 'English', 32.0, 6.5),
  ('sa_mathematical_methods', 'MATH-METH', 'Mathematical Methods', 'Mathematics', 32.0, 7.0),
  ('sa_specialist_mathematics', 'SPEC-MATH', 'Specialist Mathematics', 'Mathematics', 38.0, 6.5),
  ('sa_general_mathematics', 'GEN-MATH', 'General Mathematics', 'Mathematics', 28.0, 6.5),
  ('sa_physics', 'PHYS', 'Physics', 'Science', 32.0, 7.0),
  ('sa_chemistry', 'CHEM', 'Chemistry', 'Science', 33.0, 7.0),
  ('sa_biology', 'BIOL', 'Biology', 'Science', 30.0, 6.5),
  ('sa_modern_history', 'MOD-HIST', 'Modern History', 'Humanities', 30.0, 6.5),
  ('sa_accounting', 'ACCT', 'Accounting', 'Business', 29.0, 6.5),
  ('sa_economics', 'ECON', 'Economics', 'Humanities', 31.0, 6.5),
  ('sa_legal_studies', 'LEGAL', 'Legal Studies', 'Humanities', 29.0, 6.5),
  ('sa_psychology', 'PSYCH', 'Psychology', 'Humanities', 30.0, 6.5)
on conflict (id) do nothing;

alter table public.vk_subjects_sa enable row level security;

create policy "allow_public_read_sa_subjects"
on public.vk_subjects_sa for select
using (true);

-- =====================================================
-- STEP 8: Create Unified Subjects View
-- =====================================================

create or replace view public.vk_all_subjects as
  select 
    id, code, name, category, scaled_mean, scaled_std_dev, state_id, created_at,
    'vic' as state_code
  from public.vk_subjects_vic
  union all
  select 
    id, code, name, category, scaled_mean, scaled_std_dev, state_id, created_at,
    'nsw' as state_code
  from public.vk_subjects_nsw
  union all
  select 
    id, code, name, category, null::numeric as scaled_mean, null::numeric as scaled_std_dev, state_id, created_at,
    'qld' as state_code
  from public.vk_subjects_qld
  union all
  select 
    id, code, name, category, scaled_mean, scaled_std_dev, state_id, created_at,
    'wa' as state_code
  from public.vk_subjects_wa
  union all
  select 
    id, code, name, category, scaled_mean, scaled_std_dev, state_id, created_at,
    'sa' as state_code
  from public.vk_subjects_sa;

comment on view public.vk_all_subjects is 'Unified view of all subjects across all states';

-- =====================================================
-- STEP 9: Update User Subjects to Support Multi-State
-- =====================================================

-- No structural changes needed - user_subjects already references subject_id as text
-- Just add index for better performance
create index if not exists idx_vk_user_subjects_user_subject 
on public.vk_user_subjects(user_id, subject_id);

-- =====================================================
-- STEP 10: Create Scaling Factors Table
-- =====================================================

create table if not exists public.vk_scaling_factors (
  id uuid primary key default gen_random_uuid(),
  state_id text not null references public.vk_states(id),
  subject_id text not null,
  year integer not null,
  raw_score_min numeric(5,2) default 0,
  raw_score_max numeric(5,2) default 100,
  scaled_score_min numeric(5,2) default 0,
  scaled_score_max numeric(5,2) default 50,
  scaling_mean numeric(5,2),
  scaling_std_dev numeric(5,2),
  created_at timestamp with time zone default now(),
  unique(state_id, subject_id, year)
);

comment on table public.vk_scaling_factors is 'State-specific scaling factors by year';

create index idx_vk_scaling_factors_state_year on public.vk_scaling_factors(state_id, year);

alter table public.vk_scaling_factors enable row level security;

create policy "allow_public_read_scaling_factors"
on public.vk_scaling_factors for select
using (true);

-- =====================================================
-- STEP 11: Create Exam Calendars Table
-- =====================================================

create table if not exists public.vk_exam_calendars (
  id uuid primary key default gen_random_uuid(),
  state_id text not null references public.vk_states(id),
  year integer not null,
  exam_period_start date not null,
  exam_period_end date not null,
  results_release_date date,
  preferences_open_date date,
  preferences_close_date date,
  created_at timestamp with time zone default now(),
  unique(state_id, year)
);

comment on table public.vk_exam_calendars is 'State-specific exam calendars and key dates';

alter table public.vk_exam_calendars enable row level security;

create policy "allow_public_read_exam_calendars"
on public.vk_exam_calendars for select
using (true);

-- Sample data for 2026
insert into public.vk_exam_calendars (state_id, year, exam_period_start, exam_period_end, results_release_date) values
  ('vic', 2026, '2026-10-26', '2026-11-20', '2026-12-16'),
  ('nsw', 2026, '2026-10-12', '2026-11-06', '2026-12-17'),
  ('qld', 2026, '2026-10-26', '2026-11-20', '2026-12-12'),
  ('wa', 2026, '2026-10-26', '2026-11-20', '2026-12-15'),
  ('sa', 2026, '2026-10-26', '2026-11-20', '2026-12-17')
on conflict (state_id, year) do nothing;

-- =====================================================
-- STEP 12: Create State-Specific Functions
-- =====================================================

-- Function to get subjects by state
create or replace function public.get_subjects_by_state(p_state_id text)
returns table (
  id text,
  code text,
  name text,
  category text,
  scaled_mean numeric,
  scaled_std_dev numeric,
  state_id text
)
language plpgsql
as $$
begin
  return query
  select * from public.vk_all_subjects
  where state_code = p_state_id
  order by category, name;
end;
$$;

comment on function public.get_subjects_by_state is 'Get all subjects for a specific state';

-- Function to get user's state subjects
create or replace function public.get_user_state_subjects(p_user_id uuid)
returns table (
  id text,
  code text,
  name text,
  category text,
  scaled_mean numeric,
  scaled_std_dev numeric
)
language plpgsql
as $$
declare
  user_state text;
begin
  -- Get user's state
  select state_id into user_state
  from public.vk_users
  where id = p_user_id;
  
  -- Return subjects for that state
  return query
  select * from public.vk_all_subjects
  where state_code = user_state
  order by category, name;
end;
$$;

comment on function public.get_user_state_subjects is 'Get subjects available for user''s state';

-- =====================================================
-- STEP 13: Update Calendar Events to Support States
-- =====================================================

-- Add state_id to calendar events (optional - for state-specific events)
alter table public.vk_calendar_events
add column if not exists state_id text references public.vk_states(id);

comment on column public.vk_calendar_events.state_id is 'Optional: State-specific event (e.g., state exams)';

-- =====================================================
-- STEP 14: Migration Helper Function
-- =====================================================

-- Function to migrate existing VIC users to new structure
create or replace function public.migrate_vic_users_to_states()
returns void
language plpgsql
as $$
begin
  -- Set all existing users to VIC state
  update public.vk_users
  set state_id = 'vic'
  where state_id is null;
  
  raise notice 'Migration complete: All existing users set to VIC state';
end;
$$;

-- Execute migration
select public.migrate_vic_users_to_states();

-- =====================================================
-- STEP 15: Update Pathway Data for National Unis
-- =====================================================

-- Add state_id to pathway courses
alter table public.vk_pathway_courses
add column if not exists state_requirements jsonb default '{}'::jsonb;

comment on column public.vk_pathway_courses.state_requirements is 'State-specific entry requirements: {vic: {atar: 95}, nsw: {atar: 94}}';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Summary
do $$
begin
  raise notice '========================================';
  raise notice 'National Expansion Migration Complete!';
  raise notice '========================================';
  raise notice 'States Added: 8 (VIC, NSW, QLD, WA, SA, TAS, ACT, NT)';
  raise notice 'Subject Tables: 5 state-specific tables created';
  raise notice 'Unified View: vk_all_subjects created';
  raise notice 'Scaling System: Multi-state scaling factors table';
  raise notice 'Exam Calendars: State-specific dates';
  raise notice '';
  raise notice 'Next Steps:';
  raise notice '1. Add remaining subjects for each state';
  raise notice '2. Populate scaling factors from historical data';
  raise notice '3. Update frontend onboarding flow';
  raise notice '4. Implement state-specific ATAR calculators';
  raise notice '5. Test multi-state subject selection';
  raise notice '========================================';
end $$;
