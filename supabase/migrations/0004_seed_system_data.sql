-- Systemsteder og arter — databasens udgave af src/data/catalog.ts.
--
-- UUID'erne er faste literaler (genereret én gang, ikke gen_random_uuid()),
-- så migrationen er reproducerbar på tværs af miljøer, og klientens katalog
-- kan hardcode de samme id'er som fremmednøgle i `finds.spot_id`.
--
-- `species.lookalikes` efterlades bevidst tom (default '[]'::jsonb) —
-- strukturerede forvekslinger med korrekte latinske navne kræver
-- ekspertgennemgang (se docs/roadmap.md, "kalibrering mod Svampeatlas"),
-- og skal ikke gættes i en seed-migration for en app med sikkerhedskrav.

insert into spots (id, name, region, geom, source, habitats) values
  ('a45aa224-112b-45be-b611-0b0f52409517', 'Gribskov',        'Nordsjælland', ST_SetSRID(ST_MakePoint(12.294, 55.978), 4326)::geography, 'system', array['bøg','gran','mos','gammelskov']),
  ('9149060e-a086-44fe-b829-4ab6e353ae1f', 'Tisvilde Hegn',   'Nordkysten',   ST_SetSRID(ST_MakePoint(12.092, 56.048), 4326)::geography, 'system', array['fyr','mos','klit','sur']),
  ('b7c327c5-c0a1-4c96-8164-3bd97988ae4c', 'Rude Skov',       'Holte',        ST_SetSRID(ST_MakePoint(12.443, 55.833), 4326)::geography, 'system', array['bøg','gran','løv']),
  ('9b049416-0b36-4622-b087-5a65db7e80d0', 'Dyrehaven',       'Klampenborg',  ST_SetSRID(ST_MakePoint(12.573, 55.792), 4326)::geography, 'system', array['eg','bøg','græs','gammelskov']),
  ('fc66ca9d-3142-4934-9044-9e4cf09e8880', 'Vestskoven',      'Albertslund',  ST_SetSRID(ST_MakePoint(12.341, 55.684), 4326)::geography, 'system', array['løv','ungskov','lysning']),
  ('4ba0bee5-69f1-4b01-a810-590e1840e5f7', 'Hareskoven',      'Værløse',      ST_SetSRID(ST_MakePoint(12.383, 55.767), 4326)::geography, 'system', array['bøg','gran','løv']),
  ('6c6fb8d0-4f0b-4dc3-9cad-4c0c1daf6888', 'Jægersborg Hegn', 'Skodsborg',    ST_SetSRID(ST_MakePoint(12.552, 55.812), 4326)::geography, 'system', array['bøg','eg','dødttræ']),
  ('4c3004fd-fe58-424c-883d-3f5412ec53ec', 'Store Dyrehave',  'Hillerød',     ST_SetSRID(ST_MakePoint(12.318, 55.912), 4326)::geography, 'system', array['bøg','gran','mos']),
  ('c74f6597-fc37-47da-82ea-ff3928160be0', 'Tokkekøb Hegn',   'Allerød',      ST_SetSRID(ST_MakePoint(12.394, 55.887), 4326)::geography, 'system', array['gran','bøg','sur']),
  ('bad68cfd-a072-408e-bb9d-ab786e8bddff', 'Boserup Skov',    'Roskilde',     ST_SetSRID(ST_MakePoint(12.024, 55.652), 4326)::geography, 'system', array['bøg','løv','lysning']);

insert into species (id, name_da, name_lat, window_lo, window_hi, rain_mm, habitats) values
  ('3324410e-3dbf-4ff2-9d7b-611b97003278', 'Kantarel',                            'Cantharellus cibarius',     5, 9,  14, array['bøg','mos','løv','sur']),
  ('216b7c23-c030-4c19-9918-0a0257d026d5', 'Spiselig rørhat (Karl Johan)',        'Boletus edulis',            6, 11, 18, array['gran','bøg','mos','gammelskov']),
  ('84dcc8b4-3e4c-4779-ad7c-d983ce846754', 'Tragtkantarel',                       'Craterellus tubaeformis',   7, 13, 16, array['gran','mos','sur','fyr']),
  ('53f59636-52cc-4206-b2d6-52eb8b57f676', 'Almindelig champignon',               'Agaricus campestris',       4, 8,  12, array['græs','lysning','ungskov']),
  ('33f9505b-5010-40c0-94bc-1db44ba9cff8', 'Stor parasolhat',                     'Macrolepiota procera',      5, 10, 14, array['lysning','græs','løv']),
  ('75d07db6-aa8a-4eee-9f33-6522b20bd26a', 'Østershat',                           'Pleurotus ostreatus',       3, 9,  10, array['dødttræ','bøg','løv']),
  ('b0c5484f-994d-4122-b5e5-4e7032ece313', 'Rødmende skørhat',                    'Russula vesca',             5, 10, 15, array['bøg','eg','løv']);
