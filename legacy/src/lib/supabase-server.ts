/**
 * Server-side Supabase client for Next.js API routes.
 * Uses process.env (not import.meta.env which is Vite-only).
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseServerConfigured = Boolean(supabaseUrl && supabaseKey);

let _client: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient | null {
  if (!isSupabaseServerConfigured) return null;
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseKey);
  }
  return _client;
}
