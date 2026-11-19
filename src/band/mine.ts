// 내 컬렉션: 이 기기의 열쇠·프로필 만들기·팔찌 올리기·담기 (서버 api/band.ts POST).
// 계정이 없는 대신 이 기기에서 만든 무작위 열쇠(cred)로 내 기록을 지킨다 (서버에는 해시만). 다른 기기에서는 관리 코드로.
// 이 컴퓨터(localhost)에서 서버가 없으면 demoStore.ts 에 흉내 내어 저장한다 → 로컬에서도 등록부터 공유까지 해 볼 수 있다.
import { LOCAL } from "./api";
import { readStore, writeStore, type StoreDesign } from "./demoStore";

export interface Me {
  id: string;
  cred: string;
  name: string;
  ig: string;
  /** 관리 코드 (만들 때 한 번 받는다. 이 기기에만 저장) */
  code?: string;
  /** 로컬 시연용 가짜 서버에 만든 프로필 */
  demo?: boolean;
}
export interface Ticket {
  key: string;
  fest: string;
  band: string;
  year: number;
  grade: string;
  day: string;
  gradeLabel: string;
  dayLabel: string;
}
export interface FoundDesign {
  key: string;
  img: string;
  style: string;
  pal: string[];
  fest: string;
  year: number;
  byName: string | null;
}
export type SaveError = "full" | "rate" | "bad-image" | "bad-ticket" | "no-auth" | "locked" | "busy" | "offline" | "storage" | "error";
export type SaveResult = { ok: true; exists: boolean; design: FoundDesign | null } | { ok: false; error: SaveError };

const ME_KEY = "fl:band:me";
export function getMe(): Me | null {
  try {
    const m = JSON.parse(localStorage.getItem(ME_KEY) || "null") as Me | null;
    return m && typeof m.id === "string" && typeof m.cred === "string" ? m : null;
  } catch {
    return null;
  }
}
function setMe(m: Me) {
  try {
    localStorage.setItem(ME_KEY, JSON.stringify(m));
  } catch {
    /* 저장소 없음 */
  }
}

function randomCred(): string {
  const a = new Uint8Array(30);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function post(a: string, body: unknown): Promise<{ status: number; body: Record<string, unknown> } | null> {
  try {
    const r = await fetch("/api/band?a=" + a, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!(r.headers.get("content-type") || "").includes("application/json")) return null;
    return { status: r.status, body: (await r.json()) as Record<string, unknown> };
  } catch {
    return null;
  }
}
/** 서버가 없어서(로컬) 가짜 서버로 바꿔야 하는지 */
const useDemo = (r: { status: number } | null) => LOCAL && (r === null || r.status >= 500);
const errOf = (r: { status: number; body: Record<string, unknown> } | null): SaveError => {
  if (!r) return navigator.onLine === false ? "offline" : "error";
  const e = String(r.body.error || "");
  return (["full", "rate", "bad-image", "bad-ticket", "no-auth", "locked", "busy"] as SaveError[]).includes(e as SaveError) ? (e as SaveError) : "error";
};

/** @handle · 주소 · 긴 주소 → handle (서버와 같은 규칙). 아니면 null */
export function igHandle(x: string): string | null {
  let s = x.trim();
  if (!s) return null;
  if (/instagram\.com/i.test(s)) {
    try {
      s = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s).pathname.split("/").filter(Boolean)[0] || "";
    } catch {
      return null;
    }
  }
  s = s.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(s) || /^(p|reel|reels|explore|accounts|stories|tv|direct)$/i.test(s)) return null;
  return s.toLowerCase();
}

