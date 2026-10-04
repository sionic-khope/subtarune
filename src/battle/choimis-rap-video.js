export const CHOIMIS_RAP_VIDEO = Object.freeze({ src: 'assets/video/choimis-forever-22-41.mp4', volume: 0.72, opacity: 0.22 });

/**
 * 영상 좌표(원본 픽셀)의 얼굴 칸을 시간에 맞춰 찾는다. keys = [[초, x, y, w, h], …] 시간순, 사이는 선형 보간
 * (장면이 끊기는 곳은 같은 시각 근처에 키 두 개를 둬 건너뛴다). 범위 밖이면 가장 가까운 끝 키.
 */
export function mosaicBoxAt(keys, time) {
  if (!keys?.length) return null;
  if (time <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (time > b[0]) continue;
    const k = b[0] > a[0] ? (time - a[0]) / (b[0] - a[0]) : 1;
    return [1, 2, 3, 4].map(j => a[j] + (b[j] - a[j]) * k);
  }
  return keys[keys.length - 1].slice(1);
}

export function createChoimisRapVideo({ src = CHOIMIS_RAP_VIDEO.src, volume = CHOIMIS_RAP_VIDEO.volume,
  opacity = CHOIMIS_RAP_VIDEO.opacity, autoplay = true, documentRef = globalThis.document, mosaic = null } = {}) {
  let mosaicCanvas = null;
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
      ctx.globalAlpha *= opacity; ctx.drawImage(video, x, y, w, h);
      // 얼굴 모자이크: 원본에서 얼굴 칸을 block 픽셀 단위로 줄였다가(평균) 계단지게 키워 같은 자리에 덮는다
      const box = mosaic && mosaicBoxAt(mosaic.keys, video.currentTime);
      if (box) {
        const [bx, by, bw, bh] = box, block = mosaic.block ?? 8;
        const cw = Math.max(1, Math.ceil(bw / block)), ch = Math.max(1, Math.ceil(bh / block));
        mosaicCanvas ??= documentRef?.createElement?.('canvas');
        const mc = mosaicCanvas?.getContext?.('2d');
        if (mc) {
          if (mosaicCanvas.width !== cw || mosaicCanvas.height !== ch) { mosaicCanvas.width = cw; mosaicCanvas.height = ch; }
          mc.imageSmoothingEnabled = true; mc.drawImage(video, bx, by, bw, bh, 0, 0, cw, ch);
          const smoothing = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
          ctx.drawImage(mosaicCanvas, 0, 0, cw, ch, x + bx * scale, y + by * scale, cw * block * scale, ch * block * scale);
          ctx.imageSmoothingEnabled = smoothing;
        }
      }
      ctx.restore();
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
