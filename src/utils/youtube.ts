/**
 * YouTube Embed & Live Stream Utilities
 * Supports YouTube watch URLs, short URLs, live stream links, and raw <iframe> embed codes.
 */

/**
 * Checks whether an input string represents a YouTube URL or iframe embed.
 */
export function isYouTubeUrl(input: string): boolean {
  if (!input) return false;
  const str = input.toLowerCase();
  return (
    str.includes('youtube.com') ||
    str.includes('youtu.be') ||
    str.includes('youtube-nocookie.com') ||
    str.startsWith('youtube://')
  );
}

/**
 * Extracts an 11-character YouTube video ID from various URL and iframe formats.
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  let text = input.trim();

  // If iframe embed code, extract the src attribute first
  if (text.includes('<iframe') || text.includes('src=')) {
    const srcMatch = text.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      text = srcMatch[1];
    }
  }

  // Handle custom youtube://VIDEO_ID format
  if (text.startsWith('youtube://')) {
    const raw = text.replace('youtube://', '').split('?')[0].trim();
    if (raw.length === 11) return raw;
  }

  // Extract from standard YouTube formats
  const idMatch = text.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|watch\?.+&v=))([a-zA-Z0-9_-]{11})/i
  );
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  return null;
}

/**
 * Extracts title from an <iframe> embed code if available.
 */
export function extractYouTubeTitle(input: string): string | null {
  if (!input || !input.includes('<iframe')) return null;
  const titleMatch = input.match(/title=["']([^"']+)["']/i);
  return titleMatch && titleMatch[1] ? titleMatch[1].trim() : null;
}

/**
 * Generates a clean, autoplaying YouTube embed URL with proper parameters.
 */
export function getYouTubeEmbedUrl(
  input: string,
  options?: { autoplay?: boolean; mute?: boolean }
): string {
  const videoId = extractYouTubeVideoId(input);
  const autoplay = options?.autoplay !== false ? 1 : 0;
  const mute = options?.mute !== false ? 1 : 0;
  const originParam =
    typeof window !== 'undefined' && window.location?.origin
      ? `&origin=${window.location.origin}`
      : '';

  // Clean broadcast parameters: hides default controls, annotations, branding & keyboard traps
  const cleanParams = `&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&showinfo=0`;

  if (!videoId) {
    // If it's already an embed URL, return it
    if (input.includes('youtube.com/embed/')) {
      return input.includes('?')
        ? `${input}&autoplay=${autoplay}&mute=${mute}&enablejsapi=1${cleanParams}${originParam}`
        : `${input}?autoplay=${autoplay}&mute=${mute}&enablejsapi=1${cleanParams}${originParam}`;
    }
    return input;
  }

  return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay}&mute=${mute}&enablejsapi=1&playsinline=1${cleanParams}${originParam}`;
}
