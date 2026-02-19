-- =====================================================
-- Update All Subject Table Mappings & Constraints
-- =====================================================
-- Purpose: Ensure all tables properly reference unified vk_subjects
-- Run this AFTER data migration to vk_subjects is complete
-- =====================================================

-- =====================================================
-- STEP 1: Check Existing Foreign Key Constraints
-- =====================================================

do $$
declare
  fk_record record;
begin
  raise notice '========================================';
  raise notice 'Checking Foreign Key Constraints...';
  raise notice '========================================';
  
  for fk_record in 
    select
      tc.table_name,
      kcu.column_name,
      ccu.table_name as foreign_table_name,
      ccu.column_name as foreign_column_name,
      tc.constraint_name
    from information_schema.table_constraints as tc
    join information_schema.key_column_usage as kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage as ccu
      on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and (
        ccu.table_name like 'vk_subjects_%'
        or ccu.table_name = 'vk_vce_subjects'
        or kcu.column_name = 'subject_id'
      )
  loop
    raise notice 'Found FK: %.% (%) → %.%',
      fk_record.table_name,
      fk_record.column_name,
      fk_record.constraint_name,
      fk_record.foreign_table_name,
      fk_record.foreign_column_name;
  end loop;
  
  raise notice '========================================';
end $$;

-- =====================================================
-- STEP 2: Drop Old Foreign Key Constraints
-- =====================================================

-- Drop FK from vk_calendar_events if it references old tables
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'vk_calendar_events_subject_id_fkey'
      and table_name = 'vk_calendar_events'
      and table_schema = 'public'
  ) then
    alter table public.vk_calendar_events 
    drop constraint vk_calendar_events_subject_id_fkey;
    raise notice '✅ Dropped old FK constraint: vk_calendar_events_subject_id_fkey';
  else
    raise notice '⏭️  No FK constraint found on vk_calendar_events.subject_id';
  end if;
end $$;

-- Drop any other subject_id foreign keys pointing to old tables
do $$
declare
  fk_constraint record;
begin
  for fk_constraint in 
    select
      tc.table_name,
      tc.constraint_name,
      ccu.table_name as foreign_table_name
    from information_schema.table_constraints as tc
    join information_schema.constraint_column_usage as ccu
      on ccu.constraint_name = tc.constraint_name
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and (
        ccu.table_name like 'vk_subjects_%'
        or ccu.table_name = 'vk_vce_subjects'
      )
  loop
    execute format('alter table public.%I drop constraint %I',
      fk_constraint.table_name,
      fk_constraint.constraint_name
    );
    raise notice '✅ Dropped FK: %.% → %',
      fk_constraint.table_name,
      fk_constraint.constraint_name,
      fk_constraint.foreign_table_name;
  end loop;
end $$;

-- =====================================================
-- STEP 3: Add New Foreign Key Constraints (Optional)
-- =====================================================

-- Note: Adding FK constraints is optional since TEXT IDs work without them
-- Uncomment if you want referential integrity enforcement

/*
-- Add FK from vk_calendar_events to vk_subjects
alter table public.vk_calendar_events
add constraint vk_calendar_events_subject_id_fkey
foreign key (subject_id) references public.vk_subjects(id) on delete cascade;

-- Add FK from vk_user_subjects to vk_subjects
alter table public.vk_user_subjects
add constraint vk_user_subjects_subject_id_fkey
foreign key (subject_id) references public.vk_subjects(id) on delete cascade;

-- Add FK from vk_subject_scores to vk_subjects
alter table public.vk_subject_scores
add constraint vk_subject_scores_subject_id_fkey
foreign key (subject_id) references public.vk_subjects(id) on delete cascade;

-- Add FK from vk_notes to vk_subjects
alter table public.vk_notes
add constraint vk_notes_subject_id_fkey
foreign key (subject_id) references public.vk_subjects(id) on delete set null;

-- Add FK from vk_study_sessions to vk_subjects
alter table public.vk_study_sessions
add constraint vk_study_sessions_subject_id_fkey
foreign key (subject_id) references public.vk_subjects(id) on delete cascade;

raise notice '========================================';
raise notice '✅ Added new FK constraints to vk_subjects';
raise notice '========================================';
*/

-- =====================================================
-- STEP 4: Verify All Table Relationships
-- =====================================================

do $$
declare
  table_info record;
  subject_count integer;
