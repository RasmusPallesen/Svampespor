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

import type { Season as ModelSeason, Species } from '../lib/weather/model';
import type { Spot } from '../lib/spots/ranking';

/** Risikoniveau styrer hvor kraftigt UI'et advarer. */
export type Risk = 'low' | 'med' | 'high';

/**
 * Kalendersæson — måneder (1-12), ikke dage efter regn.
 *
 * Hentet fra Danmarks Svampeatlas' egen "Udbredelse og fænologi"-linje pr.
 * art (se `sourceUrl`), ikke gættet. `core`/`extended` er selve modellens
 * `Season`-form (`seasonFactor` i model.ts dæmper `scoreFor` ud fra dem);
 * `sourceUrl` er ren katalog-metadata, ikke noget den rene model kender til.
 */
export interface Season extends ModelSeason {
  /** Kildehenvisning til artens taxon-side på Danmarks Svampeatlas. */
  sourceUrl: string;
}

export interface CatalogSpecies extends Species {
  risk: Risk;
  /** Forvekslingstekst — kan indeholde <b>…</b>. Vises altid ved artsvalg. */
  warn: string;
  /**
   * Valgfri: kernearterne har alle sourcet sæsondata; Tier 2-fællesskabsarter
   * (se `communitySpeciesFrom`) har det ikke — en AI-vurdering ud fra 1-3
   * billeder er ikke en Svampeatlas-fænologi, og skal ikke foregive at være
   * det. `seasonFactor`/`seasonState` falder korrekt tilbage til "ingen
   * dæmpning" uden den.
   */
  season?: Season;
  /**
   * false/undefined = uverificeret Tier 2-art, tilføjet fra en Bestem-
   * identifikation. true = hånd-verificeret kerneart (mod Svampeatlas).
   * Udelades på kernearterne i denne fil — de er pr. definition verificerede.
   */
  reviewed?: boolean;
}

/**
 * Bygger en visningsklar `CatalogSpecies` af en uverificeret Tier 2-række
 * fra `species`-tabellen (`reviewed = false`). Ingen `season` — kun
 * Svampeatlas-hentet fænologi får lov at dæmpe efter kalendermåned.
 * `risk`/`warn` afledes af AI'ens egne `lookalikes`, samme felt Bestem
 * allerede viser i "Forvekslinger du skal udelukke".
 */
export function communitySpeciesFrom(row: {
  nameDa: string;
  nameLat: string;
  window: [number, number];
  rainMm: number;
  lookalikes: { name_da: string; name_lat: string; severity: string; how_to_tell: string }[];
}): CatalogSpecies {
  const deadly = row.lookalikes.filter((l) => l.severity === 'doedelig');
  const risk: Risk = deadly.length > 0 ? 'high' : row.lookalikes.length > 0 ? 'med' : 'low';

  const lookalikeLines = row.lookalikes
    .map((l) => `<b>${l.name_da}</b> (${l.severity === 'doedelig' ? 'dødelig' : l.severity}): ${l.how_to_tell}`)
    .join(' ');

  const warn =
    `<b>Uverificeret art — tilføjet fra en tidligere AI-bestemmelse, ikke tjekket mod Svampeatlas.</b> ` +
    (lookalikeLines || 'Ingen forvekslinger noteret ved den oprindelige bestemmelse — vær ekstra grundig selv.') +
    ' Dobbelttjek altid selv, uanset hvad der står her.';

  return {
    nameDa: row.nameDa, nameLat: row.nameLat, window: row.window, rainMm: row.rainMm,
    habitats: [], risk, warn, reviewed: false,
  };
}

/**
 * Systemsteder — Sjælland. `travelMin` er rejsetid fra basen.
 *
 * `id` er den samme UUID som rækken i `spots`-tabellen (source='system'),
 * sat med faste literaler i supabase/migrations/0004_seed_system_data.sql
 * — ikke gen_random_uuid() — netop så klient og database er enige om
 * identiteten. `finds.spot_id` er en fremmednøgle til denne tabel, så et
 * slug her ville brække enhver skrivning gennem Supabase-adapteren.
 *
 * `habitats` er ikke gættet — hvert steds trævalg og jordbund er slået op
 * hos Naturstyrelsen (driftsplaner/naturguider) eller anden navngiven kilde,
 * se docs/spots.md for citater og URL'er pr. sted. To tags ligner hinanden
 * men er bevidst forskellige: `mos` er mosdække i bunden af nål/blandskov
 * (det, kantareller og rørhatte vokser i), `mose` er en egentlig
 * vådbund/tørvemose et andet sted i skoven — samme ord ville skjule en
 * reel økologisk forskel. `kalkrig` er kun sat, hvor kilden eksplicit
 * nævner kalkholdig/kalkrig jord — ikke antaget ud fra Sjællands moræneler
 * generelt.
 */
