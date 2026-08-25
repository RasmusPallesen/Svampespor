/**
 * Billedtekst til deling.
 *
 * Vinklen er altid vejret som forklaring på fundet — det er dét, der gør
 * historien værd at dele. AI-teksten hentes gennem Edge Function'en
 * `billedtekst` (nøglen serverside); slår den fejl, eller er den slået fra,
 * bruges en lokal fallback. Ingen tekst udtaler sig om spiselighed.
 */

import { getSupabase } from '../data/supabaseClient';
import type { FindRecord, Profile } from '../data/types';
import type { PlatformKey } from '../../data/catalog';

export const PLATFORM_MAX: Record<PlatformKey, number> = {
  instagram: 2200, facebook: 5000, tiktok: 2200, snapchat: 250,
};

export function fallbackCaption(f: FindRecord, platform: PlatformKey, blur: boolean): string {
  const s = f.snapshot;
  const sted = blur ? `omkring ${f.spotName}` : f.spotName;
  const base = `${f.species} — dag ${s.daysSince} efter regnen.`;
  const tag = f.spotName.toLowerCase().replace(/\s/g, '');

  switch (platform) {
    case 'snapchat':
      return `${base} ${s.rain14} mm gjorde arbejdet 🍄`;
    case 'tiktok':
      return `${s.rain14} mm regn. ${s.daysSince} dage. Så stod den der.\n\n#svampejagt #kantarel #danmark #svampe #skovtur`;
    case 'facebook':
      return `${base}\n\nDer faldt ${s.rain14} mm over fjorten dage, og luftfugtigheden lå på ${s.rh}%. Skovbunden holder regnskab, man skal bare lære at læse det.\n\nNogen der har været heldige i ${sted} i år?`;
    default:
      return `${base}\n\n${s.rain14} mm over fjorten dage, ${s.rh}% luftfugtighed. Skoven husker hver eneste byge.\n\n#svampejagt #svampe #kantarel #danskskov #efterår #foraging #${tag}`;
  }
}

export async function buildCaption(
  f: FindRecord,
  platform: PlatformKey,
  profile: Profile,
): Promise<string> {
  const blur = profile.prefs.blur;
  if (!profile.prefs.caption) return fallbackCaption(f, platform, blur);

  const db = getSupabase();
  if (!db) return fallbackCaption(f, platform, blur);

  try {
    const { data, error } = await db.functions.invoke<{ text: string }>('billedtekst', {
      body: {
        species: f.species,
        quantity: f.quantity,
        habitat: f.habitat,
        spot: blur ? `omkring ${f.spotName}` : f.spotName,
        note: f.note,
        snapshot: f.snapshot,
        platform,
        handle: profile.handles[platform] ?? '',
      },
    });
    if (error || !data?.text) throw new Error('tom');
    return data.text.trim();
  } catch {
    return fallbackCaption(f, platform, blur);
  }
}
