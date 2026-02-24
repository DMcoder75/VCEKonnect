import { Platform } from 'react-native';
import { supabase } from './supabase.native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

export interface VersionStatus {
  updateRequired: boolean; // Must update to continue using app
  updateAvailable: boolean; // New version available (optional)
  latestVersion: string | null;
  minimumVersion: string | null;
  releaseNotes: string | null;
  updateUrl: string | null;
}

/**
 * Get current app version from Expo config
 */
export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}

/**
 * Get platform identifier
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Check version status against server requirements
 */
export async function checkVersionStatus(): Promise<VersionStatus & { debugInfo?: string }> {
  try {
    const currentVersion = getCurrentAppVersion();
    const platform = getPlatform();

    console.log('[VersionService] Calling RPC with:', { currentVersion, platform });

    const { data, error } = await supabase.rpc('get_version_status', {
      user_version: currentVersion,
      user_platform: platform,
    });

    console.log('[VersionService] RPC raw response:', { data, error });

    // Build detailed debug info
    let debugInfo = '';
    if (error) {
      debugInfo = `ERROR: ${error.message} | Code: ${error.code} | Details: ${error.details}`;
    } else if (!data) {
      debugInfo = `Data is null/undefined`;
    } else if (Array.isArray(data)) {
      debugInfo = `Array with ${data.length} items | First: ${JSON.stringify(data[0])}`;
    } else {
      debugInfo = `Non-array data: ${JSON.stringify(data)}`;
    }

    if (error) {
      console.error('[VersionService] Error checking version:', error);
      return {
        updateRequired: false,
        updateAvailable: false,
        latestVersion: null,
        minimumVersion: null,
        releaseNotes: null,
        updateUrl: null,
        debugInfo,
      };
    }

    // Handle both array and single object responses
    const result = Array.isArray(data) ? (data[0] || {}) : (data || {});
    
    console.log('[VersionService] Parsed result:', result);
    
    return {
      updateRequired: result.update_required || false,
      updateAvailable: result.update_available || false,
      latestVersion: result.latest_version,
      minimumVersion: result.minimum_version,
      releaseNotes: result.release_notes,
      updateUrl: result.update_url,
      debugInfo,
    };
  } catch (err) {
    console.error('[VersionService] Unexpected error:', err);
    return {
      updateRequired: false,
      updateAvailable: false,
      latestVersion: null,
      minimumVersion: null,
      releaseNotes: null,
      updateUrl: null,
      debugInfo: `EXCEPTION: ${err}`,
    };
  }
}

/**
 * Open app store for update
 */
export async function openAppStore(updateUrl?: string | null): Promise<void> {
  try {
    const url = updateUrl || getDefaultStoreUrl();
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      console.warn('[VersionService] Cannot open store URL:', url);
    }
  } catch (err) {
    console.error('[VersionService] Error opening store:', err);
  }
}

/**
 * Get default store URL based on platform
 */
function getDefaultStoreUrl(): string {
  const platform = getPlatform();
  
  if (platform === 'ios') {
    return 'https://apps.apple.com/app/fairprep/id123456789'; // Replace with actual
  } else if (platform === 'android') {
    return 'https://play.google.com/store/apps/details?id=com.fairprep.app'; // Replace with actual
  }
  
  return 'https://fairprep.com/download'; // Web fallback
}

/**
 * Compare two semantic version strings
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
}
