// FestLock 오프라인 서비스워커 — 템플릿. scripts/make-sw.mjs 가 빌드 때 아래 BUILD 와 SHELL_FILES 의 자리표시자를 채워 dist/sw.js 로 만든다 (이 파일은 사이트에 올라가지 않는다).
// 기획: docs/오프라인-PWA-기획안.md
//  · 사용자가 "오프라인으로 쓰기"를 눌렀을 때만 등록된다 (src/offline.ts). 안 누른 사람에게는 아무 영향이 없다.
//  · 앱 화면(index.html · JS · CSS · 아이콘)과 글꼴만 저장한다. 사진·영상·API 는 저장하지 않는다 (오프라인에서는 DJ 이름만 나온다).
//  · 되돌리기: 이 파일을 아래 "KILL" 형태(스스로 등록 해제 + 캐시 삭제)로 바꿔 배포하면 사용자 기기에서 서비스워커가 사라진다. docs/오프라인-PWA-기획안.md 참고.
const BUILD = "__BUILD__";
const SHELL = "fl-shell-" + BUILD;
const FONTS = "fl-fonts-v1"; // src/offline.ts 가 글꼴을 여기에 넣는다 (이 이름을 바꾸면 양쪽을 같이)
const SHELL_FILES = __SHELL__;
const SHELL_SET = new Set(SHELL_FILES);

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith("fl-shell-") && k !== SHELL) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

/** 네트워크를 먼저 보고(최대 ms), 안 되면 캐시한 index.html — 어떤 주소로 열어도 같은 앱 껍데기가 뜬다 (화면은 주소를 보고 고른다: main.tsx) */
async function navigate(req) {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 3500);
    const res = await fetch(req, { signal: ctl.signal });
    clearTimeout(timer);
    return res;
  } catch {
    const c = await caches.open(SHELL);
    return (await c.match("/index.html")) || Response.error();
  }
}

async function cacheFirst(req, name) {
  const c = await caches.open(name);
  const hit = await c.match(req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
  return res;
}

/** 캐시를 먼저 주고 뒤에서 새로 받아 둔다 (글꼴 CSS) */
async function staleWhileRevalidate(req, name) {
  const c = await caches.open(name);
  const hit = await c.match(req, { ignoreVary: true });
  const net = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    const p = url.pathname;
    // 서버 API · 분석 · 영상/드랍 목록 · 서비스워커 자신은 건드리지 않는다 (오프라인이면 그냥 실패)
    if (p.startsWith("/api/") || p.startsWith("/_vercel/") || p === "/drops.json" || p === "/clips.json" || p === "/sw.js") return;
    if (req.mode === "navigate") return void e.respondWith(navigate(req));
    if (p.startsWith("/assets/") || SHELL_SET.has(p)) return void e.respondWith(cacheFirst(req, SHELL));
    return; // 포스터 · 튜토리얼 샘플 · OG 이미지는 저장하지 않는다
  }
  if (url.hostname === "fonts.googleapis.com") return void e.respondWith(staleWhileRevalidate(req, FONTS));
  if (url.hostname === "fonts.gstatic.com") return void e.respondWith(cacheFirst(req, FONTS));
});

/* ---- KILL (되돌리기용: 위 내용을 통째로 이것으로 바꿔 배포하면 서비스워커가 스스로 지워진다) ----
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("fl-")) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll()) c.navigate(c.url);
})()));
*/
