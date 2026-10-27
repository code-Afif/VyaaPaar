import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseKey) return false;
  if (
    supabaseUrl.includes('your-project-id') ||
    supabaseKey.includes('your-publishable-key') ||
    supabaseKey.includes('your-anon-key')
  ) {
    return false;
  }
  return true;
};

// Initialize the Supabase client
// When not configured, initialize with a dummy endpoint so the JS client doesn't crash on import,
// while isSupabaseConfigured() guards all live network calls.
const effectiveUrl = isSupabaseConfigured()
  ? supabaseUrl
  : 'https://placeholder.supabase.co';
const effectiveKey = isSupabaseConfigured()
  ? supabaseKey
  : 'placeholder-anon-key';

export const supabase = createClient(effectiveUrl, effectiveKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
