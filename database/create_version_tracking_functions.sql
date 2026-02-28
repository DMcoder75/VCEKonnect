-- =====================================================
-- Version Tracking RPC Functions
-- Purpose: Update client app version fields in vk_users table
-- External DB: https://xududbaqaaffcaejwuix.supabase.co
-- =====================================================

-- 1. RPC function to update user's app version tracking fields
-- Called on: User registration, login, and app startup
-- Updates: client_app_version, client_platform, client_app_version_updated_at
create or replace function public.update_user_app_version(
  p_user_id uuid,
  p_app_version text,
  p_platform text,
  p_device_info jsonb default null -- Optional device info for future analytics
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Update user's version tracking fields
  update public.vk_users
  set 
    client_app_version = p_app_version,
    client_platform = p_platform,
    client_app_version_updated_at = now()
  where id = p_user_id;
  
  -- Log if update failed (user not found)
  if not found then
    raise notice 'User % not found for version update', p_user_id;
  end if;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.update_user_app_version(uuid, text, text, jsonb) to authenticated;
grant execute on function public.update_user_app_version(uuid, text, text, jsonb) to anon;

comment on function public.update_user_app_version is 'Updates user app version tracking fields for debugging and analytics';


-- =====================================================
-- 2. (OPTIONAL) RPC function to check if user meets minimum version requirement
-- Used for: Feature flags, gradual rollout, compatibility checks
-- =====================================================
create or replace function public.user_version_meets_requirement(
  p_user_id uuid,
  p_minimum_version text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_version text;
  v_user_parts text[];
  v_min_parts text[];
  v_user_major int;
  v_user_minor int;
  v_user_patch int;
  v_min_major int;
  v_min_minor int;
  v_min_patch int;
begin
  -- Get user's current version
  select client_app_version into v_user_version
  from public.vk_users
  where id = p_user_id;
  
  -- If user version is null, return false
  if v_user_version is null then
    return false;
  end if;
  
  -- Parse versions (assuming semantic versioning: X.Y.Z)
  v_user_parts := string_to_array(v_user_version, '.');
  v_min_parts := string_to_array(p_minimum_version, '.');
  
  -- Extract major.minor.patch
  v_user_major := coalesce(v_user_parts[1]::int, 0);
  v_user_minor := coalesce(v_user_parts[2]::int, 0);
  v_user_patch := coalesce(v_user_parts[3]::int, 0);
  
  v_min_major := coalesce(v_min_parts[1]::int, 0);
  v_min_minor := coalesce(v_min_parts[2]::int, 0);
  v_min_patch := coalesce(v_min_parts[3]::int, 0);
  
  -- Compare versions
  if v_user_major > v_min_major then
    return true;
  elsif v_user_major < v_min_major then
    return false;
  end if;
  
  -- Major versions equal, check minor
  if v_user_minor > v_min_minor then
    return true;
  elsif v_user_minor < v_min_minor then
    return false;
  end if;
  
  -- Minor versions equal, check patch
  return v_user_patch >= v_min_patch;
  
exception
  when others then
    -- If version parsing fails, return false
    return false;
end;
$$;

-- Grant execute permission
grant execute on function public.user_version_meets_requirement(uuid, text) to authenticated;
grant execute on function public.user_version_meets_requirement(uuid, text) to anon;

comment on function public.user_version_meets_requirement is 'Checks if user app version meets minimum requirement for feature access';


-- =====================================================
-- 3. (OPTIONAL) View for version adoption analytics
-- Shows distribution of app versions across platforms
-- =====================================================
create or replace view public.vk_version_adoption_stats as
select 
  client_platform as platform,
  client_app_version as version,
  count(*) as user_count,
  round(count(*) * 100.0 / sum(count(*)) over (partition by client_platform), 2) as percentage_of_platform,
  max(client_app_version_updated_at) as last_seen
from public.vk_users
where client_app_version is not null
group by client_platform, client_app_version
order by client_platform, user_count desc;

-- Grant select permission
grant select on public.vk_version_adoption_stats to authenticated;

comment on view public.vk_version_adoption_stats is 'Shows app version adoption statistics across platforms';


-- =====================================================
-- Verification queries (run after executing above)
-- =====================================================

-- Check if functions exist
-- select routine_name, routine_type 
-- from information_schema.routines 
-- where routine_schema = 'public' 
-- and routine_name in ('update_user_app_version', 'user_version_meets_requirement');

-- Check if view exists
-- select table_name 
-- from information_schema.views 
-- where table_schema = 'public' 
-- and table_name = 'vk_version_adoption_stats';

-- Test the update function (replace with actual user ID)
-- select update_user_app_version(
--   '00000000-0000-0000-0000-000000000000'::uuid, 
--   '1.0.0', 
--   'ios', 
--   '{"osVersion": "17.0"}'::jsonb
-- );
