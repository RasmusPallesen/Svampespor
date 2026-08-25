-- Retter 0002: search_path = '' brækkede begge funktioner, fordi de
-- refererer ubekvalificeret til objekter i public (user_spots-tabellen,
-- PostGIS' ST_Project). En fast, ikke-mutabel søgesti opfylder advisoren
-- uden at kræve fuld kvalificering af hver reference.
--
-- Verificeret efter anvendelse: indsættelse i finds udfylder geom_blurred
-- korrekt (1-2 km forskydning), og en 6. fastgjort relation afvises stadig.

alter function public.enforce_pin_limit() set search_path = 'public';
alter function public.blur_find_geom() set search_path = 'public';
