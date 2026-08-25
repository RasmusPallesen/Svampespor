/**
 * Demodata til session-adapteren.
 *
 * Kun til at gøre appen levende uden en Supabase-forbindelse. Ligger i
 * hukommelsen, aldrig i localStorage — fund har Supabase som sandhed, jf.
 * projektets regler. Når datalaget peger på Supabase, bruges denne fil ikke.
 */

import { findSpecies, spotByName } from '../../data/catalog';
import type { FeedItem, FindRecord } from './types';

let counter = 0;
const id = () => `seed-${++counter}`;

interface SeedFind {
  art: string;
  hab: string;
  ant: string;
  spot: string;
  note: string;
  date: string;
  snap: { r14: number; days: number; rh: number; t: number };
}

const RAW: SeedFind[] = [
  { art: 'Kantarel', hab: 'Bøgeskov, muldbund', ant: '14', spot: 'Gribskov', note: 'Nordvendt skråning ved den væltede bøg. Hele familien i én klynge — lugtede af abrikos allerede da jeg satte mig på hug.', date: '2026-08-19', snap: { r14: 31, days: 6, rh: 88, t: 19 } },
  { art: 'Spiselig rørhat (Karl Johan)', hab: 'Gammel granplantage', ant: '3', spot: 'Tisvilde Hegn', note: 'Store og orme-frie. Stod i mos langs den gamle brandvej.', date: '2026-08-11', snap: { r14: 26, days: 8, rh: 84, t: 21 } },
  { art: 'Tragtkantarel', hab: 'Blandet løvskov', ant: '40', spot: 'Rude Skov', note: 'Et helt tæppe. Tog en tredjedel. Tågen lå stadig mellem stammerne kl. 7.', date: '2025-10-04', snap: { r14: 42, days: 9, rh: 93, t: 12 } },
];

export function seedFinds(): FindRecord[] {
  return RAW.map((f) => ({
    id: id(),
    species: f.art,
    speciesLat: findSpecies(f.art)?.nameLat,
    habitat: f.hab,
    quantity: f.ant,
    spotId: spotByName(f.spot)?.id ?? f.spot,
    spotName: f.spot,
    note: f.note,
    date: f.date,
    snapshot: { rain14: f.snap.r14, daysSince: f.snap.days, rh: f.snap.rh, tmax: f.snap.t },
    source: 'user',
    shared: false,
  }));
}

/** Fællesskabsfeed — statisk demo, allerede sløret til ~2 km. */
export const SEED_FEED: FeedItem[] = [
  { who: 'Mette H.', when: 'i går', species: 'Tragtkantarel', location: '~2 km fra Gribskov', tags: [{ kind: 'ver', text: '2 bekræftelser' }, { kind: '', text: '40+ stk' }], avatar: 'M' },
  { who: 'Jonas Bech', when: '2 dage siden', species: 'Spiselig rørhat', location: '~2 km fra Tisvilde Hegn', tags: [{ kind: 'ver', text: '4 bekræftelser' }, { kind: '', text: 'under gran' }], avatar: 'J' },
  { who: 'skovmuld_dk', when: '3 dage siden', species: 'Ukendt — rørhat?', location: '~2 km fra Rude Skov', tags: [{ kind: 'pend', text: 'afventer hjælp' }, { kind: '', text: 'sporeaftryk vedlagt' }], avatar: 'S' },
  { who: 'Aase L.', when: '4 dage siden', species: 'Stor parasolhat', location: '~2 km fra Vestskoven', tags: [{ kind: 'ver', text: '6 bekræftelser' }, { kind: '', text: 'skovbryn' }], avatar: 'A' },
];