export const SPOTS: Spot[] = [
  { id: 'a45aa224-112b-45be-b611-0b0f52409517', name: 'Gribskov', region: 'Nordsjælland', lat: 55.978, lon: 12.294, travelMin: 55, habitats: ['bøg', 'gran', 'mos', 'gammelskov', 'mose', 'sandet'] },
  { id: '9149060e-a086-44fe-b829-4ab6e353ae1f', name: 'Tisvilde Hegn', region: 'Nordkysten', lat: 56.048, lon: 12.092, travelMin: 65, habitats: ['fyr', 'mos', 'klit', 'sur', 'sandet'] },
  { id: 'b7c327c5-c0a1-4c96-8164-3bd97988ae4c', name: 'Rude Skov', region: 'Holte', lat: 55.833, lon: 12.443, travelMin: 30, habitats: ['bøg', 'eg', 'birk', 'løv'] },
  { id: '9b049416-0b36-4622-b087-5a65db7e80d0', name: 'Dyrehaven', region: 'Klampenborg', lat: 55.792, lon: 12.573, travelMin: 20, habitats: ['eg', 'bøg', 'græs', 'gammelskov'] },
  { id: 'fc66ca9d-3142-4934-9044-9e4cf09e8880', name: 'Vestskoven', region: 'Albertslund', lat: 55.684, lon: 12.341, travelMin: 25, habitats: ['eg', 'bøg', 'gran', 'løv', 'kalkrig', 'lysning'] },
  { id: '4ba0bee5-69f1-4b01-a810-590e1840e5f7', name: 'Hareskoven', region: 'Værløse', lat: 55.767, lon: 12.383, travelMin: 25, habitats: ['bøg', 'eg', 'gran', 'mose', 'lysning'] },
  { id: '6c6fb8d0-4f0b-4dc3-9cad-4c0c1daf6888', name: 'Jægersborg Hegn', region: 'Skodsborg', lat: 55.812, lon: 12.552, travelMin: 24, habitats: ['bøg', 'eg', 'ask', 'birk', 'dødttræ'] },
  { id: '4c3004fd-fe58-424c-883d-3f5412ec53ec', name: 'Store Dyrehave', region: 'Hillerød', lat: 55.912, lon: 12.318, travelMin: 48, habitats: ['bøg', 'eg', 'ask', 'el', 'birk', 'gran', 'sandet'] },
  { id: 'c74f6597-fc37-47da-82ea-ff3928160be0', name: 'Tokkekøb Hegn', region: 'Allerød', lat: 55.887, lon: 12.394, travelMin: 42, habitats: ['gran', 'bøg', 'sur', 'mose'] },
  { id: 'bad68cfd-a072-408e-bb9d-ab786e8bddff', name: 'Boserup Skov', region: 'Roskilde', lat: 55.652, lon: 12.024, travelMin: 45, habitats: ['bøg', 'eg', 'ask', 'kalkrig', 'mose'] },
  { id: 'f845750f-57c3-423d-be44-34aa8dfe45f6', name: 'Teglstrup Hegn', region: 'Helsingør', lat: 56.028, lon: 12.560, travelMin: 50, habitats: ['bøg', 'ask', 'el', 'eg', 'sandet', 'mose'] },
  { id: '6e2694f0-1bcf-4906-a750-79169dc3aafe', name: 'Gurre Vang', region: 'Helsingør', lat: 56.000, lon: 12.533, travelMin: 50, habitats: ['bøg', 'eg', 'gran', 'birk', 'el', 'mose'] },
  { id: 'd6c9d6ff-0632-4e80-b242-5c40aa157761', name: 'Bidstrup Skovene', region: 'Hvalsø', lat: 55.601, lon: 11.852, travelMin: 50, habitats: ['bøg', 'gran', 'løv', 'kalkrig', 'mose', 'lysning'] },
  { id: '5802859a-0eb8-4d4f-8391-bee51d3de7ce', name: 'Sorø Sønderskov', region: 'Sorø', lat: 55.411, lon: 11.554, travelMin: 60, habitats: ['bøg', 'eg', 'ask', 'el', 'mose'] },
  { id: 'a8153129-ee04-48e3-b4d0-4713fe07013f', name: 'Faksinge Skov', region: 'Præstø', lat: 55.132, lon: 12.030, travelMin: 70, habitats: ['bøg', 'eg', 'ask', 'mose'] },
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
    window: [5, 9], rainMm: 14, habitats: ['bøg', 'mos', 'løv', 'sur', 'fyr', 'sandet', 'birk'],
    warn: 'Forveksles med falsk kantarel og olivenbrun kantarelrørhat. Tjek de nedløbende <b>ribber</b> — ikke ægte lameller — og den svage abrikoslugt.',
    // Svampeatlas: "(maj-) juni-oktober (-december)"
    season: { core: [6, 7, 8, 9, 10], extended: [5, 6, 7, 8, 9, 10, 11, 12], sourceUrl: 'https://svampe.databasen.org/taxon/11317' },
  },
  {
    nameDa: 'Spiselig rørhat (Karl Johan)', nameLat: 'Boletus edulis', risk: 'low',
    window: [6, 11], rainMm: 18, habitats: ['gran', 'bøg', 'mos', 'gammelskov', 'sur'],
    warn: 'Forveksles med galderørhat, som er ubrugelig af bitterhed. Rør-laget er hvidt til gulgrønt hos Karl Johan, lyserødt hos galderørhatten.',
    // Svampeatlas: "(juni-) juli-oktober (november)"
    season: { core: [7, 8, 9, 10], extended: [6, 7, 8, 9, 10, 11], sourceUrl: 'https://svampe.databasen.org/taxon/11069' },
  },
  {
    nameDa: 'Tragtkantarel', nameLat: 'Craterellus tubaeformis', risk: 'low',
    window: [7, 13], rainMm: 16, habitats: ['gran', 'mos', 'sur', 'fyr', 'bøg'],
    warn: 'Få farlige forvekslinger, men vokser tit i tætte tæpper — tag kun en del af bestanden, så mycelium og fællesskab har noget til næste år.',
    // Svampeatlas: "kan komme frem fra midt på sommeren i våde år, men den
    // topper typisk sent på sæsonen og helt ind i vinteren"
    season: { core: [9, 10, 11, 12], extended: [7, 8, 9, 10, 11, 12], sourceUrl: 'https://svampe.databasen.org/taxon/12753' },
  },
  {
    nameDa: 'Almindelig champignon', nameLat: 'Agaricus campestris', risk: 'high',
    window: [4, 8], rainMm: 12, habitats: ['græs', 'lysning', 'ungskov'],
    warn: '<b>Højeste agtpågivenhed.</b> Unge champignon-lignende svampe forveksles med <b>grøn fluesvamp</b> og <b>snehvid fluesvamp</b> — begge dødeligt giftige. Grav altid hele stokbasen op: en <b>tydelig pose (volva)</b> ved foden betyder fluesvamp. Champignonens lameller bliver lyserøde og siden brune; fluesvampens forbliver hvide.',
    // Svampeatlas: "(maj-) juni-november (-december)"
    season: { core: [6, 7, 8, 9, 10, 11], extended: [5, 6, 7, 8, 9, 10, 11, 12], sourceUrl: 'https://svampe.databasen.org/taxon/10065' },
  },
  {
    nameDa: 'Stor parasolhat', nameLat: 'Macrolepiota procera', risk: 'med',
    window: [5, 10], rainMm: 14, habitats: ['lysning', 'græs', 'løv'],
    warn: 'Forveksles med kastanieparasolhat (giftig), der er markant mindre og rødmer ved snit. Den ægte har <b>slangebroget stok</b> og en dobbelt ring, der kan skydes op og ned.',
    // Svampeatlas: "(juni-) juli-oktober (-november)" — arten hedder officielt
    // "Stor kæmpeparasolhat" på atlasset; "stor parasolhat" er den listede
    // synonym fra "De danske svampenavne" (Petersen & Vesterholt).
    season: { core: [7, 8, 9, 10], extended: [6, 7, 8, 9, 10, 11], sourceUrl: 'https://svampe.databasen.org/taxon/16660' },
  },
  {
    nameDa: 'Østershat', nameLat: 'Pleurotus ostreatus', risk: 'low',
    window: [3, 9], rainMm: 10, habitats: ['dødttræ', 'bøg', 'løv'],
    warn: 'Vokser på dødt løvtræ, typisk bøg. Kommer først for alvor efter <b>frost</b> — vejrvinduet her er et andet end for skovbundens arter.',
    // Svampeatlas: "især oktober-marts" — eneste efterår/vinter-art i
    // kataloget; wrapper årsskiftet, derfor listet som månedstal, ikke et
    // fra-til-interval.
    season: { core: [10, 11, 12, 1, 2, 3], extended: [10, 11, 12, 1, 2, 3], sourceUrl: 'https://svampe.databasen.org/taxon/18870' },
  },
  {
    // Atlasset kalder arten "Spiselig skørhat" (officielt navn efter "De
    // danske svampenavne"), ikke "Rødmende skørhat" — rettet til at matche
    // den anerkendte danske betegnelse for Russula vesca.
    nameDa: 'Spiselig skørhat', nameLat: 'Russula vesca', risk: 'med',
    window: [5, 10], rainMm: 15, habitats: ['bøg', 'eg', 'løv'],
    warn: 'Skørhatte kræver smagsprøve-teknik: en lille bid på tungespidsen, spyttes ud. Bittert eller skarpt = lad den stå.',
    // Svampeatlas: "juni-oktober med en toppende forekomst om sommeren"
    season: { core: [6, 7, 8], extended: [6, 7, 8, 9, 10], sourceUrl: 'https://svampe.databasen.org/taxon/20093' },
  },
];

