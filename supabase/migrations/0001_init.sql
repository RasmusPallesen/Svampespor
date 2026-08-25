-- Svampespor — grundskema
--
-- Privatlivsprincip: præcise fundkoordinater forlader aldrig brugerens rækker.
-- Fællesskabslaget læser udelukkende sløret geometri (~2 km). Se RLS nederst.

create extension if not exists postgis;

-- ------------------------------------------------------------------
-- Steder
-- ------------------------------------------------------------------

create type spot_source as enum ('system', 'user', 'community');

create table spots (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  region      text,
  geom        geography(Point, 4326) not null,
  source      spot_source not null default 'system',
  -- 'bøg','gran','eg','mos','sur','lysning','dødttræ','græs','klit','gammelskov'
  habitats    text[] not null default '{}',
  owner_id    uuid references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint user_spot_has_owner check (source <> 'user' or owner_id is not null)
);
create index spots_geom_idx on spots using gist (geom);
create index spots_owner_idx on spots (owner_id) where owner_id is not null;

create type spot_relation as enum ('pinned', 'followed', 'hidden');

create table user_spots (
  user_id     uuid not null references auth.users(id) on delete cascade,
  spot_id     uuid not null references spots(id) on delete cascade,
  relation    spot_relation not null default 'followed',
  sort_order  int not null default 0,
  -- rejsetid i minutter fra brugerens base; udregnes klientside, caches her
  travel_min  int,
  created_at  timestamptz not null default now(),
  primary key (user_id, spot_id)
);

-- Maks fem fastgjorte steder. Håndhæves i databasen, ikke kun i UI.
create or replace function enforce_pin_limit() returns trigger
language plpgsql as $$
begin
  if new.relation = 'pinned' and (
    select count(*) from user_spots
    where user_id = new.user_id and relation = 'pinned' and spot_id <> new.spot_id
  ) >= 5 then
    raise exception 'Maks fem fastgjorte steder';
  end if;
  return new;
end $$;

create trigger user_spots_pin_limit
  before insert or update on user_spots
  for each row execute function enforce_pin_limit();

-- ------------------------------------------------------------------
-- Arter
-- ------------------------------------------------------------------

create table species (
  id           uuid primary key default gen_random_uuid(),
  name_da      text not null unique,
  name_lat     text,
  -- [tidligst, senest] dage efter regnhændelse
  window_lo    int not null default 5,
  window_hi    int not null default 10,
  rain_mm      numeric(5,1) not null default 14,
  habitats     text[] not null default '{}',
  -- forvekslingsarter; severity: 'doedelig' | 'giftig' | 'uspiselig'
  lookalikes   jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  constraint window_ordered check (window_lo <= window_hi)
);

-- ------------------------------------------------------------------
-- Fund
-- ------------------------------------------------------------------

create type id_source as enum ('user', 'ai', 'community');

create table finds (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  spot_id       uuid references spots(id) on delete set null,
  species_id    uuid references species(id) on delete set null,
  species_text  text,                       -- fritekst før bestemmelse
  found_at      date not null,
  quantity      int,
  habitat       text,
  note          text,

  -- Præcis position. Vises kun for ejeren. Se RLS.
  geom          geography(Point, 4326),
  -- Sløret position (~2 km) — den eneste, fællesskabet ser.
  geom_blurred  geography(Point, 4326),

  id_source     id_source not null default 'user',
  id_confidence int check (id_confidence between 0 and 100),

  -- Vejrsnapshot på findetidspunktet. Det er dette, der gør datasættet
  -- værdifuldt over år: mønstre kan først læses, når vejret følger fundet.
  weather       jsonb,

  shared        boolean not null default false,
  created_at    timestamptz not null default now()
);
create index finds_user_idx on finds (user_id, found_at desc);
create index finds_shared_idx on finds (found_at desc) where shared;
create index finds_blurred_idx on finds using gist (geom_blurred) where shared;

-- Slør automatisk ved skrivning, så en klientfejl ikke kan lække en plet.
create or replace function blur_find_geom() returns trigger
language plpgsql as $$
declare
  angle double precision := random() * 2 * pi();
  dist  double precision := 1000 + random() * 1000;  -- 1-2 km forskydning
begin
  if new.geom is not null then
    new.geom_blurred := ST_Project(new.geom::geometry, dist, angle)::geography;
  end if;
  return new;
end $$;

create trigger finds_blur
  before insert or update of geom on finds
  for each row execute function blur_find_geom();

create table find_photos (
  id          uuid primary key default gen_random_uuid(),
  find_id     uuid not null references finds(id) on delete cascade,
  storage_path text not null,
  -- 'hat' | 'under' | 'stok'
  slot        text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Hemmelige nåle — krypteret klientside, serveren ser kun ciphertext
-- ------------------------------------------------------------------

create table secret_pins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  spot_id     uuid references spots(id) on delete set null,
  -- AES-GCM payload fra klienten. Serveren kan ikke læse position eller navn.
  ciphertext  text not null,
  iv          text not null,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Vejr — cachet pr. gittercelle, ikke pr. sted
-- ------------------------------------------------------------------

create table weather_cells (
  cell        text not null,          -- "55.980,12.294"
  date        date not null,
  precip_mm   numeric(6,2),
  tmax        numeric(4,1),
  tmin        numeric(4,1),
  rh          numeric(4,1),
  soil        numeric(5,3),
  is_forecast boolean not null default false,
  source      text not null default 'open-meteo',
  fetched_at  timestamptz not null default now(),
  primary key (cell, date, source)
);
create index weather_cells_date_idx on weather_cells (date desc);

-- ------------------------------------------------------------------
-- Fællesskab
-- ------------------------------------------------------------------

create table follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint no_self_follow check (follower_id <> followee_id)
);

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  -- {"instagram":"@…","facebook":"…","tiktok":"@…","snapchat":"…"}
  handles     jsonb not null default '{}'::jsonb,
  prefs       jsonb not null default
                '{"blur":true,"weather":true,"caption":true}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table spots        enable row level security;
alter table user_spots   enable row level security;
alter table finds        enable row level security;
alter table find_photos  enable row level security;
alter table secret_pins  enable row level security;
alter table follows      enable row level security;
alter table profiles     enable row level security;
alter table species      enable row level security;
alter table weather_cells enable row level security;

-- Steder: systemsteder er offentlige, egne steder er private
create policy spots_read on spots for select
  using (source <> 'user' or owner_id = auth.uid());
create policy spots_write on spots for insert
  with check (owner_id = auth.uid() and source = 'user');
create policy spots_update on spots for update
  using (owner_id = auth.uid());

create policy user_spots_own on user_spots for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fund: fuld adgang til egne. Delte fund er læsbare af alle —
-- men kun gennem view'et nedenfor, som ikke indeholder præcis geom.
create policy finds_own on finds for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy photos_own on find_photos for all
  using (exists (select 1 from finds f where f.id = find_id and f.user_id = auth.uid()))
  with check (exists (select 1 from finds f where f.id = find_id and f.user_id = auth.uid()));

create policy pins_own on secret_pins for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy follows_own on follows for all
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());

create policy profiles_read on profiles for select using (true);
create policy profiles_write on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

create policy species_read on species for select using (true);
create policy weather_read on weather_cells for select using (true);

-- Fællesskabsfeed. Bemærk: `geom` er ikke med i kolonnelisten, og kan
-- derfor ikke lækkes gennem dette view, uanset hvad klienten beder om.
create view community_finds
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
  p.handles
from finds f
join profiles p on p.id = f.user_id
where f.shared;
