// Platform-aware network service entry point
import { Platform } from 'react-native';

// Dynamically import the correct platform implementation
let networkService: any;

if (Platform.OS === 'web') {
  networkService = require('./networkService.web');
} else {
  networkService = require('./networkService.native');
}

export const {
  checkConnection,
  isOnline,
  onNetworkChange,
  requireNetwork,
} = networkService;
