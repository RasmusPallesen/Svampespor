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

## Det væsentlige fund — og hvordan det er rettet

`src/lib/weather/model.ts`s `scoreFor` kendte oprindeligt kun **dage efter en
regnhændelse** (`window: [lo, hi]`) — ikke hvilken måned det er. Et solidt regnskyl
6 dage før i dag i januar gav kantarel præcis samme indeks, som hvis det samme skyl
var faldet i august, selvom kantarel reelt stort set ikke bryder frem om vinteren.

**Østershat** gjorde forskellen tydeligst konkret: den eneste art i kataloget hvor
kernesæsonen ligger uden for alle de andres — oktober til marts, altså efterår/vinter
i stedet for sensommer/efterår. Forvekslingsteksten nævnte det allerede ("Kommer
først for alvor efter frost"), men modellen håndhævede det ikke.

Dette er nu rettet: `seasonFactor` i `model.ts` ganger den samlede sum med en
kalenderdæmpning (0,15-1) afledt af artens `season` — se `docs/model.md` for
formlen. Verificeret med rigtige vejrdata i den kørende app (31. august 2026):
Østershat scorer 17 (dæmpet, uden for sæson), Kantarel 51 (i sæson) på samme sted,
samme dag. Uden dæmpningen ville Østershats rå score have ligget omkring 60+.

Arter uden `season` (fx ad hoc-konstruerede testarter) dæmpes slet ikke —
`seasonFactor` falder tilbage til 1, bevidst bagudkompatibelt.
