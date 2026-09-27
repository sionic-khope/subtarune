// ─────────────────────────────────────────────────────────────
// 오프라인 캐시(BUILD390, 사용자 “새로고침에도 단단하게”): 배포 사이트에서만 등록된다(src/main.js registerOfflineCache).
//   빌드마다 캐시 이름이 바뀌어(sw.js?v=BUILD) 새 빌드가 뜨면 옛 캐시는 지운다.
//   코드(index.html·src·css)는 네트워크 우선(새 빌드 즉시), 실패하면 캐시 — 그림·곡·맵은 캐시 우선(한 번 받으면 새로고침에도 바로).
//   오디오의 Range 요청(부분 재생)은 브라우저에 맡긴다.
// ─────────────────────────────────────────────────────────────
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `subtarune-${VERSION}`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('subtarune-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));

const isCode = url => url.pathname.endsWith('/') || url.pathname.endsWith('.html') || url.pathname.includes('/src/') || url.pathname.includes('/css/') || url.pathname.endsWith('/sw.js');

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isCode(url)) {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) void cache.put(request, fresh.clone());
        return fresh;
      } catch (error) {
        const hit = await cache.match(request);
        if (hit) return hit;
        throw error;
      }
    }
    const hit = await cache.match(request);
    if (hit) return hit;
    const fresh = await fetch(request);
    if (fresh.ok && fresh.status === 200) void cache.put(request, fresh.clone());
    return fresh;
  })());
});
