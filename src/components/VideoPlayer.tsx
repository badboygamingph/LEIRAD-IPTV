import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Bookmark,
  ListFilter,
  Tv,
  Radio,
  Zap,
  Gauge,
  Sparkles
} from 'lucide-react';
import { Channel } from '../types';
import { isYouTubeUrl, getYouTubeEmbedUrl } from '../utils/youtube';

interface VideoPlayerProps {
  channel: Channel | null;
  channelIndex?: number;
  totalChannels?: number;
  nextChannel?: Channel | null;
  onPrevChannel: () => void;
  onNextChannel: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isTheaterMode: boolean;
  onToggleTheaterMode: () => void;
  recentChannels: Channel[];
  onSelectChannel: (channel: Channel) => void;
  onOpenGuide?: () => void;
  isSidebarOpen?: boolean;
  onChannelStatusChange?: (channelId: string, status: 'working' | 'off_air') => void;
  children?: React.ReactNode;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channel,
  channelIndex = 0,
  totalChannels = 0,
  nextChannel = null,
  onPrevChannel,
  onNextChannel,
  isFavorite,
  onToggleFavorite,
  isTheaterMode,
  onToggleTheaterMode,
  recentChannels,
  onSelectChannel,
  onOpenGuide,
  isSidebarOpen = false,
  onChannelStatusChange,
  children,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const osdTimeoutRef = useRef<number | null>(null);
  const loadTimeoutRef = useRef<number | null>(null);
  const autoSkipTimerRef = useRef<number | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);
  const activeUrlRef = useRef<string>('');

  // Stable references to prevent effect re-triggering loops & flickering
  const onChannelStatusChangeRef = useRef(onChannelStatusChange);
  onChannelStatusChangeRef.current = onChannelStatusChange;
  const onNextChannelRef = useRef(onNextChannel);
  onNextChannelRef.current = onNextChannel;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Clean TV Broadcast Mode: automatically hides YouTube top titles, avatar, and bottom buttons
  const [isCleanBroadcastMode, setIsCleanBroadcastMode] = useState<boolean>(true);

  // Anti-Buffer Turbo Engine state: 'anti_buffer' (45s deep buffer) vs 'instant' (15s low latency)
  const [turboBufferMode, setTurboBufferMode] = useState<'anti_buffer' | 'instant'>(() => {
    try {
      return (
        (localStorage.getItem('leirad_tv_turbo_buffer_mode') as 'anti_buffer' | 'instant') ||
        (localStorage.getItem('aether_tv_turbo_buffer_mode') as 'anti_buffer' | 'instant') ||
        'anti_buffer'
      );
    } catch {
      return 'anti_buffer';
    }
  });

  // Real-time forward buffered seconds
  const [bufferedAhead, setBufferedAhead] = useState<number>(0);

  // Unified status state: 'idle' | 'tuning' | 'playing' | 'resting'
  const [status, setStatus] = useState<'idle' | 'tuning' | 'playing' | 'resting'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showOsd, setShowOsd] = useState(true);
  const [autoSkipCountdown, setAutoSkipCountdown] = useState<number | null>(null);

  const statusRef = useRef(status);
  statusRef.current = status;

  // Clean up HLS instance
  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const clearAutoSkip = useCallback(() => {
    if (autoSkipTimerRef.current) {
      window.clearInterval(autoSkipTimerRef.current);
      autoSkipTimerRef.current = null;
    }
    setAutoSkipCountdown(null);
  }, []);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  // Ensure any native browser subtitle text tracks are permanently disabled
  const silenceNativeTextTracks = useCallback(() => {
    const video = videoRef.current;
    if (video && video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'disabled';
      }
    }
  }, []);

  const isCurrentYouTube = Boolean(channel && (channel.isYouTube || isYouTubeUrl(channel.url)));

  // Synchronize volume and mute to embedded YouTube iframe via postMessage API
  const syncYouTubeVolume = useCallback(
    (targetVol: number, targetMuted: boolean) => {
      if (!iframeRef.current?.contentWindow) return;
      const ytVolume = Math.round(targetVol * 100);
      try {
        if (targetMuted || ytVolume === 0) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'mute', args: [] }),
            '*'
          );
        } else {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
            '*'
          );
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'setVolume', args: [ytVolume] }),
            '*'
          );
        }
      } catch (err) {
        console.warn('Failed to sync YouTube volume:', err);
      }
    },
    []
  );

  // Synchronize volume & mute to video element AND YouTube iframe without tearing down stream
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
    if (isCurrentYouTube) {
      syncYouTubeVolume(volume, isMuted);
    }
  }, [volume, isMuted, isCurrentYouTube, syncYouTubeVolume]);

  // Bidirectional listener: receive play/pause and volume events from YouTube iframe
  useEffect(() => {
    if (!isCurrentYouTube) return;

    const handleMessage = (e: MessageEvent) => {
      try {
        if (typeof e.data !== 'string') return;
        const data = JSON.parse(e.data);
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.playerState === 'number') {
            if (data.info.playerState === 1) setIsPlaying(true);
            else if (data.info.playerState === 2) setIsPlaying(false);
          }
          if (typeof data.info.muted === 'boolean') {
            setIsMuted(data.info.muted);
          }
          if (typeof data.info.volume === 'number' && !data.info.muted) {
            setVolume(data.info.volume / 100);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isCurrentYouTube]);

  // Track live forward buffer depth every second
  useEffect(() => {
    if (status !== 'playing') {
      setBufferedAhead(0);
      return;
    }

    const interval = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.buffered.length) {
        setBufferedAhead(0);
        return;
      }
      const cur = video.currentTime;
      let ahead = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= cur && cur <= video.buffered.end(i)) {
          ahead = Math.max(0, video.buffered.end(i) - cur);
          break;
        }
      }
      setBufferedAhead(Math.round(ahead));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [status]);

  // Anti-Buffer Self-Healing Watchdog: if internet hiccups and buffers for > 1.8s, nudge video to resume
  useEffect(() => {
    if (!isBuffering || status !== 'playing') return;

    const stallTimer = window.setTimeout(() => {
      const video = videoRef.current;
      const hls = hlsRef.current;
      if (video && !video.paused) {
        // Nudge 0.25s ahead to bypass any corrupted or missing frame in the live playlist
        video.currentTime += 0.25;
        setIsBuffering(false);
      }
      if (hls) {
        hls.startLoad();
      }
    }, 1800);

    return () => window.clearTimeout(stallTimer);
  }, [isBuffering, status]);

  // Background Next-Channel Pre-warming: Pre-warms TCP/TLS socket for instant next tune
  useEffect(() => {
    if (status !== 'playing' || !nextChannel?.url) return;

    const timer = window.setTimeout(() => {
      try {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = nextChannel.url;
        document.head.appendChild(link);
        setTimeout(() => link.remove(), 12000);
      } catch {}
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [status, nextChannel?.url]);

  // Toggle Turbo Buffer Mode between Deep Anti-Buffer (45s) and Instant (15s)
  const toggleTurboBuffer = () => {
    const nextMode = turboBufferMode === 'anti_buffer' ? 'instant' : 'anti_buffer';
    setTurboBufferMode(nextMode);
    try {
      localStorage.setItem('leirad_tv_turbo_buffer_mode', nextMode);
    } catch {}

    // Apply configuration immediately to active HLS instance if alive
    if (hlsRef.current) {
      hlsRef.current.config.maxBufferLength = nextMode === 'anti_buffer' ? 45 : 15;
      hlsRef.current.config.maxMaxBufferLength = nextMode === 'anti_buffer' ? 90 : 30;
      hlsRef.current.config.liveSyncDurationCount = nextMode === 'anti_buffer' ? 4 : 2;
    }
  };

  // Graceful auto-skip to next working station when stream is off-air
  const triggerAutoSkip = useCallback(
    (reasonMsg: string, channelId: string) => {
      if (statusRef.current === 'resting') return;

      consecutiveFailuresRef.current += 1;
      setStatus('resting');
      setIsBuffering(false);
      setErrorMessage(reasonMsg);
      onChannelStatusChangeRef.current?.(channelId, 'off_air');

      clearAutoSkip();

      // Only give up if we have checked every station in the list
      const maxRetries = Math.max(totalChannels, 100);
      if (consecutiveFailuresRef.current >= maxRetries) {
        setAutoSkipCountdown(null);
        setErrorMessage('All stations in the list are currently off the air or resting.');
        return;
      }

      // Fast, responsive 1-second auto-skip so the player immediately seeks the next working channel
      setAutoSkipCountdown(1);
      autoSkipTimerRef.current = window.setTimeout(() => {
        clearAutoSkip();
        onNextChannelRef.current?.();
      }, 1000);
    },
    [clearAutoSkip, totalChannels]
  );

  // Show TV On-Screen Display (OSD Banner) on channel change
  useEffect(() => {
    setShowOsd(true);
    if (osdTimeoutRef.current) {
      window.clearTimeout(osdTimeoutRef.current);
    }
    osdTimeoutRef.current = window.setTimeout(() => {
      setShowOsd(false);
    }, 3500);

    return () => {
      if (osdTimeoutRef.current) window.clearTimeout(osdTimeoutRef.current);
    };
  }, [channel?.id]);

  // Primary playback initialization: ONLY runs when channel URL actually changes
  useEffect(() => {
    if (!channel?.url) return;

    if (channel.url === activeUrlRef.current && statusRef.current === 'playing') {
      return;
    }

    activeUrlRef.current = channel.url;
    clearAutoSkip();
    clearLoadTimeout();
    destroyHls();

    const currentChannelId = channel.id;
    const isYt = Boolean(channel.isYouTube || isYouTubeUrl(channel.url));

    // Instant seamless playback for YouTube live streams & iframe embeds
    if (isYt) {
      consecutiveFailuresRef.current = 0;
      setStatus('playing');
      setIsPlaying(true);
      setIsBuffering(false);
      setErrorMessage(null);
      onChannelStatusChangeRef.current?.(currentChannelId, 'working');
      return;
    }

    if (!videoRef.current) return;

    setStatus('tuning');
    setIsBuffering(false);
    setErrorMessage(null);
    setIsPlaying(false);

    const video = videoRef.current;
    const streamUrl = channel.url;
    const isPageHttps = window.location.protocol === 'https:';
    const isStreamHttp = streamUrl.startsWith('http://');

    // HTTPS pages block HTTP stream requests due to browser Mixed Content policy:
    if (isPageHttps && isStreamHttp) {
      consecutiveFailuresRef.current += 1;
      onChannelStatusChangeRef.current?.(currentChannelId, 'off_air');
      setStatus('resting');
      setErrorMessage('Mixed content (HTTP stream) blocked on HTTPS. Auto-tuning next working station...');
      setAutoSkipCountdown(1);
      autoSkipTimerRef.current = window.setTimeout(() => {
        clearAutoSkip();
        onNextChannelRef.current?.();
      }, 400);
      return;
    }

    // Set connection timeout: 5.5 seconds for initial channel handshake
    loadTimeoutRef.current = window.setTimeout(() => {
      if (statusRef.current === 'tuning') {
        destroyHls();
        triggerAutoSkip('Station broadcast is off air or resting (stream timeout).', currentChannelId);
      }
    }, 5500);

    let networkRetries = 0;

    if (Hls.isSupported()) {
      // High-performance Anti-Buffer Turbo Engine Configuration:
      // Prevents buffering, stalls, and stuttering even on slow internet connections
      const hls = new Hls({
        enableWorker: true,
        // When in anti-buffer mode, allows a healthy live segment cushion instead of suffocating at the edge
        lowLatencyMode: turboBufferMode === 'instant',
        startFragPrefetch: true, // Immediately fetches initial segment while manifest parses
        backBufferLength: 25,
        maxBufferLength: turboBufferMode === 'anti_buffer' ? 45 : 15, // Up to 45 seconds of cached buffer
        maxMaxBufferLength: turboBufferMode === 'anti_buffer' ? 90 : 30,
        maxBufferSize: 90 * 1000 * 1000, // 90 MB memory buffer
        maxBufferHole: 0.3,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.25,
        nudgeMaxRetry: 6,
        liveSyncDurationCount: turboBufferMode === 'anti_buffer' ? 4 : 2,
        liveMaxLatencyDurationCount: turboBufferMode === 'anti_buffer' ? 12 : 5,
        // Automatically prevents downloading oversized 4K streams on smaller canvases, saving bandwidth
        capLevelToPlayerSize: true,
        abrEwmaDefaultEstimate: 450000, // 450kbps initial estimate for fast startup
        fragLoadingTimeOut: 25000, // 25s for slow internet connections
        manifestLoadingTimeOut: 15000,
        levelLoadingTimeOut: 15000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 500,
        manifestLoadingMaxRetry: 4,
        renderTextTracksNatively: false,
      });

      hls.subtitleDisplay = false;
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        silenceNativeTextTracks();
        video
          .play()
          .then(() => {
            clearLoadTimeout();
            clearAutoSkip();
            consecutiveFailuresRef.current = 0;
            setIsPlaying(true);
            setStatus('playing');
            setIsBuffering(false);
            onChannelStatusChangeRef.current?.(currentChannelId, 'working');
          })
          .catch(() => {
            clearLoadTimeout();
            setIsPlaying(false);
            setStatus('idle');
            setIsBuffering(false);
          });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        // Recover from buffer stalls automatically without interrupting user
        if (
          data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
          data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL
        ) {
          if (video && !video.paused) {
            video.currentTime += 0.25;
          }
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetries < 1) {
                networkRetries += 1;
                hls.startLoad();
              } else {
                destroyHls();
                triggerAutoSkip('Stream network offline. Station broadcast resting.', currentChannelId);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              destroyHls();
              triggerAutoSkip('Cannot decode broadcast stream. Station is off air.', currentChannelId);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video
        .play()
        .then(() => {
          clearLoadTimeout();
          clearAutoSkip();
          consecutiveFailuresRef.current = 0;
          setIsPlaying(true);
          setStatus('playing');
          setIsBuffering(false);
          silenceNativeTextTracks();
          onChannelStatusChangeRef.current?.(currentChannelId, 'working');
        })
        .catch(() => {
          clearLoadTimeout();
          setIsPlaying(false);
          setStatus('idle');
          setIsBuffering(false);
        });
    } else {
      clearLoadTimeout();
      triggerAutoSkip('HLS playback is not supported in this browser.', currentChannelId);
    }

    return () => {
      clearLoadTimeout();
      clearAutoSkip();
      destroyHls();
    };
  }, [
    channel?.url,
    channel?.id,
    turboBufferMode,
    clearLoadTimeout,
    clearAutoSkip,
    destroyHls,
    triggerAutoSkip,
    silenceNativeTextTracks,
  ]);

  // Video element event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const currentChannelId = channel?.id;

    const handlePlay = () => {
      setIsPlaying(true);
      silenceNativeTextTracks();
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      if (statusRef.current === 'playing') {
        setIsBuffering(true);
      }
    };

    const handlePlaying = () => {
      clearLoadTimeout();
      clearAutoSkip();
      consecutiveFailuresRef.current = 0;
      setStatus('playing');
      setIsPlaying(true);
      setIsBuffering(false);
      silenceNativeTextTracks();
      if (currentChannelId) onChannelStatusChangeRef.current?.(currentChannelId, 'working');
    };

    const handleVideoError = () => {
      if (currentChannelId && (statusRef.current === 'tuning' || statusRef.current === 'playing')) {
        destroyHls();
        triggerAutoSkip('Video playback error. Station is off air.', currentChannelId);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleVideoError);
    };
  }, [channel?.id, clearLoadTimeout, clearAutoSkip, silenceNativeTextTracks]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && !isSidebarOpen) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  const togglePlay = () => {
    if (isCurrentYouTube) {
      if (iframeRef.current?.contentWindow) {
        const cmd = isPlaying ? 'pauseVideo' : 'playVideo';
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: cmd, args: [] }),
          '*'
        );
      }
      setIsPlaying((prev) => !prev);
      return;
    }
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }

    if (isCurrentYouTube) {
      syncYouTubeVolume(volume, nextMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    const willBeMuted = newVolume === 0;
    setIsMuted(willBeMuted);

    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = willBeMuted;
    }

    if (isCurrentYouTube) {
      syncYouTubeVolume(newVolume, willBeMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP failed', err);
    }
  };

  const handleRetry = () => {
    if (!channel) return;
    clearAutoSkip();
    if (isCurrentYouTube) {
      setStatus('playing');
      setIsPlaying(true);
      setErrorMessage(null);
      return;
    }
    if (!videoRef.current) return;
    setStatus('tuning');
    setErrorMessage(null);
    if (hlsRef.current) {
      hlsRef.current.loadSource(channel.url);
      hlsRef.current.startLoad();
    } else {
      videoRef.current.src = channel.url;
      videoRef.current.play().catch(() => {});
    }
  };

  if (!channel) {
    return (
      <div className="w-full aspect-video bg-[#05070d] rounded-2xl border border-white/10 flex flex-col items-center justify-center p-8 text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 mb-4 shadow-inner">
          <Tv className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Channel Tuned</h3>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          Open the Channel Selector Sidebar on the right to browse all working live streams.
        </p>
        {onOpenGuide && (
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95"
          >
            <ListFilter className="w-4 h-4" />
            <span>Select Channels (Sidebar)</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Main Video Stream Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && !isSidebarOpen && setShowControls(false)}
        className={`relative w-full aspect-video bg-black overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-0 z-50 h-screen w-screen max-w-none rounded-none'
            : isTheaterMode
            ? 'max-w-7xl rounded-2xl border border-white/10'
            : 'max-w-5xl rounded-2xl border border-white/10 ring-1 ring-white/5'
        } ${!showControls && isPlaying && !isSidebarOpen ? 'cursor-none' : ''}`}
      >
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {/* Stream Display: YouTube Live Embed iFrame or HTML5 Video Stream */}
          {isCurrentYouTube ? (
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-black">
              <iframe
                ref={iframeRef}
                key={channel.id}
                src={getYouTubeEmbedUrl(channel.url, { autoplay: true, mute: isMuted })}
                title={channel.name}
                className={`w-full h-full border-0 absolute inset-0 z-10 transition-transform duration-300 ${
                  isCleanBroadcastMode ? 'scale-[1.26] pointer-events-none' : 'scale-100 pointer-events-auto'
                }`}
                style={{
                  transformOrigin: 'center center',
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                onLoad={() => {
                  if (iframeRef.current?.contentWindow) {
                    try {
                      iframeRef.current.contentWindow.postMessage(
                        JSON.stringify({ event: 'listening' }),
                        '*'
                      );
                    } catch {}
                  }
                  syncYouTubeVolume(volume, isMuted);
                  setTimeout(() => syncYouTubeVolume(volume, isMuted), 350);
                  setTimeout(() => syncYouTubeVolume(volume, isMuted), 800);
                  setTimeout(() => syncYouTubeVolume(volume, isMuted), 1600);
                }}
              />

              {/* Transparent Click-to-Play/Pause Overlay (Active in Clean Broadcast Mode to eliminate YouTube popups) */}
              {isCleanBroadcastMode && (
                <div
                  onClick={togglePlay}
                  onDoubleClick={toggleFullscreen}
                  className="absolute inset-0 z-15 cursor-pointer"
                  title="Click to Play/Pause · Double-click for Fullscreen"
                />
              )}
            </div>
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              playsInline
              crossOrigin="anonymous"
            />
          )}

          {/* Clean Cinematic On-Screen Display (OSD Banner) when switching channels or hovering */}
          {showOsd && (
            <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none transition-all duration-300">
              <div className="inline-flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-950/85 border border-white/10 shadow-2xl backdrop-blur-md max-w-full">
                <div className="flex items-center gap-3 min-w-0">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt=""
                      className="w-10 h-10 object-contain rounded-lg bg-black/60 p-1 border border-white/10 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-[10px] text-cyan-400 shrink-0">
                      LEIRAD
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate drop-shadow">
                      {channel.name}
                    </h3>
                    <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5 truncate font-normal">
                      <span>{channel.countryFlag} {channel.countryName}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-cyan-400 font-medium">{channel.group}</span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-slate-400 text-[11px]">{channel.quality}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-white/10">
                  <span
                    className={`text-[11px] font-mono font-bold tracking-wider uppercase ${
                      isCurrentYouTube ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {isCurrentYouTube ? 'YT LIVE' : 'LIVE'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Discreet Anti-Buffer Recovery Indicator — shown only when momentarily buffering */}
          {status === 'playing' && isBuffering && (
            <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-950/90 border border-cyan-500/40 backdrop-blur-md text-xs font-semibold text-cyan-300 animate-in fade-in duration-200 shadow-xl">
              <div className="w-3.5 h-3.5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
              <span>Anti-Buffer Engine recovering stream...</span>
            </div>
          )}

          {/* UNIFIED BROADCAST TUNER OVERLAY (Zero-flicker state machine) */}
          <div
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center transition-all duration-300 ${
              status === 'playing'
                ? 'opacity-0 pointer-events-none'
                : 'opacity-100 bg-[#04060a]/92 backdrop-blur-md pointer-events-auto'
            }`}
          >
            <div className="flex flex-col items-center max-w-md mx-auto">
              {channel.logo ? (
                <img
                  src={channel.logo}
                  alt=""
                  className="w-16 h-16 object-contain rounded-2xl bg-white/5 p-2 border border-white/10 mb-4 shadow-xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 mb-4 shadow-xl">
                  <Tv className="w-8 h-8" />
                </div>
              )}

              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow mb-1">
                {channel.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 flex items-center justify-center gap-2 font-normal mb-6">
                {channel.countryFlag && <span>{channel.countryFlag}</span>}
                <span>{channel.countryName}</span>
                <span className="text-slate-600">·</span>
                <span className="text-cyan-400 font-medium">{channel.group}</span>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-slate-400 text-xs">{channel.quality}</span>
              </p>

              {/* State A: Tuning / Connecting */}
              {status === 'tuning' && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-semibold shadow-lg">
                    <Radio className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Connecting with Anti-Buffer Turbo Engine...</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Pre-fetching initial stream segments for fast, buffer-free playback
                  </p>
                </div>
              )}

              {/* State B: Resting / Off-Air with Auto-Tune to Next Working Station */}
              {status === 'resting' && (
                <div className="flex flex-col items-center space-y-4">
                  {autoSkipCountdown !== null ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold shadow-lg">
                        <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>Auto-tuning next working station in {autoSkipCountdown}s...</span>
                      </div>
                      <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                        Station is resting or off air. Smoothly advancing to keep stream uninterrupted.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-amber-300 text-xs font-semibold">
                        <Tv className="w-3.5 h-3.5 text-amber-400" />
                        <span>Station Broadcast Resting</span>
                      </div>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        {errorMessage || 'This station is currently resting or off the air.'}
                      </p>
                    </div>
                  )}

                  {/* Direct Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    <button
                      onClick={() => {
                        clearAutoSkip();
                        onNextChannel();
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>Tune Next Working Station</span>
                    </button>

                    {autoSkipCountdown !== null && (
                      <button
                        onClick={clearAutoSkip}
                        className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 border border-white/10 rounded-xl transition-colors cursor-pointer"
                      >
                        Stay On Station
                      </button>
                    )}

                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl transition-colors cursor-pointer active:scale-95"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Try Again</span>
                    </button>

                    {onOpenGuide && (
                      <button
                        onClick={onOpenGuide}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer active:scale-95"
                      >
                        <ListFilter className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Select Channels</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* State C: Idle */}
              {status === 'idle' && (
                <button
                  onClick={togglePlay}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all cursor-pointer active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Click to Play Stream</span>
                </button>
              )}
            </div>
          </div>

          {/* Aesthetic Bottom Media Control Bar */}
          <div
            className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-2 z-20 transition-opacity duration-300 ${
              showControls || isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
              {/* Left Side: Prev Channel, Play/Pause, Next Channel, Volume, Anti-Buffer Badge */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <button
                  onClick={onPrevChannel}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10 backdrop-blur-md active:scale-95"
                  title="Tune previous working station (Skips off-air channels)"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">PREV CH</span>
                </button>

                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-cyan-500/25 active:scale-95"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={onNextChannel}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10 backdrop-blur-md active:scale-95"
                  title="Tune next working station (Skips off-air channels)"
                >
                  <span className="hidden sm:inline">NEXT CH</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-2 pl-1 sm:pl-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-20 accent-cyan-400 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                    title={`Volume: ${Math.round(volume * 100)}%`}
                  />
                </div>

                {/* Anti-Buffer Turbo Engine Indicator & Mode Toggle (or YouTube Live Badge) */}
                {isCurrentYouTube ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 border border-rose-500/40 text-rose-300 backdrop-blur-md select-none">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="font-semibold text-[11px]">YouTube Live</span>
                    </div>

                    <button
                      onClick={() => setIsCleanBroadcastMode((prev) => !prev)}
                      className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer backdrop-blur-md active:scale-95 ${
                        isCleanBroadcastMode
                          ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-sm'
                          : 'bg-white/5 text-slate-300 hover:text-white border-white/10'
                      }`}
                      title={
                        isCleanBroadcastMode
                          ? 'Clean TV Broadcast Active (Hides YouTube overlays & title). Click to switch to Standard.'
                          : 'Standard Mode Active (YouTube overlays visible). Click to switch to Clean TV Broadcast.'
                      }
                    >
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                      <span className="font-semibold text-[11px]">
                        {isCleanBroadcastMode ? 'Clean TV Feed' : 'Standard Feed'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={toggleTurboBuffer}
                    className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer backdrop-blur-md ${
                      turboBufferMode === 'anti_buffer'
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                    title={
                      turboBufferMode === 'anti_buffer'
                        ? 'Anti-Buffer Turbo Active (45s deep cache protects against slow internet). Click to toggle.'
                        : 'Fast Tune Mode (15s low latency). Click to switch to Anti-Buffer Turbo.'
                    }
                  >
                    <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-[11px]">
                      {turboBufferMode === 'anti_buffer' ? 'Anti-Buffer Turbo' : 'Fast Tune'}
                    </span>
                    {status === 'playing' && bufferedAhead > 0 && (
                      <span className="font-mono text-[10px] text-emerald-400/90 pl-1 border-l border-emerald-500/30">
                        {bufferedAhead}s buffer
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Right Side: Favorite, Sidebar Channel Selector, PiP, Fullscreen */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                <button
                  onClick={onToggleFavorite}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer active:scale-95 ${
                    isFavorite
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : 'bg-white/5 text-slate-300 hover:text-white border-white/10 hover:bg-white/10'
                  }`}
                  title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                >
                  <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                </button>

                {/* OPEN SIDEBAR CHANNEL SELECTOR ON RIGHT */}
                {onOpenGuide && (
                  <button
                    onClick={onOpenGuide}
                    className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-md active:scale-95 ${
                      isSidebarOpen
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-cyan-500/30'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur-md'
                    }`}
                    title="Open Channel Selector Sidebar (G)"
                  >
                    <ListFilter className="w-4 h-4 text-cyan-400" />
                    <span>Channels</span>
                    {totalChannels > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-black/40 text-[10px] font-mono text-cyan-300">
                        {totalChannels}
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={togglePiP}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer hidden sm:flex"
                  title="Picture in Picture"
                >
                  <PictureInPicture2 className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all cursor-pointer shadow-lg shadow-cyan-500/25 active:scale-95"
                  title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen Stream (F)'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Nested Modals / Drawers for full compatibility in Fullscreen Mode */}
        {children}
      </div>
    </div>
  );
};
