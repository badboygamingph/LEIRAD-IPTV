import { Channel, PlaylistSource } from '../types';
import { getCountryFlag, getCountryName } from './countries';
import { LEIRAD_M3U_PLAYLIST } from '../data/userPlaylist';
import { isYouTubeUrl, getYouTubeEmbedUrl, extractYouTubeTitle } from './youtube';

// All M3U Playlists requested by the user
export const PH_M3U_URL = 'https://raw.githubusercontent.com/Harleythetech/IPHTV/main/ph.m3u';
export const PH_M3U_MIRROR = 'https://raw.githubusercontent.com/Harleythetech/IPHTV/refs/heads/main/ph.m3u';
export const MJH_RAW_M3U = 'https://i.mjh.nz/all/raw.m3u8';
export const MJH_KODI_M3U = 'https://i.mjh.nz/all/kodi.m3u8';
export const MJH_TVH_M3U = 'https://i.mjh.nz/all/tvh.m3u8';
export const IPTV_ORG_GLOBAL = 'https://iptv-org.github.io/iptv/index.m3u';
export const DEFAULT_M3U_URL = IPTV_ORG_GLOBAL;
export const IPTV_ORG_CATEGORY = 'https://iptv-org.github.io/iptv/index.category.m3u';
export const IPTV_ORG_COUNTRY = 'https://iptv-org.github.io/iptv/index.country.m3u';
export const IPTV_ORG_LANGUAGE = 'https://iptv-org.github.io/iptv/index.language.m3u';
export const IPTV_ORG_REGION = 'https://iptv-org.github.io/iptv/index.region.m3u';
export const IPTV_ORG_JP = 'https://iptv-org.github.io/iptv/countries/jp.m3u';
export const JAPAN_LUONGZ_M3U = 'https://raw.githubusercontent.com/luongz/Japan-IPTV/main/jp.m3u';
export const JAPAN_LUONGZ_ALT = 'https://raw.githubusercontent.com/luongz/iptv-jp/refs/heads/main/jp.m3u';
export const FLUXUS_NEW_M3U = 'https://raw.githubusercontent.com/drjou/IPTV-2/refs/heads/master/list.m3u';
export const IPTVMATE_ALL_TV = 'https://iptvmate.net/files/freeiptv/ZZ_PLAYLIST_ALL_TV.m3u';
export const IPTVMATE_FLUXUS = 'https://iptvmate.net/files/fluxus/fluxusiptv.m3u';
export const IPTVMATE_ALL_CH = 'https://iptvmate.net/files/25032021/allchannels.m3u';
export const MJH_PLUTO_M3U = 'https://i.mjh.nz/PlutoTV/all.m3u8';
export const MJH_PBS_M3U = 'https://i.mjh.nz/PBS/all.m3u8';
export const MJH_PLEX_M3U = 'https://i.mjh.nz/Plex/all.m3u8';
export const MJH_ROKU_M3U = 'https://i.mjh.nz/Roku/all.m3u8';
export const MJH_SAMSUNG_M3U = 'https://i.mjh.nz/SamsungTVPlus/all.m3u8';
export const MJH_STIRR_M3U = 'https://i.mjh.nz/Stirr/all.m3u8';

