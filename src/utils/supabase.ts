import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PlaylistSource } from '../types';

export const DEFAULT_ADMIN_PASSWORD = 'D@rielgwapo223';

// Storage keys
const STORAGE_SUPABASE_URL = 'leirad_supabase_url';
const STORAGE_SUPABASE_KEY = 'leirad_supabase_anon_key';
const STORAGE_ADMIN_AUTH = 'leirad_admin_authenticated_session';

export const SUPABASE_SETUP_SQL = `-- ==============================================================================
-- LEIRAD TV - SUPABASE DATABASE SETUP SCRIPT
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

-- Drop existing policies if re-running
drop policy if exists "Allow public read on iptv_playlists" on public.iptv_playlists;
drop policy if exists "Allow public insert on iptv_playlists" on public.iptv_playlists;
drop policy if exists "Allow public update on iptv_playlists" on public.iptv_playlists;
drop policy if exists "Allow public delete on iptv_playlists" on public.iptv_playlists;

drop policy if exists "Allow public read on admin_settings" on public.admin_settings;
drop policy if exists "Allow public insert on admin_settings" on public.admin_settings;
drop policy if exists "Allow public update on admin_settings" on public.admin_settings;

-- 4. CREATE POLICIES (Allow web app to perform CRUD operations)
create policy "Allow public read on iptv_playlists"
  on public.iptv_playlists for select using (true);

create policy "Allow public insert on iptv_playlists"
  on public.iptv_playlists for insert with check (true);

create policy "Allow public update on iptv_playlists"
  on public.iptv_playlists for update using (true);

create policy "Allow public delete on iptv_playlists"
  on public.iptv_playlists for delete using (true);

create policy "Allow public read on admin_settings"
  on public.admin_settings for select using (true);

create policy "Allow public insert on admin_settings"
  on public.admin_settings for insert with check (true);

create policy "Allow public update on admin_settings"
  on public.admin_settings for update using (true);

-- 5. SEED INITIAL ADMIN PASSWORD (D@rielgwapo223)
insert into public.admin_settings (key, value, description, updated_at)
values ('admin_password', 'D@rielgwapo223', 'Password required to access the /admin portal', now())
on conflict (key) do update
set value = excluded.value, updated_at = now();

-- 6. SEED INITIAL VERIFIED IPTV M3U PLAYLISTS
insert into public.iptv_playlists (id, name, url, enabled, sort_order)
values
  ('leirad-official-stations', 'LEIRAD TV Official Stations', 'inline://leirad-official-stations', true, 1),
  ('iphtv-philippines', 'Philippines IPHTV (Harleythetech - Live)', 'https://raw.githubusercontent.com/Harleythetech/IPHTV/main/ph.m3u', true, 2),
  ('mjh-nz-raw', 'MJH NZ - Global Live Broadcasts', 'https://i.mjh.nz/all/raw.m3u8', true, 3),
  ('mjh-nz-kodi', 'MJH NZ - Kodi Live TV', 'https://i.mjh.nz/all/kodi.m3u8', true, 4),
  ('japan-official', 'Japan Broadcasts (IPTV-Org)', 'https://iptv-org.github.io/iptv/countries/jp.m3u', true, 5),
  ('fluxus-tv-new', 'Fluxus TV (Updated Streams)', 'https://raw.githubusercontent.com/drjou/IPTV-2/refs/heads/master/list.m3u', true, 6),
  ('iptv-org-global', 'IPTV-Org Global Index', 'https://iptv-org.github.io/iptv/index.m3u', true, 7),
  ('mjh-pluto', 'Pluto TV Global Feeds', 'https://i.mjh.nz/PlutoTV/all.m3u8', true, 8),
  ('mjh-samsung', 'Samsung TV Plus Live', 'https://i.mjh.nz/SamsungTVPlus/all.m3u8', true, 9)
on conflict (id) do update
set name = excluded.name, url = excluded.url, enabled = excluded.enabled, sort_order = excluded.sort_order, updated_at = now();
`;