/**
 * Voksested og jordtype — to adskilte valg i log- og bestem-formularerne.
 *
 * Voksested er biomet/træet, svampen stod under eller i — det, man kan se
 * med det samme. Jordtype er selve jordbunden — det, man sjældnere kender
 * uden at grave, deraf "Ved ikke" som en reel mulighed, ikke en udvej.
 * Begge lister er fritekst valgt af brugeren ved log/bestem, adskilt fra
 * (men ordforrådsmæssigt i familie med) de interne `habitats`-tags på
 * `Spot`/`CatalogSpecies`, som rangeringen bruger — se docs/spots.md.
 */
export const HABITATS: string[] = [
  'Bøgeskov',
  'Granskov / nåleskov',
  'Egeskov',
  'Fyrreskov / klitplantage',
  'Blandet løvskov',
  'Elle- eller askesump',
  'Skovbryn / lysning',
  'På dødt træ / stub',
  'Græsplæne / eng',
];

export const SOIL_TYPES: string[] = [
  'Muldbund (næringsrig)',
  'Morbund (sur, næringsfattig)',
  'Kalkrig moræneler',
  'Sandet, næringsfattig',
  'Mose / vådbund (tørv)',
  'Ved ikke',
];

/**
 * Første tag i `spot.habitats`, der har en kendt oversættelse — arrayet er
 * skrevet med det mest fremtrædende tag først (jf. docs/spots.md' kilder),
 * så "første match" er reelt "mest fremtrædende match", ikke en vilkårlig
 * en. Kun en foreslået startværdi: brugeren kan altid rette den i formularen.
 */
