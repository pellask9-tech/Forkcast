-- Forkcast coaching: database setup for Supabase.
-- Paste this whole file into your Supabase project's SQL Editor and run it once.
-- It is safe to run again: everything is created only if missing, and policies are replaced.
--
-- Who can see what (enforced by row level security, not by the app):
--   * Anyone can read published coach profiles. Only the coach can edit their own.
--   * The "verified" badge can only be set by you, the app owner, in the Supabase dashboard.
--   * A member's shared progress (food totals, weight, body check results) is readable only by
--     the member and by a coach they have an ACTIVE coaching link with. Photos are never shared.
--   * Notes from a coach can only be sent to that coach's active clients.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'coach')),
  display_name text not null default '' check (char_length(display_name) <= 60),
  created_at timestamptz not null default now()
);

-- Create a profile row for every new sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'coach' then 'coach' else 'member' end,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- coach profiles
create table if not exists public.coach_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  headline text not null default '' check (char_length(headline) <= 120),
  bio text not null default '' check (char_length(bio) <= 2000),
  photo_url text check (photo_url is null or char_length(photo_url) <= 500),
  specialties text[] not null default '{}' check (cardinality(specialties) <= 12),
  years_experience int check (years_experience between 0 and 70),
  location text not null default '' check (char_length(location) <= 80),
  -- [{ "name": "NASM Certified Personal Trainer", "issuer": "NASM", "year": 2021 }]
  certifications jsonb not null default '[]' check (jsonb_typeof(certifications) = 'array' and jsonb_array_length(certifications) <= 20),
  -- [{ "title": "1st place, Men's Physique", "org": "PFBF Nationals", "year": 2023 }]
  awards jsonb not null default '[]' check (jsonb_typeof(awards) = 'array' and jsonb_array_length(awards) <= 20),
  accepting_clients boolean not null default true,
  published boolean not null default false,
  -- Set only by the app owner after checking the coach's credentials.
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists coach_profiles_touch on public.coach_profiles;
create trigger coach_profiles_touch before update on public.coach_profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- coaching links
create table if not exists public.coach_clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'declined', 'ended')),
  message text not null default '' check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coach_id <> client_id)
);
-- A member can have one coach (or one pending request) at a time.
create unique index if not exists coach_clients_one_open_per_client
  on public.coach_clients (client_id) where status in ('pending', 'active');
create index if not exists coach_clients_coach on public.coach_clients (coach_id, status);

-- Allowed status changes, and who may make them:
--   coach:  pending -> active | declined,  active -> ended
--   client: pending -> ended (cancel),     active -> ended
create or replace function public.check_coach_client_update() returns trigger
language plpgsql set search_path = '' as $$
declare me uuid := auth.uid();
begin
  -- No signed-in user means the SQL Editor or dashboard, i.e. you, the app owner.
  if me is null then return new; end if;
  if new.coach_id <> old.coach_id or new.client_id <> old.client_id or new.message <> old.message
     or new.created_at <> old.created_at then
    raise exception 'Only the status of a coaching link can change';
  end if;
  if new.status = old.status then return new; end if;
  if me = old.coach_id and (
       (old.status = 'pending' and new.status in ('active', 'declined')) or
       (old.status = 'active' and new.status = 'ended')) then
    null;
  elsif me = old.client_id and old.status in ('pending', 'active') and new.status = 'ended' then
    null;
  else
    raise exception 'That change is not allowed';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists coach_clients_update on public.coach_clients;
create trigger coach_clients_update before update on public.coach_clients
  for each row execute function public.check_coach_client_update();

-- ---------------------------------------------------------------- shared progress
create table if not exists public.client_snapshots (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 200000),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- coach notes
create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists coach_notes_client on public.coach_notes (client_id, created_at desc);

-- ---------------------------------------------------------------- helpers
-- Is the signed-in user the ACTIVE coach of this member?
create or replace function public.is_active_coach_of(member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_clients
    where coach_id = auth.uid() and client_id = member and status = 'active'
  );
$$;

-- Has this member sent the signed-in coach a request, now or before? (Lets coaches see who asked.)
create or replace function public.is_coach_link_of(member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.coach_clients where coach_id = auth.uid() and client_id = member);
$$;

-- ---------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.coach_clients enable row level security;
alter table public.client_snapshots enable row level security;
alter table public.coach_notes enable row level security;

-- profiles
drop policy if exists "profiles: read own or my clients" on public.profiles;
create policy "profiles: read own or my clients" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_coach_link_of(id));
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- coach_profiles
drop policy if exists "coach profiles: read published or own" on public.coach_profiles;
create policy "coach profiles: read published or own" on public.coach_profiles for select to anon, authenticated
  using (published or id = auth.uid());