export const INITIAL_PLAYLIST_SOURCES: PlaylistSource[] = [
  // 1. LEIRAD TV Official Station Channels
  {
    id: 'leirad-official-stations',
    name: 'LEIRAD TV Official Stations',
    url: 'inline://leirad-official-stations',
    enabled: true,
    channelCount: 0,
    content: LEIRAD_M3U_PLAYLIST,
  },
  // 2. Philippines & Asia (Harleythetech - 100% verified working live)
  {
    id: 'iphtv-philippines',
    name: 'Philippines IPHTV (Harleythetech - 100% Live)',
    url: PH_M3U_URL,
    enabled: true,
    channelCount: 20,
  },
  // 2. MJH NZ Live Broadcasts (High-speed verified global streams)
  {
    id: 'mjh-nz-raw',
    name: 'MJH NZ - Global Live Broadcasts',
    url: MJH_RAW_M3U,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'mjh-nz-kodi',
    name: 'MJH NZ - Kodi Live TV',
    url: MJH_KODI_M3U,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'mjh-nz-tvh',
    name: 'MJH NZ - TVHeadend',
    url: MJH_TVH_M3U,
    enabled: true,
    channelCount: 0,
  },
  // 3. Japan IPTV Sources
  {
    id: 'japan-official',
    name: 'Japan Broadcasts (IPTV-Org)',
    url: IPTV_ORG_JP,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'japan-luongz',
    name: 'Japan IPTV (luongz)',
    url: JAPAN_LUONGZ_M3U,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'japan-luongz-alt',
    name: 'Japan IPTV Alternate',
    url: JAPAN_LUONGZ_ALT,
    enabled: true,
    channelCount: 0,
  },
  // 4. Fluxus TV (new)
  {
    id: 'fluxus-tv-new',
    name: 'Fluxus TV (new - drjou)',
    url: FLUXUS_NEW_M3U,
    enabled: true,
    channelCount: 0,
  },
  // 5. IPTV Mate Sources
  {
    id: 'iptvmate-all-tv',
    name: 'IPTV Mate: All TV',
    url: IPTVMATE_ALL_TV,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'iptvmate-fluxus',
    name: 'IPTV Mate: Fluxus IPTV',
    url: IPTVMATE_FLUXUS,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'iptvmate-all-channels',
    name: 'IPTV Mate: All Channels',
    url: IPTVMATE_ALL_CH,
    enabled: true,
    channelCount: 0,
  },
  // 6. IPTV-Org Indexes
  {
    id: 'iptv-org-global',
    name: 'IPTV-Org: Global Index (11k+ Channels)',
    url: IPTV_ORG_GLOBAL,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'iptv-org-category',
    name: 'IPTV-Org: By Category',
    url: IPTV_ORG_CATEGORY,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'iptv-org-country',
    name: 'IPTV-Org: By Country',
    url: IPTV_ORG_COUNTRY,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'iptv-org-language',
    name: 'IPTV-Org: By Language',
    url: IPTV_ORG_LANGUAGE,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'iptv-org-region',
    name: 'IPTV-Org: By Region',
    url: IPTV_ORG_REGION,
    enabled: true,
    channelCount: 0,
  },
  // 7. MJH NZ Network Feeds
  {
    id: 'mjh-plutotv',
    name: 'MJH NZ: Pluto TV',
    url: MJH_PLUTO_M3U,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'mjh-pbs',
    name: 'MJH NZ: PBS',
    url: MJH_PBS_M3U,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'mjh-plex',
    name: 'MJH NZ: Plex',
    url: MJH_PLEX_M3U,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'mjh-roku',
    name: 'MJH NZ: Roku',
    url: MJH_ROKU_M3U,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'mjh-samsung',
    name: 'MJH NZ: Samsung TV Plus',
    url: MJH_SAMSUNG_M3U,
    enabled: true,
    channelCount: 0,
  },
  {
    id: 'mjh-stirr',
    name: 'MJH NZ: Stirr',
    url: MJH_STIRR_M3U,
    enabled: true,
    channelCount: 0,
  },
];

export interface ParseOptions {
  sourceId?: string;
  sourceName?: string;
  defaultCountry?: string;
}