/* ---------- 프로필 만들기 ---------- */
const DEMO_WORDS = "사과 바다 구름 하늘 나무 별빛 달빛 노을 파도 모래 호수 단풍 무지개 햇살 안개 고래 토끼 여우 사슴 고양이".split(" ");
export async function createProfile(name: string, igInput: string): Promise<{ ok: true; me: Me } | { ok: false; error: "bad-name" | "bad-ig" | SaveError }> {
  const handle = igHandle(igInput);
  const nm = name.trim();
  if (!nm || [...nm].length > 20) return { ok: false, error: "bad-name" };
  if (!handle) return { ok: false, error: "bad-ig" };
  const cred = randomCred();
  const r = await post("profile", { name: nm, ig: handle, cred });
  if (r && r.status === 200 && typeof r.body.id === "string") {
    const me: Me = { id: r.body.id, cred, name: nm, ig: handle, code: String(r.body.code || "") };
    setMe(me);
    return { ok: true, me };
  }
  if (!useDemo(r)) return { ok: false, error: r?.body.error === "bad-ig" ? "bad-ig" : r?.body.error === "bad-name" ? "bad-name" : errOf(r) };
  // 로컬 시연: 이 기기에 만든다
  const s = readStore();
  const id = "c" + Math.random().toString(36).slice(2, 11).padEnd(9, "0");
  const code = Array.from({ length: 4 }, () => DEMO_WORDS[Math.floor(Math.random() * DEMO_WORDS.length)]).join("-");
  s.profiles[id] = { name: nm, ig: `https://www.instagram.com/${handle}/`, code, at: Date.now(), items: [] };
  if (!writeStore(s)) return { ok: false, error: "storage" };
  const me: Me = { id, cred, name: nm, ig: handle, code, demo: true };
  setMe(me);
  return { ok: true, me };
}

/* ---------- 같은 티켓의 첫 디자인 찾기 ---------- */
export async function lookupDesign(key: string): Promise<FoundDesign | null> {
  let r: { status: number; body: Record<string, unknown> } | null = null;
  try {
    const res = await fetch("/api/band?a=design&key=" + encodeURIComponent(key));
    if ((res.headers.get("content-type") || "").includes("application/json")) r = { status: res.status, body: (await res.json()) as Record<string, unknown> };
  } catch {
    r = null;
  }
  if (r && r.status === 200 && r.body.design) {
    const d = r.body.design as Record<string, unknown>;
    const by = d.by as { name?: string } | null;
    return { key, img: String(d.img), style: String(d.style), pal: (d.pal as string[]) || [], fest: String(d.fest), year: Number(d.year), byName: by?.name ?? null };
  }
  if (!useDemo(r)) return null;
  const s = readStore();
  const d = s.designs[key];
  if (d) return { key, img: d.img, style: d.style, pal: d.pal, fest: d.fest, year: d.year, byName: s.profiles[d.by]?.name ?? null };
  try {
    const demo = await import("./demo");
    const x = demo.demoDesign(key);
    return x ? { key, img: x.img, style: x.style, pal: x.pal, fest: x.fest, year: x.year, byName: null } : null;
  } catch {
    return null;
  }
}

/* ---------- 그림 줄이기: 긴 변 1024px · 300KB 이하 · WebP(안 되면 JPEG — 아이폰 Safari) ---------- */
async function encode(src: HTMLCanvasElement, maxSide = 1024, maxBytes = 300 * 1024): Promise<{ b64: string; dataUrl: string } | null> {
  const k = Math.min(1, maxSide / Math.max(src.width, src.height));
  const c = document.createElement("canvas");
  c.width = Math.max(64, Math.round(src.width * k));
  c.height = Math.max(64, Math.round(src.height * k));
  const g = c.getContext("2d")!;
  g.fillStyle = "#0B0620"; // 투명한 끝단(올 풀림)은 JPEG 에서 검게 되지 않게 무대 색으로
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(src, 0, 0, c.width, c.height);
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((res) => c.toBlob(res, type, q));
  for (const q of [0.82, 0.72, 0.6, 0.5]) {
    let b = await toBlob("image/webp", q);
    if (!b || b.type !== "image/webp") b = await toBlob("image/jpeg", q);
    if (b && b.size <= maxBytes) {
      const dataUrl = await new Promise<string>((res) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.readAsDataURL(b!);
      });
      return { b64: dataUrl.slice(dataUrl.indexOf(",") + 1), dataUrl };
    }
  }
  return null;
}

