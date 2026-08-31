# Artskalender — sæson pr. art

Kilde: [Danmarks Svampeatlas](https://svampe.databasen.org) (svampe.databasen.org),
Statens Naturhistoriske Museum / Københavns Universitet i samarbejde med Foreningen
til Svampekundskabens Fremme. Atlasset bygger på over 950.000 kvalitetstjekkede fund
indberettet af mere end 3.300 frivillige, og er den mest autoritative kilde til dansk
svampefænologi der findes offentligt.

Hver arts "Udbredelse og fænologi"-linje er citeret direkte fra dens taxon-side.
Formatet `(maj-) juni-oktober (-december)` er atlassets eget: parenteserne er
yderpunkter — sjældnere fund, men reelle — omkring en kernesæson uden parentes.

Dette er kildedata for `season`-feltet på hver art i `src/data/catalog.ts`.

| Art | Latin | Fænologi (Svampeatlas' egen formulering) | Kilde |
|---|---|---|---|
| Kantarel | *Cantharellus cibarius* | (maj-) juni-oktober (-december) | [taxon/11317](https://svampe.databasen.org/taxon/11317) |
| Spiselig rørhat (Karl Johan) | *Boletus edulis* | (juni-) juli-oktober (november) | [taxon/11069](https://svampe.databasen.org/taxon/11069) |
| Tragtkantarel | *Craterellus tubaeformis* | kan komme frem fra midt på sommeren i våde år, men topper typisk sent på sæsonen og helt ind i vinteren | [taxon/12753](https://svampe.databasen.org/taxon/12753) |
| Almindelig champignon (Mark-champignon) | *Agaricus campestris* | (maj-) juni-november (-december) | [taxon/10065](https://svampe.databasen.org/taxon/10065) |
| Stor parasolhat (Stor kæmpeparasolhat) | *Macrolepiota procera* | (juni-) juli-oktober (-november) | [taxon/16660](https://svampe.databasen.org/taxon/16660) |
| Østershat (Almindelig østershat) | *Pleurotus ostreatus* | især oktober-marts | [taxon/18870](https://svampe.databasen.org/taxon/18870) |
| Spiselig skørhat | *Russula vesca* | juni-oktober med en toppende forekomst om sommeren | [taxon/20093](https://svampe.databasen.org/taxon/20093) |

## Rettelser undervejs

- **Russula vesca** stod i kataloget som "Rødmende skørhat". Atlassets eget navn —
  og det officielle navn efter *De danske svampenavne* (Petersen & Vesterholt), som
  atlasset selv henviser til — er **Spiselig skørhat**. Rettet i
  `src/data/catalog.ts` og i `species`-tabellen (migration `0006`).
- "Stor parasolhat" er ikke en fejl — det er den listede synonym til "Stor
  kæmpeparasolhat" i samme navnereference. Beholdt som artsnavnet i appen, da det
  er kortere og allerede etableret i UI-tekster og forvekslingsteksten.

## Det væsentlige fund: modellen har ingen kalendersæson

`src/lib/weather/model.ts`s `scoreFor` kender kun **dage efter en regnhændelse**
(`window: [lo, hi]`) — ikke hvilken måned det er. Det betyder, at et solidt regnskyl
6 dage før i dag i januar i dag giver kantarel præcis samme indeks, som hvis det
samme skyl var faldet i august, selvom kantarel reelt stort set ikke bryder frem om
vinteren i Danmark.

To arter i kataloget gør forskellen konkret:

- **Østershat** er den eneste art, hvor kernesæsonen ligger uden for kantarels,
  tragtkantarels og de øvriges — oktober til marts, altså efterår/vinter i stedet
  for sensommer/efterår. Kataloguens egen forvekslingstekst nævner det allerede
  ("Kommer først for alvor efter frost"), men modellen håndhæver det ikke.
- **Tragtkantarel** har det bredeste vindue (7-13 dage efter regn) og topper sent —
  det er en tilnærmelse til efterårs-tendensen, men stadig ikke en kalenderspærre.

`season`-feltet på hver `CatalogSpecies` (nu tilføjet) gør dataene tilgængelige, men
er bevidst **ikke** koblet ind i `scoreFor` endnu — det er en reel modelændring,
ikke en datarettelse, og CLAUDE.md's konvention kræver at modelændringer ledsages af
en bevidst opdateret test. Et oplagt næste skridt: en sæsonfaktor der dæmper (ikke
nulstiller) indekset uden for `extended`, og næsten intet uden for `core` — samme
gaussiske stil som `windowScore` allerede bruger.
