/**
 * Katalog — systemsteder og arter.
 *
 * Dette er klientens spejl af databasens `spots`- (source='system') og
 * `species`-tabeller. Indtil Supabase-projektet kører, serverer kataloget
 * de samme data statisk, så modellen og rangeringen har noget at arbejde på.
 *
 * Arter udvider `Species` fra modellen med felter, UI'et bruger — risiko og
 * forvekslingstekst — uden at forurene den rene model.
 */

import type { Species } from '../lib/weather/model';
import type { Spot } from '../lib/spots/ranking';

/** Risikoniveau styrer hvor kraftigt UI'et advarer. */
export type Risk = 'low' | 'med' | 'high';

export interface CatalogSpecies extends Species {
  risk: Risk;
  /** Forvekslingstekst — kan indeholde <b>…</b>. Vises altid ved artsvalg. */
  warn: string;
}

/**
 * Systemsteder — Nordsjælland og omegn. `travelMin` er rejsetid fra basen.
 *
 * `id` er den samme UUID som rækken i `spots`-tabellen (source='system'),
 * sat med faste literaler i supabase/migrations/0004_seed_system_data.sql
 * — ikke gen_random_uuid() — netop så klient og database er enige om
 * identiteten. `finds.spot_id` er en fremmednøgle til denne tabel, så et
 * slug her ville brække enhver skrivning gennem Supabase-adapteren.
 */
export const SPOTS: Spot[] = [
  { id: 'a45aa224-112b-45be-b611-0b0f52409517', name: 'Gribskov', region: 'Nordsjælland', lat: 55.978, lon: 12.294, travelMin: 55, habitats: ['bøg', 'gran', 'mos', 'gammelskov'] },
  { id: '9149060e-a086-44fe-b829-4ab6e353ae1f', name: 'Tisvilde Hegn', region: 'Nordkysten', lat: 56.048, lon: 12.092, travelMin: 65, habitats: ['fyr', 'mos', 'klit', 'sur'] },
  { id: 'b7c327c5-c0a1-4c96-8164-3bd97988ae4c', name: 'Rude Skov', region: 'Holte', lat: 55.833, lon: 12.443, travelMin: 30, habitats: ['bøg', 'gran', 'løv'] },
  { id: '9b049416-0b36-4622-b087-5a65db7e80d0', name: 'Dyrehaven', region: 'Klampenborg', lat: 55.792, lon: 12.573, travelMin: 20, habitats: ['eg', 'bøg', 'græs', 'gammelskov'] },
  { id: 'fc66ca9d-3142-4934-9044-9e4cf09e8880', name: 'Vestskoven', region: 'Albertslund', lat: 55.684, lon: 12.341, travelMin: 25, habitats: ['løv', 'ungskov', 'lysning'] },
  { id: '4ba0bee5-69f1-4b01-a810-590e1840e5f7', name: 'Hareskoven', region: 'Værløse', lat: 55.767, lon: 12.383, travelMin: 25, habitats: ['bøg', 'gran', 'løv'] },
  { id: '6c6fb8d0-4f0b-4dc3-9cad-4c0c1daf6888', name: 'Jægersborg Hegn', region: 'Skodsborg', lat: 55.812, lon: 12.552, travelMin: 24, habitats: ['bøg', 'eg', 'dødttræ'] },
  { id: '4c3004fd-fe58-424c-883d-3f5412ec53ec', name: 'Store Dyrehave', region: 'Hillerød', lat: 55.912, lon: 12.318, travelMin: 48, habitats: ['bøg', 'gran', 'mos'] },
  { id: 'c74f6597-fc37-47da-82ea-ff3928160be0', name: 'Tokkekøb Hegn', region: 'Allerød', lat: 55.887, lon: 12.394, travelMin: 42, habitats: ['gran', 'bøg', 'sur'] },
  { id: 'bad68cfd-a072-408e-bb9d-ab786e8bddff', name: 'Boserup Skov', region: 'Roskilde', lat: 55.652, lon: 12.024, travelMin: 45, habitats: ['bøg', 'løv', 'lysning'] },
];

/**
 * Arter med modningsvindue, nedbørsbehov og forvekslinger.
 *
 * `habitats` er de voksesteder arten faktisk søger — det er dem, rangeringens
 * cold start bruger, når du endnu ingen historik har på et sted.
 */
