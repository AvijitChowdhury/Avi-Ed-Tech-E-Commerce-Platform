// Facebook Pixel client helper
export const FB_PIXEL_ID = "1578286966994621";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    __fbPixelTrackersInit?: boolean;
  }
}

export function fbTrack(event: string, params?: Record<string, any>) {
  if (typeof window === "undefined" || !window.fbq) return;
  try {
    window.fbq("track", event, params ?? {});
  } catch {}
}

export function fbTrackCustom(event: string, params?: Record<string, any>) {
  if (typeof window === "undefined" || !window.fbq) return;
  try {
    window.fbq("trackCustom", event, params ?? {});
  } catch {}
}

// Initialise auto-trackers: TimeOnPage (30s), PageScroll (50%),
// WatchVideo (play + 10s), InternalClick (same-origin anchor clicks).
export function initFbAutoTrackers() {
  if (typeof window === "undefined" || window.__fbPixelTrackersInit) return;
  window.__fbPixelTrackersInit = true;

  let timeFired = false;
  const timeTimer = window.setTimeout(() => {
    if (timeFired) return;
    timeFired = true;
    fbTrackCustom("TimeOnPage", { seconds: 30, path: location.pathname });
  }, 30_000);

  let scrollFired = false;
  const onScroll = () => {
    if (scrollFired) return;
    const h = document.documentElement;
    const scrolled = (h.scrollTop + window.innerHeight) / h.scrollHeight;
    if (scrolled >= 0.5) {
      scrollFired = true;
      fbTrackCustom("PageScroll", { percent: 50, path: location.pathname });
      window.removeEventListener("scroll", onScroll);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  const onClick = (e: MouseEvent) => {
    const target = (e.target as HTMLElement | null)?.closest("a");
    if (!target) return;
    const href = target.getAttribute("href");
    if (!href) return;
    const isInternal =
      href.startsWith("/") ||
      (href.startsWith(location.origin) && !href.startsWith(location.origin + location.pathname + "#"));
    if (isInternal) {
      fbTrackCustom("InternalClick", { href, from: location.pathname });
    }
  };
  document.addEventListener("click", onClick, true);

  const wireVideo = (v: HTMLVideoElement) => {
    if ((v as any).__fbWired) return;
    (v as any).__fbWired = true;
    let playFired = false;
    let durationFired = false;
    let playedSeconds = 0;
    let lastTs = 0;
    v.addEventListener("play", () => {
      if (!playFired) {
        playFired = true;
        fbTrackCustom("WatchVideo", { action: "play", src: v.currentSrc || v.src });
      }
      lastTs = Date.now();
    });
    v.addEventListener("timeupdate", () => {
      if (durationFired) return;
      const now = Date.now();
      if (lastTs) playedSeconds += (now - lastTs) / 1000;
      lastTs = now;
      if (playedSeconds >= 10) {
        durationFired = true;
        fbTrackCustom("WatchVideo", { action: "watched10s", src: v.currentSrc || v.src });
      }
    });
    v.addEventListener("pause", () => { lastTs = 0; });
  };
  document.querySelectorAll("video").forEach(wireVideo as any);
  const mo = new MutationObserver(() => {
    document.querySelectorAll("video").forEach(wireVideo as any);
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // Cleanup not strictly needed (root lifetime), but expose for tests.
  return () => {
    window.clearTimeout(timeTimer);
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("click", onClick, true);
    mo.disconnect();
  };
}
