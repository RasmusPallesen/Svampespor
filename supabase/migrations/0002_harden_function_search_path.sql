-- Advisor-fund efter 0001_init: enforce_pin_limit og blur_find_geom havde
-- mutable search_path, som i teorien lader en session omdirigere opslag
-- via session-lokal search_path (function_search_path_mutable).
--
-- BEMÆRK: denne første rettelse sætter search_path til '' (tomt), hvilket
-- er den anbefalede standardrettelse — men begge funktioner refererer
-- ubekvalificeret til objekter i public (user_spots-tabellen,
-- PostGIS' ST_Project), så den slår fejl ved næste kald. Rettet i
-- 0003_fix_search_path_regression.sql. Filen står som den blev anvendt,
-- så migrationshistorikken matcher det, der faktisk kørte.

alter function public.enforce_pin_limit() set search_path = '';
alter function public.blur_find_geom() set search_path = '';