// Retrieve Supabase credentials with precedence: environment variables > localStorage
export function getSupabaseConfig(): { url: string; anonKey: string; isFromEnv: boolean } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return { url: envUrl.trim(), anonKey: envKey.trim(), isFromEnv: true };
  }

  try {
    const storedUrl = localStorage.getItem(STORAGE_SUPABASE_URL) || '';
    const storedKey = localStorage.getItem(STORAGE_SUPABASE_KEY) || '';
    return { url: storedUrl.trim(), anonKey: storedKey.trim(), isFromEnv: false };
  } catch {
    return { url: '', anonKey: '', isFromEnv: false };
  }
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  try {
    localStorage.setItem(STORAGE_SUPABASE_URL, url.trim());
    localStorage.setItem(STORAGE_SUPABASE_KEY, anonKey.trim());
    // Clear client cache
    cachedClient = null;
  } catch (e) {
    console.error('Failed to save Supabase config', e);
  }
}

export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_SUPABASE_URL);
    localStorage.removeItem(STORAGE_SUPABASE_KEY);
    cachedClient = null;
  } catch {}
}

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

// Client singleton
let cachedClient: SupabaseClient | null = null;
let lastClientKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  const clientKey = `${url}:${anonKey}`;
  if (cachedClient && lastClientKey === clientKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastClientKey = clientKey;
    return cachedClient;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
}

// Test live connection to Supabase
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tableExists?: boolean;
  playlistsCount?: number;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL or Anon Key is missing. Please configure your credentials.',
    };
  }

  try {
    // Probe iptv_playlists table
    const { data, error } = await client
      .from('iptv_playlists')
      .select('id, name')
      .limit(5);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          tableExists: false,
          message:
            'Connected to Supabase, but the "iptv_playlists" table does not exist yet. Please run the SQL Setup Script in your Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Supabase query error: ${error.message} (${error.code || 'unknown'})`,
      };
    }

    // Also check admin_settings
    await client
      .from('admin_settings')
      .select('key')
      .eq('key', 'admin_password')
      .maybeSingle();

    return {
      success: true,
      tableExists: true,
      playlistsCount: data?.length || 0,
      message: `Successfully connected to Supabase database! Found ${data?.length || 0}+ playlist records.`,
    };
  } catch (e: any) {
    return {
      success: false,
      message: `Failed to reach Supabase: ${e?.message || 'Network error'}`,
    };
  }
}

// Session auth helpers for /admin
export function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_ADMIN_AUTH) === 'true';
  } catch {
    return false;
  }
}

export function setAdminAuthenticated(authenticated: boolean): void {
  try {
    if (authenticated) {
      sessionStorage.setItem(STORAGE_ADMIN_AUTH, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_ADMIN_AUTH);
    }
  } catch {}
}

// Verify Admin Password against Supabase (or fallback default)
export async function verifyAdminPassword(passwordAttempt: string): Promise<{
  success: boolean;
  message: string;
  fromSupabase: boolean;
}> {
  const trimmed = passwordAttempt.trim();
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('admin_settings')
        .select('value')
        .eq('key', 'admin_password')
        .maybeSingle();

      if (!error && data?.value) {
        const matches = trimmed === data.value.trim();
        if (matches) {
          setAdminAuthenticated(true);
          return {
            success: true,
            message: 'Access granted via Supabase database authentication.',
            fromSupabase: true,
          };
        } else {
          return {
            success: false,
            message: 'Incorrect admin password. Please try again.',
            fromSupabase: true,
          };
        }
      }
    } catch (err) {
      console.warn('Supabase password check encountered an issue, falling back:', err);
    }
  }

  // Fallback to default password (D@rielgwapo223)
  if (trimmed === DEFAULT_ADMIN_PASSWORD) {
    setAdminAuthenticated(true);
    return {
      success: true,
      message: 'Access granted via default password (D@rielgwapo223).',
      fromSupabase: false,
    };
  }

  return {
    success: false,
    message: 'Incorrect admin password. Please check your credentials.',
    fromSupabase: false,
  };
}

