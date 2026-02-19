-- =====================================================
-- Comprehensive Verification: All RPC Functions Use Unified vk_subjects
-- =====================================================
-- Purpose: Verify no functions reference old state-specific subject tables
-- Date: 2026-02-19
-- =====================================================

-- =====================================================
-- PART 1: Search All Functions for Old Table References
-- =====================================================

do $$
declare
  func_record record;
  func_source text;
  has_issues boolean := false;
begin
  raise notice '========================================';
  raise notice 'CHECKING ALL DATABASE FUNCTIONS';
  raise notice '========================================';
  raise notice '';
  
  -- Check all functions in public schema
  for func_record in 
    select 
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_definition
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
    and p.prokind = 'f' -- functions only (not aggregates, etc.)
    order by p.proname
  loop
    func_source := func_record.function_definition;
    
    -- Check for old table references
    if func_source ~* 'vk_vce_subjects' then
      raise notice '❌ ISSUE: % references OLD table vk_vce_subjects', func_record.function_name;
      has_issues := true;
    elsif func_source ~* 'vk_subjects_(vic|nsw|qld|wa|sa|tas|act|nt)' then
      raise notice '❌ ISSUE: % references OLD state-specific table', func_record.function_name;
      has_issues := true;
    elsif func_source ~* 'vk_all_subjects' then
      raise notice '❌ ISSUE: % references OLD view vk_all_subjects', func_record.function_name;
      has_issues := true;
    elsif func_source ~* 'vk_subjects' then
      raise notice '✅ OK: % uses unified vk_subjects table', func_record.function_name;
    else
      raise notice '⚪ SKIP: % (no subject table references)', func_record.function_name;
    end if;
  end loop;
  
  raise notice '';
  raise notice '========================================';
  if has_issues then
    raise notice '⚠️  ISSUES FOUND - Functions need updating!';
  else
    raise notice '✅ ALL FUNCTIONS VERIFIED - No old table references';
  end if;
  raise notice '========================================';
  raise notice '';
end $$;

-- =====================================================
-- PART 2: List All Subject-Related Functions
-- =====================================================

do $$
declare
  func_record record;
begin
  raise notice '========================================';
  raise notice 'SUBJECT-RELATED FUNCTIONS INVENTORY';
  raise notice '========================================';
  raise notice '';
  
  for func_record in
    select 
      p.proname as function_name,
      pg_get_function_arguments(p.oid) as arguments,
      pg_get_function_result(p.oid) as return_type
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
    and p.prokind = 'f'
    and (
      pg_get_functiondef(p.oid) ~* 'vk_subjects' or
      p.proname ~* 'subject'
    )
    order by p.proname
  loop
    raise notice 'Function: %', func_record.function_name;
    raise notice '  Arguments: %', func_record.arguments;
    raise notice '  Returns: %', func_record.return_type;
    raise notice '';
  end loop;
  
  raise notice '========================================';
end $$;

-- =====================================================
-- PART 3: Check Foreign Key Constraints
-- =====================================================

do $$
declare
  fk_record record;
  has_old_fks boolean := false;
begin
  raise notice '========================================';
  raise notice 'FOREIGN KEY CONSTRAINTS CHECK';
  raise notice '========================================';
  raise notice '';
  
  for fk_record in
    select
      tc.table_name,
      kcu.column_name,
      ccu.table_name as foreign_table_name,
      tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
    where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and (
      ccu.table_name ~* 'vk_vce_subjects' or
      ccu.table_name ~* 'vk_subjects_(vic|nsw|qld|wa|sa|tas|act|nt)' or
      ccu.table_name ~* 'vk_all_subjects'
    )
  loop
    raise notice '❌ OLD FK: %.% → %', 
      fk_record.table_name, 
      fk_record.column_name, 
      fk_record.foreign_table_name;
    raise notice '   Constraint: %', fk_record.constraint_name;
    has_old_fks := true;
  end loop;
  
  if not has_old_fks then
    raise notice '✅ No foreign keys pointing to old subject tables';
  end if;
  
  raise notice '';
  raise notice '========================================';
end $$;

-- =====================================================
-- PART 4: Verify Key Functions Exist and Use Unified Table
-- =====================================================

do $$
declare
  func_exists boolean;
  func_source text;