export const SPECIES: CatalogSpecies[] = [
  {
    nameDa: 'Kantarel', nameLat: 'Cantharellus cibarius', risk: 'low',
    window: [5, 9], rainMm: 14, habitats: ['bøg', 'mos', 'løv', 'sur'],
    warn: 'Forveksles med falsk kantarel og olivenbrun kantarelrørhat. Tjek de nedløbende <b>ribber</b> — ikke ægte lameller — og den svage abrikoslugt.',
  },
  {
    nameDa: 'Spiselig rørhat (Karl Johan)', nameLat: 'Boletus edulis', risk: 'low',
    window: [6, 11], rainMm: 18, habitats: ['gran', 'bøg', 'mos', 'gammelskov'],
    warn: 'Forveksles med galderørhat, som er ubrugelig af bitterhed. Rør-laget er hvidt til gulgrønt hos Karl Johan, lyserødt hos galderørhatten.',
  },
  {
    nameDa: 'Tragtkantarel', nameLat: 'Craterellus tubaeformis', risk: 'low',
    window: [7, 13], rainMm: 16, habitats: ['gran', 'mos', 'sur', 'fyr'],
    warn: 'Få farlige forvekslinger, men vokser tit i tætte tæpper — tag kun en del af bestanden, så mycelium og fællesskab har noget til næste år.',
  },
  {
    nameDa: 'Almindelig champignon', nameLat: 'Agaricus campestris', risk: 'high',
    window: [4, 8], rainMm: 12, habitats: ['græs', 'lysning', 'ungskov'],
    warn: '<b>Højeste agtpågivenhed.</b> Unge champignon-lignende svampe forveksles med <b>grøn fluesvamp</b> og <b>snehvid fluesvamp</b> — begge dødeligt giftige. Grav altid hele stokbasen op: en <b>tydelig pose (volva)</b> ved foden betyder fluesvamp. Champignonens lameller bliver lyserøde og siden brune; fluesvampens forbliver hvide.',
  },
  {
    nameDa: 'Stor parasolhat', nameLat: 'Macrolepiota procera', risk: 'med',
    window: [5, 10], rainMm: 14, habitats: ['lysning', 'græs', 'løv'],
    warn: 'Forveksles med kastanieparasolhat (giftig), der er markant mindre og rødmer ved snit. Den ægte har <b>slangebroget stok</b> og en dobbelt ring, der kan skydes op og ned.',
  },
  {
    nameDa: 'Østershat', nameLat: 'Pleurotus ostreatus', risk: 'low',
    window: [3, 9], rainMm: 10, habitats: ['dødttræ', 'bøg', 'løv'],
    warn: 'Vokser på dødt løvtræ, typisk bøg. Kommer først for alvor efter <b>frost</b> — vejrvinduet her er et andet end for skovbundens arter.',
  },
  {
    nameDa: 'Rødmende skørhat', nameLat: 'Russula vesca', risk: 'med',
    window: [5, 10], rainMm: 15, habitats: ['bøg', 'eg', 'løv'],
    warn: 'Skørhatte kræver smagsprøve-teknik: en lille bid på tungespidsen, spyttes ud. Bittert eller skarpt = lad den stå.',
  },
];

/** Voksesteder man kan vælge i log- og bestem-formularerne. */
export const HABITATS: string[] = [
  'Bøgeskov, muldbund',
  'Gammel granplantage',
  'Blandet løvskov',
  'Egeskov, sur bund',
  'Skovbryn / lysning',
  'Mosset klit / fyr',
  'På dødt træ / stub',
  'Græsplæne / eng',
];

/** De tre billeder bestemmelsen beder om, i rækkefølge. */
export const SHOT_SLOTS = [
  { k: 'hat', cap: 'Hatten ovenfra', req: 'vigtig' },
  { k: 'under', cap: 'Undersiden — lameller / rør', req: 'vigtig' },
  { k: 'stok', cap: 'Stok + base gravet fri', req: 'kritisk' },
] as const;

/** Deleplatforme. `native` = telefonen kan dele billedet direkte. */
export const PLATFORMS = [
  { k: 'instagram', n: 'Instagram', ic: 'IG', ph: '@ditnavn', max: 2200, native: true },
  { k: 'facebook', n: 'Facebook', ic: 'FB', ph: 'facebook.com/…', max: 5000, native: false },
  { k: 'tiktok', n: 'TikTok', ic: 'TT', ph: '@ditnavn', max: 2200, native: true },
  { k: 'snapchat', n: 'Snapchat', ic: 'SC', ph: 'ditnavn', max: 250, native: true },
] as const;

export type PlatformKey = (typeof PLATFORMS)[number]['k'];

export const findSpecies = (nameDa: string): CatalogSpecies | undefined =>
  SPECIES.find((s) => s.nameDa.toLowerCase() === nameDa.toLowerCase());

export const findSpot = (id: string): Spot | undefined => SPOTS.find((s) => s.id === id);
export const spotByName = (name: string): Spot | undefined => SPOTS.find((s) => s.name === name);
