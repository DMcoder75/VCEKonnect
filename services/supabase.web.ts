import { createClient } from '@supabase/supabase-js';

// External Supabase configuration
const supabaseUrl = 'https://xududbaqaaffcaejwuix.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZHVkYmFxYWFmZmNhZWp3dWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyOTE4OTQsImV4cCI6MjA2Njg2Nzg5NH0.rMPZCHgDfyho4sUOXNcA1PF4yZ3GFBJxXya_SPcq8fA';

// Platform-agnostic storage (no AsyncStorage for web)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: undefined, // Disable storage on web
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Helper to set user context for RLS
export async function setUserContext(userId: string) {
  const { error } = await supabase.rpc('set_config', {
    setting: 'app.user_id',
    value: userId,
  });
  if (error) console.error('Failed to set user context:', error);
}
