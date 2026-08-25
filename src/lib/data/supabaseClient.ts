/**
 * Supabase-klient.
 *
 * Oprettes kun, hvis miljøvariablerne er sat. Ellers kører appen på
 * session-adapteren, og denne fil returnerer null — så en manglende .env
 * ikke vælter build eller test.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) client = createClient(url as string, anonKey as string);
  return client;
}
