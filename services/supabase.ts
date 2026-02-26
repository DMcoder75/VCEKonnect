// Platform-aware Supabase client entry point
import { Platform } from 'react-native';

// Dynamically import the correct platform implementation
let supabaseClient: any;

if (Platform.OS === 'web') {
  supabaseClient = require('./supabase.web');
} else {
  supabaseClient = require('./supabase.native');
}

export const { supabase } = supabaseClient;
