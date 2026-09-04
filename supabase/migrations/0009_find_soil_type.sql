-- "Voksested" i log/bestem-formularerne er splittet i to fritekstfelter:
-- `habitat` er biomet/træet (bøgeskov, granskov …), `soil` er selve
-- jordbunden (muldbund, morbund, kalkrig, sandet, mose, eller "ved ikke").
-- Se src/data/catalog.ts (HABITATS/SOIL_TYPES) for de nøjagtige valg og
-- docs/spots.md for hvorfor jordtype er sit eget felt nu.

alter table finds add column soil text;

-- Fællesskabsfeedet skal kunne vise jordtype på lige fod med voksested,
-- selvom klienten endnu ikke konsumerer feltet fra viewet. `soil` er sat
-- sidst i kolonnelisten, ikke ved siden af `habitat` — CREATE OR REPLACE
-- VIEW tillader kun at tilføje kolonner til sidst, ikke at indsætte dem.
create or replace view community_finds
with (security_invoker = true) as
select
  f.id,
  f.found_at,
  f.species_id,
  f.species_text,
  f.habitat,
  f.geom_blurred,
  f.id_source,
  f.id_confidence,
  p.display_name,
  p.handles,
  f.soil
from finds f
join profiles p on p.id = f.user_id
where f.shared;
