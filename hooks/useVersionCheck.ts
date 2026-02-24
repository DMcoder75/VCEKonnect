import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { checkVersionStatus, VersionStatus } from '@/services/versionService';

export function useVersionCheck() {
  const [versionStatus, setVersionStatus] = useState<VersionStatus>({
    updateRequired: false,
    updateAvailable: false,
    latestVersion: null,
    minimumVersion: null,
    releaseNotes: null,
    updateUrl: null,
  });
  const [isChecking, setIsChecking] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Skip version check on iOS to prevent crashes
    // Android version check works perfectly
    if (Platform.OS !== 'ios') {
      checkVersion();
    } else {
      setIsChecking(false);
    }
  }, []);

  async function checkVersion() {
    // Skip on iOS
    if (Platform.OS === 'ios') {
      setIsChecking(false);
      return;
    }
    
    setIsChecking(true);
    try {
      const status = await checkVersionStatus();
      setVersionStatus(status);
    } catch (err) {
      console.error('[useVersionCheck] Error:', err);
    } finally {
      setIsChecking(false);
    }
  }

  function dismissUpdate() {
    // Only dismiss if update is not required
    if (!versionStatus.updateRequired) {
      setIsDismissed(true);
    }
  }

  const shouldShowModal = !isChecking && 
    !isDismissed && 
    (versionStatus.updateRequired || versionStatus.updateAvailable);

  return {
    versionStatus,
    isChecking,
    shouldShowModal,
    dismissUpdate,
    recheckVersion: checkVersion,
  };
}
