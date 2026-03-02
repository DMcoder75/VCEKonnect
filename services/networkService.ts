import NetInfo from '@react-native-community/netinfo';

let isConnected = true;
let listeners: ((connected: boolean) => void)[] = [];

// Initialize network monitoring
NetInfo.configure({
  reachabilityUrl: 'https://clients3.google.com/generate_204',
  reachabilityTest: async (response) => response.status === 204,
  reachabilityLongTimeout: 60 * 1000, // 60s
  reachabilityShortTimeout: 5 * 1000, // 5s
  reachabilityRequestTimeout: 15 * 1000, // 15s
});

// Subscribe to network state changes
NetInfo.addEventListener(state => {
  const connected = state.isConnected === true && state.isInternetReachable === true;
  if (connected !== isConnected) {
    console.log('🌐 Network status changed:', connected ? 'ONLINE' : 'OFFLINE');
    isConnected = connected;
    listeners.forEach(listener => listener(connected));
  }
});

/**
 * Check if device has active internet connection
 */
export async function checkConnection(): Promise<boolean> {
  const state = await NetInfo.fetch();
  isConnected = state.isConnected === true && state.isInternetReachable === true;
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
