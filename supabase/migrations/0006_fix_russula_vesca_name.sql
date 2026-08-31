-- Retter Russula vescas danske navn til den officielle betegnelse.
--
-- Danmarks Svampeatlas (https://svampe.databasen.org/taxon/20093) og "De
-- danske svampenavne" (Petersen & Vesterholt) navngiver arten "Spiselig
-- skørhat" — ikke "Rødmende skørhat", som stod i 0004_seed_system_data.sql.
-- Klientens katalog (src/data/catalog.ts) er rettet tilsvarende.

update species
set name_da = 'Spiselig skørhat'
where name_lat = 'Russula vesca';
