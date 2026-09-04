# Stedkalender — jordbund og skovtype pr. sted

De oprindelige ti systemsteder havde kun løse trætags (`bøg`, `gran`, `mos` …)
uden jordbund — et sted på ren sand og et sted på kalkrig moræneler blev
behandlet ens af rangeringens `habitatFactor`, selvom de reelt tiltrækker
forskellige arter. Hvert sted herunder er slået op enkeltvis, ikke gættet —
enten hos Naturstyrelsen (driftsplaner og naturguider på naturstyrelsen.dk)
eller anden navngiven kilde. Dette er kildedata for `habitats`-feltet på
hver `Spot` i `src/data/catalog.ts` og `spots`-tabellen (migration `0008`).

## Tag-ordforråd

| Tag | Betyder |
|---|---|
| `bøg`, `eg`, `ask`, `el`, `birk`, `gran`, `fyr` | Dominerende træart |
| `løv` | Blandet løvskov uden én dominerende art |
| `mos` | Mosdækket skovbund (typisk under nål/blandskov) |
| `mose` | Egentlig vådbund/tørvemose — **ikke** det samme som `mos` |
| `sur` | Sur bund (morbund, syrefattig) |
| `kalkrig` | Kalkholdig/næringsrig jord — kun sat hvor kilden siger det eksplicit |
| `sandet` | Sandet/næringsfattig jord (smeltevandssand eller klit) |
| `klit`, `gammelskov`, `ungskov`, `lysning`, `græs`, `dødttræ` | Skovtype/struktur |

`kalkrig` er bevidst ikke sat på alle sjællandske steder, selvom Sjællands
moræneler generelt er mere næringsrigt end Jyllands udvaskede smeltevands-
sand — kun hvor kilden konkret nævner kalkholdig/kalkrig jord for netop det
sted.

## Eksisterende steder — hvad der ændrede sig

