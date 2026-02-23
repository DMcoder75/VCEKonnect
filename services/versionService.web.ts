// Web version - version checking not applicable for web apps
export interface VersionStatus {
  updateRequired: boolean;
  updateAvailable: boolean;
  latestVersion: string | null;
  minimumVersion: string | null;
  releaseNotes: string | null;
  updateUrl: string | null;
}

/**
 * Get current app version (web always uses latest deployed version)
 */
export function getCurrentAppVersion(): string {
  return '1.0.0';
}

/**
 * Get platform identifier
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return 'web';
}

/**
 * Check version status - web apps don't need version checking
 * They're always running the latest deployed version
 */
export async function checkVersionStatus(): Promise<VersionStatus> {
  return {
    updateRequired: false,
    updateAvailable: false,
    latestVersion: null,
    minimumVersion: null,
    releaseNotes: null,
    updateUrl: null,
  };
}

/**
 * Open app store - no-op on web
 */
export async function openAppStore(updateUrl?: string | null): Promise<void> {
  console.log('[VersionService.web] App store not applicable on web platform');
}

/**
 * Compare two semantic version strings
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