drop policy if exists "coach profiles: coaches create their own" on public.coach_profiles;
create policy "coach profiles: coaches create their own" on public.coach_profiles for insert to authenticated
  with check (id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach'));
drop policy if exists "coach profiles: update own" on public.coach_profiles;
create policy "coach profiles: update own" on public.coach_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "coach profiles: delete own" on public.coach_profiles;
create policy "coach profiles: delete own" on public.coach_profiles for delete to authenticated
  using (id = auth.uid());

-- coach_clients
drop policy if exists "links: read mine" on public.coach_clients;
create policy "links: read mine" on public.coach_clients for select to authenticated
  using (client_id = auth.uid() or coach_id = auth.uid());
drop policy if exists "links: members request a coach" on public.coach_clients;
create policy "links: members request a coach" on public.coach_clients for insert to authenticated
  with check (
    client_id = auth.uid() and status = 'pending'
    and exists (select 1 from public.coach_profiles c where c.id = coach_id and c.published and c.accepting_clients)
  );
drop policy if exists "links: either side updates" on public.coach_clients;
create policy "links: either side updates" on public.coach_clients for update to authenticated
  using (client_id = auth.uid() or coach_id = auth.uid())
  with check (client_id = auth.uid() or coach_id = auth.uid());

-- client_snapshots
drop policy if exists "snapshots: member manages own" on public.client_snapshots;
create policy "snapshots: member manages own" on public.client_snapshots for all to authenticated
  using (client_id = auth.uid()) with check (client_id = auth.uid());
drop policy if exists "snapshots: active coach reads" on public.client_snapshots;
create policy "snapshots: active coach reads" on public.client_snapshots for select to authenticated
  using (public.is_active_coach_of(client_id));

-- coach_notes
drop policy if exists "notes: read mine" on public.coach_notes;
create policy "notes: read mine" on public.coach_notes for select to authenticated
  using (coach_id = auth.uid() or client_id = auth.uid());
drop policy if exists "notes: coach writes to active clients" on public.coach_notes;
create policy "notes: coach writes to active clients" on public.coach_notes for insert to authenticated
  with check (coach_id = auth.uid() and public.is_active_coach_of(client_id));
drop policy if exists "notes: coach deletes own" on public.coach_notes;
create policy "notes: coach deletes own" on public.coach_notes for delete to authenticated
  using (coach_id = auth.uid());

-- ---------------------------------------------------------------- table privileges
-- Policies decide which rows; these grants decide which columns. Notably, nobody using the app
-- can write coach_profiles.verified, or change a link's coach, client or message after sending.
revoke all on public.profiles, public.coach_profiles, public.coach_clients, public.client_snapshots, public.coach_notes from anon, authenticated;

grant select on public.coach_profiles to anon, authenticated;
grant insert (id, name, headline, bio, photo_url, specialties, years_experience, location, certifications, awards, accepting_clients, published)
  on public.coach_profiles to authenticated;
grant update (name, headline, bio, photo_url, specialties, years_experience, location, certifications, awards, accepting_clients, published)
  on public.coach_profiles to authenticated;
grant delete on public.coach_profiles to authenticated;

grant select on public.profiles to authenticated;
grant update (role, display_name) on public.profiles to authenticated;

grant select on public.coach_clients to authenticated;
grant insert (coach_id, client_id, message) on public.coach_clients to authenticated;
grant update (status) on public.coach_clients to authenticated;

grant select, insert, update, delete on public.client_snapshots to authenticated;

grant select, delete on public.coach_notes to authenticated;
grant insert (coach_id, client_id, body) on public.coach_notes to authenticated;

-- Functions in the public schema are callable over the API unless revoked. The access checks are
-- needed by the policies above (which run as the signed-in user); nothing else should call these directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_active_coach_of(uuid), public.is_coach_link_of(uuid) from public, anon;
grant execute on function public.is_active_coach_of(uuid), public.is_coach_link_of(uuid) to authenticated;

-- A coach who has clients can't switch back to member while links are open.
-- Their coach profile is unpublished when they do switch back.
create or replace function public.check_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'coach' and new.role <> 'coach' then
    if exists (select 1 from public.coach_clients where coach_id = old.id and status in ('pending', 'active')) then
      raise exception 'End your coaching links before switching back to a member account';
    end if;
    update public.coach_profiles set published = false where id = old.id;
  end if;
  return new;
end $$;
drop trigger if exists profiles_role on public.profiles;
create trigger profiles_role before update on public.profiles
  for each row execute function public.check_profile_role();
revoke execute on function public.check_profile_role() from public, anon, authenticated;

-- ---------------------------------------------------------------- coach photos
-- Public bucket for profile photos. Each coach can only write inside a folder named after their user id.
insert into storage.buckets (id, name, public) values ('coach-photos', 'coach-photos', true)
  on conflict (id) do nothing;

drop policy if exists "coach photos: coaches upload their own" on storage.objects;
create policy "coach photos: coaches upload their own" on storage.objects for insert to authenticated
  with check (bucket_id = 'coach-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "coach photos: coaches replace their own" on storage.objects;
create policy "coach photos: coaches replace their own" on storage.objects for update to authenticated
  using (bucket_id = 'coach-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "coach photos: coaches delete their own" on storage.objects;
create policy "coach photos: coaches delete their own" on storage.objects for delete to authenticated
  using (bucket_id = 'coach-photos' and (storage.foldername(name))[1] = auth.uid()::text);
