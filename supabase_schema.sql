-- ==============================================================================
-- LEIRAD TV - SUPABASE DATABASE SETUP SCRIPT
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Open your Supabase Project Dashboard (https://supabase.com/dashboard)
-- 2. In the left sidebar, click on "SQL Editor"
-- 3. Click "+ New query"
-- 4. Paste this entire script into the editor
-- 5. Click "Run" (or Ctrl + Enter)
-- 6. Done! All tables, security policies, the initial admin password,
--    and initial IPTV M3U playlist feeds will be created automatically.
-- ==============================================================================

-- 1. CREATE PLAYLISTS TABLE
create table if not exists public.iptv_playlists (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  url text not null,
  enabled boolean not null default true,
  content text,
  channel_count integer default 0,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. CREATE ADMIN SETTINGS TABLE
create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
alter table public.iptv_playlists enable row level security;
alter table public.admin_settings enable row level security;

-- Drop existing policies if re-running to avoid errors
drop policy if exists "Allow public read on iptv_playlists" on public.iptv_playlists;
drop policy if exists "Allow public insert on iptv_playlists" on public.iptv_playlists;
drop policy if exists "Allow public update on iptv_playlists" on public.iptv_playlists;
drop policy if exists "Allow public delete on iptv_playlists" on public.iptv_playlists;

drop policy if exists "Allow public read on admin_settings" on public.admin_settings;
drop policy if exists "Allow public insert on admin_settings" on public.admin_settings;
drop policy if exists "Allow public update on admin_settings" on public.admin_settings;

-- 4. CREATE POLICIES (Allow web app to perform CRUD operations)
create policy "Allow public read on iptv_playlists"
  on public.iptv_playlists for select
  using (true);

create policy "Allow public insert on iptv_playlists"
  on public.iptv_playlists for insert
  with check (true);

create policy "Allow public update on iptv_playlists"
  on public.iptv_playlists for update
  using (true);

create policy "Allow public delete on iptv_playlists"
  on public.iptv_playlists for delete
  using (true);

create policy "Allow public read on admin_settings"
  on public.admin_settings for select
  using (true);

create policy "Allow public insert on admin_settings"
  on public.admin_settings for insert
  with check (true);

create policy "Allow public update on admin_settings"
  on public.admin_settings for update
  using (true);

-- 5. SEED INITIAL ADMIN PASSWORD (D@rielgwapo223)
insert into public.admin_settings (key, value, description, updated_at)
values (
  'admin_password',
  'D@rielgwapo223',
  'Password required to access the /admin portal',
  now()
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

-- 6. SEED INITIAL VERIFIED IPTV M3U PLAYLISTS
insert into public.iptv_playlists (id, name, url, enabled, sort_order)
values
  (
    'leirad-official-stations',
    'LEIRAD TV Official Stations',
    'inline://leirad-official-stations',
    true,
    1
  ),
  (
    'iphtv-philippines',
    'Philippines IPHTV (Harleythetech - Live)',
    'https://raw.githubusercontent.com/Harleythetech/IPHTV/main/ph.m3u',
    true,
    2
  ),
  (
    'mjh-nz-raw',
    'MJH NZ - Global Live Broadcasts',
    'https://i.mjh.nz/all/raw.m3u8',
    true,
    3
  ),
  (
    'mjh-nz-kodi',
    'MJH NZ - Kodi Live TV',
    'https://i.mjh.nz/all/kodi.m3u8',
    true,
    4
  ),
  (
    'japan-official',
    'Japan Broadcasts (IPTV-Org)',
    'https://iptv-org.github.io/iptv/countries/jp.m3u',
    true,
    5
  ),
  (
    'fluxus-tv-new',
    'Fluxus TV (Updated Streams)',
    'https://raw.githubusercontent.com/drjou/IPTV-2/refs/heads/master/list.m3u',
    true,
    6
  ),
  (
    'iptv-org-global',
    'IPTV-Org Global Index',
    'https://iptv-org.github.io/iptv/index.m3u',
    true,
    7
  ),
  (
    'mjh-pluto',
    'Pluto TV Global Feeds',
    'https://i.mjh.nz/PlutoTV/all.m3u8',
    true,
    8
  ),
  (
    'mjh-samsung',
    'Samsung TV Plus Live',
    'https://i.mjh.nz/SamsungTVPlus/all.m3u8',
    true,
    9
  )
on conflict (id) do update
set name = excluded.name,
    url = excluded.url,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order,
    updated_at = now();

-- 7. VERIFICATION QUERY (Run this to verify data after execution)
select * from public.admin_settings;
select id, name, url, enabled, sort_order from public.iptv_playlists order by sort_order asc;