export function parseM3U(m3uContent: string, options?: ParseOptions): Channel[] {
  const lines = m3uContent.split(/\r?\n/);
  const channels: Channel[] = [];
  const sourceId = options?.sourceId || 'default-source';
  const sourceName = options?.sourceName || 'IPTV Playlist';
  const isPhSource =
    sourceName.toLowerCase().includes('ph') ||
    sourceId.includes('ph') ||
    false;
  const isJpSource =
    sourceName.toLowerCase().includes('japan') ||
    sourceId.includes('japan') ||
    sourceId.includes('jp') ||
    false;

  let currentInfo: {
    name: string;
    logo: string;
    group: string;
    tvgId: string;
    countryCode: string;
    quality: string;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Parse attributes
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      const countryAttrMatch = line.match(/tvg-country="([^"]*)"/i);

      // Name is after the first comma outside quotes in the #EXTINF line
      let commaIndex = -1;
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        if (line[c] === '"') inQuotes = !inQuotes;
        else if (line[c] === ',' && !inQuotes) {
          commaIndex = c;
          break;
        }
      }
      if (commaIndex === -1) commaIndex = line.lastIndexOf(',');
      let rawName = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'Unnamed Channel';

      const tvgId = tvgIdMatch ? tvgIdMatch[1].trim() : '';
      const logo = tvgLogoMatch ? tvgLogoMatch[1].trim() : '';
      let group = groupMatch ? groupMatch[1].trim() : '';

      // Infer group if missing or undefined
      if (!group || group.toLowerCase() === 'undefined') {
        const lowerName = rawName.toLowerCase();
        if (lowerName.includes('news')) group = 'News';
        else if (lowerName.includes('sport') || lowerName.includes('espn') || lowerName.includes('fifa')) group = 'Sports';
        else if (lowerName.includes('movie') || lowerName.includes('cinema') || lowerName.includes('film')) group = 'Movies';
        else if (lowerName.includes('music') || lowerName.includes('mtv')) group = 'Music';
        else if (lowerName.includes('kid') || lowerName.includes('cartoon') || lowerName.includes('disney')) group = 'Kids';
        else if (lowerName.includes('doc') || lowerName.includes('discovery') || lowerName.includes('nat geo')) group = 'Documentary';
        else if (isPhSource) group = 'Philippines General';
        else if (isJpSource) group = 'Japan General';
        else group = 'General';
      }

      // Infer country
      let countryCode = countryAttrMatch ? countryAttrMatch[1].trim().toUpperCase() : '';
      if (!countryCode) {
        if (isPhSource) {
          countryCode = 'PH';
        } else if (isJpSource) {
          countryCode = 'JP';
        } else if (tvgId.endsWith('.ph') || tvgId.includes('.ph@')) {
          countryCode = 'PH';
        } else if (tvgId.endsWith('.jp') || tvgId.includes('.jp@')) {
          countryCode = 'JP';
        } else if (tvgId.endsWith('.nz') || tvgId.includes('mjh-sky')) {
          countryCode = 'NZ';
        } else if (tvgId.endsWith('.us') || tvgId.includes('.us@')) {
          countryCode = 'US';
        } else if (tvgId.endsWith('.uk') || tvgId.includes('.uk@')) {
          countryCode = 'GB';
        }
      }

      // Infer quality
      let quality = 'SD';
      const upperName = rawName.toUpperCase();
      if (upperName.includes('4K') || upperName.includes('UHD')) {
        quality = '4K';
      } else if (upperName.includes('1080P') || upperName.includes('FHD')) {
        quality = 'FHD';
      } else if (upperName.includes('720P') || upperName.includes('HD')) {
        quality = 'HD';
      }

      // Clean channel name
      const cleanName = rawName
        .replace(/\s*\(1080p\)/gi, '')
        .replace(/\s*\(720p\)/gi, '')
        .replace(/\s*\[1080p\]/gi, '')
        .replace(/\s*\[720p\]/gi, '')
        .replace(/\s*\(FHD\)/gi, '')
        .replace(/\s*\(HD\)/gi, '')
        .replace(/\s*\(SD\)/gi, '')
        .trim();

      currentInfo = {
        name: cleanName || rawName,
        logo,
        group,
        tvgId,
        countryCode,
        quality,
      };
    } else if (line.includes('<iframe')) {
      const isYt = isYouTubeUrl(line);
      const embedUrl = isYt ? getYouTubeEmbedUrl(line) : (line.match(/src=["']([^"']+)["']/i)?.[1] || '');
      const ytTitle = currentInfo?.name || extractYouTubeTitle(line) || `Live Stream ${channels.length + 1}`;
      const countryCode = currentInfo?.countryCode || 'PH';
      const countryName = getCountryName(countryCode) || 'Philippines';
      const countryFlag = getCountryFlag(countryCode) || '🇵🇭';
      if (embedUrl) {
        channels.push({
          id: `${sourceId}-${currentInfo?.tvgId || 'yt'}-${channels.length + 1}`,
          name: ytTitle,
          url: embedUrl,
          logo: currentInfo?.logo || 'https://www.youtube.com/s/desktop/f7125345/img/favicon_144x144.png',
          group: currentInfo?.group || 'YouTube Live',
          countryCode,
          countryName,
          countryFlag,
          quality: currentInfo?.quality || 'HD',
          tvgId: currentInfo?.tvgId || '',
          isHttps: true,
          isYouTube: true,
          embedCode: line,
          sourceId,
          sourceName,
        });
      }
      currentInfo = null;
    } else if (!line.startsWith('#') && currentInfo) {
      // Line is a stream URL (handle trailing pipe parameters such as |User-Agent=...)
      let streamUrl = line.trim();
      if (streamUrl.includes('|')) {
        streamUrl = streamUrl.split('|')[0].trim();
      }
      const isYt = isYouTubeUrl(streamUrl);
      if (isYt) {
        streamUrl = getYouTubeEmbedUrl(streamUrl);
      }
      if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://')) {
        const id = `${sourceId}-${currentInfo.tvgId || 'chan'}-${channels.length + 1}`;
        const countryCode = currentInfo.countryCode || '';
        const countryName = getCountryName(countryCode);
        const countryFlag = getCountryFlag(countryCode);

        channels.push({
          id,
          name: currentInfo.name,
          url: streamUrl,
          logo: currentInfo.logo || (isYt ? 'https://www.youtube.com/s/desktop/f7125345/img/favicon_144x144.png' : ''),
          group: currentInfo.group || (isYt ? 'YouTube Live' : 'General'),
          countryCode,
          countryName,
          countryFlag,
          quality: currentInfo.quality,
          tvgId: currentInfo.tvgId,
          isHttps: streamUrl.startsWith('https://'),
          isYouTube: isYt,
          sourceId,
          sourceName,
        });
      }
      currentInfo = null;
    }
  }

  return channels;
}

