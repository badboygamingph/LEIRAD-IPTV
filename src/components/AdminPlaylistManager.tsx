import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  RefreshCw,
  Download,
  Radio,
  ShieldCheck,
  Globe2,
  Layers,
  Check,
  Tv,
  ToggleLeft,
  ToggleRight,
  FileCode,
  ShieldAlert,
  Server,
  Database,
  ExternalLink,
  Sparkles,
  Zap,
  RotateCcw,
  Pencil,
  Copy,
  CheckCheck,
  KeyRound,
  LogOut,
  Settings,
  HelpCircle,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  X,
  Play,
  Video
} from 'lucide-react';
import { Channel, PlaylistSource } from '../types';
import {
  PH_M3U_URL,
  MJH_RAW_M3U,
  MJH_KODI_M3U,
  IPTV_ORG_JP,
  FLUXUS_NEW_M3U,
  IPTVMATE_ALL_TV,
  IPTV_ORG_GLOBAL
} from '../utils/m3uParser';
import { isYouTubeUrl, extractYouTubeTitle, getYouTubeEmbedUrl, extractYouTubeVideoId } from '../utils/youtube';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  isSupabaseConfigured,
  testSupabaseConnection,
  SUPABASE_SETUP_SQL,
  createPlaylistInSupabase,
  updatePlaylistInSupabase,
  deletePlaylistInSupabase,
  updateAdminPasswordInSupabase,
  seedPlaylistsToSupabase,
  setAdminAuthenticated,
  DEFAULT_ADMIN_PASSWORD
} from '../utils/supabase';

interface AdminPlaylistManagerProps {
  sources: PlaylistSource[];
  onToggleSource: (id: string) => Promise<void> | void;
  onAddSource: (name: string, url: string, content?: string) => Promise<void> | void;
  onUpdateSource: (id: string, updates: Partial<PlaylistSource>) => Promise<void> | void;
  onRemoveSource: (id: string) => Promise<void> | void;
  onUploadFiles: (files: File[]) => Promise<void> | void;
  onReloadAll: () => Promise<void> | void;
  onResetDefaults?: () => Promise<void> | void;
  onResetBrokenChannels?: () => void;
  onReturnToApp: () => void;
  isLoading: boolean;
  totalChannels: number;
  httpsCount: number;
  categoriesCount: number;
  countriesCount: number;
  favorites: Channel[];
  isSupabaseConnected?: boolean;
}