// Update Admin Password in Supabase
export async function updateAdminPasswordInSupabase(newPassword: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, message: 'Password must be at least 4 characters long.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase is not configured. Connect your Supabase project first to persist password changes.',
    };
  }

  try {
    const { error } = await client
      .from('admin_settings')
      .upsert(
        {
          key: 'admin_password',
          value: newPassword.trim(),
          description: 'Password required to access the /admin portal',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      return { success: false, message: `Failed to update password: ${error.message}` };
    }

    return { success: true, message: 'Admin password successfully updated in Supabase database!' };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Error updating password' };
  }
}

// ============================================================================
// CRUD OPERATIONS FOR PLAYLIST SOURCES IN SUPABASE
// ============================================================================

// 1. READ: Fetch all playlists from Supabase
export async function fetchPlaylistsFromSupabase(): Promise<{
  data: PlaylistSource[];
  isSupabase: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], isSupabase: false };
  }

  try {
    const { data, error } = await client
      .from('iptv_playlists')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return { data: [], isSupabase: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: [], isSupabase: true };
    }

    const playlists: PlaylistSource[] = data.map((row: any) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      enabled: Boolean(row.enabled),
      channelCount: Number(row.channel_count) || 0,
      content: row.content || undefined,
      sortOrder: Number(row.sort_order) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { data: playlists, isSupabase: true };
  } catch (err: any) {
    return { data: [], isSupabase: false, error: err?.message };
  }
}

// 2. CREATE: Add new playlist source to Supabase
export async function createPlaylistInSupabase(playlist: {
  name: string;
  url: string;
  enabled?: boolean;
  content?: string;
  sortOrder?: number;
}): Promise<{ data: PlaylistSource | null; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      data: null,
      error: 'Supabase is not configured. Please connect Supabase in Settings.',
    };
  }

  try {
    const payload = {
      name: playlist.name.trim(),
      url: playlist.url.trim(),
      enabled: playlist.enabled ?? true,
      content: playlist.content || null,
      sort_order: playlist.sortOrder ?? 0,
      channel_count: 0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('iptv_playlists')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: {
        id: data.id,
        name: data.name,
        url: data.url,
        enabled: data.enabled,
        channelCount: data.channel_count || 0,
        content: data.content || undefined,
        sortOrder: data.sort_order || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed creating playlist' };
  }
}

// 3. UPDATE: Update an existing playlist source in Supabase
export async function updatePlaylistInSupabase(
  id: string,
  updates: Partial<PlaylistSource>
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Supabase is not configured.',
    };
  }

  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.url !== undefined) payload.url = updates.url.trim();
    if (updates.enabled !== undefined) payload.enabled = updates.enabled;
    if (updates.content !== undefined) payload.content = updates.content || null;
    if (updates.channelCount !== undefined) payload.channel_count = updates.channelCount;
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;

    const { error } = await client
      .from('iptv_playlists')
      .update(payload)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed updating playlist' };
  }
}

// 4. DELETE: Delete a playlist source from Supabase
export async function deletePlaylistInSupabase(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Supabase is not configured.',
    };
  }

  try {
    const { error } = await client
      .from('iptv_playlists')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed deleting playlist' };
  }
}

// 5. SEED: Populate default playlists into Supabase
export async function seedPlaylistsToSupabase(
  defaultSources: PlaylistSource[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase not configured' };
  }

  try {
    const records = defaultSources.map((s, idx) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      enabled: s.enabled,
      content: s.content || null,
      channel_count: s.channelCount || 0,
      sort_order: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await client
      .from('iptv_playlists')
      .upsert(records, { onConflict: 'id' })
      .select();

    if (error) {
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data?.length || records.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Failed seeding playlists' };
  }
}
