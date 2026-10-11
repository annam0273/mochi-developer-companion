import { useState, useEffect } from 'react';

/**
 * Detects the theme / category of the current web page.
 * Returns: 'music' | 'dev' | 'video' | 'reading' | null
 */
export function usePageTheme() {
  const [pageTheme, setPageTheme] = useState(() => detectTheme());

  useEffect(() => {
    const updateTheme = () => {
      const detected = detectTheme();
      setPageTheme(detected);
    };

    updateTheme();

    // Listen for SPA route updates and history changes
    window.addEventListener('popstate', updateTheme);
    window.addEventListener('hashchange', updateTheme);

    // Periodic check for SPAs (like YouTube, Spotify Web, GitHub) that pushState silently
    const interval = setInterval(updateTheme, 2500);

    return () => {
      window.removeEventListener('popstate', updateTheme);
      window.removeEventListener('hashchange', updateTheme);
      clearInterval(interval);
    };
  }, []);

  return pageTheme;
}

function detectTheme() {
  try {
    const host = window.location.hostname.toLowerCase();
    const href = window.location.href.toLowerCase();

    // 1. Music & Audio Apps
    if (
      host.includes('spotify.com') ||
      host.includes('soundcloud.com') ||
      host.includes('music.youtube.com') ||
      host.includes('music.apple.com') ||
      host.includes('bandcamp.com') ||
      host.includes('tidal.com') ||
      host.includes('deezer.com') ||
      host.includes('pandora.com') ||
      host.includes('audiomack.com')
    ) {
      return 'music';
    }

    // 2. Dev & Coding
    if (
      host.includes('github.com') ||
      host.includes('gitlab.com') ||
      host.includes('stackoverflow.com') ||
      host.includes('stackexchange.com') ||
      host.includes('leetcode.com') ||
      host.includes('developer.mozilla.org') ||
      host.includes('npmjs.com') ||
      host.includes('codepen.io') ||
      host.includes('replit.com') ||
      host.includes('codesandbox.io')
    ) {
      return 'dev';
    }

    // 3. Video & Streaming (check after music.youtube.com)
    if (
      host.includes('youtube.com') ||
      host.includes('youtu.be') ||
      host.includes('netflix.com') ||
      host.includes('twitch.tv') ||
      host.includes('disneyplus.com') ||
      host.includes('primevideo.com') ||
      host.includes('hulu.com') ||
      host.includes('vimeo.com')
    ) {
      return 'video';
    }

    // 4. Reading & Knowledge
    if (
      host.includes('wikipedia.org') ||
      host.includes('medium.com') ||
      host.includes('substack.com') ||
      host.includes('notion.so') ||
      host.includes('arxiv.org') ||
      host.includes('devdocs.io')
    ) {
      return 'reading';
    }

    return null;
  } catch {
    return null;
  }
}
