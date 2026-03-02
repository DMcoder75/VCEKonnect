let isConnected = true;
let listeners: ((connected: boolean) => void)[] = [];

// Monitor online/offline events in browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Network status changed: ONLINE');
    isConnected = true;
    listeners.forEach(listener => listener(true));
  });

  window.addEventListener('offline', () => {
    console.log('🌐 Network status changed: OFFLINE');
    isConnected = false;
    listeners.forEach(listener => listener(false));
  });

  isConnected = navigator.onLine;
}

/**
 * Check if device has active internet connection
 */
export async function checkConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined') {
    isConnected = navigator.onLine;
  }
  return isConnected;
}

/**
 * Get current network status (synchronous, uses last known state)
 */
export function isOnline(): boolean {
  return isConnected;
}

/**
 * Subscribe to network status changes
 */
export function onNetworkChange(callback: (connected: boolean) => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

/**
 * Throw error if offline (use in services that require network)
 */
export function requireNetwork(): void {
  if (!isConnected) {
    throw new Error('No Internet connection! Please try after sometime!');
  }
}