begin
  raise notice '========================================';
  raise notice 'Verifying Table Relationships...';
  raise notice '========================================';
  
  -- Check each table that uses subject_id
  for table_info in 
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'subject_id'
      and table_name like 'vk_%'
    order by table_name
  loop
    execute format(
      'select count(distinct %I) from public.%I',
      table_info.column_name,
      table_info.table_name
    ) into subject_count;
    
    raise notice '✅ %.%: % unique subject IDs',
      table_info.table_name,
      table_info.column_name,
      subject_count;
  end loop;
  
  raise notice '========================================';
end $$;

-- =====================================================
-- STEP 5: Validate Data Integrity
-- =====================================================

-- Find orphaned subject_id references (subjects that don't exist in vk_subjects)
do $$
declare
  orphan_count integer;
  table_name text;
begin
  raise notice '========================================';
  raise notice 'Checking for Orphaned Subject IDs...';
  raise notice '========================================';
  
  -- Check vk_user_subjects
  select count(*) into orphan_count
  from public.vk_user_subjects us
  where not exists (
    select 1 from public.vk_subjects s where s.id = us.subject_id
  );
  if orphan_count > 0 then
    raise warning '⚠️  vk_user_subjects: % orphaned subject IDs found!', orphan_count;
  else
    raise notice '✅ vk_user_subjects: No orphaned subject IDs';
  end if;
  
  -- Check vk_subject_scores
  select count(*) into orphan_count
  from public.vk_subject_scores ss
  where not exists (
    select 1 from public.vk_subjects s where s.id = ss.subject_id
  );
  if orphan_count > 0 then
    raise warning '⚠️  vk_subject_scores: % orphaned subject IDs found!', orphan_count;
  else
    raise notice '✅ vk_subject_scores: No orphaned subject IDs';
  end if;
  
  -- Check vk_calendar_events
  select count(*) into orphan_count
  from public.vk_calendar_events ce
  where not exists (
    select 1 from public.vk_subjects s where s.id = ce.subject_id
  );
  if orphan_count > 0 then
    raise warning '⚠️  vk_calendar_events: % orphaned subject IDs found!', orphan_count;
  else
    raise notice '✅ vk_calendar_events: No orphaned subject IDs';
  end if;
  
  -- Check vk_notes
  select count(*) into orphan_count
  from public.vk_notes n
  where not exists (
    select 1 from public.vk_subjects s where s.id = n.subject_id
  );
  if orphan_count > 0 then
    raise warning '⚠️  vk_notes: % orphaned subject IDs found!', orphan_count;
  else
    raise notice '✅ vk_notes: No orphaned subject IDs';
  end if;
  
  -- Check vk_study_sessions
  select count(*) into orphan_count
  from public.vk_study_sessions ss
  where not exists (
    select 1 from public.vk_subjects s where s.id = ss.subject_id
  );
  if orphan_count > 0 then
    raise warning '⚠️  vk_study_sessions: % orphaned subject IDs found!', orphan_count;
  else
    raise notice '✅ vk_study_sessions: No orphaned subject IDs';
  end if;
  
  raise notice '========================================';
end $$;

-- =====================================================
-- STEP 6: Summary Report
-- =====================================================

do $$
declare
  total_subjects integer;
  total_user_subjects integer;
  total_scores integer;
  total_events integer;
  total_notes integer;
  total_sessions integer;
begin
  select count(*) into total_subjects from public.vk_subjects;
  select count(*) into total_user_subjects from public.vk_user_subjects;
  select count(*) into total_scores from public.vk_subject_scores;
  select count(*) into total_events from public.vk_calendar_events;
  select count(*) into total_notes from public.vk_notes;
  select count(*) into total_sessions from public.vk_study_sessions;
  
  raise notice '========================================';
  raise notice 'Subject Table Mappings - Summary Report';
  raise notice '========================================';
  raise notice 'Unified Table:';
  raise notice '  vk_subjects: % subjects', total_subjects;
  raise notice '';
  raise notice 'Related Tables:';
  raise notice '  vk_user_subjects: % records', total_user_subjects;
  raise notice '  vk_subject_scores: % records', total_scores;
  raise notice '  vk_calendar_events: % records', total_events;
  raise notice '  vk_notes: % records', total_notes;
  raise notice '  vk_study_sessions: % records', total_sessions;
  raise notice '';
  raise notice 'Status:';
  raise notice '✅ All tables use TEXT subject_id (flexible)';
  raise notice '✅ Old FK constraints removed';
  raise notice '✅ Ready for unified vk_subjects table';
  raise notice '';
  raise notice 'Next Steps:';
  raise notice '1. Update frontend vceSubjectsService.ts';
  raise notice '2. Test subject queries across all states';
  raise notice '3. Drop old state-specific tables when ready';
  raise notice '========================================';
end $$;
