# Modellen

Hvorfor den ser sådan ud, og hvad der endnu ikke er verificeret.

## Modningsindeks

Frugtlegemer bryder frem et stykke tid efter en regnhændelse — ikke under den. Lagets
længde afhænger af art og temperatur. Modellen består af fem vægtede komponenter:

| Vægt | Komponent | Form |
|---|---|---|
| 42 | position i modningsvinduet | gaussisk om artens optimum |
| 24 | nedbør i hændelsen | mættende, mod artens `rainMm` |
| 15 | luftfugtighed, 3 døgn | lineær 62-90 % |
| 12 | temperatur, 5 døgn | gaussisk om 14 °C |
| 7 | jordfugt 0-7 cm | lineær 0,15-0,35 m³/m³ |

En **regnhændelse** er et døgn med mindst 5 mm (`RAIN_EVENT_MM`). Mængden opgøres over
hændelsesdøgnet plus de to følgende, så en byge fordelt over to dage tæller samlet.

### Modningsvinduer

| Art | Vindue (dage) | Nedbørsbehov |
|---|---|---|
| Kantarel | 5-9 | 14 mm |
| Spiselig rørhat | 6-11 | 18 mm |
| Tragtkantarel | 7-13 | 16 mm |
| Almindelig champignon | 4-8 | 12 mm |
| Stor parasolhat | 5-10 | 14 mm |
| Østershat | 3-9 | 10 mm |

**Disse tal er kvalificerede skøn, ikke empiri.** De er sat ud fra almindelig
feltviden og skal kalibreres mod Svampeatlas' danske fund koblet med historiske
vejrdata fra samme koordinat. Det er den vigtigste udestående opgave i projektet.

Østershat er et særtilfælde: den kommer i gang efter frost snarere end efter regn,
og modellen behandler den derfor forkert i sin nuværende form.

## Prognoseusikkerhed

En nedbørsprognose er rimelig to døgn frem og bliver hurtigt løs derefter. I stedet for
at dæmpe tallet, vises spændet.

Spændet fremkommer ved at køre modellen **to gange** med prognosens nedbør skaleret ned
og op — ikke ved at lægge tilfældig støj oveni. Det afspejler den faktiske fejlkilde.

| Lead | Tørt/vådt scenarie | Tillid | Mærkat |
|---|---|---|---|
| +1 | ×0,85 / ×1,15 | 1,00 | sikker |
| +2 | ×0,70 / ×1,32 | 0,97 | sikker |
| +3 | ×0,55 / ×1,52 | 0,92 | usikker |
| +4 | ×0,42 / ×1,78 | 0,85 | usikker |
| +5 | ×0,30 / ×2,05 | 0,76 | løs prognose |
| +6 | ×0,20 / ×2,30 | 0,68 | løs prognose |

En vigtig konsekvens: **er den drivende regn allerede faldet, er spændet næsten nul.**
Vinduet er så et observeret faktum, ikke et gæt. Et lille gulv — `(1−tillid) × mid × 0,6`
— dækker, at luftfugtighed og temperatur stadig er prognose.

Spændet er derfor ikke strengt voksende skridt for skridt: gulvet skalerer med selve
scoren, og scoren falder, efterhånden som vinduet lukker. Et lille fald mellem to
nabodage er korrekt opførsel.

**Bedste dag vælges på `mid × tillid`**, så et løst dag-6-tal ikke kan skubbe en solid
dag-2-anbefaling ned. Det er den detalje, der reelt påvirker, hvad appen anbefaler.

## Rangering af steder

    score = indeks × afstand × historik + nyhed − mætning

- **Afstand** regnes i rejsetid, ikke kilometer: `exp(−((t−15)/80)^1.35)`.
  De første 15 minutter er gratis. Aldrig klippet flad — en tur på halvanden time og en
  tur til Jylland skal ikke veje ens. *(Tidlig fejl: en hård bund ved 0,25 gjorde netop
  det, og forvred rangeringen nok til at vende resultater.)*
- **Historik** er din egen træfprocent på stedet for den art, der er i vindue nu.
  Loft på 1,55, så ét sted ikke dominerer for evigt.
- **Cold start**: uden historik afgør habitatmatch. En gammel granplantage rangerer højt
  for Karl Johan fra dag ét — sådan undgår appen at være tom den første uge.
- **Nyhed** (+6) forhindrer, at man kun besøger de samme tre skove for evigt.
- **Mætning** trækker op til 26 point, hvis du var der inden for otte dage. Var stedet
  tømt i mandags, er det ikke klar igen på fredag, uanset vejret.

## Endnu ikke bygget

- Kalibrering af vinduer mod Svampeatlas
- Artspecifik temperaturrespons (nu bruges 14 °C til alle)
- Frost som trigger for vinterarter
- Jordtype og eksponering — nordvendte skråninger holder på fugten længere
- Mikroklima: modellen ser en 2 km celle, ikke en skrænt
