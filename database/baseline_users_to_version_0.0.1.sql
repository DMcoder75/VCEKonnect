-- =====================================================
-- Baseline All Users to Version 0.0.1
-- =====================================================
-- Purpose: Set all existing users to baseline version 0.0.1
-- Run this on external Supabase SQL editor
-- =====================================================

-- Update all users to baseline version 0.0.1
update vk_users
set 
  client_app_version = '0.0.1',
  client_platform = case 
    when client_platform is not null then client_platform
    else 'unknown'
  end,
  client_app_version_updated_at = now()
where client_app_version is null or client_app_version != '0.0.1';

-- Insert analytics record for all baselined users
insert into vk_version_analytics (user_id, app_version, platform, device_info)
select 
  id,
  '0.0.1',
  coalesce(client_platform, 'unknown'),
  jsonb_build_object('baseline', true, 'baselined_at', now())
from vk_users
where client_app_version = '0.0.1';

-- Verify baseline
select 
  client_app_version,
  client_platform,
  count(*) as user_count
from vk_users
group by client_app_version, client_platform
order by user_count desc;
