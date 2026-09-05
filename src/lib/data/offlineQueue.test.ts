/**
 * Kun beslutningslogikken testes her, ikke selve IndexedDB-adapteren —
 * samme princip som SupabaseRepo aldrig er blevet unit-testet: I/O
 * verificeres manuelt mod det rigtige miljø (se docs/roadmap.md-historikken
 * for hvordan Supabase-features er verificeret gennem sessionen). Det, der
 * SKAL være rigtigt uafhængigt af miljø, er hvilke fejl der lægges i køen,
 * og hvilke der vises som en rigtig fejl med det samme.
 */
import { describe, expect, it } from 'vitest';

import { isOfflineLikeError } from './offlineQueue';

describe('isOfflineLikeError', () => {
  it('opfatter en TypeError fra fetch som et netværkssvigt', () => {
    expect(isOfflineLikeError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isOfflineLikeError(new TypeError('NetworkError when attempting to fetch resource'))).toBe(true);
  });

  it('opfatter kendte netværksbeskeder som netværkssvigt, selv uden TypeError', () => {
    expect(isOfflineLikeError(new Error('Load failed'))).toBe(true);
  });

  it('opfatter IKKE en rigtig fejl som netværkssvigt — den skal vises, ikke ventes med', () => {
    expect(isOfflineLikeError(new Error('Log ind for at gemme fund'))).toBe(false);
    expect(isOfflineLikeError({ code: '42501', message: 'row-level security' })).toBe(false);
    expect(isOfflineLikeError(new Error('Ugyldig værdi'))).toBe(false);
  });
});