| Sted | Ny jordbund/træ-info | Kilde |
|---|---|---|
| Gribskov | Nutrient-fattigt smeltevandsgrus i Gadevang-delen; flere navngivne moser (Hjortesølen, Hovmosen) | [Naturstyrelsen, driftsplan Nordsjælland](https://naturstyrelsen.dk/vildere-natur/planer-for-naturen/driftsplaner/nordsjaelland/omraadeplaner-i-nordsjaelland/gribskov) |
| Tisvilde Hegn | Uændret — kystnær klitplantage på sur, sandet jord | Eksisterende data, bekræftet af [Shroomi/Svampesjælland-beskrivelser af kantarel i sandflugtsplantager](https://www.svampesjaelland.dk/spisesvampenes-voksesteder/) |
| Rude Skov | Løvskov domineret af bøg, mindre eg, spredt birk — ikke gran | [Naturstyrelsen, Rude Skov faktaark](https://naturstyrelsen.dk/media/2fgje5hv/hst_rudeskov_faktaark.pdf) |
| Dyrehaven | Uændret — ældgamle enkeltstående ege på åben græsmoræne | [Naturstyrelsen, Jægersborg Dyrehave og Hegn](https://naturstyrelsen.dk/find-et-naturomraade/foldere/hovedstaden-og-nordsjaelland/jaegersborg-dyrehave-og-hegn) |
| Vestskoven | Kalkholdigt, meget lerholdigt (næringsrigt); eg og bøg størst andel, også gran | Albertslund Kommune / Danmarks Naturfredningsforening, [Naturen i Albertslund](https://albertslund.dn.dk/naturen-i-albertslund/naturomraader-i-albertslund/vestskoven/) |
| Hareskoven | Bøg dominerer med spredt eg, store granbevoksninger; tre navngivne moser (Skallemosen, Store Sejbæk Mose, Gedderygsmosen) | [Naturstyrelsen, Hareskovene](https://naturstyrelsen.dk/find-et-naturomraade/naturguider/hovedstaden-og-nordsjaelland/hareskovene/historie) |
| Jægersborg Hegn | Højskov af bøg, eg, ask og birk | [Naturstyrelsen, Jægersborg Dyrehave og Hegn](https://naturstyrelsen.dk/find-et-naturomraade/foldere/hovedstaden-og-nordsjaelland/jaegersborg-dyrehave-og-hegn) |
| Store Dyrehave | Meget varieret: bøg mest udbredt, men også eg, ask, ahorn, el, pil, birk, gran, lærk; moræneler og smeltevandsgrus | [Naturstyrelsen, Store Dyrehave](https://naturstyrelsen.dk/find-et-naturomraade/naturguider/hovedstaden-og-nordsjaelland/store-dyrehave/dyr-og-planter) |
| Tokkekøb Hegn | 631 ha med bakker, moser og søer; bøg mest udbredt, gran trives til høj alder | [Naturstyrelsen, Tokkekøb Hegn](https://naturstyrelsen.dk/media/jjfharv4/9_-tokkekoeb-hegn_web_100123.pdf) |
| Boserup Skov | Kalk- og næringsrig moræneler; bøg og eg, gammel askeskov med lønelementer i sydvest | [Naturstyrelsen, Boserup Skov faktaark](https://naturstyrelsen.dk/media/df4ktknp/msj_boserup_skov_faktaark.pdf) |

## Fem nye steder

Alle fem er statsskov (Naturstyrelsen), så plukning til eget forbrug er
lovligt efter naturbeskyttelseslovens §26 — samme retlige status som de
oprindelige ti. Bevidst ikke medtaget: private skove med usikker adgang
(fx Vallø, Gisselfeld) og fredede urskove hvor plukning er begrænset
(fx Suserup Skov). Møn er udeladt, selvom Klinteskovens kalkbund havde
været et oplagt eksempel — øen ligger uden for Sjælland selv.

| Sted | Egn | Jordbund/træer | Kilde |
|---|---|---|---|
| Teglstrup Hegn | Helsingør | Sandet/næringsfattigt smeltevandsgrus med moser mellem ryggene; bøg og elle-askeskov; 500-600 år gamle ege | [Naturstyrelsen, Teglstrup Hegn og Hellebæk Skov](https://naturstyrelsen.dk/find-et-naturomraade/naturguider/hovedstaden-og-nordsjaelland/teglstrup-hegn-og-hellebaek-skov) |
| Gurre Vang | Helsingør | Bøg og eg dominerer, rødgran/sitkagran/ædelgran, meget birk, el i sumpet bund ned mod søen | [Naturstyrelsen, Gurre Sø med Gurre Vang og Horserød Hegn](https://naturstyrelsen.dk/find-et-naturomraade/naturguider/hovedstaden-og-nordsjaelland/gurre-soe-med-gurre-vang-og-horseroed-hegn) |
| Bidstrup Skovene | Hvalsø/Lejre | Stærkt kuperet morænelandskab med kalkrige søer; blandet løv/nål; søer, moser, enge og græsning midt i skoven | [Naturstyrelsen, Bidstrup Skovene](https://naturstyrelsen.dk/find-et-naturomraade/naturguider/oevrige-sjaelland-og-sydhavsoeerne/bidstrup-skovene) |
| Sorø Sønderskov | Sorø | Bøg på muldbund, egeblandskov, el- og askeskov; kildevæld og bække fra morænehældning | Natura 2000-baggrundsmateriale, [Sorø Kommune / DN Sorø](https://soroe.dn.dk/departments-media/6417/fremtidensnatur_soroe.pdf) |
| Faksinge Skov | Præstø | Moræneler med mindre tørveparti mod Even Sø; bøg med stor indblanding af løn og ask (ask hårdt ramt af asketoptørre) | [udinaturen.dk, Faksinge Skov](https://udinaturen.dk/facilitet/rekreative-naturomr%C3%A5der/?id=9C0959AC-6D4A-42E2-9B35-DA533A7499D1) |

## Artshabitater — samme øvelse for de 7 kernearter

Tre arters `habitats` i `src/data/catalog.ts` blev udvidet med konkret
voksestedsinformation, ikke bare trænavne:

- **Kantarel**: tilføjet `fyr`, `sandet`, `birk` — Lokalafdelingen Sjælland
  beskriver kantarellen specifikt langs stier i sandflugtsplantager på sur,
  sandet skovbund, og en separat kilde nævner åbne skove med birk og eg.
- **Karl Johan** (*Boletus edulis*): tilføjet `sur` — gammel bøgeskov på
  sur bund er en dokumenteret voksested ved siden af de mere næringsrige.
- **Tragtkantarel**: tilføjet `bøg` — tæt ung bøgeplantage er nævnt
  eksplicit, ikke kun gammel granskov.

Kilde: [Lokalafdelingen Sjælland — Spisesvampenes voksesteder](https://www.svampesjaelland.dk/spisesvampenes-voksesteder/),
suppleret med Svampeatlas-observationer for de arter, hvor selve taxon-siden
ikke gengiver voksestedstekst til en simpel hentning (se `docs/species.md`
for hvorfor kun fænologi, ikke voksested, er hentet derfra).

De øvrige fire arter (champignon, stor parasolhat, østershat, spiselig
skørhat) er efterset mod samme kilder, men fik ingen ny, tilstrækkeligt
konkret oplysning til at tilføje endnu et tag — deres eksisterende
`habitats` står som de var.