export const AdminPlaylistManager: React.FC<AdminPlaylistManagerProps> = ({
  sources,
  onToggleSource,
  onAddSource,
  onUpdateSource,
  onRemoveSource,
  onUploadFiles,
  onReloadAll,
  onResetDefaults,
  onResetBrokenChannels,
  onReturnToApp,
  isLoading,
  totalChannels,
  httpsCount,
  categoriesCount,
  countriesCount,
  favorites,
  isSupabaseConnected = false,
}) => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'playlists' | 'youtube' | 'supabase_setup' | 'settings'>('playlists');

  // Form states: Create Playlist
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dedicated YouTube Live Stream form state
  const [ytEmbedInput, setYtEmbedInput] = useState('');
  const [ytChannelName, setYtChannelName] = useState('');
  const [ytCategory, setYtCategory] = useState('News');
  const [ytCountry, setYtCountry] = useState('PH');
  const [ytLogoUrl, setYtLogoUrl] = useState('');
  const [ytDetectedId, setYtDetectedId] = useState<string | null>(null);
  const [isYtSubmitting, setIsYtSubmitting] = useState(false);
  const [previewYtUrl, setPreviewYtUrl] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Edit Modal State
  const [editingSource, setEditingSource] = useState<PlaylistSource | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);
  const [editSortOrder, setEditSortOrder] = useState<number>(0);
  const [editContent, setEditContent] = useState('');

  // Notifications
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Supabase Configuration in Settings
  const [configUrl, setConfigUrl] = useState('');
  const [configAnonKey, setConfigAnonKey] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Change Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ success: boolean; text: string } | null>(null);

  // Active YouTube Live streams across all database sources
  const activeYouTubeStreams = useMemo(() => {
    return sources.filter(
      (s) =>
        isYouTubeUrl(s.url) ||
        (s.content && (s.content.includes('<iframe') || isYouTubeUrl(s.content)))
    );
  }, [sources]);

  // Initialize config values
  useEffect(() => {
    const cfg = getSupabaseConfig();
    setConfigUrl(cfg.url);
    setConfigAnonKey(cfg.anonKey);
  }, []);

  const notify = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Handle Add Source (Create)
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawUrl = newUrl.trim();
    if (!rawUrl) return;
    setIsSubmitting(true);

    let finalName = newName.trim();
    let finalUrl = rawUrl;
    let finalContent = newContent.trim() || undefined;

    // Support YouTube live iframe codes or direct YouTube URLs:
    if (rawUrl.includes('<iframe') || isYouTubeUrl(rawUrl)) {
      const ytTitle = extractYouTubeTitle(rawUrl);
      if (!finalName && ytTitle) {
        finalName = ytTitle;
      }
      const embedUrl = getYouTubeEmbedUrl(rawUrl);
      finalName = finalName || 'YouTube Live Channel';
      finalUrl = embedUrl;
      finalContent = `#EXTM3U\n#EXTINF:-1 tvg-id="yt-${Date.now()}" tvg-country="PH" group-title="YouTube Live",${finalName}\n${embedUrl}\n`;
    }

    finalName = finalName || `Custom Source ${sources.length + 1}`;

    try {
      await onAddSource(finalName, finalUrl, finalContent);
      setNewUrl('');
      setNewName('');
      setNewContent('');
      notify(`Added source "${finalName}" to Supabase & LEIRAD TV.`);
    } catch (err: any) {
      notify(`Error adding source: ${err?.message || 'Failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle YouTube embed input change with auto-detection of video ID and title
  const handleYtInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const val = e.target.value;
    setYtEmbedInput(val);
    const id = extractYouTubeVideoId(val);
    setYtDetectedId(id);
    const title = extractYouTubeTitle(val);
    if (title && !ytChannelName) {
      setYtChannelName(title);
    }
    if (id && !ytLogoUrl) {
      setYtLogoUrl(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
    }
  };

  // Add YouTube Live stream directly to Supabase and LEIRAD TV
  const handleAddYouTubeStream = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = ytEmbedInput.trim();
    if (!raw) return;

    setIsYtSubmitting(true);
    const videoId = extractYouTubeVideoId(raw);
    const embedUrl = getYouTubeEmbedUrl(raw);
    const extractedTitle = extractYouTubeTitle(raw);
    const name =
      ytChannelName.trim() ||
      extractedTitle ||
      (videoId ? `YouTube Live Stream (${videoId})` : `YouTube Live Channel ${sources.length + 1}`);
    const logo = ytLogoUrl.trim() || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '');
    const group = ytCategory.trim() || 'News';
    const country = ytCountry.trim().toUpperCase() || 'PH';

    // Self-contained M3U structure for this station
    const m3uContent = `#EXTM3U\n#EXTINF:-1 tvg-id="yt-${videoId || Date.now()}" tvg-logo="${logo}" tvg-country="${country}" group-title="${group}",${name}\n${embedUrl}\n`;

    try {
      await onAddSource(name, embedUrl, m3uContent);
      setYtEmbedInput('');
      setYtChannelName('');
      setYtLogoUrl('');
      setYtDetectedId(null);
      notify(`Successfully added YouTube Live stream "${name}" to Supabase & LEIRAD TV!`);
    } catch (err: any) {
      notify(`Error adding stream: ${err?.message || 'Failed'}`);
    } finally {
      setIsYtSubmitting(false);
    }
  };

  const handleAddYouTubePreset = async (preset: { name: string; url: string; group: string; logo: string }) => {
    const embedUrl = getYouTubeEmbedUrl(preset.url);
    const videoId = extractYouTubeVideoId(preset.url);
    const m3uContent = `#EXTM3U\n#EXTINF:-1 tvg-id="yt-${videoId || Date.now()}" tvg-logo="${preset.logo}" tvg-country="PH" group-title="${preset.group}",${preset.name}\n${embedUrl}\n`;
    try {
      await onAddSource(preset.name, embedUrl, m3uContent);
      notify(`Added verified preset "${preset.name}" to Supabase & LEIRAD TV!`);
    } catch (err: any) {
      notify(`Error adding preset: ${err?.message || 'Failed'}`);
    }
  };

  // Open Edit Modal (Update)
  const handleOpenEdit = (src: PlaylistSource) => {
    setEditingSource(src);
    setEditName(src.name);
    setEditUrl(src.url);
    setEditEnabled(src.enabled);
    setEditSortOrder(src.sortOrder ?? 0);
    setEditContent(src.content || '');
  };

  // Save Edit (Update)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource) return;

    let finalName = editName.trim();
    let finalUrl = editUrl.trim();
    let finalContent = editContent.trim() || undefined;

    if (finalUrl.includes('<iframe') || isYouTubeUrl(finalUrl)) {
      const ytTitle = extractYouTubeTitle(finalUrl);
      if (!finalName && ytTitle) {
        finalName = ytTitle;
      }
      const embedUrl = getYouTubeEmbedUrl(finalUrl);
      finalName = finalName || 'YouTube Live Channel';
      finalUrl = embedUrl;
      finalContent = `#EXTM3U\n#EXTINF:-1 tvg-id="yt-${Date.now()}" tvg-country="PH" group-title="YouTube Live",${finalName}\n${embedUrl}\n`;
    }

    try {
      await onUpdateSource(editingSource.id, {
        name: finalName,
        url: finalUrl,
        enabled: editEnabled,
        sortOrder: Number(editSortOrder) || 0,
        content: finalContent,
      });
      setEditingSource(null);
      notify(`Updated playlist "${finalName}".`);
    } catch (err: any) {
      notify(`Error updating playlist: ${err?.message || 'Failed'}`);
    }
  };

  // Delete Source (Delete)
  const handleDeleteSource = async (src: PlaylistSource) => {
    if (confirm(`Are you sure you want to delete playlist "${src.name}" from Supabase?`)) {
      try {
        await onRemoveSource(src.id);
        notify(`Deleted playlist "${src.name}".`);
      } catch (err: any) {
        notify(`Error deleting: ${err?.message || 'Failed'}`);
      }
    }
  };

  // File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await onUploadFiles(Array.from(files));
      if (fileInputRef.current) fileInputRef.current.value = '';
      notify(`Uploaded and saved ${files.length} M3U playlist file(s).`);
    }
  };

  // Copy Supabase SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
    notify('Copied complete Supabase SQL Setup script to clipboard!');
  };

  // Test Supabase Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Temporarily save to test
      saveSupabaseConfig(configUrl, configAnonKey);
      const res = await testSupabaseConnection();
      setTestResult(res);
      notify(res.message);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Supabase Configuration
  const handleSaveConfig = () => {
    saveSupabaseConfig(configUrl, configAnonKey);
    notify('Supabase project configuration saved. Reloading feeds...');
    onReloadAll();
  };

  // Seed default playlists into Supabase
  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const res = await seedPlaylistsToSupabase(sources);
      if (res.success) {
        notify(`Successfully seeded ${res.count} playlists into Supabase database!`);
        await onReloadAll();
      } else {
        notify(`Seed error: ${res.error || 'Failed'}`);
      }
    } catch (e: any) {
      notify(`Seed error: ${e?.message || 'Failed'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Change Admin Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ success: false, text: 'Passwords do not match. Please verify.' });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordNotice({ success: false, text: 'Password must be at least 4 characters long.' });
      return;
    }

    try {
      const res = await updateAdminPasswordInSupabase(newPassword);
      if (res.success) {
        setPasswordNotice({ success: true, text: res.message });
        setNewPassword('');
        setConfirmPassword('');
        notify('Master admin password updated in Supabase!');
      } else {
        setPasswordNotice({ success: false, text: res.message });
      }
    } catch (err: any) {
      setPasswordNotice({ success: false, text: err?.message || 'Failed updating password' });
    }
  };

  // Logout from /admin
  const handleSignOut = () => {
    setAdminAuthenticated(false);
    onReturnToApp();
  };

  // Export favorites M3U
  const handleExportFavoritesM3U = () => {
    if (favorites.length === 0) return;
    let content = '#EXTM3U\n';
    favorites.forEach((c) => {
      content += `#EXTINF:-1 tvg-id="${c.tvgId}" tvg-logo="${c.logo}" group-title="${c.group}",${c.name}\n${c.url}\n`;
    });
    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leirad-tv-favorites.m3u';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  // Preset quick adds
  const PRESET_SOURCES = [
    { name: 'Philippines IPHTV (Harleythetech - Live)', url: PH_M3U_URL },
    { name: 'MJH NZ Global Live Broadcasts', url: MJH_RAW_M3U },
    { name: 'MJH NZ Kodi Live TV', url: MJH_KODI_M3U },
    { name: 'Japan Broadcasts (IPTV-Org)', url: IPTV_ORG_JP },
    { name: 'Fluxus TV (Updated Streams)', url: FLUXUS_NEW_M3U },
    { name: 'IPTV Mate All TV', url: IPTVMATE_ALL_TV },
    { name: 'IPTV-Org Global Index', url: IPTV_ORG_GLOBAL },
  ];

  // Verified Philippine YouTube Live Stream presets
  const PHILIPPINE_YOUTUBE_PRESETS = [
    {
      name: 'Showtime Online U (ABS-CBN Live)',
      url: '<iframe width="1059" height="595" src="https://www.youtube.com/embed/tamUy3G8N88" title="Showtime Online U | October 13, 2026" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
      group: 'Entertainment',
      logo: 'https://img.youtube.com/vi/tamUy3G8N88/hqdefault.jpg',
      badge: 'ABS-CBN Variety',
    },
    {
      name: 'GMA News Live Coverage',
      url: '<iframe width="1059" height="595" src="https://www.youtube.com/embed/K5aQKcayAKk" title="LIVE - Impeachment Trial of VP Sara Duterte - DAY 39 (Oct. 13, 2026) | GMA News Special Coverage" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
      group: 'News',
      logo: 'https://img.youtube.com/vi/K5aQKcayAKk/hqdefault.jpg',
      badge: 'GMA Special Live',
    },
    {
      name: 'ABS-CBN News 24/7 Live Stream',
      url: 'https://www.youtube.com/watch?v=live',
      group: 'News',
      logo: 'https://img.youtube.com/vi/live/hqdefault.jpg',
      badge: 'Rolling News',
    },
    {
      name: 'PTV 4 Philippines Live',
      url: 'https://www.youtube.com/@PTVPhilippines/live',
      group: 'News',
      logo: 'https://yt3.googleusercontent.com/ytc/AIdro_n4=s176-c-k-c0x00ffffff-no-rj',
      badge: 'Government TV',
    },
  ];

  // Filtered sources
  const filteredSources = sources.filter((s) => {
    if (filterEnabled === 'enabled' && !s.enabled) return false;
    if (filterEnabled === 'disabled' && s.enabled) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col select-none">
      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#090d18]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-rose-500 to-cyan-500 flex items-center justify-center text-slate-950 font-extrabold shadow-md shadow-amber-500/20 shrink-0">
            <ShieldAlert className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg text-white tracking-tight">
                LEIRAD TV · Admin Portal
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
                /admin
              </span>
              {isSupabaseConnected ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Supabase Live
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Local Fallback
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Supabase M3U Playlist Database CRUD & Master Broadcast Engine Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation Tabs */}
          <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1 text-xs">
            <button
              onClick={() => setActiveTab('playlists')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'playlists'
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Playlists CRUD
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'youtube'
                  ? 'bg-rose-500 text-white shadow shadow-rose-500/25'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>YouTube Live</span>
              {activeYouTubeStreams.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono font-bold">
                  {activeYouTubeStreams.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('supabase_setup')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'supabase_setup'
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Supabase SQL Guide</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Database & Security</span>
            </button>
          </div>

          <button
            onClick={onReturnToApp}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
            title="Return to the public Live TV player"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Return to Public Player</span>
          </button>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/40 border border-white/10 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            title="Lock Admin Portal & Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="flex md:hidden border-b border-white/10 bg-[#090d18] px-4 py-2 gap-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('playlists')}
          className={`px-3 py-1.5 rounded-lg font-bold shrink-0 ${
            activeTab === 'playlists' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
          }`}
        >
          Playlists CRUD
        </button>
        <button
          onClick={() => setActiveTab('youtube')}
          className={`px-3 py-1.5 rounded-lg font-bold shrink-0 flex items-center gap-1 ${
            activeTab === 'youtube' ? 'bg-rose-500 text-white' : 'text-slate-400'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>YouTube Live ({activeYouTubeStreams.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('supabase_setup')}
          className={`px-3 py-1.5 rounded-lg font-bold shrink-0 ${
            activeTab === 'supabase_setup' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
          }`}
        >
          Supabase SQL Setup
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-1.5 rounded-lg font-bold shrink-0 ${
            activeTab === 'settings' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
          }`}
        >
          Database & Password
        </button>
      </div>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Action / Toast Notification */}
        {actionNotice && (
          <div className="p-3.5 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 shadow-lg shadow-cyan-500/10">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{actionNotice}</span>
            </span>
            <button onClick={() => setActionNotice(null)} className="text-cyan-400 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: PLAYLISTS CRUD MANAGEMENT */}
        {activeTab === 'playlists' && (
          <>
            {/* Health & Inventory Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Total Stations</span>
                  <Tv className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                    {totalChannels.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Parsed from active feeds</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Verified HTTPS Streams</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300 tracking-tight font-mono">
                    {httpsCount.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">100% browser HTTPS compatible</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Genres / Categories</span>
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                    {categoriesCount}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Auto-classified genres</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>Supabase Playlists</span>
                  <Database className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-tight font-mono">
                    {sources.filter((s) => s.enabled).length} / {sources.length}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Enabled feeds in database</p>
                </div>
              </div>
            </div>

            {/* CREATE: Add New Playlist to Supabase */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0f1a] border border-white/10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-cyan-400" />
                    <span>Create & Insert M3U Playlist to Supabase</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Insert any new M3U / M3U8 broadcast feed into the Supabase database. Viewers will automatically receive channels from it.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".m3u,.m3u8,.txt"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Upload .M3U File</span>
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleAddSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                      Playlist Label / Name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Philippines HD News & Sports"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                      M3U / M3U8 Feed URL, YouTube Live, or &lt;iframe&gt; Embed Code
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://...playlist.m3u, YouTube Live URL, or <iframe src='...'></iframe>"
                        required
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-cyan-500/20 shrink-0 flex items-center gap-1.5 disabled:opacity-60"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isSubmitting ? 'Inserting...' : 'Insert to Supabase'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Quick Add Presets */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 block mb-2">
                  Quick-Insert Verified Working Feeds:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_SOURCES.map((preset) => {
                    const alreadyAdded = sources.some((s) => s.url === preset.url);
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={async () => {
                          await onAddSource(preset.name, preset.url);
                          notify(`Inserted "${preset.name}" into Supabase database.`);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                          alreadyAdded
                            ? 'bg-slate-950/50 text-slate-500 border-slate-800 cursor-not-allowed'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                        }`}
                      >
                        <span>{preset.name}</span>
                        {alreadyAdded ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* READ & UPDATE & DELETE: Existing Playlists in Supabase */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0f1a] border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-400" />
                    <span>Supabase Playlist Sources ({sources.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Full CRUD operations: Toggle active state, edit URLs/titles, or delete from database.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onReloadAll}
                    disabled={isLoading}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Syncing...' : 'Sync From Supabase'}</span>
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search playlists by name or URL..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setFilterEnabled('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      filterEnabled === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    All ({sources.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterEnabled('enabled')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      filterEnabled === 'enabled' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    Active ({sources.filter((s) => s.enabled).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterEnabled('disabled')}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      filterEnabled === 'disabled' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400'
                    }`}
                  >
                    Disabled ({sources.filter((s) => !s.enabled).length})
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                {filteredSources.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No playlists matched your search or filters.
                  </div>
                ) : (
                  filteredSources.map((src, idx) => {
                    const isInline = src.url.startsWith('inline://') || src.id === 'leirad-official-stations';
                    return (
                      <div
                        key={src.id}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleSource(src.id)}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                            title={src.enabled ? 'Click to disable feed' : 'Click to enable feed'}
                          >
                            {src.enabled ? (
                              <ToggleRight className="w-6 h-6 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-slate-600" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-white truncate">
                                {src.name}
                              </span>
                              {isInline ? (
                                <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-[9px] font-bold uppercase shrink-0">
                                  LEIRAD CORE
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] font-bold shrink-0">
                                  M3U FEED
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  src.enabled
                                    ? 'bg-emerald-950/70 border border-emerald-500/30 text-emerald-300'
                                    : 'bg-slate-900 border border-slate-700 text-slate-500'
                                }`}
                              >
                                {src.channelCount} CH
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                              {src.url}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons: UPDATE & DELETE */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(src)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors cursor-pointer"
                            title="Edit Playlist Details (Update in Supabase)"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSource(src)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete Source from Supabase"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Maintenance & Export */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0f1a] border border-white/10 space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                <span>Broadcast Engine Maintenance Tools</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {onResetBrokenChannels && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-white">Reset Off-Air Status Cache</h4>
                    <p className="text-[11px] text-slate-400">
                      Clears the cache of temporarily resting stations so every station is re-probed from scratch.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onResetBrokenChannels();
                        notify('Cleared off-air cache. All stations will be re-scanned.');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Rescan All Channels
                    </button>
                  </div>
                )}

                {onResetDefaults && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-white">Restore Factory Sources</h4>
                    <p className="text-[11px] text-slate-400">
                      Resets active playlist feeds to default official LEIRAD TV and verified sources.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Reset to default LEIRAD TV playlist sources?')) {
                          await onResetDefaults();
                          notify('Restored default playlist sources.');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Reset Sources
                    </button>
                  </div>
                )}

                {favorites.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-white">Export Favorites ({favorites.length})</h4>
                    <p className="text-[11px] text-slate-400">
                      Download an .M3U file containing all bookmarked stations to use in external players.
                    </p>
                    <button
                      type="button"
                      onClick={handleExportFavoritesM3U}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadSuccess ? 'Downloaded!' : 'Export Favorites .M3U'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB: YOUTUBE LIVE STREAMS BROADCAST CENTER */}
        {activeTab === 'youtube' && (
          <div className="space-y-6">
            {/* Header / Mode explanation banner */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-rose-950/60 via-[#0b0f1a] to-slate-900 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>YouTube Live Stream Broadcast Engine</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Radio className="w-6 h-6 text-rose-500" />
                  <span>YouTube Live Streams & &lt;iframe&gt; Embeds</span>
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Add and broadcast any YouTube Live video stream into LEIRAD TV and Supabase. Paste raw <code className="text-rose-400 bg-rose-950/60 px-1 py-0.5 rounded">&lt;iframe&gt;</code> embed codes or YouTube URLs. LEIRAD TV automatically applies Clean Broadcast Mode to hide YouTube chrome, titles, avatars, share icons, and "More videos" overlays.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/20 text-center min-w-[100px]">
                  <div className="text-2xl font-black text-rose-400 font-mono">
                    {activeYouTubeStreams.length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Active Streams
                  </div>
                </div>
              </div>
            </div>

            {/* Verified 1-Click Philippine Live Presets */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0f1a] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Quick-Add Verified Philippine Live Stream Presets (1-Click)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Instantly add high-demand Philippine live streams with verified embed parameters directly into Supabase.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {PHILIPPINE_YOUTUBE_PRESETS.map((preset, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 hover:border-rose-500/40 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-rose-950/50 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 overflow-hidden">
                        {preset.logo ? (
                          <img
                            src={preset.logo}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Radio className="w-5 h-5 text-rose-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">
                          {preset.badge}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                          {preset.name}
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          {preset.group} · PH
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddYouTubePreset(preset)}
                      className="w-full py-1.5 px-3 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-rose-600/20 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Supabase</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Custom YouTube Live Stream Form */}
            <div className="p-5 sm:p-7 rounded-2xl bg-[#0b0f1a] border border-white/10 space-y-5">
              <div className="pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-rose-500" />
                  <span>Add New Live Stream via YouTube Embed Code or URL</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Paste the full YouTube <code className="text-rose-400">&lt;iframe ...&gt;</code> embed code or a YouTube video link. The video ID, title, and thumbnail are detected automatically.
                </p>
              </div>

              <form onSubmit={handleAddYouTubeStream} className="space-y-4">
                {/* Embed Code / URL Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>YouTube &lt;iframe&gt; Embed Code or Live Stream URL *</span>
                    {ytDetectedId && (
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                        ✓ Detected ID: {ytDetectedId}
                      </span>
                    )}
                  </label>
                  <textarea
                    rows={3}
                    value={ytEmbedInput}
                    onChange={handleYtInputChange}
                    placeholder={`<iframe width="1059" height="595" src="https://www.youtube.com/embed/tamUy3G8N88" title="Showtime Online U | October 13, 2026" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`}
                    required
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl p-3.5 text-xs text-white font-mono focus:outline-none placeholder:text-slate-600 transition-colors"
                  />
                  <p className="text-[11px] text-slate-400">
                    Supports raw <code className="text-slate-300">&lt;iframe src="https://www.youtube.com/embed/..."&gt;</code>, watch URLs (<code className="text-slate-300">youtube.com/watch?v=...</code>), or short links (<code className="text-slate-300">youtu.be/...</code>).
                  </p>
                </div>

                {/* Form fields: Channel Name, Category, Country, Logo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                      Channel / Broadcast Title *
                    </label>
                    <input
                      type="text"
                      value={ytChannelName}
                      onChange={(e) => setYtChannelName(e.target.value)}
                      placeholder="e.g. Showtime Online U Live"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                      Category / Group
                    </label>
                    <select
                      value={ytCategory}
                      onChange={(e) => setYtCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="News">News</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Variety">Variety</option>
                      <option value="Sports">Sports</option>
                      <option value="Music">Music</option>
                      <option value="General">General</option>
                      <option value="Philippines General">Philippines General</option>
                      <option value="Special Coverage">Special Coverage</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                      Country Code
                    </label>
                    <input
                      type="text"
                      value={ytCountry}
                      onChange={(e) => setYtCountry(e.target.value.toUpperCase())}
                      maxLength={2}
                      placeholder="PH"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase focus:outline-none placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                      Channel Logo / Thumbnail URL
                    </label>
                    <input
                      type="text"
                      value={ytLogoUrl}
                      onChange={(e) => setYtLogoUrl(e.target.value)}
                      placeholder="https://img.youtube.com/vi/.../hqdefault.jpg"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {ytDetectedId && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewYtUrl(
                            previewYtUrl === getYouTubeEmbedUrl(ytEmbedInput)
                              ? null
                              : getYouTubeEmbedUrl(ytEmbedInput)
                          )
                        }
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-rose-400" />
                        <span>{previewYtUrl ? 'Hide Live Preview' : 'Test Live Stream Preview'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isYtSubmitting || !ytEmbedInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 ml-auto"
                  >
                    {isYtSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Stream to Supabase...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add Live Stream to Supabase & Live TV</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Inline Live Stream Preview Box */}
              {previewYtUrl && (
                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                      <span>Live Stream Clean Broadcast Test Preview</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewYtUrl(null)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Close Preview ✕
                    </button>
                  </div>
                  <div className="w-full max-w-2xl mx-auto aspect-video rounded-xl overflow-hidden bg-black relative border border-white/10">
                    <iframe
                      src={previewYtUrl}
                      title="Preview Player"
                      className="w-full h-full border-0 absolute inset-0 scale-[1.26] pointer-events-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Active YouTube Broadcast Channels List */}
            <div className="p-5 sm:p-7 rounded-2xl bg-[#0b0f1a] border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Tv className="w-5 h-5 text-rose-400" />
                    <span>Active YouTube Broadcast Channels ({activeYouTubeStreams.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live video streams currently synchronized with Supabase and available on LEIRAD TV.
                  </p>
                </div>
              </div>

              {activeYouTubeStreams.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mx-auto">
                    <Radio className="w-6 h-6" />
                  </div>
                  <p className="text-xs">
                    No custom YouTube live streams added yet. Paste a YouTube &lt;iframe&gt; embed code above or click one of the verified 1-click presets!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeYouTubeStreams.map((src) => {
                    const videoId = extractYouTubeVideoId(src.url) || (src.content ? extractYouTubeVideoId(src.content) : null);
                    const thumb = videoId
                      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                      : 'https://www.youtube.com/s/desktop/f7125345/img/favicon_144x144.png';

                    return (
                      <div
                        key={src.id}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-12 rounded-lg bg-black border border-white/10 overflow-hidden shrink-0 relative flex items-center justify-center">
                            <img
                              src={thumb}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Radio className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 font-mono text-[9px] font-bold border border-rose-500/30">
                                YouTube Live
                              </span>
                              {src.enabled ? (
                                <span className="text-[10px] text-emerald-400 font-bold">● Active</span>
                              ) : (
                                <span className="text-[10px] text-slate-500">○ Paused</span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-white truncate" title={src.name}>
                              {src.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate font-mono">
                              {videoId ? `ID: ${videoId}` : src.url}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewYtUrl(getYouTubeEmbedUrl(src.url || src.content || ''))
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Play className="w-3 h-3 text-rose-400" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSource(src)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete Live Stream from Supabase"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SUPABASE SQL SETUP GUIDE */}
        {activeTab === 'supabase_setup' && (
          <div className="p-5 sm:p-7 rounded-2xl bg-[#0b0f1a] border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold mb-1.5">
                  <Database className="w-3.5 h-3.5" />
                  <span>Ready to Paste into Supabase SQL Editor</span>
                </div>
                <h2 className="text-xl font-extrabold text-white">
                  Step-by-Step Supabase Database Setup Guide
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Follow these simple steps to configure your Supabase database with all tables, initial IPTV feeds, and admin password protection.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer shrink-0"
              >
                {copiedSql ? (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    <span>Copied SQL Script!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Supabase SQL Script</span>
                  </>
                )}
              </button>
            </div>

            {/* Step-by-Step Walkthrough */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-extrabold font-mono flex items-center justify-center text-xs">
                  1
                </div>
                <h4 className="text-xs font-bold text-white">Open Supabase Dashboard</h4>
                <p className="text-[11px] text-slate-400">
                  Navigate to your project at <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">supabase.com/dashboard</a>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-extrabold font-mono flex items-center justify-center text-xs">
                  2
                </div>
                <h4 className="text-xs font-bold text-white">Click "SQL Editor"</h4>
                <p className="text-[11px] text-slate-400">
                  On the left navigation menu, click the <strong>SQL Editor</strong> icon, then click <strong>"+ New query"</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-extrabold font-mono flex items-center justify-center text-xs">
                  3
                </div>
                <h4 className="text-xs font-bold text-white">Paste & Click "Run"</h4>
                <p className="text-[11px] text-slate-400">
                  Paste the SQL code from below and click the green <strong>"Run"</strong> button (or press Ctrl + Enter).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-extrabold font-mono flex items-center justify-center text-xs">
                  4
                </div>
                <h4 className="text-xs font-bold text-white">Connect Credentials</h4>
                <p className="text-[11px] text-slate-400">
                  Go to <strong>Project Settings → API</strong> to copy your Project URL & Anon Key, and paste them in the <strong>Database & Security</strong> tab!
                </p>
              </div>
            </div>

            {/* SQL Code Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px]">supabase_schema.sql (Ready to Paste)</span>
                <span className="text-[11px] text-emerald-400">✓ Includes initial password: D@rielgwapo223</span>
              </div>
              <div className="relative">
                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-100/90 overflow-x-auto max-h-96 leading-relaxed selection:bg-cyan-500/40">
                  {SUPABASE_SETUP_SQL}
                </pre>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                >
                  {copiedSql ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DATABASE & SECURITY SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Supabase Connection Config */}
            <div className="p-5 sm:p-7 rounded-2xl bg-[#0b0f1a] border border-white/10 space-y-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <span>Supabase Project Connection Credentials</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter your Supabase project parameters below. Once configured, all M3U playlist URLs and admin passwords are synchronously loaded directly from your Supabase database.
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                      : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1.5 block uppercase">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={configUrl}
                    onChange={(e) => setConfigUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Found in Project Settings → API → Project URL</p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1.5 block uppercase">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    value={configAnonKey}
                    onChange={(e) => setConfigAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Found in Project Settings → API → Project API Keys (anon public)</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  Save Configuration
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !configUrl || !configAnonKey}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSeedDefaults}
                  disabled={isSeeding}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ml-auto"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{isSeeding ? 'Seeding...' : 'Seed Current Feeds into Supabase'}</span>
                </button>
              </div>
            </div>

            {/* Change Admin Password */}
            <div className="p-5 sm:p-7 rounded-2xl bg-[#0b0f1a] border border-white/10 space-y-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  <span>Change Master Admin Password</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update the password required to access the /admin portal. This is stored directly in Supabase table <code className="font-mono text-cyan-400">admin_settings</code>.
                </p>
              </div>

              {passwordNotice && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                    passwordNotice.success
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                      : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                  }`}
                >
                  <span>{passwordNotice.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3 max-w-lg">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                    New Master Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new admin password..."
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                    Confirm New Master Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new admin password..."
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Update Admin Password in Supabase
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* UPDATE MODAL: Edit Playlist Source */}
      {editingSource && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0b0f1a] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">
                  Edit Playlist in Supabase
                </h3>
              </div>
              <button
                onClick={() => setEditingSource(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                  Playlist Name / Label
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                  M3U / M3U8 Stream URL
                </label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={editSortOrder}
                    onChange={(e) => setEditSortOrder(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditEnabled(!editEnabled)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      editEnabled
                        ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {editEnabled ? 'Active (Enabled)' : 'Inactive (Disabled)'}
                  </button>
                </div>
              </div>

              {editUrl.startsWith('inline://') && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block uppercase">
                    Raw Inline M3U Content
                  </label>
                  <textarea
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSource(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  Save Changes to Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
