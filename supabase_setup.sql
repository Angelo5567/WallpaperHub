-- WallpaperHub: configurazione pubblica senza login.
-- ATTENZIONE: i dati cloud e i file caricati saranno accessibili a chiunque.

create table if not exists public.wallpaperhub_public_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.wallpaperhub_public_state enable row level security;
grant select, insert, update, delete on public.wallpaperhub_public_state to anon, authenticated;

drop policy if exists "WallpaperHub public access" on public.wallpaperhub_public_state;
create policy "WallpaperHub public access"
on public.wallpaperhub_public_state
for all
to anon, authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('wallpaper-uploads', 'wallpaper-uploads', true)
on conflict (id) do update set public = true;

drop policy if exists "WallpaperHub public uploads" on storage.objects;
create policy "WallpaperHub public uploads"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'wallpaper-uploads');

drop policy if exists "WallpaperHub public reads" on storage.objects;
create policy "WallpaperHub public reads"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'wallpaper-uploads');

drop policy if exists "WallpaperHub public updates" on storage.objects;
create policy "WallpaperHub public updates"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'wallpaper-uploads')
with check (bucket_id = 'wallpaper-uploads');

drop policy if exists "WallpaperHub public deletes" on storage.objects;
create policy "WallpaperHub public deletes"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'wallpaper-uploads');
