// 오프라인으로 쓰기(PWA). 기획: docs/오프라인-PWA-기획안.md
//  · 사용자가 "오프라인으로 쓰기"에서 저장을 눌렀을 때만 서비스워커(public 이 아니라 scripts/sw.template.js → dist/sw.js)를 등록한다.
//  · 저장하는 것: 앱 화면(서비스워커가 설치할 때 알아서) + 지금 언어의 글꼴. 사진·영상·API 는 저장하지 않는다.
//  · 오프라인일 때는 DJ 사진을 불러오지 않고 이름만 보여 준다 (config.ts faceSrc 가 null 을 돌려준다).
import { useSyncExternalStore } from "react";
import { THEME_FONTS } from "./fest/cardTheme";

/** 오프라인으로 쓰기를 여는 페스티벌 (TML 먼저. 다른 곳은 여기에 slug 만 더하면 켜진다) */
export const OFFLINE_FESTS = new Set<string>(["tomorrowland-thailand-2026"]);

const KEY = "fl:offline";
/** 서비스워커(scripts/sw.template.js)의 FONTS 와 같은 이름 */
export const FONT_CACHE = "fl-fonts-v1";

/** 시간표 데이터가 앱에 들어간 시각 (빌드 시각) */
export const BUILD_TIME: string = typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "";

export interface OfflineSaved {
  at: number;
  lang: string;
  files: number;
  bytes: number;
}

export function readSaved(): OfflineSaved | null {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || "null");
    return j && typeof j.at === "number" ? (j as OfflineSaved) : null;
  } catch {
    return null;
  }
}
function writeSaved(v: OfflineSaved | null) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    /* 저장소 없음 */
  }
  notify();
}

// ---------------------------------------------------------------- 작은 저장소 (React 가 구독)
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
function subscribeAll(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---------------------------------------------------------------- 연결 상태
export const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

function subscribeNet(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
/** 인터넷이 되는지 (바뀌면 화면이 다시 그려진다) */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeNet, () => !isOffline(), () => true);
}

/** 저장해 둔 기록 (저장·삭제하면 다시 그려진다) */
export function useSaved(): OfflineSaved | null {
  const raw = useSyncExternalStore(subscribeAll, () => localStorage.getItem(KEY), () => null);
  void raw;
  return readSaved();
}

// ---------------------------------------------------------------- 홈 화면 추가
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
let installEvent: InstallEvent | null = null;
/** Android(Chrome) 의 "앱 설치" 창을 띄울 수 있으면 true */
export function useCanInstall(): boolean {
  return useSyncExternalStore(subscribeAll, () => !!installEvent, () => false);
}
export async function promptInstall(): Promise<boolean> {
  const e = installEvent;
  if (!e) return false;
  await e.prompt();
  const r = await e.userChoice;
  installEvent = null;
  notify();
  return r.outcome === "accepted";
}
/** 홈 화면 앱(아이콘)으로 열려 있는지 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
export function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// ---------------------------------------------------------------- 서비스워커
export function swSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof caches !== "undefined" && import.meta.env.PROD;
}
export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!swSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

/** 앱 시작 때 한 번: 연결 상태를 <html data-offline> 에 표시하고, 저장한 적이 있으면 서비스워커를 다시 등록(새 버전으로 갱신) */
export function bootOffline(): void {
  if (typeof window === "undefined") return;
  const mark = () => {
    document.documentElement.toggleAttribute("data-offline", isOffline());
    if (!isOffline()) {
      try {
        localStorage.setItem("fl:lastOnline", String(Date.now()));
      } catch {
        /* 무시 */
      }
    }
  };
  mark();
  window.addEventListener("online", mark);
  window.addEventListener("offline", mark);
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e as InstallEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    notify();
  });
  if (readSaved()) void registerSW();
}

// ---------------------------------------------------------------- 저장 / 삭제
/** 언어별로 앱이 쓰는 CJK 글꼴 (구글 폰트 이름). 나머지 언어는 Noto Sans(라틴)만 */
const LANG_FONT: Record<string, string> = { ko: "Noto Sans KR", ja: "Noto Sans JP", zh: "Noto Sans SC", zht: "Noto Sans TC", th: "Noto Sans Thai" };
const ALWAYS_FONTS = ["Noto Sans", "Rubik", "Anton", "Caveat", "Permanent Marker", "DM Mono"];

