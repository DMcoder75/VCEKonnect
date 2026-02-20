-- Add state_id column to vk_users table
-- This allows users to select their Australian state/territory for state-specific ATAR calculations
-- Migration created: 2026-02-20
-- Tables affected: vk_users

-- Add state_id column if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'vk_users' 
    and column_name = 'state_id'
  ) then
    alter table public.vk_users
    add column state_id text default 'VIC' check (state_id in ('VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'));
    
    -- Add comment
    comment on column public.vk_users.state_id is 'Australian state/territory: VIC, NSW, QLD, WA, SA, TAS, ACT, NT';
  end if;
end $$;
