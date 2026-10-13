import React, { useState, useRef } from 'react';
import {
  X,
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
  FileCode
} from 'lucide-react';
import { Channel, PlaylistSource } from '../types';
import { PH_M3U_URL, DEFAULT_M3U_URL } from '../utils/m3uParser';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: PlaylistSource[];
  onToggleSource: (id: string) => void;
  onAddSource: (name: string, url: string) => void;
  onRemoveSource: (id: string) => void;
  onUploadFiles: (files: File[]) => void;
  onReloadAll: () => void;
  isLoading: boolean;
  totalChannels: number;
  httpsCount: number;
  categoriesCount: number;
  countriesCount: number;
  favorites: Channel[];
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  sources,
  onToggleSource,
  onAddSource,
  onRemoveSource,
  onUploadFiles,
  onReloadAll,
  isLoading,
  totalChannels,
  httpsCount,
  categoriesCount,
  countriesCount,
  favorites,
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    const name = newName.trim() || `Playlist ${sources.length + 1}`;
    onAddSource(name, newUrl.trim());
    setNewUrl('');
    setNewName('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadFiles(Array.from(files));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                LEIRAD TV Playlist Manager
              </h3>
              <p className="text-xs text-slate-400">
                Add multiple M3U URLs or upload playlist files into your TV lineup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                Total Channels
              </span>
              <p className="text-lg font-bold font-mono text-cyan-300 tabular-nums">
                {totalChannels.toLocaleString()}
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                Active Sources
              </span>
              <p className="text-lg font-bold font-mono text-white tabular-nums">
                {sources.filter(s => s.enabled).length} of {sources.length}
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                HTTPS Channels
              </span>
              <p className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                {httpsCount.toLocaleString()}
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                TV Categories
              </span>
              <p className="text-lg font-bold font-mono text-amber-300 tabular-nums">
                {categoriesCount}
              </p>
            </div>
          </div>

          {/* Active Playlist Sources List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Connected Playlist Sources ({sources.length}):
              </h4>
              <button
                onClick={onReloadAll}
                disabled={isLoading}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Reload All Playlists</span>
              </button>
            </div>

            <div className="space-y-2">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 transition-colors ${
                    source.enabled
                      ? 'bg-slate-950 border-slate-700/80'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => onToggleSource(source.id)}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
                      title={source.enabled ? 'Disable source' : 'Enable source'}
                    >
                      {source.enabled ? (
                        <ToggleRight className="w-7 h-7 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-600" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-white truncate">
                          {source.name}
                        </h5>
                        {source.channelCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono text-cyan-300">
                            {source.channelCount.toLocaleString()} ch
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate max-w-sm sm:max-w-md mt-0.5">
                        {source.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {sources.length > 1 && (
                      <button
                        onClick={() => onRemoveSource(source.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Remove this playlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Another M3U URL Form */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Add Another M3U URL</span>
            </h4>

            <form onSubmit={handleAddSubmit} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Playlist Name (e.g. Philippines TV, News)"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/playlist.m3u"
                  className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {/* Preset quick insertion */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewName('Philippines IPHTV (Harleythetech)');
                      setNewUrl(PH_M3U_URL);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-bold cursor-pointer"
                  >
                    🇵🇭 Philippines IPHTV (ph.m3u)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewName('Global IPTV');
                      setNewUrl(DEFAULT_M3U_URL);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    🌐 Global iptv-org
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !newUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Playlist URL</span>
                </button>
              </div>
            </form>
          </div>

          {/* Upload Multiple Local M3U Files Section */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Upload Multiple Local .m3u / .m3u8 Playlist Files</span>
              </h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select one or multiple M3U files from your computer or phone to add to your channels
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".m3u,.m3u8,text/plain"
                onChange={handleFileChange}
                className="hidden"
                id="m3u-file-input"
              />
              <label
                htmlFor="m3u-file-input"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer shadow-md"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Choose .M3U Files</span>
              </label>
            </div>
          </div>

          {/* Export Favorites Section */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">
                Export Your Favorites Playlist
              </p>
              <p className="text-[11px] text-slate-400">
                Download your bookmarked stations as a standalone .m3u playlist
              </p>
            </div>
            <button
              onClick={handleExportFavoritesM3U}
              disabled={favorites.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download .m3u ({favorites.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {sources.length} playlist source{sources.length === 1 ? '' : 's'} connected
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer shadow-md"
          >
            Close Manager
          </button>
        </div>
      </div>
    </div>
  );
};
