-- Tier 2: fællesskabsarter, opdaget gennem Bestem.
--
-- species-tabellen har hidtil kun holdt de 7 hånd-verificerede kernearter
-- fra src/data/catalog.ts. Denne migration lader Bestem selv udvide den:
-- enhver art, Claude identificerer, og som ikke allerede er en kerneart,
-- kan skrives her med sit eget forslag til modningsvindue og forvekslinger
-- — markeret tydeligt som uverificeret, aldrig blandet sammen med de
-- Svampeatlas-verificerede kernearter.
--
-- Sikkerhedsreglerne (CLAUDE.md regel 1-2) svækkes ikke af dette: de håndhæves
-- af ID_PROMPT i Edge Function'en bestem, på hvert eneste kald, uanset om
-- arten er kendt i forvejen eller ej.

create type species_source as enum ('system', 'ai', 'community');

alter table species
  add column source species_source not null default 'ai',
  add column reviewed boolean not null default false;

-- De 7 allerede seedede kernearter er hånd-verificerede mod Svampeatlas
-- (se docs/species.md) — marker dem som sådan.
update species set source = 'system', reviewed = true;

-- Kun indsættelse fra klienten, aldrig opdatering. En art rettes eller
-- forfremmes til kerneart administrativt (samme proces som de 7 originale
-- fik), ikke ved at en tilfældig efterfølgende bruger overskriver den.
-- source tvinges til 'ai', så en klient ikke kan udgive sig for at indsætte
-- en 'system'-art.
create policy species_insert_ai on species for insert
  with check (auth.uid() is not null and source = 'ai');
