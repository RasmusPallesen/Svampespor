-- Jordbund/skovtype pr. sted, og fem nye velkendte sjællandske svampesteder.
--
-- De oprindelige ti steders `habitats` beskrev kun trætype og et par løse
-- fællesskabstræk (mos, sur, lysning …) — ikke jordbunden, de faktisk står
-- på. Hvert sted herunder er slået op enkeltvis hos Naturstyrelsen (drifts-
-- planer/naturguider) eller anden navngiven kilde, ikke gættet — se
-- docs/spots.md for citater og URL'er.
--
-- To tags kan forveksles, men er bevidst forskellige: `mos` er mosdækket
-- skovbund under nål/blandskov (det, kantareller og rørhatte vokser i),
-- `mose` er en egentlig vådbund/tørvemose et andet sted i skoven. `kalkrig`
-- er kun sat, hvor kilden eksplicit nævner kalkholdig jord — ikke antaget
-- ud fra Sjællands moræneler generelt.

comment on column spots.habitats is
  'bøg,eg,ask,el,birk,gran,fyr,løv — træer. mos (skovbund), mose (vådbund/tørv), sur, kalkrig, sandet — jordbund. klit, gammelskov, ungskov, lysning, græs, dødttræ — skovtype/struktur. Se docs/spots.md.';

update spots set habitats = array['bøg','gran','mos','gammelskov','mose','sandet'] where name = 'Gribskov';
update spots set habitats = array['fyr','mos','klit','sur','sandet'] where name = 'Tisvilde Hegn';
update spots set habitats = array['bøg','eg','birk','løv'] where name = 'Rude Skov';
update spots set habitats = array['eg','bøg','gran','løv','kalkrig','lysning'] where name = 'Vestskoven';
update spots set habitats = array['bøg','eg','gran','mose','lysning'] where name = 'Hareskoven';
update spots set habitats = array['bøg','eg','ask','birk','dødttræ'] where name = 'Jægersborg Hegn';
update spots set habitats = array['bøg','eg','ask','el','birk','gran','sandet'] where name = 'Store Dyrehave';
update spots set habitats = array['gran','bøg','sur','mose'] where name = 'Tokkekøb Hegn';
update spots set habitats = array['bøg','eg','ask','kalkrig','mose'] where name = 'Boserup Skov';
-- Dyrehaven (Klampenborg) er allerede korrekt — gamle enkeltstående ege på
-- åben græsmoræne — og rørt ikke.

insert into spots (id, name, region, geom, source, habitats) values
  ('f845750f-57c3-423d-be44-34aa8dfe45f6', 'Teglstrup Hegn',   'Helsingør', ST_SetSRID(ST_MakePoint(12.560, 56.028), 4326)::geography, 'system', array['bøg','ask','el','eg','sandet','mose']),
  ('6e2694f0-1bcf-4906-a750-79169dc3aafe', 'Gurre Vang',       'Helsingør', ST_SetSRID(ST_MakePoint(12.533, 56.000), 4326)::geography, 'system', array['bøg','eg','gran','birk','el','mose']),
  ('d6c9d6ff-0632-4e80-b242-5c40aa157761', 'Bidstrup Skovene', 'Hvalsø',    ST_SetSRID(ST_MakePoint(11.852, 55.601), 4326)::geography, 'system', array['bøg','gran','løv','kalkrig','mose','lysning']),
  ('5802859a-0eb8-4d4f-8391-bee51d3de7ce', 'Sorø Sønderskov',  'Sorø',      ST_SetSRID(ST_MakePoint(11.554, 55.411), 4326)::geography, 'system', array['bøg','eg','ask','el','mose']),
  ('a8153129-ee04-48e3-b4d0-4713fe07013f', 'Faksinge Skov',    'Præstø',    ST_SetSRID(ST_MakePoint(12.030, 55.132), 4326)::geography, 'system', array['bøg','eg','ask','mose']);

-- Artshabitater opdateret med voksestedsdetaljer fra Lokalafdelingen
-- Sjælland (svampesjaelland.dk/spisesvampenes-voksesteder) og Svampeatlas-
-- observationer for Russula vesca — se docs/species.md.
update species set habitats = array['bøg','mos','løv','sur','fyr','sandet','birk'] where name_da = 'Kantarel';
update species set habitats = array['gran','bøg','mos','gammelskov','sur'] where name_lat = 'Boletus edulis';
update species set habitats = array['gran','mos','sur','fyr','bøg'] where name_da = 'Tragtkantarel';