function inRange(range: string, cps: number[]): boolean {
  return range
    .split(",")
    .map((s) => s.trim().replace(/^U\+/i, "").split("-").map((h) => parseInt(h, 16)))
    .some(([a, b]) => cps.some((c) => (b == null ? c === a : c >= a && c <= b)));
}

/**
 * 오프라인 저장: 서비스워커 등록(앱 화면 저장) → 지금 언어의 글꼴 조각 저장.
 * text: 화면에 쓰이는 글자 (그 글자를 덮는 글꼴 조각만 받는다). 글꼴은 서비스워커가 아니라 여기서 직접 Cache API 에 넣어서,
 * 이미 화면에 떠 있던 글꼴도 빠짐없이 저장된다.
 */
export async function saveOffline(lang: string, text: string, onProgress: (done: number, total: number) => void): Promise<OfflineSaved> {
  if (!swSupported()) throw new Error("unsupported");
  const reg = await registerSW();
  if (!reg) throw new Error("register");
  // 서비스워커가 설치되어(앱 화면 저장) 켜질 때까지 (최대 30초)
  await Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error("sw-timeout")), 30000))]);
  if (!(await caches.match("/index.html", { ignoreVary: true }))) throw new Error("shell");

  // 글꼴: 문서의 글꼴 CSS + 모든 카드 모양의 글꼴 CSS 주소를 모아서(링크를 문서에 새로 넣지 않는다: 같은 주소를 동시에 두 방식으로 요청하면 실패한다) 필요한 조각만 받는다
  const links = [...new Set([...[...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((l) => l.href), ...Object.values(THEME_FONTS).map((f) => f!.url)])].filter((h) => h.startsWith("https://fonts.googleapis.com/"));
  const allowed = new Set([...(LANG_FONT[lang] ? [LANG_FONT[lang]] : []), ...ALWAYS_FONTS]);
  const cps = [...new Set([...Array.from({ length: 95 }, (_, i) => i + 32), ...Array.from(text).map((c) => c.codePointAt(0)!)])];
  const cache = await caches.open(FONT_CACHE);
  const urls = new Set<string>();
  for (const href of links) {
    // cache:"reload": 페이지가 이미 일반(no-cors) 방식으로 받아 브라우저 캐시에 둔 응답은 CORS 로 다시 읽을 수 없어서 실패한다
    const res = await fetch(href, { mode: "cors", cache: "reload" });
    if (!res.ok) throw new Error("font-css");
    const css = await res.clone().text();
    await cache.put(href, res);
    for (const blk of css.split("@font-face").slice(1)) {
      const fam = /font-family:\s*['"]([^'"]+)['"]/.exec(blk)?.[1];
      const url = /url\((https:[^)]+)\)/.exec(blk)?.[1];
      const range = /unicode-range:\s*([^;]+);/.exec(blk)?.[1];
      if (!fam || !url || !allowed.has(fam)) continue;
      if (!range || inRange(range, cps)) urls.add(url);
    }
  }
  const list = [...urls];
  let done = 0, bytes = 0;
  onProgress(0, list.length);
  const queue = [...list];
  const worker = async () => {
    for (let u; (u = queue.shift()); ) {
      const hit = await cache.match(u);
      if (hit) bytes += (await hit.clone().blob()).size;
      else {
        const r = await fetch(u, { mode: "cors" });
        if (!r.ok) throw new Error("font-file");
        bytes += (await r.clone().blob()).size;
        await cache.put(u, r);
      }
      onProgress(++done, list.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

  const saved: OfflineSaved = { at: Date.now(), lang, files: list.length, bytes };
  writeSaved(saved);
  return saved;
}

/** 저장 지우기: 서비스워커 해제 + 저장한 파일 삭제 */
export async function deleteOffline(): Promise<void> {
  try {
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  } catch {
    /* 무시 */
  }
  try {
    for (const k of await caches.keys()) if (k.startsWith("fl-")) await caches.delete(k);
  } catch {
    /* 무시 */
  }
  writeSaved(null);
}
