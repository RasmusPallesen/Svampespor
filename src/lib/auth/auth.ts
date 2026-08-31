/**
 * Auth — Google/Apple OAuth + e-mail magic-link via Supabase Auth.
 *
 * Kun relevant i Supabase-tilstand (session-adapteren har ingen rigtige
 * brugere). RLS-politikkerne i 0001_init.sql kræver auth.uid(), så uden en
 * session kan hverken fund eller profil gemmes — se SupabaseRepo.
 *
 * OAuth-udbyderne skal aktiveres i Supabase Dashboard (Authentication →
 * Providers) med et Client ID + hemmelighed fra hhv. Google Cloud Console
 * og Apple Developer — det kan ikke gøres herfra, og hemmeligheden må aldrig
 * gå gennem klientkoden. Se README for opsætning.
 */

import { getSupabase } from '../data/supabaseClient';

export class AuthUnavailableError extends Error {}

function requireDb() {
  const db = getSupabase();
  if (!db) {
    throw new AuthUnavailableError('Login kræver en Supabase-forbindelse. Sæt VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY i .env.');
  }
  return db;
}

async function signInWithOAuth(provider: 'google' | 'apple'): Promise<void> {
  const db = requireDb();
  const { error } = await db.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  // Browseren omdirigeres til udbyderen — resten sker efter redirect tilbage.
}

export const signInWithGoogle = () => signInWithOAuth('google');
export const signInWithApple = () => signInWithOAuth('apple');

export async function signInWithMagicLink(email: string): Promise<void> {
  const db = requireDb();
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOutAuth(): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  await db.auth.signOut();
}
