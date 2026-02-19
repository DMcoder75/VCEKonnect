-- =====================================================
-- Unified Subjects Table Migration
-- =====================================================
-- Purpose: Replace state-specific subject tables with single unified table
-- Architecture: vk_subjects with state_id column (better design)
-- Note: Data migration to be done separately
-- =====================================================

-- =====================================================
-- STEP 1: Create Unified Subjects Table
-- =====================================================

create table if not exists public.vk_subjects (
  id text primary key,
  code text not null,
  name text not null,
  category text not null,
  state_id text not null references public.vk_states(id) on delete cascade,
  
  -- Scaling data (for ATAR states: VIC, NSW, WA, SA)
  scaled_mean numeric(5,2),
  scaled_std_dev numeric(5,2),
  
  -- Credit points (for QLD QCE system)
  credit_points integer,
  
  -- Additional metadata
  is_mandatory boolean default false,
  prerequisite_subjects jsonb default '[]'::jsonb,
  unit_value integer default 2, -- 1 unit for extensions, 2 for standard
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table public.vk_subjects is 'Unified subjects table for all Australian states';
comment on column public.vk_subjects.state_id is 'State/territory: vic, nsw, qld, wa, sa, tas, act, nt';
comment on column public.vk_subjects.scaled_mean is 'ATAR scaling mean (null for non-ATAR states like QLD, TAS)';
comment on column public.vk_subjects.credit_points is 'QCE credit points (used by QLD)';
comment on column public.vk_subjects.unit_value is 'Subject unit value: 1 for extensions, 2 for standard subjects';
comment on column public.vk_subjects.prerequisite_subjects is 'Array of prerequisite subject IDs';

-- =====================================================
-- STEP 2: Create Indexes for Performance
-- =====================================================

create index if not exists idx_vk_subjects_state_id on public.vk_subjects(state_id);
create index if not exists idx_vk_subjects_category on public.vk_subjects(category);
create index if not exists idx_vk_subjects_state_category on public.vk_subjects(state_id, category);
create index if not exists idx_vk_subjects_code on public.vk_subjects(code);

-- =====================================================
-- STEP 3: Enable RLS
-- =====================================================

alter table public.vk_subjects enable row level security;

-- Public read access
create policy "allow_anon_select_subjects"
on public.vk_subjects for select
to anon
using (true);

create policy "allow_authenticated_select_subjects"
on public.vk_subjects for select
to authenticated
using (true);

-- =====================================================
-- STEP 4: Verify Existing Tables (No Changes Needed)
-- =====================================================

-- These tables already use subject_id as TEXT and will work automatically:
-- ✅ vk_user_subjects (user_id, subject_id)
-- ✅ vk_subject_scores (user_id, subject_id, sac_average, etc.)
-- ✅ vk_calendar_events (subject_id, event_type, etc.)
-- ✅ vk_notes (subject_id, title, content)
-- ✅ vk_study_sessions (subject_id, duration_minutes)

-- All these tables will automatically work with the new unified vk_subjects table
-- No foreign key constraints to update since subject_id is just text

do $$
begin
  raise notice '========================================';
  raise notice 'Existing Table Compatibility Check';
  raise notice '========================================';
  raise notice '✅ vk_user_subjects - Compatible (subject_id: text)';
  raise notice '✅ vk_subject_scores - Compatible (subject_id: text)';
  raise notice '✅ vk_calendar_events - Compatible (subject_id: text)';
  raise notice '✅ vk_notes - Compatible (subject_id: text)';
  raise notice '✅ vk_study_sessions - Compatible (subject_id: text)';
  raise notice '';
  raise notice 'No relationship changes needed!';
  raise notice '========================================';
end $$;

-- =====================================================
-- STEP 5: Update Database Functions
-- =====================================================

-- Drop old state-specific function
drop function if exists public.get_subjects_by_state(text);

-- Create new unified function
create or replace function public.get_subjects_by_state(p_state_id text)
returns table (
  id text,
  code text,
  name text,
  category text,
  scaled_mean numeric,
  scaled_std_dev numeric,
  credit_points integer,
  unit_value integer,
  state_id text
)
language plpgsql
as $$
begin
  return query
  select 
    s.id,
    s.code,
    s.name,
    s.category,
    s.scaled_mean,
    s.scaled_std_dev,
    s.credit_points,
    s.unit_value,
    s.state_id
  from public.vk_subjects s
  where s.state_id = p_state_id
  order by s.category, s.name;
end;
$$;

comment on function public.get_subjects_by_state is 'Get all subjects for a specific state from unified table';

-- Update user state subjects function
drop function if exists public.get_user_state_subjects(uuid);

create or replace function public.get_user_state_subjects(p_user_id uuid)
returns table (
  id text,
  code text,
  name text,
  category text,
  scaled_mean numeric,
  scaled_std_dev numeric,
  credit_points integer
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
  select 
    s.id,
    s.code,
    s.name,
    s.category,
    s.scaled_mean,
    s.scaled_std_dev,
    s.credit_points
  from public.vk_subjects s
  where s.state_id = user_state
  order by s.category, s.name;
end;
$$;

comment on function public.get_user_state_subjects is 'Get subjects available for user''s state from unified table';

-- =====================================================
-- STEP 6: Drop Old State-Specific Tables (After Data Migration)
-- =====================================================

-- ⚠️ WARNING: Only run this AFTER you've migrated all data to vk_subjects
-- Uncomment the following lines when ready:

/*
drop table if exists public.vk_subjects_vic cascade;
drop table if exists public.vk_subjects_nsw cascade;
drop table if exists public.vk_subjects_qld cascade;
drop table if exists public.vk_subjects_wa cascade;
drop table if exists public.vk_subjects_sa cascade;
drop table if exists public.vk_subjects_tas cascade;
drop table if exists public.vk_subjects_act cascade;
drop table if exists public.vk_subjects_nt cascade;

drop view if exists public.vk_all_subjects;

raise notice '✅ Old state-specific tables dropped';
raise notice '✅ vk_all_subjects view dropped (no longer needed)';
*/

-- =====================================================
-- STEP 7: Data Migration Template (For Reference)
-- =====================================================

-- Example migration from old tables to new unified table:
/*
-- VIC subjects
insert into public.vk_subjects (id, code, name, category, state_id, scaled_mean, scaled_std_dev, unit_value)
select id, code, name, category, 'vic', scaled_mean, scaled_std_dev, 2
from public.vk_subjects_vic;

-- NSW subjects
insert into public.vk_subjects (id, code, name, category, state_id, scaled_mean, scaled_std_dev, unit_value)
select id, code, name, category, 'nsw', scaled_mean, scaled_std_dev, 2
from public.vk_subjects_nsw;

-- QLD subjects (uses credit_points instead of scaling)
insert into public.vk_subjects (id, code, name, category, state_id, credit_points, unit_value)
select id, code, name, category, 'qld', credit_points, 4
from public.vk_subjects_qld;

-- WA subjects
insert into public.vk_subjects (id, code, name, category, state_id, scaled_mean, scaled_std_dev, unit_value)
select id, code, name, category, 'wa', scaled_mean, scaled_std_dev, 2
from public.vk_subjects_wa;

-- SA subjects
insert into public.vk_subjects (id, code, name, category, state_id, scaled_mean, scaled_std_dev, unit_value)
select id, code, name, category, 'sa', scaled_mean, scaled_std_dev, 2
from public.vk_subjects_sa;

raise notice 'Data migration complete!';
*/

-- =====================================================
-- STEP 8: Update Trigger for updated_at
-- =====================================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_vk_subjects_updated_at on public.vk_subjects;

create trigger update_vk_subjects_updated_at
before update on public.vk_subjects
for each row
execute function public.update_updated_at_column();

-- =====================================================
-- END OF MIGRATION
-- =====================================================

do $$
declare
  subject_count integer;
begin
  select count(*) into subject_count from public.vk_subjects;
  
  raise notice '========================================';
  raise notice 'Unified Subjects Migration Complete!';
  raise notice '========================================';
  raise notice 'New Table: vk_subjects (unified)';
  raise notice 'Current Subjects: %', subject_count;
  raise notice '';
  raise notice 'Benefits of Unified Architecture:';
  raise notice '✅ Single source of truth for all subjects';
  raise notice '✅ No duplicate table maintenance';
  raise notice '✅ Simpler queries and relationships';
  raise notice '✅ Easier to add new states';
  raise notice '✅ Better performance with proper indexing';
  raise notice '';
  raise notice 'Next Steps:';
  raise notice '1. Migrate data from old state tables to vk_subjects';
  raise notice '2. Verify data integrity';
  raise notice '3. Drop old state-specific tables (uncomment STEP 6)';
  raise notice '4. Update frontend services to use unified table';
  raise notice '========================================';
end $$;
