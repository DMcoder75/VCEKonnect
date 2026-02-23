-- ============================================
-- App Version Control System
-- Manages forced and optional app updates
-- ============================================

-- Version Control Table
create table if not exists vk_app_versions (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('ios', 'android', 'all')),
  current_version text not null, -- Latest version available in store
  minimum_required_version text not null, -- Below this = force update
  release_notes text,
  update_url_ios text, -- App Store URL
  update_url_android text, -- Play Store URL
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table vk_app_versions enable row level security;

-- Allow public read access (users need to check version)
create policy "allow_public_read_app_versions"
  on vk_app_versions for select
  to anon, authenticated
  using (is_active = true);

-- Only authenticated admins can modify (future admin system)
create policy "allow_admin_manage_app_versions"
  on vk_app_versions for all
  to authenticated
  using (false)
  with check (false);

-- Function to get version status for a platform
create or replace function get_version_status(
  user_version text,
  user_platform text
)
returns table (
  update_required boolean,
  update_available boolean,
  latest_version text,
  minimum_version text,
  release_notes text,
  update_url text
) as $$
declare
  version_info record;
begin
  -- Get the active version info for the platform (or 'all')
  select * into version_info
  from vk_app_versions
  where is_active = true
    and (platform = user_platform or platform = 'all')
  order by 
    case when platform = user_platform then 1 else 2 end,
    created_at desc
  limit 1;

  if not found then
    -- No version control set up yet
    return query select false, false, null::text, null::text, null::text, null::text;
    return;
  end if;

  -- Determine update URLs based on platform
  declare
    url text;
  begin
    if user_platform = 'ios' then
      url := version_info.update_url_ios;
    elsif user_platform = 'android' then
      url := version_info.update_url_android;
    else
      url := version_info.update_url_ios; -- default
    end if;

    return query select
      user_version < version_info.minimum_required_version as update_required,
      user_version < version_info.current_version as update_available,
      version_info.current_version as latest_version,
      version_info.minimum_required_version as minimum_version,
      version_info.release_notes,
      url as update_url;
  end;
end;
$$ language plpgsql security definer;

-- Insert initial version configuration (customize these values)
insert into vk_app_versions (platform, current_version, minimum_required_version, release_notes, update_url_ios, update_url_android)
values (
  'all',
  '1.0.0', -- Current version in stores
  '1.0.0', -- Minimum required version (update this to force updates)
  'Welcome to FairPrep! Track your study progress, predict your ATAR, and plan your university pathway.',
  'https://apps.apple.com/app/fairprep/id123456789', -- Replace with actual App Store URL
  'https://play.google.com/store/apps/details?id=com.fairprep.app' -- Replace with actual Play Store URL
);

-- Create index for faster lookups
create index if not exists idx_app_versions_platform on vk_app_versions(platform, is_active);

comment on table vk_app_versions is 'Stores app version requirements for force/optional updates';
comment on function get_version_status is 'Checks if user app version requires update';
