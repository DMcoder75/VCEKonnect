import { useState, useEffect } from 'react';
import { isOnline, onNetworkChange } from '@/services/networkService';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(isOnline());

  useEffect(() => {
    const unsubscribe = onNetworkChange((connected) => {
      setIsConnected(connected);
    });

    return unsubscribe;
  }, []);

  return { isConnected, isOffline: !isConnected };
}
