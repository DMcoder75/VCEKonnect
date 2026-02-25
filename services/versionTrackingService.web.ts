/**
 * Version Tracking Service (Web)
 * Web version - no-op implementation since web apps auto-update
 */

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
export function getPlatform(): 'web' {
  return 'web';
}

/**
 * Collect device information for analytics
 */
export function getDeviceInfo(): DeviceInfo {
  return {
    platform: 'web',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
  };
}

/**
 * Update user's app version in database (no-op on web)
 * Web apps auto-update, so version tracking is not needed
 */
export async function updateUserAppVersion(userId: string): Promise<void> {
  // No-op on web - apps auto-update on deployment
  console.log('[VersionTracking] Skipping version tracking on web (auto-update enabled)');
}

/**
 * Check if user's current version meets minimum requirement (always true on web)
 */
export async function userVersionMeetsRequirement(
  userId: string,
  minimumVersion: string
): Promise<boolean> {
  // Always return true on web since apps are always on latest version
  return true;
}

/**
 * Get version adoption statistics (empty on web)
 */
export async function getVersionAdoptionStats(): Promise<any[]> {
  return [];
}
