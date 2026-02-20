// Platform-agnostic Supabase client export
// Auto-selects the correct client for web or native

import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // @ts-ignore
  module.exports = require('./supabase.web');
} else {
  // @ts-ignore
  module.exports = require('./supabase.native');
}
