/**
 * Version Tracking Service
 * Tracks client app version in database for debugging, feature rollout, and analytics
 */

import { Platform } from 'react-native';
import { supabase } from './supabase.native';
import { getCurrentAppVersion } from './versionService.native';
import Constants from 'expo-constants';

export interface DeviceInfo {
  osVersion?: string;
  deviceModel?: string;
  deviceName?: string;
  appBuildNumber?: string;
  [key: string]: any;
}

/**
 * Get current platform identifier
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Collect device information for analytics
 */
export function getDeviceInfo(): DeviceInfo {
  try {
    return {
      osVersion: Platform.Version.toString(),
      deviceModel: Constants.deviceName || 'Unknown',
      deviceName: Constants.deviceName || 'Unknown',
      appBuildNumber: Constants.expoConfig?.version || getCurrentAppVersion(),
      platform: Platform.OS,
    };
  } catch (err) {
    console.warn('[VersionTracking] Error collecting device info:', err);
    return {};
  }
}

/**
 * Update user's app version in database
 * Called on login, app startup, or version change
 */
export async function updateUserAppVersion(userId: string): Promise<void> {
  try {
    const appVersion = getCurrentAppVersion();
    const platform = getPlatform();
    const deviceInfo = getDeviceInfo();

    const { error } = await supabase.rpc('update_user_app_version', {
      p_user_id: userId,
      p_app_version: appVersion,
      p_platform: platform,
      p_device_info: deviceInfo,
    });

    if (error) {
      console.error('[VersionTracking] Error updating version:', error);
    } else {
      console.log(`[VersionTracking] Updated to ${appVersion} (${platform})`);
    }
  } catch (err) {
    console.error('[VersionTracking] Failed to update version:', err);
  }
}

/**
 * Check if user's current version meets minimum requirement
 * Useful for feature flags and gradual rollout
 */
export async function userVersionMeetsRequirement(
  userId: string,
  minimumVersion: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('user_version_meets_requirement', {
      p_user_id: userId,
      p_minimum_version: minimumVersion,
    });

    if (error) {
      console.error('[VersionTracking] Error checking version requirement:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('[VersionTracking] Failed to check version requirement:', err);
    return false;
  }
}

/**
 * Get version adoption statistics
 */
export async function getVersionAdoptionStats(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('vk_version_adoption_stats')
      .select('*');

    if (error) {
      console.error('[VersionTracking] Error fetching adoption stats:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[VersionTracking] Failed to fetch adoption stats:', err);
    return [];
  }
}
