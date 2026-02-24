-- =====================================================
-- Client App Version Tracking System
-- =====================================================
-- Purpose: Track which app version users are running for:
--   1. Debug version-specific bugs
--   2. Control feature rollout by version
--   3. Analytics and adoption tracking
-- =====================================================

-- Add client version columns to vk_users table
alter table vk_users 
  add column if not exists client_app_version text;

alter table vk_users 
  add column if not exists client_platform text; -- 'ios', 'android', 'web'

alter table vk_users 
  add column if not exists client_app_version_updated_at timestamp with time zone;

-- Create index for querying by version
create index if not exists idx_vk_users_client_app_version 
  on vk_users(client_app_version);

create index if not exists idx_vk_users_client_platform 
  on vk_users(client_platform);

-- =====================================================
-- Version Analytics Table (for historical tracking)
-- =====================================================
create table if not exists vk_version_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references vk_users(id) on delete cascade,
  app_version text not null,
  platform text not null, -- 'ios', 'android', 'web'
  device_info jsonb, -- Device details (OS version, model, etc.)
  recorded_at timestamp with time zone default now()
);

-- Indices for analytics queries
create index if not exists idx_vk_version_analytics_user_id 
  on vk_version_analytics(user_id);

create index if not exists idx_vk_version_analytics_version 
  on vk_version_analytics(app_version);

create index if not exists idx_vk_version_analytics_platform 
  on vk_version_analytics(platform);

create index if not exists idx_vk_version_analytics_recorded_at 
  on vk_version_analytics(recorded_at desc);

-- RLS policies
alter table vk_version_analytics enable row level security;

create policy "Allow anon insert version analytics"
  on vk_version_analytics for insert
  to anon
  with check (true);

create policy "Allow anon select version analytics"
  on vk_version_analytics for select
  to anon
  using (true);

-- =====================================================
-- Function: Update User App Version
-- =====================================================
-- Atomically updates user's current version and logs to analytics
create or replace function update_user_app_version(
  p_user_id uuid,
  p_app_version text,
  p_platform text,
  p_device_info jsonb default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Update user's current version
  update vk_users
  set 
    client_app_version = p_app_version,
    client_platform = p_platform,
    client_app_version_updated_at = now()
  where id = p_user_id;

  -- Log to analytics table only if version changed
  insert into vk_version_analytics (user_id, app_version, platform, device_info)
  values (p_user_id, p_app_version, p_platform, p_device_info);
end;
$$;

-- =====================================================
-- Analytics Views
-- =====================================================

-- View: Current version adoption (active users)
create or replace view vk_version_adoption_stats as
select 
  client_app_version as version,
  client_platform as platform,
  count(*) as user_count,
  round(count(*) * 100.0 / sum(count(*)) over (), 2) as percentage,
  max(client_app_version_updated_at) as last_seen
from vk_users
where client_app_version is not null
group by client_app_version, client_platform
order by user_count desc;

-- View: Version adoption over time (historical)
create or replace view vk_version_adoption_timeline as
select 
  date_trunc('day', recorded_at) as date,
  app_version,
  platform,
  count(distinct user_id) as unique_users
from vk_version_analytics
group by date_trunc('day', recorded_at), app_version, platform
order by date desc, unique_users desc;

-- =====================================================
-- Helper Functions for Feature Rollout
-- =====================================================

-- Check if user's app version meets minimum requirement
create or replace function user_version_meets_requirement(
  p_user_id uuid,
  p_minimum_version text
)
returns boolean
language plpgsql
stable
as $$
declare
  v_user_version text;
  v_user_parts int[];
  v_min_parts int[];
begin
  -- Get user's current version
  select client_app_version into v_user_version
  from vk_users
  where id = p_user_id;

  if v_user_version is null then
    return false;
  end if;

  -- Parse versions into integer arrays
  v_user_parts := string_to_array(v_user_version, '.')::int[];
  v_min_parts := string_to_array(p_minimum_version, '.')::int[];

  -- Compare major version
  if coalesce(v_user_parts[1], 0) > coalesce(v_min_parts[1], 0) then
    return true;
  elsif coalesce(v_user_parts[1], 0) < coalesce(v_min_parts[1], 0) then
    return false;
  end if;

  -- Compare minor version
  if coalesce(v_user_parts[2], 0) > coalesce(v_min_parts[2], 0) then
    return true;
  elsif coalesce(v_user_parts[2], 0) < coalesce(v_min_parts[2], 0) then
    return false;
  end if;

  -- Compare patch version
  if coalesce(v_user_parts[3], 0) >= coalesce(v_min_parts[3], 0) then
    return true;
  end if;

  return false;
end;
$$;

-- =====================================================
-- Comments for documentation
-- =====================================================
comment on column vk_users.client_app_version is 'Last known app version from client (e.g., 1.0.0)';
comment on column vk_users.client_platform is 'Platform: ios, android, or web';
comment on column vk_users.client_app_version_updated_at is 'Timestamp when client_app_version was last updated';
comment on table vk_version_analytics is 'Tracks version changes over time for analytics and debugging';
comment on function update_user_app_version is 'Updates user version and logs to analytics table';
comment on function user_version_meets_requirement is 'Check if user app version meets minimum requirement for feature rollout';

-- =====================================================
-- Sample Queries for Analytics
-- =====================================================

-- Query 1: Current version distribution
-- SELECT * FROM vk_version_adoption_stats;

-- Query 2: Users still on old version (e.g., < 1.1.0)
-- SELECT id, email, name, client_app_version, client_app_version_updated_at
-- FROM vk_users
-- WHERE client_app_version < '1.1.0'
-- ORDER BY client_app_version_updated_at DESC;

-- Query 3: Version adoption trend over last 30 days
-- SELECT * FROM vk_version_adoption_timeline
-- WHERE date >= current_date - interval '30 days'
-- ORDER BY date DESC, unique_users DESC;

-- Query 4: Check if specific user can access new feature
-- SELECT user_version_meets_requirement('user-uuid-here', '1.1.0');
