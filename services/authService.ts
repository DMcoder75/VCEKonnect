// Platform-aware auth service entry point
import { Platform } from 'react-native';

// Dynamically import the correct platform implementation
let authService: any;

if (Platform.OS === 'web') {
  authService = require('./authService.web');
} else {
  authService = require('./authService.native');
}

export const {
  registerUser,
  loginUser,
  getCurrentUser,
  updateUserProfile,
  logoutUser,
} = authService;

export type { AuthResponse } from './authService.web';
