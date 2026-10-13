import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Play,
  Bookmark,
  Tv,
  Sparkles,
  SlidersHorizontal,
  Zap,
  ArrowUp,
  Target,
  RotateCcw,
  Filter,
  Check,
  Radio,
  Volume2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Channel, PlaylistSource } from '../types';

interface TVGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  brokenChannelIds?: Set<string>;
  verifiedWorkingIds?: Set<string>;
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  favorites: string[];
  onToggleFavorite: (channel: Channel, e: React.MouseEvent) => void;
  sources?: PlaylistSource[];
  onOpenPlaylistModal?: () => void;
  onResetBrokenChannels?: () => void;
}

export const TVGuideDrawer: React.FC<TVGuideDrawerProps> = ({
  isOpen,
  onClose,
  channels,
  brokenChannelIds = new Set<string>(),
  verifiedWorkingIds = new Set<string>(),
  activeChannel,
  onSelectChannel,
  favorites,
  onToggleFavorite,
  sources = [],
  onOpenPlaylistModal,
  onResetBrokenChannels,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Working');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Progressive infinite scroll window: starts at 150 and grows dynamically
  const [visibleCount, setVisibleCount] = useState(150);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Horizontal pill bar scroll controls
  const pillContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkPillScroll = useCallback(() => {
    if (!pillContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = pillContainerRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  const scrollPills = (direction: 'left' | 'right') => {
    if (!pillContainerRef.current) return;
    const offset = direction === 'left' ? -220 : 220;
    pillContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    setTimeout(checkPillScroll, 320);
  };

  const handlePillsWheel = (e: React.WheelEvent) => {
    if (pillContainerRef.current && Math.abs(e.deltaY) > 0) {
      pillContainerRef.current.scrollLeft += e.deltaY;
      checkPillScroll();
    }
  };

  // Mouse click & drag to scroll
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!pillContainerRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - pillContainerRef.current.offsetLeft;
    startScrollLeftRef.current = pillContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !pillContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - pillContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    pillContainerRef.current.scrollLeft = startScrollLeftRef.current - walk;
    checkPillScroll();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Re-check scroll buttons when drawer opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(checkPillScroll, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, checkPillScroll]);

  const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  // Categories list with counts
  const { categories, categoryCounts } = useMemo(() => {
    const counts = new Map<string, number>();
    channels.forEach((c) => {
      if (c.group && c.group !== 'Undefined') {
        const grp = c.group.trim();
        counts.set(grp, (counts.get(grp) || 0) + 1);
      }
    });
    const sorted = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
    return { categories: sorted, categoryCounts: counts };
  }, [channels]);

  // Countries list sorted by channel count
  const countryOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; flag: string; count: number }>();
    channels.forEach((c) => {
      if (c.countryCode) {
        const code = c.countryCode.toUpperCase();
        if (!map.has(code)) {
          map.set(code, {
            code,
            name: c.countryName || code,
            flag: c.countryFlag || '🌐',
            count: 0,
          });
        }
        map.get(code)!.count++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [channels]);

  // Sources with actual parsed count
  const sourcesWithCounts = useMemo(() => {
    return sources.map((s) => {
      const realCount = channels.filter((c) => c.sourceId === s.id).length;
      return {
        ...s,
        channelCount: realCount || s.channelCount,
      };
    });
  }, [sources, channels]);

  // Total working count
  const totalWorkingCount = useMemo(() => {
    return channels.filter((c) => {
      if (isPageHttps && !c.isHttps) return false;
      if (brokenChannelIds.has(c.id)) return false;
      return true;
    }).length;
  }, [channels, brokenChannelIds, isPageHttps]);

  // Filter channels based on selected criteria
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return channels.filter((c) => {
      // 1. Working channels category filter
      if (selectedCategory === 'Working') {
        if (isPageHttps && !c.isHttps) return false;
        if (brokenChannelIds.has(c.id)) return false;
      }

      // 2. Favorites category filter
      if (selectedCategory === 'Favorites') {
        if (!favorites.includes(c.id)) return false;
      }

      // 3. Philippines category filter
      if (selectedCategory === 'PH') {
        const isPh =
          (c.countryCode && c.countryCode.toUpperCase() === 'PH') ||
          (c.tvgId && c.tvgId.endsWith('.ph')) ||
          (c.group && c.group.toLowerCase().includes('philippine'));
        if (!isPh) return false;
      }

      // 4. Custom Genre category filter
      if (
        selectedCategory !== 'All' &&
        selectedCategory !== 'Working' &&
        selectedCategory !== 'Favorites' &&
        selectedCategory !== 'PH'
      ) {
        const catLower = selectedCategory.toLowerCase();
        const grpLower = (c.group || '').toLowerCase();
        if (grpLower !== catLower && !grpLower.includes(catLower)) return false;
      }

      // 5. Advanced Country filter
      if (selectedCountry !== 'All') {
        const selCountryUpper = selectedCountry.toUpperCase();
        const codeUpper = (c.countryCode || '').toUpperCase();
        const nameUpper = (c.countryName || '').toUpperCase();
        if (codeUpper !== selCountryUpper && !nameUpper.includes(selCountryUpper)) return false;
      }

      // 6. Advanced Playlist Source filter
      if (selectedSource !== 'All' && c.sourceId !== selectedSource) {
        return false;
      }

      // 7. Search query filter (matches name, genre, country, or source)
      if (q) {
        const matchName = c.name.toLowerCase().includes(q);
        const matchCat = (c.group || '').toLowerCase().includes(q);
        const matchCountry = (c.countryName || '').toLowerCase().includes(q);
        const matchSource = (c.sourceName || '').toLowerCase().includes(q);
        const matchYt = Boolean(c.isYouTube && ('youtube'.includes(q) || 'yt'.includes(q) || 'live'.includes(q)));
        if (!matchName && !matchCat && !matchCountry && !matchSource && !matchYt) return false;
      }

      return true;
    });
  }, [
    channels,
    selectedCategory,
    selectedCountry,
    selectedSource,
    searchTerm,
    favorites,
    brokenChannelIds,
    isPageHttps,
  ]);

  // Handle progressive scroll loading
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 350) {
      setVisibleCount((prev) => Math.min(prev + 100, filtered.length));
    }
  }, [filtered.length]);

  // Reset visible count when filter or search changes
  useEffect(() => {
    setVisibleCount(150);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [searchTerm, selectedCategory, selectedCountry, selectedSource]);

  // Scroll to active channel
  const scrollToActive = useCallback(() => {
    if (!activeChannel) return;
    const el = document.getElementById(`channel-item-${activeChannel.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeChannel]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Keyboard navigation & escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto scroll to active station once when opened
  useEffect(() => {
    if (isOpen && activeChannel) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`channel-item-${activeChannel.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeChannel?.id]);

  if (!isOpen) return null;

  // Popular category pills for instant 1-click access
  const QUICK_TABS = [
    { id: 'Working', label: '⚡ Working Only', count: totalWorkingCount },
    { id: 'Favorites', label: '⭐ Favorites', count: favorites.length },
    { id: 'PH', label: '🇵🇭 Philippines' },
    { id: 'Sports', label: '⚽ Sports' },
    { id: 'News', label: '📰 News' },
    { id: 'Movies', label: '🎬 Movies' },
    { id: 'Music', label: '🎵 Music' },
    { id: 'Kids', label: '🧒 Kids' },
    { id: 'Documentary', label: '📚 Documentary' },
    { id: 'All', label: 'All Channels', count: channels.length },
  ];

  const hasAdvancedFilters = selectedCountry !== 'All' || selectedSource !== 'All';

  const resetAllFilters = () => {
    setSelectedCategory('Working');
    setSelectedCountry('All');
    setSelectedSource('All');
    setSearchTerm('');
    setShowAdvancedFilters(false);
  };

  const drawerContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl sm:max-w-2xl h-full bg-[#080c16] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================================
            HEADER: Clean, Modern & Informative
           ========================================================================= */}
        <div className="p-4 sm:p-5 bg-[#0b101e] border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-extrabold shadow-md shadow-cyan-500/20 shrink-0">
              <Tv className="w-5 h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  Channel Selector
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold shrink-0">
                  {filtered.length.toLocaleString()} Stations
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Click any channel to tune in instantly · Use keyboard or remote to browse
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeChannel && (
              <button
                onClick={scrollToActive}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                title="Scroll down to currently playing station"
              >
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>Jump to Playing</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              title="Close Channel Selector (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            SEARCH & CATEGORY BAR: Clean, Fast & Easy to Read
           ========================================================================= */}
        <div className="p-3.5 sm:p-4 bg-[#0a0f1c] border-b border-white/10 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search station name, number, country, or genre..."
              className="w-full bg-[#060912] border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 transition-colors outline-none font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer font-bold"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Category Filter Pills with Left & Right Scroll Controls */}
          <div className="flex items-center gap-1.5 relative">
            {/* Scroll Left Arrow Button */}
            <button
              type="button"
              onClick={() => scrollPills('left')}
              disabled={!canScrollLeft}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                canScrollLeft
                  ? 'bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 border-white/10 shadow-sm active:scale-95'
                  : 'opacity-25 pointer-events-none bg-slate-950 text-slate-600 border-transparent'
              }`}
              title="Scroll categories left"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrollable Category Pills Row (Mouse Wheel, Drag & Touch Scrollable) */}
            <div
              ref={pillContainerRef}
              onScroll={checkPillScroll}
              onWheel={handlePillsWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 text-xs scrollbar-none scroll-smooth select-none cursor-grab active:cursor-grabbing flex-1"
            >
              {QUICK_TABS.map((tab) => {
                const isSelected = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isSelected
                            ? 'bg-slate-950/30 text-slate-950 font-extrabold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scroll Right Arrow Button */}
            <button
              type="button"
              onClick={() => scrollPills('right')}
              disabled={!canScrollRight}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                canScrollRight
                  ? 'bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 border-white/10 shadow-sm active:scale-95'
                  : 'opacity-25 pointer-events-none bg-slate-950 text-slate-600 border-transparent'
              }`}
              title="Scroll categories right"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Toggle Advanced Filters (Country & Source) */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                showAdvancedFilters || hasAdvancedFilters
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/10'
              }`}
              title="Show additional country & source filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {hasAdvancedFilters && <span className="w-2 h-2 rounded-full bg-slate-950" />}
            </button>
          </div>

          {/* Collapsible Advanced Filters (Kept Hidden by Default to Keep View Clean) */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
                  <span>Country</span>
                  {selectedCountry !== 'All' && (
                    <button
                      onClick={() => setSelectedCountry('All')}
                      className="text-cyan-400 hover:underline text-[9px] cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-[#060912] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="All">All Countries ({countryOptions.length})</option>
                  {countryOptions.map(({ code, name, flag, count }) => (
                    <option key={code} value={code}>
                      {flag} {name} ({count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
                  <span>Playlist Source</span>
                  {selectedSource !== 'All' && (
                    <button
                      onClick={() => setSelectedSource('All')}
                      className="text-cyan-400 hover:underline text-[9px] cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full bg-[#060912] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="All">All Sources ({channels.length} channels)</option>
                  {sourcesWithCounts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.channelCount})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            CURRENTLY PLAYING MINI BANNER (Pinned on top of list for instant context)
           ========================================================================= */}
        {activeChannel && (
          <div className="px-4 py-2.5 bg-cyan-950/60 border-b border-cyan-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold block">
                  Now Playing
                </span>
                <p className="font-bold text-white truncate text-xs sm:text-sm">
                  {activeChannel.name}
                </p>
              </div>
            </div>

            <button
              onClick={scrollToActive}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Locate in List</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            CHANNEL LIST: High Contrast, Highly Legible & Easy to Read
           ========================================================================= */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scroll-smooth"
        >
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Tv className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <h3 className="text-base font-bold text-white">No channels found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No channels match your current search or category filter.
              </p>
              <button
                onClick={resetAllFilters}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : (
            filtered.slice(0, visibleCount).map((c, idx) => {
              const isCurrent = activeChannel?.id === c.id;
              const isFav = favorites.includes(c.id);
              const isVerifiedWorking = verifiedWorkingIds.has(c.id);
              const isBroken = brokenChannelIds.has(c.id) || (isPageHttps && !c.isHttps);

              return (
                <div
                  key={c.id}
                  id={`channel-item-${c.id}`}
                  onClick={() => onSelectChannel(c)}
                  className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer group active:scale-[0.99] select-none ${
                    isCurrent
                      ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50'
                      : isBroken
                      ? 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 text-slate-500'
                      : 'bg-[#0c1222] hover:bg-[#11192e] border-white/[0.07] hover:border-cyan-500/40 text-slate-200'
                  }`}
                >
                  {/* Left: Channel Number Box + Logo + Name & Metadata */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Clear Channel Number Badge */}
                    <span
                      className={`font-mono text-xs font-bold px-2 py-1 rounded-xl border shrink-0 text-center min-w-[42px] ${
                        isCurrent
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 group-hover:text-cyan-300 group-hover:border-slate-700'
                      }`}
                    >
                      CH {idx + 1}
                    </span>

                    {/* Logo Box */}
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {c.logo ? (
                        <img
                          src={c.logo}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-500 font-mono">
                          {c.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Station Name & Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm sm:text-base font-bold truncate leading-tight ${
                            isCurrent
                              ? 'text-cyan-300'
                              : 'text-white group-hover:text-cyan-300'
                          }`}
                        >
                          {c.name}
                        </h4>

                        {/* Status Tag */}
                        {isCurrent ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-cyan-400 text-slate-950 text-[10px] font-extrabold uppercase shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                            PLAYING
                          </span>
                        ) : c.isYouTube ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-950/90 border border-rose-500/40 text-rose-300 text-[10px] font-bold shrink-0">
                            YT LIVE
                          </span>
                        ) : isVerifiedWorking ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shrink-0">
                            ● ON AIR
                          </span>
                        ) : isBroken ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-950/70 border border-amber-500/30 text-amber-400 text-[10px] font-bold shrink-0">
                            ○ OFF AIR
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold shrink-0">
                            LIVE
                          </span>
                        )}
                      </div>

                      {/* Clean Scannable Metadata Line */}
                      <p className="text-xs text-slate-400 truncate mt-1 flex items-center gap-1.5">
                        <span>{c.countryFlag || '🌐'} {c.countryName || 'Global'}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-cyan-400 font-medium">{c.group || 'General'}</span>
                        <span className="text-slate-600">·</span>
                        <span className="font-mono text-[11px] text-slate-400 font-semibold">{c.quality || 'HD'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Actions: Favorite & Play Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(c, e);
                      }}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        isFav
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-950 text-slate-500 hover:text-amber-400 border-slate-800 hover:border-slate-700'
                      }`}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Bookmark className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-cyan-400 text-slate-950 shadow-sm'
                          : 'bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span className="hidden sm:inline">{isCurrent ? 'Playing' : 'Watch'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Infinite Scroll Indicator */}
          {filtered.length > visibleCount && (
            <div className="text-center py-4 text-xs text-slate-500 font-medium">
              Showing {visibleCount} of {filtered.length} stations. Scroll down to see more...
            </div>
          )}
        </div>

        {/* =========================================================================
            FOOTER: Clean Navigation Counters
           ========================================================================= */}
        <div className="p-3.5 sm:p-4 bg-[#0b101e] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Viewing</span>
            <span className="font-mono text-white font-bold">
              {Math.min(visibleCount, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
            </span>
            <span>channels</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={scrollToTop}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Scroll to top of channels list"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer transition-colors"
            >
              Close Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const mountNode =
    (typeof document !== 'undefined' && (document.fullscreenElement as HTMLElement)) ||
    (typeof document !== 'undefined' ? document.body : null);

  if (!mountNode) return null;
  return createPortal(drawerContent, mountNode);
};