begin
  raise notice '========================================';
  raise notice 'KEY FUNCTIONS VERIFICATION';
  raise notice '========================================';
  raise notice '';
  
  -- Check get_subjects_by_state
  select exists(
    select 1 from pg_proc 
    where proname = 'get_subjects_by_state'
  ) into func_exists;
  
  if func_exists then
    select pg_get_functiondef(oid) into func_source
    from pg_proc where proname = 'get_subjects_by_state';
    
    if func_source ~* 'from public\.vk_subjects' then
      raise notice '✅ get_subjects_by_state - Uses unified vk_subjects';
    else
      raise notice '❌ get_subjects_by_state - NOT using unified table!';
    end if;
  else
    raise notice '❌ get_subjects_by_state - MISSING!';
  end if;
  
  -- Check get_user_state_subjects
  select exists(
    select 1 from pg_proc 
    where proname = 'get_user_state_subjects'
  ) into func_exists;
  
  if func_exists then
    select pg_get_functiondef(oid) into func_source
    from pg_proc where proname = 'get_user_state_subjects';
    
    if func_source ~* 'from public\.vk_subjects' then
      raise notice '✅ get_user_state_subjects - Uses unified vk_subjects';
    else
      raise notice '❌ get_user_state_subjects - NOT using unified table!';
    end if;
  else
    raise notice '❌ get_user_state_subjects - MISSING!';
  end if;
  
  -- Check calendar functions
  select exists(
    select 1 from pg_proc 
    where proname = 'get_upcoming_events'
  ) into func_exists;
  
  if func_exists then
    select pg_get_functiondef(oid) into func_source
    from pg_proc where proname = 'get_upcoming_events';
    
    if func_source ~* 'from public\.vk_subjects' then
      raise notice '✅ get_upcoming_events - Uses unified vk_subjects';
    elsif func_source ~* 'vk_vce_subjects' then
      raise notice '❌ get_upcoming_events - Uses OLD vk_vce_subjects!';
    else
      raise notice '⚪ get_upcoming_events - No subject table join';
    end if;
  else
    raise notice '⚪ get_upcoming_events - Not found';
  end if;
  
  select exists(
    select 1 from pg_proc 
    where proname = 'get_events_by_date_range'
  ) into func_exists;
  
  if func_exists then
    select pg_get_functiondef(oid) into func_source
    from pg_proc where proname = 'get_events_by_date_range';
    
    if func_source ~* 'from public\.vk_subjects' then
      raise notice '✅ get_events_by_date_range - Uses unified vk_subjects';
    elsif func_source ~* 'vk_vce_subjects' then
      raise notice '❌ get_events_by_date_range - Uses OLD vk_vce_subjects!';
    else
      raise notice '⚪ get_events_by_date_range - No subject table join';
    end if;
  else
    raise notice '⚪ get_events_by_date_range - Not found';
  end if;
  
  select exists(
    select 1 from pg_proc 
    where proname = 'get_events_by_week'
  ) into func_exists;
  
  if func_exists then
    select pg_get_functiondef(oid) into func_source
    from pg_proc where proname = 'get_events_by_week';
    
    if func_source ~* 'from public\.vk_subjects' then
      raise notice '✅ get_events_by_week - Uses unified vk_subjects';
    elsif func_source ~* 'vk_vce_subjects' then
      raise notice '❌ get_events_by_week - Uses OLD vk_vce_subjects!';
    else
      raise notice '⚪ get_events_by_week - No subject table join';
    end if;
  else
    raise notice '⚪ get_events_by_week - Not found';
  end if;
  
  raise notice '';
  raise notice '========================================';
end $$;

-- =====================================================
-- PART 5: Summary Report
-- =====================================================

do $$
declare
  total_funcs integer;
  subject_funcs integer;
  old_table_refs integer;
begin
  -- Count total functions
  select count(*) into total_funcs
  from pg_proc p
  join pg_namespace n on p.pronamespace = n.oid
  where n.nspname = 'public' and p.prokind = 'f';
  
  -- Count subject-related functions
  select count(*) into subject_funcs
  from pg_proc p
  join pg_namespace n on p.pronamespace = n.oid
  where n.nspname = 'public' 
  and p.prokind = 'f'
  and (
    pg_get_functiondef(p.oid) ~* 'vk_subjects' or
    p.proname ~* 'subject'
  );
  
  -- Count functions with old table references
  select count(*) into old_table_refs
  from pg_proc p
  join pg_namespace n on p.pronamespace = n.oid
  where n.nspname = 'public'
  and p.prokind = 'f'
  and (
    pg_get_functiondef(p.oid) ~* 'vk_vce_subjects' or
    pg_get_functiondef(p.oid) ~* 'vk_subjects_(vic|nsw|qld|wa|sa|tas|act|nt)' or
    pg_get_functiondef(p.oid) ~* 'vk_all_subjects'
  );
  
  raise notice '========================================';
  raise notice 'VERIFICATION SUMMARY';
  raise notice '========================================';
  raise notice 'Total Functions: %', total_funcs;
  raise notice 'Subject-Related Functions: %', subject_funcs;
  raise notice 'Functions with Old Table References: %', old_table_refs;
  raise notice '';
  
  if old_table_refs > 0 then
    raise notice '⚠️  ACTION REQUIRED: % function(s) need updating', old_table_refs;
    raise notice 'Run fix_calendar_functions_unified_subjects.sql to update';
  else
    raise notice '✅ ALL CLEAR: No old table references found';
    raise notice '✅ Migration to unified vk_subjects is complete';
  end if;
  
  raise notice '========================================';
end $$;

-- =====================================================
-- END OF VERIFICATION
-- =====================================================