/* ---------- 팔찌 올리기 (처음이면 그 디자인이 모두의 것) ---------- */
export async function saveDesign(me: Me, t: Ticket, style: string, pal: string[], canvas: HTMLCanvasElement): Promise<SaveResult> {
  if (!me.demo) {
    const img = await encode(canvas);
    if (!img) return { ok: false, error: "bad-image" };
    const r = await post("design", { id: me.id, cred: me.cred, key: t.key, fest: t.fest, year: t.year, grade: t.gradeLabel, day: t.dayLabel, style, pal, img: img.b64 });
    if (r && r.status === 200 && r.body.ok) {
      const exists = r.body.exists === true;
      if (exists) {
        const c = await collect(me, t.key);
        if (!c.ok) return c;
      }
      const d = r.body.design as Record<string, unknown> | null;
      return { ok: true, exists, design: d ? { key: t.key, img: String(d.img), style: String(d.style), pal: (d.pal as string[]) || [], fest: String(d.fest), year: Number(d.year), byName: (d.by as { name?: string } | null)?.name ?? null } : null };
    }
    if (!useDemo(r)) return { ok: false, error: errOf(r) };
  }
  // 로컬 시연: 이 기기에 저장 (그림은 작게)
  const s = readStore();
  const p = s.profiles[me.id];
  if (!p) return { ok: false, error: "no-auth" };
  if (p.items.length >= 60 && !p.items.some((it) => it.key === t.key)) return { ok: false, error: "full" };
  let d = s.designs[t.key];
  const exists = !!d;
  if (!d) {
    const img = await encode(canvas, 640, 120 * 1024);
    if (!img) return { ok: false, error: "bad-image" };
    d = { key: t.key, fest: t.fest, year: t.year, grade: t.gradeLabel, day: t.dayLabel, style, pal, img: img.dataUrl, w: canvas.width, h: canvas.height, at: Date.now(), by: me.id } as StoreDesign;
    s.designs[t.key] = d;
  }
  if (!p.items.some((it) => it.key === t.key)) p.items.push({ key: t.key, at: Date.now() });
  p.at = Date.now();
  if (!writeStore(s)) return { ok: false, error: "storage" };
  return { ok: true, exists, design: { key: t.key, img: d.img, style: d.style, pal: d.pal, fest: d.fest, year: d.year, byName: s.profiles[d.by]?.name ?? null } };
}

/** 이미 있는 디자인을 내 기록에 담기 */
export async function collect(me: Me, key: string, found?: FoundDesign | null): Promise<{ ok: true } | { ok: false; error: SaveError }> {
  if (!me.demo) {
    const r = await post("collect", { id: me.id, cred: me.cred, key });
    if (r && r.status === 200 && r.body.ok) return { ok: true };
    if (!useDemo(r)) return { ok: false, error: errOf(r) };
  }
  const s = readStore();
  const p = s.profiles[me.id];
  if (!p) return { ok: false, error: "no-auth" };
  if (!s.designs[key] && found) {
    // 예시 데이터(demo.ts)의 디자인을 담을 때: 이 기기 저장소에도 복사해 둔다
    s.designs[key] = { key, fest: found.fest, year: found.year, grade: key.split(":")[2] || "", day: key.split(":")[3] || "", style: found.style, pal: found.pal, img: found.img, w: 600, h: 100, at: Date.now(), by: "" };
  }
  if (p.items.length >= 60 && !p.items.some((it) => it.key === key)) return { ok: false, error: "full" };
  if (!p.items.some((it) => it.key === key)) p.items.push({ key, at: Date.now() });
  p.at = Date.now();
  return writeStore(s) ? { ok: true } : { ok: false, error: "storage" };
}
