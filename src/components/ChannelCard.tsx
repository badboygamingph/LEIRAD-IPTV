import React from 'react';
import { Play, Bookmark, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Channel } from '../types';

interface ChannelCardProps {
  channel: Channel;
  index?: number;
  isEasyMode?: boolean;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: (channel: Channel) => void;
  onToggleFavorite: (channel: Channel, e: React.MouseEvent) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  index,
  isEasyMode = false,
  isActive,
  isFavorite,
  onSelect,
  onToggleFavorite,
}) => {
  return (
    <div
      onClick={() => onSelect(channel)}
      className={`group relative flex flex-col bg-slate-900/60 hover:bg-slate-800/80 border-2 rounded-2xl p-3.5 transition-all duration-200 cursor-pointer overflow-hidden ${
        isActive
          ? 'border-cyan-400 bg-cyan-950/30 shadow-xl shadow-cyan-500/15 ring-2 ring-cyan-400/60'
          : 'border-slate-800 hover:border-slate-600'
      }`}
    >
      {/* Top Media / Thumbnail Area */}
      <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden mb-3 group-hover:border-slate-700 transition-colors">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
            className="w-full h-full object-contain p-2.5 transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}

        {/* Fallback Graphic */}
        <div
          style={{ display: channel.logo ? 'none' : 'flex' }}
          className="w-full h-full items-center justify-center flex-col bg-gradient-to-br from-slate-900 to-slate-950 text-slate-400 p-2 text-center"
        >
          <span className="text-xl font-bold tracking-wider text-slate-300">
            {channel.name.slice(0, 4).toUpperCase()}
          </span>
          <span className="text-xs text-slate-500 mt-1 font-medium">{channel.group}</span>
        </div>

        {/* Hover Play Overlay */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-xl shadow-emerald-500/40 transform scale-95 group-hover:scale-100 transition-transform">
            <Play className="w-4 h-4 fill-current" />
            <span className="text-xs sm:text-sm">WATCH NOW</span>
          </div>
        </div>

        {/* Channel Number Badge */}
        {typeof index === 'number' && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-xs text-white text-xs font-mono font-bold border border-white/20">
            CH {index + 1}
          </div>
        )}

        {/* Favorite Bookmark Button with explicit label */}
        <button
          onClick={(e) => onToggleFavorite(channel, e)}
          className={`absolute top-2 right-2 px-2 py-1 rounded-lg backdrop-blur-md transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
            isFavorite
              ? 'bg-amber-500 text-slate-950 border border-amber-400 shadow-md'
              : 'bg-black/70 text-slate-300 hover:text-white border border-white/20 hover:bg-black/90'
          }`}
          title={isFavorite ? 'Saved in favorites' : 'Save to favorites'}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          <span className="text-[11px]">{isFavorite ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Channel Information */}
      <div className="flex flex-col flex-1 justify-between gap-1.5">
        <div>
          <h3 className={`${isEasyMode ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1`}>
            {channel.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
            <span className="font-medium text-cyan-400">{channel.group}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1 font-medium">
              <span>{channel.countryFlag}</span>
              <span className="truncate max-w-[120px]">{channel.countryName}</span>
            </span>
          </div>
        </div>

        {/* Clear Action Button on Card: Elderly friendly "Watch Channel" button */}
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {isActive ? (
            <div className="w-full py-1.5 px-3 rounded-lg bg-cyan-950 border border-cyan-700/80 text-cyan-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>WATCHING NOW</span>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(channel);
              }}
              className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch Channel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