const VOKSESTED_FRA_TAG: Record<string, string> = {
  klit: 'Fyrreskov / klitplantage',
  fyr: 'Fyrreskov / klitplantage',
  el: 'Elle- eller askesump',
  ask: 'Elle- eller askesump',
  gran: 'Granskov / nåleskov',
  eg: 'Egeskov',
  bøg: 'Bøgeskov',
  løv: 'Blandet løvskov',
  lysning: 'Skovbryn / lysning',
  dødttræ: 'På dødt træ / stub',
  græs: 'Græsplæne / eng',
};

const JORDTYPE_FRA_TAG: Record<string, string> = {
  kalkrig: 'Kalkrig moræneler',
  sandet: 'Sandet, næringsfattig',
  mose: 'Mose / vådbund (tørv)',
  sur: 'Morbund (sur, næringsfattig)',
};

/**
 * Foreslår et Voksested ud fra det aktive steds kendte trævalg. Rammer intet
 * tag (fx en Tier 2-art uden stedsdata, eller et brugeroprettet sted), falder
 * tilbage til den første mulighed — samme startpunkt som før denne funktion.
 */
export function suggestHabitat(spot: Pick<Spot, 'habitats'> | undefined): string {
  const hit = spot?.habitats.find((h) => h in VOKSESTED_FRA_TAG);
  return (hit && VOKSESTED_FRA_TAG[hit]) || HABITATS[0];
}

/**
 * Foreslår en Jordtype ud fra det aktive steds kendte jordbund. Ingen af de
 * specifikke jordtags (kalkrig/sandet/mose/sur) betyder ikke "ukendt" her —
 * det betyder oftest almindelig sjællandsk moræneler, altså muldbund, jf.
 * docs/spots.md' indledende note om Sjællands jordbund generelt.
 */
export function suggestSoil(spot: Pick<Spot, 'habitats'> | undefined): string {
  const hit = spot?.habitats.find((h) => h in JORDTYPE_FRA_TAG);
  return (hit && JORDTYPE_FRA_TAG[hit]) || SOIL_TYPES[0];
}

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
