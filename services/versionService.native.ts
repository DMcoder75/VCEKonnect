import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase.native';
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
 * Get current app version - hardcoded to match app.json
 * Note: Dynamic imports from app.json and Constants.expoConfig are unreliable on iOS
 */
export function getCurrentAppVersion(): string {
  // Hardcoded to match app.json version (update when app.json changes)
  return '1.0.0';
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
 * Returns safe defaults on any error to prevent app crashes
 */
export async function checkVersionStatus(): Promise<VersionStatus> {
  const safeDefaults: VersionStatus = {
    updateRequired: false,
    updateAvailable: false,
    latestVersion: null,
    minimumVersion: null,
    releaseNotes: null,
    updateUrl: null,
  };

  try {
    // Get current version safely
    const currentVersion = getCurrentAppVersion();
    if (!currentVersion) {
      console.warn('[VersionService] No app version available');
      return safeDefaults;
    }

    const platform = getPlatform();

    // Make RPC call with timeout protection
    const { data, error } = await Promise.race([
      supabase.rpc('get_version_status', {
        user_version: currentVersion,
        user_platform: platform,
      }),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 5000)
      ),
    ]);

    if (error) {
      console.warn('[VersionService] Error checking version:', error.message);
      return safeDefaults;
    }

    if (!data) {
      console.warn('[VersionService] No data returned from version check');
      return safeDefaults;
    }

    // Handle both array and single object responses
    const result = Array.isArray(data) ? (data[0] || {}) : (data || {});
    
    return {
      updateRequired: result.update_required || false,
      updateAvailable: result.update_available || false,
      latestVersion: result.latest_version || null,
      minimumVersion: result.minimum_version || null,
      releaseNotes: result.release_notes || null,
      updateUrl: result.update_url || null,
    };
  } catch (err) {
    console.warn('[VersionService] Safe catch - returning defaults:', err);
    return safeDefaults;
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
