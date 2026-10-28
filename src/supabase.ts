import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configurationError = !url || !key || url.includes('YOUR_PROJECT_REF') || key.includes('YOUR_')
  ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Campus-Connect/.env.local, then restart Vite.'
  : '';

// One browser client; Supabase Auth owns session persistence and token refresh.
export const supabase = configurationError ? null : createClient<Database>(url, key);
export function client() {
  if (!supabase) throw new Error(configurationError);
  return supabase;
}
