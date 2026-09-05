import { describe, expect, it } from 'vitest';

import { HABITATS, SOIL_TYPES, suggestHabitat, suggestSoil } from './catalog';

describe('suggestHabitat', () => {
  it('bruger det først-nævnte tag, der har en oversættelse', () => {
    // Vestskoven: eg først, matcher kildens "eg og bøg udgør den største andel"
    expect(suggestHabitat({ habitats: ['eg', 'bøg', 'gran', 'løv', 'kalkrig', 'lysning'] })).toBe('Egeskov');
  });

  it('springer tags uden oversættelse over (mos, gammelskov, sandet …)', () => {
    expect(suggestHabitat({ habitats: ['sandet', 'mos', 'fyr', 'klit'] })).toBe('Fyrreskov / klitplantage');
  });

  it('falder tilbage til første Voksested-mulighed uden kendte tags', () => {
    expect(suggestHabitat({ habitats: [] })).toBe(HABITATS[0]);
    expect(suggestHabitat(undefined)).toBe(HABITATS[0]);
  });
});

describe('suggestSoil', () => {
  it('finder et specifikt jordtag, selvom det ikke står først', () => {
    // Boserup Skov: bøg, eg, ask nævnt før kalkrig
    expect(suggestSoil({ habitats: ['bøg', 'eg', 'ask', 'kalkrig', 'mose'] })).toBe('Kalkrig moræneler');
  });

  it('falder tilbage til muldbund uden noget specifikt jordtag — Sjællands almindelige moræneler', () => {
    expect(suggestSoil({ habitats: ['bøg', 'eg', 'birk', 'løv'] })).toBe(SOIL_TYPES[0]);
    expect(suggestSoil(undefined)).toBe(SOIL_TYPES[0]);
  });
});
