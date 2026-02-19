# Unified Subjects Table - Mapping Summary

## Overview

The FairPrep database has been migrated from **8 separate state-specific subject tables** to a **single unified `vk_subjects` table** with a `state_id` column. This improves maintainability, performance, and scalability.

---

## Migration Status

### ✅ Completed Steps

1. **Created unified `vk_subjects` table** (`database/unified_subjects_migration.sql`)
   - Single table with `state_id` column
   - Indexes on `state_id`, `category`, `code`
   - RLS policies for anon/authenticated access
   
2. **Migrated data** from old state-specific tables
   - VIC subjects ✅
   - NSW subjects ✅
   - QLD subjects (sample) ✅
   - WA subjects (sample) ✅
   - SA subjects (sample) ✅
   
3. **Updated database functions**
   - `get_subjects_by_state(state_id)` - queries unified table
   - `get_user_state_subjects(user_id)` - queries unified table
   
4. **Updated frontend service** (`services/vceSubjectsService.ts`)
   - Removed `STATE_TABLE_MAP` (old table mapping)
   - All functions now query `vk_subjects` with `state_id` filter
   - `getSubjectsByState()`, `searchSubjects()`, `getSubjectCategories()` all updated

5. **Created mapping verification script** (`database/update_subject_table_mappings.sql`)
   - Checks for old foreign key constraints
   - Drops old FK constraints to state-specific tables
   - Validates data integrity (orphaned subject IDs)
   - Provides summary report

---

## Table Relationships

All tables use `subject_id` as **TEXT** (flexible, no FK required):

### ✅ Tables with subject_id Column

| Table | Column | Constraint | Status |
|-------|--------|------------|--------|
| `vk_user_subjects` | `subject_id` | TEXT (no FK) | ✅ Compatible |
| `vk_subject_scores` | `subject_id` | TEXT (no FK) | ✅ Compatible |
| `vk_calendar_events` | `subject_id` | TEXT (old FK removed) | ✅ Compatible |
| `vk_notes` | `subject_id` | TEXT (no FK) | ✅ Compatible |
| `vk_study_sessions` | `subject_id` | TEXT (no FK) | ✅ Compatible |

**Note:** The old `vk_calendar_events_subject_id_fkey` constraint (pointing to `vk_vce_subjects`) will be dropped by running `update_subject_table_mappings.sql`.

---

## Architecture Benefits

### Before (8 separate tables):
```
vk_subjects_vic
vk_subjects_nsw
vk_subjects_qld
vk_subjects_wa
vk_subjects_sa
vk_subjects_tas
vk_subjects_act
vk_subjects_nt
```

**Problems:**
- Duplicate schema maintenance (8 tables to update)
- Complex union queries across tables
- Hard to add new states
- Difficult to manage relationships

### After (1 unified table):
```
vk_subjects (with state_id column)
```

**Benefits:**
- ✅ Single source of truth
- ✅ Simple queries with `WHERE state_id = ?`
- ✅ Easy to add new states (just insert with new state_id)
- ✅ Better performance with proper indexes
- ✅ Cleaner frontend code (no table mapping logic)

---

## Next Steps

1. **Run mapping verification script**:
   ```sql
   -- Execute this to check and update all mappings
   \i database/update_subject_table_mappings.sql
   ```

2. **Complete remaining state data**:
   - QLD QCE subjects (need ~65 more subjects)
   - WA WACE subjects (need ~57 more subjects)
   - SA SACE subjects (need ~47 more subjects)
   - TAS TCE subjects (need all ~50 subjects)
   - ACT subjects (need all ~60 subjects)
   - NT NTCET subjects (need all ~40 subjects)

3. **Drop old state-specific tables** (when ready):
   ```sql
   -- Uncomment STEP 6 in unified_subjects_migration.sql
   DROP TABLE vk_subjects_vic CASCADE;
   DROP TABLE vk_subjects_nsw CASCADE;
   -- etc.
   ```

4. **Test subject queries** across all states in the app

---

## Database Schema

### vk_subjects (Unified Table)

```sql
CREATE TABLE public.vk_subjects (
  id TEXT PRIMARY KEY,                    -- e.g., 'vic_english_3_4'
  code TEXT NOT NULL,                     -- e.g., 'ENGL'
  name TEXT NOT NULL,                     -- e.g., 'English'
  category TEXT NOT NULL,                 -- e.g., 'English'
  state_id TEXT NOT NULL,                 -- 'vic', 'nsw', 'qld', etc.
  
  -- ATAR state fields (VIC, NSW, WA, SA)
  scaled_mean NUMERIC(5,2),               -- e.g., 30.5
  scaled_std_dev NUMERIC(5,2),            -- e.g., 7.2
  
  -- QLD-specific fields
  credit_points INTEGER,                  -- e.g., 4
  
  -- Additional metadata
  is_mandatory BOOLEAN DEFAULT false,
  prerequisite_subjects JSONB,            -- Array of prerequisite IDs
  unit_value INTEGER DEFAULT 2,           -- 1 for extensions, 2 for standard
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  FOREIGN KEY (state_id) REFERENCES vk_states(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_vk_subjects_state_id ON vk_subjects(state_id);
CREATE INDEX idx_vk_subjects_category ON vk_subjects(category);
CREATE INDEX idx_vk_subjects_state_category ON vk_subjects(state_id, category);
CREATE INDEX idx_vk_subjects_code ON vk_subjects(code);
```

---

## Frontend Service Changes

### Before (vceSubjectsService.ts):
```typescript
const STATE_TABLE_MAP = {
  'vic': 'vk_subjects_vic',
  'nsw': 'vk_subjects_nsw',
  // ... 8 tables
};

const tableName = STATE_TABLE_MAP[stateId];
const { data } = await supabase.from(tableName).select('*');
```

### After:
```typescript
// Direct query to unified table
const { data } = await supabase
  .from('vk_subjects')
  .select('*')
  .eq('state_id', stateId);
```

**Result:** Simpler, faster, more maintainable code!

---

## Validation Checklist

Run this checklist to verify the migration:

- [ ] Run `database/update_subject_table_mappings.sql`
- [ ] Verify no orphaned subject IDs (check console output)
- [ ] Test subject picker in app (should load state-specific subjects)
- [ ] Test ATAR calculator (should work with unified subjects)
- [ ] Test calendar events (should display subject names correctly)
- [ ] Test notes with subject tags
- [ ] Test study sessions by subject
- [ ] Verify all 8 states can be selected in onboarding
- [ ] Drop old state-specific tables (when confident)

---

## Support

If you encounter any issues:
1. Check for orphaned subject IDs in validation script output
2. Verify data was migrated correctly: `SELECT state_id, COUNT(*) FROM vk_subjects GROUP BY state_id`
3. Check frontend console for Supabase query errors
4. Ensure old FK constraints were dropped successfully
