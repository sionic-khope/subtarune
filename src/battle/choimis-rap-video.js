export const CHOIMIS_RAP_VIDEO = Object.freeze({ src: 'assets/video/choimis-forever-22-41.mp4', volume: 0.72, opacity: 0.22 });

export function createChoimisRapVideo({ src = CHOIMIS_RAP_VIDEO.src, volume = CHOIMIS_RAP_VIDEO.volume,
  opacity = CHOIMIS_RAP_VIDEO.opacity, autoplay = true, documentRef = globalThis.document } = {}) {
  const video = documentRef?.createElement?.('video');
  let stopped = false, playError = null, loadError = null, playPending = false, settleReady = () => {};
  const ready = !video ? Promise.resolve(false) : video.readyState >= 2 ? Promise.resolve(true) : new Promise(resolve => {
    let settled = false;
    const timeout = setTimeout(() => failed(new Error('decode timeout')), 3000);
    const loaded = () => settleReady(true), failed = error => settleReady(false, error instanceof Error ? error : new Error('media load failed'));
    settleReady = (value, error = null) => {
      if (settled) return; settled = true; clearTimeout(timeout);
      video.removeEventListener?.('loadeddata', loaded); video.removeEventListener?.('error', failed);
      if (error) { loadError = error; console.warn('[choimis-rap-video] load failed', loadError); }
      resolve(value);
    };
    video.addEventListener?.('loadeddata', loaded, { once: true }); video.addEventListener?.('error', failed, { once: true });
  });
  if (video) {
    video.preload = 'auto'; video.playsInline = true; video.muted = false;
    video.volume = volume; video.src = src; video.load();
  }
  const play = () => {
    if (stopped || !video || playPending || playError) return;
    const attempt = video.play();
    if (attempt?.then) { playPending = true; attempt.then(() => { playPending = false; }).catch(error => { playPending = false; playError = error; console.warn('[choimis-rap-video] playback failed', error); }); }
  };
  const visibilityChanged = () => { if (documentRef?.hidden) video?.pause(); };
  documentRef?.addEventListener?.('visibilitychange', visibilityChanged);
  if (autoplay) play();
  return {
    get stopped() { return stopped; },
    get playError() { return playError; },
    get loadError() { return loadError; },
    ready,
    play,
    sync({ time, muted, paused }) {
      if (stopped || !video) return;
      video.muted = !!muted;
      if (video.readyState >= 2 && Number.isFinite(time) && Math.abs(video.currentTime - time) > 0.2) video.currentTime = time;
      if (paused || documentRef?.hidden) video.pause(); else if (video.paused) play();
    },
    draw(ctx, bounds) {
      if (stopped || !video || video.readyState < 2) return false;
      const vw = video.videoWidth || bounds.w, vh = video.videoHeight || bounds.h;
      const scale = Math.max(bounds.w / vw, bounds.h / vh), w = Math.round(vw * scale), h = Math.round(vh * scale);
      const x = Math.round(bounds.x + (bounds.w - w) / 2), y = Math.round(bounds.y + (bounds.h - h) / 2);
      ctx.save(); ctx.beginPath(); ctx.rect(bounds.x, bounds.y, bounds.w, bounds.h); ctx.clip();
      ctx.globalAlpha *= opacity; ctx.drawImage(video, x, y, w, h); ctx.restore();
      return true;
    },
    stop() {
      if (stopped) return;
      stopped = true; settleReady(false); documentRef?.removeEventListener?.('visibilitychange', visibilityChanged);
      if (!video) return;
      video.pause(); video.removeAttribute('src'); video.load();
    },
  };
}
