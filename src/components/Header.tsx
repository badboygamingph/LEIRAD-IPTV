import React from 'react';
import { Tv, ListFilter, Maximize, Plus } from 'lucide-react';
import { Channel } from '../types';

interface HeaderProps {
  channel: Channel | null;
  channelIndex?: number;
  totalChannels?: number;
  favoritesCount: number;
  isLargeText: boolean;
  onToggleLargeText: () => void;
  onOpenGuide: () => void;
  onFullscreen: () => void;
  onOpenPlaylistModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  channel,
  channelIndex = 0,
  totalChannels = 0,
  onOpenGuide,
  onFullscreen,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#05070d]/90 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-cyan-500/20">
              <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              LEIRAD TV
            </span>
          </div>

          {/* Zone 2: Clean Unboxed Current Station Metadata */}
          <div className="hidden md:flex items-center justify-center min-w-0 flex-1 px-4 text-xs text-slate-400 truncate">
            {channel ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-cyan-400 font-semibold shrink-0">
                  CH {channelIndex + 1}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-white font-medium truncate">{channel.name}</span>
                {channel.countryFlag && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="shrink-0">{channel.countryFlag} {channel.countryName}</span>
                  </>
                )}
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 shrink-0">{channel.group}</span>
              </div>
            ) : (
              <span className="text-slate-500">Live TV Stream Player</span>
            )}
          </div>

          {/* Zone 3: Navigation & Primary Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Open Channels Sidebar Button */}
            <button
              onClick={onOpenGuide}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
              title="Open channels sidebar on right side to select channels (G)"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Channels</span>
              {totalChannels > 0 && (
                <span className="font-mono text-[10px] bg-slate-950/25 px-1.5 py-0.5 rounded ml-0.5 font-bold">
                  {totalChannels}
                </span>
              )}
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={onFullscreen}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center"
              title="Fullscreen Watch Mode (F)"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