// Memory and Session cache for instant playlist retrieval
const playlistCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

export async function fetchM3UPlaylist(url: string, content?: string): Promise<string> {
  if (content) return content;
  if (url === 'inline://leirad-official-stations' || url.startsWith('inline://')) {
    return LEIRAD_M3U_PLAYLIST;
  }

  // Handle direct YouTube links or raw <iframe> embed codes supplied as playlist URL
  if (url.includes('<iframe') || isYouTubeUrl(url)) {
    const embedUrl = getYouTubeEmbedUrl(url);
    const title = extractYouTubeTitle(url) || 'YouTube Live Stream';
    return `#EXTM3U\n#EXTINF:-1 tvg-id="yt-live" tvg-country="PH" group-title="YouTube Live",${title}\n${embedUrl}\n`;
  }

  // Check fast in-memory cache
  const cached = playlistCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.text;
  }

  // Check sessionStorage
  try {
    const sessionKey = `m3u_cache_${url}`;
    const stored = sessionStorage.getItem(sessionKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.text) {
        playlistCache.set(url, parsed);
        return parsed.text;
      }
    }
  } catch {}

  // Fetch with 10s timeout protection
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);

  try {
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch {
      // Fallback via local Vite dev proxy for CORS-restricted sources (like iptvmate)
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      response = await fetch(proxyUrl, { signal: controller.signal });
    }

    window.clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    playlistCache.set(url, { text, timestamp: Date.now() });

    try {
      if (text.length < 2 * 1024 * 1024) {
        sessionStorage.setItem(`m3u_cache_${url}`, JSON.stringify({ text, timestamp: Date.now() }));
      }
    } catch {}

    return text;
  } catch (err) {
    window.clearTimeout(timeoutId);
    if (cached) return cached.text;
    throw err;
  }
}
