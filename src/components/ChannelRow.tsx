import React from 'react';
import { Play, Bookmark, ShieldCheck, ShieldAlert, Copy } from 'lucide-react';
import { Channel } from '../types';

interface ChannelRowProps {
  channel: Channel;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: (channel: Channel) => void;
  onToggleFavorite: (channel: Channel, e: React.MouseEvent) => void;
  onCopyUrl: (url: string, e: React.MouseEvent) => void;
}

export const ChannelRow: React.FC<ChannelRowProps> = ({
  channel,
  isActive,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onCopyUrl,
}) => {
  return (
    <tr
      onClick={() => onSelect(channel)}
      className={`group border-b border-slate-800/60 transition-colors cursor-pointer text-sm ${
        isActive
          ? 'bg-cyan-950/30 hover:bg-cyan-950/40'
          : 'hover:bg-slate-800/40'
      }`}
    >
      {/* Play / Status Cell */}
      <td className="py-3 px-3 w-12 text-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(channel);
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer ${
            isActive
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-slate-800/80 group-hover:bg-cyan-500 text-slate-300 group-hover:text-slate-950'
          }`}
          title="Play Channel"
        >
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        </button>
      </td>

      {/* Logo & Name Cell */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden">
            {channel.logo ? (
              <img
                src={channel.logo}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-[10px] font-bold text-slate-400">
                {channel.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className={`font-medium truncate ${isActive ? 'text-cyan-400 font-semibold' : 'text-slate-100 group-hover:text-white'}`}>
              {channel.name}
            </p>
            <p className="text-xs text-slate-400 md:hidden">{channel.group}</p>
          </div>
        </div>
      </td>

      {/* Category Cell */}
      <td className="py-3 px-3 hidden sm:table-cell text-slate-300 whitespace-nowrap">
        {channel.group}
      </td>

      {/* Country Cell */}
      <td className="py-3 px-3 hidden md:table-cell text-slate-300 whitespace-nowrap">
        <span className="mr-1.5">{channel.countryFlag}</span>
        <span>{channel.countryName}</span>
      </td>

      {/* Source Cell */}
      <td className="py-3 px-3 hidden lg:table-cell whitespace-nowrap">
        <span className="font-mono text-xs text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
          {channel.sourceName || 'IPTV'}
        </span>
      </td>

      {/* Protocol Cell */}
      <td className="py-3 px-3 hidden lg:table-cell whitespace-nowrap">
        {channel.isHttps ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HTTPS</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-mono">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>HTTP</span>
          </span>
        )}
      </td>

      {/* Actions Cell */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          <button
            onClick={(e) => onCopyUrl(channel.url, e)}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            title="Copy stream URL"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => onToggleFavorite(channel, e)}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isFavorite
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isFavorite ? 'Remove bookmark' : 'Bookmark channel'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </td>
    </tr>
  );
};
