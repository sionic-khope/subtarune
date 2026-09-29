// ─────────────────────────────────────────────────────────────
// 오프라인 캐시(BUILD390, 사용자 “새로고침에도 단단하게”): 배포 사이트에서만 등록된다(src/main.js registerOfflineCache).
//   코드(index.html·src·css)는 빌드별 캐시 — 네트워크 우선(새 빌드 즉시), 실패하면 캐시.
//   에셋(그림·곡·맵·영상)은 빌드와 무관한 캐시(BUILD432) — asset-manifest.json 의 내용 지문(h)을 열쇠에 붙여
//     바뀐 파일만 다시 받는다(전엔 빌드마다 248MB 를 통째로 지우고 다시 받았다). 버전 꼬리표(?v=, &r=)는 열쇠에서 뗀다.
//   오디오 부분 요청(Range)도 캐시에 통째로 있으면 잘라서 준다 — 곡 재생이 새로고침·끊긴 망에서도 캐시로 된다.
// ─────────────────────────────────────────────────────────────
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CODE = `subtarune-${VERSION}`;
const ASSETS = 'subtarune-assets';
const ROOT = new URL('./', self.location.href).pathname;
let manifest = null, codeList = [];

/** asset-manifest.json → { 경로(ROOT 기준): 지문 } — 서비스 워커가 다시 깨어나도 코드 캐시에서 다시 읽는다 */
async function loadManifest() {
  if (manifest) return manifest;
  const url = `${ROOT}asset-manifest.json?v=${VERSION}`;
  const cache = await caches.open(CODE);
  let res = await cache.match(url);
  if (!res) { try { res = await fetch(url); if (res.ok) await cache.put(url, res.clone()); } catch { res = null; } }
  const list = res && res.ok ? await res.json().catch(() => null) : null;
  manifest = Object.fromEntries((list?.files || []).map(f => [f.p, f.h]));
  codeList = list?.code || [];
  return manifest;
}

// 설치 때 코드 껍데기(index.html·src·css)를 받아 둔다 — 첫 방문엔 페이지가 서비스 워커보다 먼저 떠서 코드가 캐시에 없었다
self.addEventListener('install', event => event.waitUntil((async () => {
  await loadManifest();
  const cache = await caches.open(CODE);
  await Promise.all(codeList.map(p => fetch(`${ROOT}${p}`).then(r => (r.ok ? cache.put(`${ROOT}${p}`, r) : null)).catch(() => null)));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('subtarune-') && key !== CODE && key !== ASSETS) await caches.delete(key);
  // 이번 빌드 목록에 없거나 지문이 바뀐 에셋만 지운다
  const m = await loadManifest();
  if (Object.keys(m).length) {
    const cache = await caches.open(ASSETS);
    for (const req of await cache.keys()) {
      const u = new URL(req.url), p = u.pathname.slice(ROOT.length);
      if (m[p] !== u.searchParams.get('h')) await cache.delete(req);
    }
  }
  await self.clients.claim();
})()));

const isCode = url => url.pathname.endsWith('/') || url.pathname.endsWith('.html') || url.pathname.includes('/src/') || url.pathname.includes('/css/') || url.pathname.endsWith('/sw.js') || url.pathname.endsWith('/asset-manifest.json');

/** 에셋 캐시 열쇠: 버전 꼬리표를 떼고 지문(h)만 — 같은 파일은 어떤 주소로 불러도 한 번만 받는다 */
async function assetKey(url) {
  const p = url.pathname.slice(ROOT.length), h = (await loadManifest())[p];
  return `${url.origin}${url.pathname}?h=${h || 'x'}`;
}

/** 통째로 캐시된 응답에서 Range(bytes=a-b) 조각을 206 으로 만든다 */
async function sliceRange(full, range) {
  const buf = await full.arrayBuffer(), size = buf.byteLength;
  const [a, b] = range.replace(/^bytes=/, '').split(',')[0].split('-');
  let start = a === '' ? Math.max(0, size - Number(b)) : Number(a);
  let end = a === '' || b === '' ? size - 1 : Math.min(Number(b), size - 1);
  if (!(start <= end) || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': full.headers.get('Content-Type') || 'application/octet-stream',
    'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const range = request.headers.get('range');
  if (isCode(url)) {
    if (range) return;
    event.respondWith((async () => {
      const cache = await caches.open(CODE);
      try {
        const fresh = await fetch(request);
        if (fresh.ok) void cache.put(request, fresh.clone());
        return fresh;
      } catch (error) {
        // 버전 꼬리표(?v=)·주소 뒤 인자가 달라도 같은 파일이면 쓴다(오프라인)
        const hit = await cache.match(request) || await cache.match(request, { ignoreSearch: true })
          || (request.mode === 'navigate' ? await cache.match(`${ROOT}index.html`) : null);
        if (hit) return hit;
        throw error;
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(ASSETS), key = await assetKey(url);
    const hit = await cache.match(key);
    if (hit) return range ? sliceRange(hit, range) : hit;
    if (range) {
      // 아직 없는 곡: 재생은 네트워크 부분 요청으로 바로 하고, 통째 파일은 뒤에서 받아 둔다
      event.waitUntil(fetch(url.pathname).then(r => (r.ok && r.status === 200 ? cache.put(key, r) : null)).catch(() => null));
      return fetch(request);
    }
    const fresh = await fetch(request);
    if (fresh.ok && fresh.status === 200) event.waitUntil(cache.put(key, fresh.clone()));
    return fresh;
  })());
});
