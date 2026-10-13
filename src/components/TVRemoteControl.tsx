import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Bookmark,
  Tv,
  ListFilter,
  Power,
  RotateCcw
} from 'lucide-react';
import { Channel } from '../types';

interface TVRemoteControlProps {
  channel: Channel | null;
  channelIndex: number;
  totalChannels: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isFavorite: boolean;
  isLargeText: boolean;
  onPlayPause: () => void;
  onPrevChannel: () => void;
  onNextChannel: () => void;
  onToggleMute: () => void;
  onVolumeChange: (newVol: number) => void;
  onToggleFavorite: () => void;
  onFullscreen: () => void;
  onOpenGuide: () => void;
  onJumpToChannel?: (index: number) => void;
}

export const TVRemoteControl: React.FC<TVRemoteControlProps> = ({
  channel,
  channelIndex,
  totalChannels,
  isPlaying,
  isMuted,
  volume,
  isFavorite,
  isLargeText,
  onPlayPause,
  onPrevChannel,
  onNextChannel,
  onToggleMute,
  onVolumeChange,
  onToggleFavorite,
  onFullscreen,
  onOpenGuide,
  onJumpToChannel,
}) => {
  const [dialInput, setDialInput] = useState('');
  const [showKeypad, setShowKeypad] = useState(false);

  if (!channel) return null;

  const handleDialNumber = (num: number) => {
    const next = dialInput + num.toString();
    setDialInput(next);
  };

  const handleDialEnter = () => {
    if (!dialInput) return;
    const chNum = parseInt(dialInput, 10);
    if (!isNaN(chNum) && chNum >= 1 && chNum <= totalChannels && onJumpToChannel) {
      onJumpToChannel(chNum - 1);
      setDialInput('');
      setShowKeypad(false);
    }
  };

  const handleDialClear = () => {
    setDialInput('');
  };

  return (
    <div className="w-full bg-slate-900 border-2 border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl">
      {/* Remote Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-cyan-950 border-2 border-cyan-500 text-cyan-300 font-mono font-extrabold text-base sm:text-lg shrink-0 shadow-md">
            CH {channelIndex + 1}
          </div>
          <div className="min-w-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
              Now Playing on Television:
            </span>
            <h2 className={`${isLargeText ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'} font-bold text-white truncate drop-shadow-sm`}>
              {channel.name}
            </h2>
          </div>
        </div>

        {/* TV Guide Button right in header */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGuide}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-95 transition-all cursor-pointer border border-cyan-400"
            title="Open all listed playlist channels"
          >
            <ListFilter className="w-4 h-4" />
            <span>TV GUIDE / ALL CHANNELS</span>
          </button>
        </div>
      </div>

      {/* Main TV Remote Buttons Row */}
      <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Previous Channel (CH ▼) */}
        <button
          onClick={onPrevChannel}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border-2 border-slate-700 shadow-md transition-all cursor-pointer min-h-[76px]"
          title="Go back to previous TV channel (Arrow Down or Page Down)"
        >
          <ChevronLeft className="w-6 h-6 text-cyan-400 mb-1" />
          <span className="text-xs sm:text-sm font-extrabold text-center uppercase tracking-wide">
            CH ▼ PREV
          </span>
        </button>

        {/* Play / Pause Toggle */}
        <button
          onClick={onPlayPause}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl active:scale-95 text-slate-950 font-bold shadow-md transition-all cursor-pointer min-h-[76px] ${
            isPlaying
              ? 'bg-amber-400 hover:bg-amber-300'
              : 'bg-emerald-400 hover:bg-emerald-300'
          }`}
          title={isPlaying ? 'Pause TV broadcast' : 'Start playing channel'}
        >
          {isPlaying ? (
            <>
              <Pause className="w-6 h-6 fill-current mb-1" />
              <span className="text-xs sm:text-sm font-extrabold">PAUSE TV</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current ml-0.5 mb-1" />
              <span className="text-xs sm:text-sm font-extrabold">WATCH TV</span>
            </>
          )}
        </button>

        {/* Next Channel (CH ▲) */}
        <button
          onClick={onNextChannel}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border-2 border-slate-700 shadow-md transition-all cursor-pointer min-h-[76px]"
          title="Switch to next TV channel (Arrow Up or Page Up)"
        >
          <ChevronRight className="w-6 h-6 text-cyan-400 mb-1" />
          <span className="text-xs sm:text-sm font-extrabold text-center uppercase tracking-wide">
            CH ▲ NEXT
          </span>
        </button>

        {/* TV Guide Button in remote cluster */}
        <button
          onClick={onOpenGuide}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-cyan-700/80 hover:bg-cyan-600 active:scale-95 text-white border-2 border-cyan-500 shadow-md transition-all cursor-pointer min-h-[76px]"
          title="Display all playlist channels list"
        >
          <Tv className="w-6 h-6 mb-1 text-cyan-200" />
          <span className="text-xs sm:text-sm font-extrabold text-center uppercase tracking-wide">
            TV GUIDE
          </span>
        </button>

        {/* Mute / Unmute Button */}
        <button
          onClick={onToggleMute}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl active:scale-95 border-2 transition-all cursor-pointer min-h-[76px] ${
            isMuted
              ? 'bg-rose-950/70 border-rose-800 text-rose-300 hover:bg-rose-900/80'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
          }`}
          title={isMuted ? 'Turn Sound Back On' : 'Turn Sound Off (Mute)'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-6 h-6 text-rose-400 mb-1" />
              <span className="text-xs sm:text-sm font-bold">MUTE: ON</span>
            </>
          ) : (
            <>
              <Volume2 className="w-6 h-6 text-cyan-400 mb-1" />
              <span className="text-xs sm:text-sm font-bold">SOUND: ON</span>
            </>
          )}
        </button>

        {/* Big Screen Fullscreen */}
        <button
          onClick={onFullscreen}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border-2 border-slate-700 shadow-md transition-all cursor-pointer min-h-[76px]"
          title="Watch on Big Full Screen"
        >
          <Maximize2 className="w-6 h-6 text-cyan-400 mb-1" />
          <span className="text-xs sm:text-sm font-bold text-center">FULLSCREEN</span>
        </button>
      </div>

      {/* Volume & Channel Dialing Bar */}
      <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        {/* Volume controls */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold uppercase text-[11px]">Volume:</span>
          <button
            onClick={() => onVolumeChange(Math.max(0, volume - 0.1))}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer border border-slate-700 active:scale-95"
            title="Volume Down"
          >
            VOL -
          </button>
          <div className="w-24 sm:w-32 bg-slate-950 h-3 rounded-full border border-slate-800 overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all"
              style={{ width: `${Math.round((isMuted ? 0 : volume) * 100)}%` }}
            />
          </div>
          <button
            onClick={() => onVolumeChange(Math.min(1, volume + 0.1))}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer border border-slate-700 active:scale-95"
            title="Volume Up"
          >
            VOL +
          </button>
        </div>

        {/* Channel Keypad Opener & Dialing */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeypad(!showKeypad)}
            className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
              showKeypad
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            {showKeypad ? 'Hide Dial Pad' : '123 Dial Channel #'}
          </button>

          <button
            onClick={onToggleFavorite}
            className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 ${
              isFavorite
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            <span>{isFavorite ? 'Saved ★' : 'Save Channel'}</span>
          </button>
        </div>
      </div>

      {/* Direct Channel Dialing Keypad (Like physical TV remote buttons) */}
      {showKeypad && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 animate-in fade-in duration-200">
          <div className="max-w-xs mx-auto bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Jump to Channel Number:
              </span>
              <div className="font-mono text-base font-bold text-cyan-400 px-3 py-1 bg-slate-900 rounded border border-slate-700 min-w-[60px] text-center">
                {dialInput || 'CH _'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleDialNumber(num)}
                  className="p-3 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-700 active:scale-95 cursor-pointer"
                >
                  {num}
                </button>
              ))}

              <button
                onClick={handleDialClear}
                className="p-3 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-rose-400 rounded-xl border border-slate-700 active:scale-95 cursor-pointer"
              >
                CLEAR
              </button>

              <button
                onClick={() => handleDialNumber(0)}
                className="p-3 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-700 active:scale-95 cursor-pointer"
              >
                0
              </button>

              <button
                onClick={handleDialEnter}
                disabled={!dialInput}
                className="p-3 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-slate-950 rounded-xl active:scale-95 cursor-pointer"
              >
                TUNE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
