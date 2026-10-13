import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sparkles,
  Maximize,
  Tv,
  ListFilter
} from 'lucide-react';
import { Channel, PlaylistSource } from './types';
import { parseM3U, fetchM3UPlaylist, INITIAL_PLAYLIST_SOURCES } from './utils/m3uParser';
import { LEIRAD_M3U_PLAYLIST } from './data/userPlaylist';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { TVGuideDrawer } from './components/TVGuideDrawer';
import { AdminPlaylistManager } from './components/AdminPlaylistManager';
import { AdminLoginGate } from './components/AdminLoginGate';
import {
  fetchPlaylistsFromSupabase,
  createPlaylistInSupabase,
  updatePlaylistInSupabase,
  deletePlaylistInSupabase,
  isSupabaseConfigured,
  isAdminAuthenticated,
} from './utils/supabase';

export const App: React.FC = () => {
  // Route state: /admin vs public live TV player
  const [isAdminView, setIsAdminView] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.pathname === '/admin' ||
      window.location.pathname.startsWith('/admin') ||
      window.location.hash === '#/admin' ||
      window.location.search.includes('admin=true')
    );
  });

  // Admin authentication state for password gate
  const [isAdminAuthenticatedState, setIsAdminAuthenticatedState] = useState(() => {
    return isAdminAuthenticated();
  });
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // Listen to popstate and hashchange for clean SPA routing to /admin
  useEffect(() => {
    const handleUrlChange = () => {
      const isAdmin =
        window.location.pathname === '/admin' ||
        window.location.pathname.startsWith('/admin') ||
        window.location.hash === '#/admin' ||
        window.location.search.includes('admin=true');
      setIsAdminView(isAdmin);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setIsAdminView(
        path === '/admin' ||
        path.startsWith('/admin') ||
        path === '#/admin' ||
        path.includes('admin=true')
      );
    }
  };

  // Playlist Sources State
  const [sources, setSources] = useState<PlaylistSource[]>(() => {
    try {
      const saved = localStorage.getItem('leirad_tv_sources') || localStorage.getItem('aether_tv_sources');
      if (saved) {
        const parsed: PlaylistSource[] = JSON.parse(saved);
        const savedIds = new Set(parsed.map((s) => s.id));
        const missing = INITIAL_PLAYLIST_SOURCES.filter((s) => !savedIds.has(s.id));
        const combined = [...missing, ...parsed].map((s) =>
          s.id === 'leirad-official-stations' ? { ...s, content: LEIRAD_M3U_PLAYLIST } : s
        );
        const official = combined.filter((s) => s.id === 'leirad-official-stations');
        const others = combined.filter((s) => s.id !== 'leirad-official-stations');
        return [...official, ...others];
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PLAYLIST_SOURCES;
  });

  // Channels State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const activeChannelIndexRef = useRef<number>(0);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('leirad_tv_favorites') || localStorage.getItem('aether_tv_favorites');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Track off-air / resting / broken station IDs to ensure Next/Prev and channel list skip them
  const [brokenChannelIds, setBrokenChannelIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('broken_channels_v1');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
    return new Set<string>();
  });

  // Track verified working station IDs
  const [verifiedWorkingIds, setVerifiedWorkingIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('verified_channels_v1');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
    return new Set<string>();
  });

  // Sidebar State
  const [showChannelsSidebar, setShowChannelsSidebar] = useState(false);

  // Accessibility & Senior Friendly Modes
  const [isLargeText, setIsLargeText] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('leirad_tv_largetext') === 'true' ||
        localStorage.getItem('aether_tv_largetext') === 'true'
      );
    } catch {
      return false;
    }
  });

  // Loading & Feedback State
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState('Connecting to LEIRAD TV live broadcast stations...');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const playerSectionRef = useRef<HTMLDivElement | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Sync favorites & settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('leirad_tv_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem('leirad_tv_sources', JSON.stringify(sources));
    } catch (e) {
      console.error(e);
    }
  }, [sources]);

  useEffect(() => {
    try {
      localStorage.setItem('leirad_tv_largetext', isLargeText ? 'true' : 'false');
    } catch (e) {
      console.error(e);
    }
  }, [isLargeText]);

  // Save current active channel to localStorage so refresh or reload never loses the station
  useEffect(() => {
    if (activeChannel?.id) {
      try {
        localStorage.setItem('leirad_tv_current_channel_id', activeChannel.id);
        localStorage.setItem('leirad_tv_current_channel_url', activeChannel.url);
      } catch {}
    }
  }, [activeChannel?.id, activeChannel?.url]);

  // Callback from VideoPlayer to update station health status in real time
  const brokenChannelIdsRef = useRef(brokenChannelIds);
  brokenChannelIdsRef.current = brokenChannelIds;

  const handleChannelStatusChange = useCallback((channelId: string, status: 'working' | 'off_air') => {
    if (status === 'working') {
      brokenChannelIdsRef.current.delete(channelId);
      setVerifiedWorkingIds((prev) => {
        if (prev.has(channelId)) return prev;
        const next = new Set(prev);
        next.add(channelId);
        try {
          localStorage.setItem('verified_channels_v1', JSON.stringify([...next]));
        } catch {}
        return next;
      });
      setBrokenChannelIds((prev) => {
        if (!prev.has(channelId)) return prev;
        const next = new Set(prev);
        next.delete(channelId);
        try {
          localStorage.setItem('broken_channels_v1', JSON.stringify([...next]));
        } catch {}
        return next;
      });
    } else {
      brokenChannelIdsRef.current.add(channelId);
      setBrokenChannelIds((prev) => {
        if (prev.has(channelId)) return prev;
        const next = new Set(prev);
        next.add(channelId);
        try {
          localStorage.setItem('broken_channels_v1', JSON.stringify([...next]));
        } catch {}
        return next;
      });
      setVerifiedWorkingIds((prev) => {
        if (!prev.has(channelId)) return prev;
        const next = new Set(prev);
        next.delete(channelId);
        try {
          localStorage.setItem('verified_channels_v1', JSON.stringify([...next]));
        } catch {}
        return next;
      });
    }
  }, []);

  // Check if webpage is running on HTTPS
  const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  // Compute ONLY working / on-air channels (skipping off-air, dead, or browser-blocked HTTP channels)
  const workingChannels = useMemo(() => {
    return channels.filter((c) => {
      if (isPageHttps && !c.isHttps) return false;
      if (brokenChannelIds.has(c.id)) return false;
      return true;
    });
  }, [channels, brokenChannelIds, isPageHttps]);

  // Fast, Parallel & Progressive Playlist Loader for Instant Playback
  const loadAllSources = useCallback(
    async (currentSources: PlaylistSource[]) => {
      setIsLoading(true);
      setLoadingProgress('Connecting to high-speed live broadcast stations...');

      // Find primary LEIRAD official source or Philippines IPHTV source
      const primarySource =
        currentSources.find((s) => s.enabled && s.id === 'leirad-official-stations') ||
        currentSources.find(
          (s) => s.enabled && (s.id.includes('ph') || s.name.toLowerCase().includes('ph'))
        ) ||
        currentSources.find((s) => s.enabled);

      const otherSources = currentSources.filter(
        (s) => s.enabled && (!primarySource || s.id !== primarySource.id)
      );

      let initialLoaded = false;
      let accumulatedChannels: Channel[] = [];
      const seenUrls = new Set<string>();

      // Helper to merge channels cleanly and deduplicate
      const mergeChannels = (newChannels: Channel[]) => {
        const added: Channel[] = [];
        for (const ch of newChannels) {
          if (!seenUrls.has(ch.url)) {
            seenUrls.add(ch.url);
            added.push(ch);
          }
        }
        accumulatedChannels = [...accumulatedChannels, ...added];
        return accumulatedChannels;
      };

      // Session indicator: Check if user newly opened the website
      const isNewSession = typeof window !== 'undefined' && !sessionStorage.getItem('leirad_tv_session_active');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('leirad_tv_session_active', 'true');
      }

      // If newly opening the website, we prioritize playing the YouTube Live broadcast automatically!
      const savedChannelId = (!isNewSession && typeof window !== 'undefined') ? localStorage.getItem('leirad_tv_current_channel_id') : null;
      const savedChannelUrl = (!isNewSession && typeof window !== 'undefined') ? localStorage.getItem('leirad_tv_current_channel_url') : null;

      // Stage 1: Load Primary Source Immediately (< 200ms)
      if (primarySource) {
        try {
          const text = await fetchM3UPlaylist(primarySource.url, primarySource.content);
          const parsed = parseM3U(text, {
            sourceId: primarySource.id,
            sourceName: primarySource.name,
          });

          // Pre-seed verified working IDs for high-confidence source
          const isHighConfidence = primarySource.id.includes('ph') || primarySource.id.includes('leirad');
          if (isHighConfidence && parsed.length > 0) {
            setVerifiedWorkingIds((prev) => {
              const next = new Set(prev);
              parsed.forEach((c) => {
                if (c.isHttps || !isPageHttps) next.add(c.id);
              });
              try {
                localStorage.setItem('verified_channels_v1', JSON.stringify([...next]));
              } catch {}
              return next;
            });
          }

          const currentMerged = mergeChannels(parsed);
          setChannels(currentMerged);

          // Update source count
          setSources((prev) =>
            prev.map((s) => (s.id === primarySource.id ? { ...s, channelCount: parsed.length } : s))
          );

          // Restore previously tuned channel from localStorage if present (for existing ongoing sessions)
          let toTune: Channel | null = null;
          if (savedChannelId || savedChannelUrl) {
            toTune =
              currentMerged.find(
                (c) =>
                  (savedChannelId && c.id === savedChannelId) ||
                  (savedChannelUrl && c.url === savedChannelUrl)
              ) || null;
          }

          // If newly opening the website or no saved station: ALWAYS default to YouTube Live!
          if (!toTune || isNewSession) {
            const ytChannel = currentMerged.find((c) => c.isYouTube && (!isPageHttps || c.isHttps)) || currentMerged.find((c) => c.isYouTube);
            if (ytChannel) {
              toTune = ytChannel;
            } else {
              const playable = currentMerged.filter((c) => !isPageHttps || c.isHttps);
              toTune = playable[0] || currentMerged[0] || null;
            }
          }

          if (toTune) {
            const foundIdx = currentMerged.findIndex((c) => c.id === toTune?.id);
            if (foundIdx >= 0) activeChannelIndexRef.current = foundIdx;
            setActiveChannel(toTune);
            setIsLoading(false);
            initialLoaded = true;
          }
        } catch (err) {
          console.warn('Failed to load primary source:', err);
        }
      }

      // Stage 2: In parallel, fetch all other sources without blocking the user
      const sourcePromises = otherSources.map(async (source) => {
        try {
          const text = await fetchM3UPlaylist(source.url, source.content);
          const parsed = parseM3U(text, {
            sourceId: source.id,
            sourceName: source.name,
          });
          return { sourceId: source.id, channels: parsed };
        } catch (err) {
          console.warn(`Failed loading source ${source.name}:`, err);
          return { sourceId: source.id, channels: [] };
        }
      });

      const results = await Promise.allSettled(sourcePromises);

      // Merge all other channels smoothly
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value.channels.length > 0) {
          const { sourceId, channels: newChs } = res.value;
          mergeChannels(newChs);

          setSources((prev) =>
            prev.map((s) => (s.id === sourceId ? { ...s, channelCount: newChs.length } : s))
          );
        }
      }

      setChannels([...accumulatedChannels]);
      setIsLoading(false);

      // Check if user's saved channel was in the secondary sources and restore it (for ongoing sessions)
      if (!isNewSession && (savedChannelId || savedChannelUrl)) {
        const found = accumulatedChannels.find(
          (c) =>
            (savedChannelId && c.id === savedChannelId) ||
            (savedChannelUrl && c.url === savedChannelUrl)
        );
        if (found) {
          const foundIdx = accumulatedChannels.findIndex((c) => c.id === found.id);
          if (foundIdx >= 0) activeChannelIndexRef.current = foundIdx;
          setActiveChannel(found);
          initialLoaded = true;
        }
      }

      // Fallback if no station was tuned yet: prioritize YouTube Live!
      if (!initialLoaded && accumulatedChannels.length > 0) {
        const ytFallback = accumulatedChannels.find((c) => c.isYouTube && (!isPageHttps || c.isHttps)) || accumulatedChannels.find((c) => c.isYouTube);
        const playable = accumulatedChannels.filter((c) => !isPageHttps || c.isHttps);
        const initial = ytFallback || playable[0] || accumulatedChannels[0];
        const foundIdx = accumulatedChannels.findIndex((c) => c.id === initial.id);
        activeChannelIndexRef.current = foundIdx >= 0 ? foundIdx : 0;
        setActiveChannel(initial);
      }
    },
    [isPageHttps]
  );

  // Initial load: Fetch playlists from Supabase database first if configured
  useEffect(() => {
    let isMounted = true;
    const initializePlaylists = async () => {
      try {
        if (isSupabaseConfigured()) {
          const res = await fetchPlaylistsFromSupabase();
          if (res.isSupabase && res.data && res.data.length > 0 && isMounted) {
            setIsSupabaseConnected(true);
            setSources(res.data);
            await loadAllSources(res.data);
            return;
          }
        }
      } catch (err) {
        console.warn('Supabase initial fetch failed, using fallback:', err);
      }
      if (isMounted) {
        loadAllSources(sources);
      }
    };

    initializePlaylists();

    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable Channel Index in the channels list: NEVER collapses to 0 on temporary errors
  const channelsRef = useRef(channels);
  channelsRef.current = channels;
  const activeChannelRef = useRef(activeChannel);
  activeChannelRef.current = activeChannel;

  const activeChannelIndex = useMemo(() => {
    if (!activeChannel || channels.length === 0) return activeChannelIndexRef.current;
    const idx = channels.findIndex(
      (c) => c.id === activeChannel.id || c.url === activeChannel.url
    );
    if (idx >= 0) {
      activeChannelIndexRef.current = idx;
      return idx;
    }
    return activeChannelIndexRef.current;
  }, [activeChannel, channels]);

  // TV Channel Surfing Functions (Previous / Next)
  // Continuous forward/backward search that skips non-working stations without resetting to Channel 1
  const handlePrevChannel = useCallback(() => {
    const all = channelsRef.current;
    if (all.length === 0) return;

    const current = activeChannelRef.current;
    let currentIdx = -1;
    if (current) {
      currentIdx = all.findIndex((c) => c.id === current.id || c.url === current.url);
    }
    if (currentIdx === -1) {
      currentIdx = activeChannelIndexRef.current;
    }

    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const brokenSet = brokenChannelIdsRef.current;

    let foundChannel: Channel | null = null;
    let foundIndex = -1;

    for (let step = 1; step < all.length; step++) {
      const idx = (currentIdx - step + all.length) % all.length;
      const candidate = all[idx];
      if (isHttps && !candidate.isHttps) continue;
      if (brokenSet.has(candidate.id)) continue;

      foundChannel = candidate;
      foundIndex = idx;
      break;
    }

    if (!foundChannel) {
      const fallbackIdx = (currentIdx - 1 + all.length) % all.length;
      foundChannel = all[fallbackIdx];
      foundIndex = fallbackIdx;
    }

    if (foundChannel) {
      activeChannelIndexRef.current = foundIndex;
      setActiveChannel(foundChannel);
      try {
        localStorage.setItem('leirad_tv_current_channel_id', foundChannel.id);
        localStorage.setItem('leirad_tv_current_channel_url', foundChannel.url);
      } catch {}
      showToast(`Tuned: ${foundChannel.name} (CH ${foundIndex + 1}/${all.length})`);
    }
  }, [showToast]);

  const handleNextChannel = useCallback(() => {
    const all = channelsRef.current;
    if (all.length === 0) return;

    const current = activeChannelRef.current;
    let currentIdx = -1;
    if (current) {
      currentIdx = all.findIndex((c) => c.id === current.id || c.url === current.url);
    }
    if (currentIdx === -1) {
      currentIdx = activeChannelIndexRef.current;
    }

    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const brokenSet = brokenChannelIdsRef.current;

    // Search forward sequentially through all channels to find next playable, non-broken channel
    let foundChannel: Channel | null = null;
    let foundIndex = -1;

    for (let step = 1; step < all.length; step++) {
      const idx = (currentIdx + step + all.length) % all.length;
      const candidate = all[idx];
      // Skip HTTPS-blocked HTTP streams on HTTPS page
      if (isHttps && !candidate.isHttps) continue;
      // Skip channels known to be broken/off-air
      if (brokenSet.has(candidate.id)) continue;

      foundChannel = candidate;
      foundIndex = idx;
      break;
    }

    // Fallback: if all non-broken channels were exhausted, advance sequentially to next channel
    if (!foundChannel) {
      const fallbackIdx = (currentIdx + 1) % all.length;
      foundChannel = all[fallbackIdx];
      foundIndex = fallbackIdx;
    }

    if (foundChannel) {
      activeChannelIndexRef.current = foundIndex;
      setActiveChannel(foundChannel);
      try {
        localStorage.setItem('leirad_tv_current_channel_id', foundChannel.id);
        localStorage.setItem('leirad_tv_current_channel_url', foundChannel.url);
      } catch {}
      showToast(`Tuned: ${foundChannel.name} (CH ${foundIndex + 1}/${all.length})`);
    }
  }, [showToast]);

  const handleSelectChannel = (channel: Channel) => {
    const idx = channelsRef.current.findIndex((c) => c.id === channel.id || c.url === channel.url);
    if (idx >= 0) activeChannelIndexRef.current = idx;
    setActiveChannel(channel);
    try {
      localStorage.setItem('leirad_tv_current_channel_id', channel.id);
      localStorage.setItem('leirad_tv_current_channel_url', channel.url);
    } catch {}
    showToast(`Tuned: ${channel.name}`);
  };

  const handleToggleFavorite = (channel: Channel) => {
    setFavorites((prev) => {
      const exists = prev.includes(channel.id);
      if (exists) {
        showToast(`Removed from Favorites: ${channel.name}`);
        return prev.filter((id) => id !== channel.id);
      } else {
        showToast(`Added to Favorites: ${channel.name}`);
        return [...prev, channel.id];
      }
    });
  };

  const handleResetBrokenChannels = () => {
    setBrokenChannelIds(new Set());
    try {
      localStorage.removeItem('broken_channels_v1');
    } catch {}
    showToast('Reset all station off-air markers. Rescanning all channels.');
  };

  // Pre-calculate next operational station for background socket pre-warming
  const nextWorkingChannel = useMemo(() => {
    if (channels.length <= 1) return null;
    const all = channels;
    const current = activeChannel;
    let currentIdx = -1;
    if (current) {
      currentIdx = all.findIndex((c) => c.id === current.id || c.url === current.url);
    }
    if (currentIdx === -1) currentIdx = activeChannelIndexRef.current;
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    for (let step = 1; step < all.length; step++) {
      const idx = (currentIdx + step) % all.length;
      const candidate = all[idx];
      if (isHttps && !candidate.isHttps) continue;
      if (brokenChannelIds.has(candidate.id)) continue;
      return candidate;
    }
    return all[(currentIdx + 1) % all.length] || null;
  }, [channels, activeChannel, brokenChannelIds]);

  // Fullscreen trigger helper
  const handleFullscreenTrigger = () => {
    if (!playerSectionRef.current) return;
    if (!document.fullscreenElement) {
      playerSectionRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Playlist Management CRUD Handlers (Used in /admin - Synchronized with Supabase)
  const handleToggleSource = async (id: string) => {
    const current = sources.find((s) => s.id === id);
    if (!current) return;
    const newEnabled = !current.enabled;
    const next = sources.map((s) => (s.id === id ? { ...s, enabled: newEnabled } : s));
    setSources(next);
    await loadAllSources(next);

    if (isSupabaseConfigured()) {
      await updatePlaylistInSupabase(id, { enabled: newEnabled });
    }
  };

  const handleAddSource = async (name: string, url: string, content?: string) => {
    let createdId = `custom-${Date.now()}`;
    if (isSupabaseConfigured()) {
      const res = await createPlaylistInSupabase({
        name,
        url,
        content,
        enabled: true,
        sortOrder: sources.length + 1,
      });
      if (res.data) {
        createdId = res.data.id;
        setIsSupabaseConnected(true);
      }
    }

    const newSource: PlaylistSource = {
      id: createdId,
      name,
      url,
      content,
      enabled: true,
      channelCount: 0,
      sortOrder: sources.length + 1,
    };
    const next = [...sources, newSource];
    setSources(next);
    await loadAllSources(next);
    showToast(`Added playlist: ${name}`);
  };

  const handleUpdateSource = async (id: string, updates: Partial<PlaylistSource>) => {
    const next = sources.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setSources(next);
    await loadAllSources(next);

    if (isSupabaseConfigured()) {
      await updatePlaylistInSupabase(id, updates);
    }
    showToast('Updated playlist source in Supabase');
  };

  const handleRemoveSource = async (id: string) => {
    const next = sources.filter((s) => s.id !== id);
    setSources(next);
    await loadAllSources(next);

    if (isSupabaseConfigured()) {
      await deletePlaylistInSupabase(id);
    }
    showToast('Playlist source removed from database');
  };

  const handleUploadFiles = async (files: File[]) => {
    const newSources: PlaylistSource[] = [];
    for (const file of files) {
      try {
        const text = await file.text();
        let customId = `file-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

        if (isSupabaseConfigured()) {
          const res = await createPlaylistInSupabase({
            name: file.name.replace(/\.[^/.]+$/, ''),
            url: `inline://file-${file.name}`,
            content: text,
            enabled: true,
            sortOrder: sources.length + newSources.length + 1,
          });
          if (res.data) {
            customId = res.data.id;
          }
        }

        newSources.push({
          id: customId,
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: `inline://file-${file.name}`,
          content: text,
          enabled: true,
          channelCount: 0,
        });
      } catch (err) {
        console.error('Failed reading file', file.name, err);
      }
    }
    if (newSources.length > 0) {
      const next = [...sources, ...newSources];
      setSources(next);
      await loadAllSources(next);
      showToast(`Uploaded ${newSources.length} playlist files`);
    }
  };

  const handleReloadAllSources = async () => {
    if (isSupabaseConfigured()) {
      const res = await fetchPlaylistsFromSupabase();
      if (res.isSupabase && res.data && res.data.length > 0) {
        setIsSupabaseConnected(true);
        setSources(res.data);
        await loadAllSources(res.data);
        showToast(`Synced ${res.data.length} playlists from Supabase database`);
        return;
      }
    }
    await loadAllSources(sources);
    showToast('Refreshed all playlist sources');
  };

  const handleResetDefaults = async () => {
    setSources(INITIAL_PLAYLIST_SOURCES);
    try {
      localStorage.setItem('leirad_tv_sources', JSON.stringify(INITIAL_PLAYLIST_SOURCES));
    } catch {}
    await loadAllSources(INITIAL_PLAYLIST_SOURCES);
    showToast('Restored default LEIRAD TV playlist sources.');
  };

  const isCurrentFavorite = Boolean(activeChannel && favorites.includes(activeChannel.id));

  // Compute stats for AdminPortal
  const httpsCount = useMemo(() => channels.filter((c) => c.isHttps).length, [channels]);
  const categoriesCount = useMemo(() => {
    const set = new Set(channels.map((c) => c.group));
    return set.size;
  }, [channels]);
  const countriesCount = useMemo(() => {
    const set = new Set(channels.map((c) => c.countryCode).filter(Boolean));
    return set.size;
  }, [channels]);
  const favoriteChannels = useMemo(
    () => channels.filter((c) => favorites.includes(c.id)),
    [channels, favorites]
  );

  // ROUTE 1: Dedicated Admin Portal at URL /admin (Password protected with Supabase CRUD)
  if (isAdminView) {
    // If not authenticated, require admin password
    if (!isAdminAuthenticatedState) {
      return (
        <AdminLoginGate
          onSuccess={() => setIsAdminAuthenticatedState(true)}
          onReturnToApp={() => navigateTo('/')}
        />
      );
    }

    return (
      <AdminPlaylistManager
        sources={sources}
        onToggleSource={handleToggleSource}
        onAddSource={handleAddSource}
        onUpdateSource={handleUpdateSource}
        onRemoveSource={handleRemoveSource}
        onUploadFiles={handleUploadFiles}
        onReloadAll={handleReloadAllSources}
        onResetDefaults={handleResetDefaults}
        onResetBrokenChannels={handleResetBrokenChannels}
        onReturnToApp={() => navigateTo('/')}
        isLoading={isLoading}
        totalChannels={channels.length}
        httpsCount={httpsCount}
        categoriesCount={categoriesCount}
        countriesCount={countriesCount}
        favorites={favoriteChannels}
        isSupabaseConnected={isSupabaseConnected}
      />
    );
  }

  // ROUTE 2: Public Live Broadcast TV Player (Clean UI for regular viewers)
  return (
    <div
      className={`min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans select-none ${
        isLargeText ? 'text-lg' : 'text-base'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900/95 border border-cyan-500/50 text-cyan-200 text-xs px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header: Clean Public TV Bar (No playlist admin buttons visible to regular users) */}
      <Header
        channel={activeChannel}
        channelIndex={activeChannelIndex}
        totalChannels={channels.length}
        favoritesCount={favorites.length}
        isLargeText={isLargeText}
        onToggleLargeText={() => {
          setIsLargeText(!isLargeText);
          showToast(!isLargeText ? 'Large Text Enabled' : 'Normal Text Enabled');
        }}
        onOpenGuide={() => setShowChannelsSidebar((prev) => !prev)}
        onFullscreen={handleFullscreenTrigger}
      />

      {/* Main Stream Area - Exclusively displaying the Broadcast Stream Video */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-5 flex flex-col items-center justify-center">
        {/* Initial Connecting Screen: only on first cold load when no channels are ready yet */}
        {isLoading && channels.length === 0 && (
          <div className="w-full aspect-video max-w-5xl bg-[#04060a] border border-white/10 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-2xl ring-1 ring-white/5">
            <div className="w-12 h-12 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Loading Live Broadcast Stations
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-normal max-w-md">
              {loadingProgress}
            </p>
          </div>
        )}

        {/* Video Player Display with Channel Drawer inside it for seamless Fullscreen support */}
        {channels.length > 0 && (
          <div
            ref={playerSectionRef}
            className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl [&:fullscreen]:max-w-none [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:bg-black flex flex-col items-center justify-center transition-all duration-300"
          >
            <VideoPlayer
              channel={activeChannel}
              channelIndex={activeChannelIndex}
              totalChannels={channels.length}
              nextChannel={nextWorkingChannel}
              onPrevChannel={handlePrevChannel}
              onNextChannel={handleNextChannel}
              isFavorite={isCurrentFavorite}
              onToggleFavorite={() => activeChannel && handleToggleFavorite(activeChannel)}
              isTheaterMode={false}
              onToggleTheaterMode={() => {}}
              recentChannels={[]}
              onSelectChannel={handleSelectChannel}
              onOpenGuide={() => setShowChannelsSidebar((prev) => !prev)}
              isSidebarOpen={showChannelsSidebar}
              onChannelStatusChange={handleChannelStatusChange}
            >
              {/* RIGHT SIDEBAR CHANNEL SELECTOR DRAWER - Visible in both Normal and Fullscreen mode */}
              <TVGuideDrawer
                isOpen={showChannelsSidebar}
                onClose={() => setShowChannelsSidebar(false)}
                channels={channels}
                brokenChannelIds={brokenChannelIds}
                verifiedWorkingIds={verifiedWorkingIds}
                activeChannel={activeChannel}
                onSelectChannel={handleSelectChannel}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                sources={sources}
                onResetBrokenChannels={handleResetBrokenChannels}
              />
            </VideoPlayer>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
