import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

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
