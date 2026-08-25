/**
 * Klientsiden af artsbestemmelsen.
 *
 * Kaldet går ALDRIG direkte til Anthropic — nøglen må aldrig ligge i
 * frontend-bundlen (CLAUDE.md, regel 1). I stedet rammer vi Supabase Edge
 * Function'en `bestem`, som holder nøglen serverside og kender prompten.
 */

import { getSupabase } from '../data/supabaseClient';
import type { IdResult, IdentifyInput } from './types';

export class IdUnavailableError extends Error {}

export async function identify(input: IdentifyInput): Promise<IdResult> {
  const db = getSupabase();
  if (!db) {
    throw new IdUnavailableError(
      'Bestemmelsesmotoren kræver en forbindelse. Sæt Supabase-nøglerne op og udrul Edge Function’en bestem.',
    );
  }

  const { data, error } = await db.functions.invoke<IdResult>('bestem', {
    body: {
      images: input.images,
      habitat: input.habitat,
      observations: input.observations,
      order: input.order,
    },
  });

  if (error || !data) {
    // Brugeren skal se en rolig, generisk besked (matcher prototypen) —
    // men den reelle årsag logges, så en fejl ikke kræver en tur i
    // Supabase-logs for at diagnosticere.
    console.error('bestem-kald fejlede:', error);
    throw new IdUnavailableError('Der er ikke forbindelse til bestemmelsesmotoren lige nu.');
  }
  return data;
}
