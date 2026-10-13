import React from 'react';
import { Play, Pause, X, Maximize2, Radio } from 'lucide-react';
import { Channel } from '../types';

interface MiniPlayerProps {
  channel: Channel | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExpand: () => void;
  onClose: () => void;
  isVisible?: boolean;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  channel,
  isPlaying,
  onTogglePlay,
  onExpand,
  onClose,
  isVisible = true,
}) => {
  if (!channel || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 sm:w-96 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-3 backdrop-blur-md flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
              className="w-full h-full object-contain"
            />
          ) : (
            <Radio className="w-5 h-5 text-cyan-400" />
          )}
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-900 animate-pulse" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-semibold text-white truncate">
              {channel.name}
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {channel.countryFlag} {channel.group} · {channel.quality}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onTogglePlay}
          className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={onExpand}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="Focus Player"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="Dismiss Mini Player"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
