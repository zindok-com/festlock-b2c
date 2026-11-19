// 나만의 컬렉션: 서버(api/band.ts) 읽기 + 신고 보내기.
// 이 컴퓨터(localhost)에서 서버가 없을 때(DB 없음 503·연결 실패·JSON이 아닌 응답)만 예시 데이터(demo.ts)를 쓴다.
// 운영 주소(festlock.com 등)에서는 LOCAL 이 false 라서 예시 데이터를 절대 쓰지 않는다 — demo.ts 는 따로 묶여 있어 받지도 않는다.
import { isOffline } from "../offline";
import { deviceId } from "../fest/festStats";
import { storeCards, storeCollector } from "./demoStore";

export interface BandDesign {
  key: string;
  fest: string;
  year: number;
  grade: string;
  day: string;
  style: string;
  /** 사진에서 뽑은 색 (금사 디자인 팔찌의 바탕색 등) */
  pal: string[];
  img: string;
  w: number;
  h: number;
}
export interface CollectorCard {
  id: string;
  name: string;
  count: number;
  thumbs: string[];
}
export interface CollectorList {
  list: CollectorCard[];
  next: number | null;
}
export interface Collector {
  id: string;
  name: string;
  ig: string | null;
  count: number;
  items: BandDesign[];
}
export type Sort = "recent" | "most";
export type Load<T> = { kind: "ok"; data: T; demo: boolean } | { kind: "none" } | { kind: "error" } | { kind: "offline" };

/** 이 컴퓨터에서 연 화면인지 (festStats.ts 의 DEMO 와 같은 기준) */
export const LOCAL = typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
export const ID_RE = /^c[a-z0-9]{9}$/;

/** 한 번 예시 데이터로 바뀌면 이 화면에서는 계속 예시 데이터를 쓴다 (LOCAL 일 때만 켜질 수 있음) */
let demoOn = false;

async function getJson(url: string): Promise<{ status: number; body: Record<string, unknown> } | null> {
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!(r.headers.get("content-type") || "").includes("application/json")) return null;
    return { status: r.status, body: (await r.json()) as Record<string, unknown> };
  } catch {
    return null;
  }
}
/** 서버가 없거나 고장 (예시 데이터로 바꿔도 되는 경우) */
const apiDown = (r: { status: number } | null) => r === null || r.status >= 500;

// 서버에서 온 값은 모양을 한 번 더 확인한다 (이미지는 https 주소만, 인스타는 instagram.com 만)
// 로컬 시연(demoOn)일 때만 이 기기에서 만든 그림(data:)도 받는다
const safeImg = (s: unknown): string | null => (typeof s === "string" && (/^https:\/\//.test(s) || (demoOn && /^data:image\/(svg\+xml,|jpeg;base64,|webp;base64,|png;base64,)/.test(s))) ? s : null);
const safeIg = (s: unknown): string | null => (typeof s === "string" && /^https:\/\/www\.instagram\.com\/[A-Za-z0-9._]{1,30}\/$/.test(s) ? s : null);

function toDesign(x: unknown): BandDesign | null {
  const d = x as Record<string, unknown> | null;
  if (!d || typeof d.key !== "string") return null;
  const img = safeImg(d.img);
  if (!img) return null;
  return { key: d.key, fest: String(d.fest ?? ""), year: Number(d.year) || 0, grade: String(d.grade ?? ""), day: String(d.day ?? ""), style: String(d.style ?? "photo"), pal: (Array.isArray(d.pal) ? d.pal : []).filter((c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 6), img, w: Number(d.w) || 0, h: Number(d.h) || 0 };
}
function toList(b: Record<string, unknown>): CollectorList {
  const list = (b.list as unknown[]).flatMap((x) => {
    const c = x as Record<string, unknown>;
    if (!c || typeof c.id !== "string" || !ID_RE.test(c.id)) return [];
    const thumbs = (Array.isArray(c.thumbs) ? c.thumbs : []).map(safeImg).filter((s): s is string => !!s).slice(0, 3);
    return [{ id: c.id, name: String(c.name ?? ""), count: Number(c.count) || 0, thumbs }];
  });
  return { list, next: typeof b.next === "number" ? b.next : null };
}
function toCollector(b: Record<string, unknown>): Collector {
  const items = (Array.isArray(b.items) ? b.items : []).map((it) => toDesign((it as Record<string, unknown>)?.design)).filter((d): d is BandDesign => !!d);
  return { id: String(b.id), name: String(b.name ?? ""), ig: safeIg(b.ig), count: Number(b.count) || items.length, items };
}

/** 구경하기 목록 한 쪽 (24명씩). fest 를 고르면 정렬은 최근순만 (서버와 같음) */
export async function loadCollectors(q: { fest: string; sort: Sort; cursor: number }): Promise<Load<CollectorList>> {
  if (isOffline()) return { kind: "offline" };
  const p = new URLSearchParams({ a: "collectors" });
  if (q.fest) p.set("fest", q.fest);
  else if (q.sort === "most") p.set("sort", "most");
  if (q.cursor) p.set("cursor", String(q.cursor));
  const r = demoOn ? null : await getJson("/api/band?" + p.toString());
  if (r && r.status === 200 && Array.isArray(r.body.list)) return { kind: "ok", data: toList(r.body), demo: false };
  if (LOCAL && (demoOn || apiDown(r))) {
    try {
      const demo = await import("./demo");
      demoOn = true;
      const base = demo.demoCollectors(q);
      // 이 기기에서 만든(로컬 시연) 사람을 맨 앞에
      const mine = q.cursor === 0 ? storeCards(q.fest) : [];
      const list = [...mine, ...base.list.filter((c) => !mine.some((m) => m.id === c.id))];
      return { kind: "ok", data: toList({ list, next: base.next } as unknown as Record<string, unknown>), demo: true };
    } catch {
      return { kind: "error" };
    }
  }
  return { kind: "error" };
}

/** 한 사람의 기록. 없으면 none */
export async function loadCollector(id: string): Promise<Load<Collector>> {
  if (!ID_RE.test(id)) return { kind: "none" };
  if (isOffline()) return { kind: "offline" };
  const r = demoOn ? null : await getJson("/api/band?a=collector&id=" + id);
  if (r && r.status === 200 && r.body.id === id) return { kind: "ok", data: toCollector(r.body), demo: false };
  if (r && (r.status === 404 || r.status === 400)) return { kind: "none" };
  if (LOCAL && (demoOn || apiDown(r))) {
    try {
      const demo = await import("./demo");
      demoOn = true;
      const c = storeCollector(id) ?? demo.demoCollector(id);
      return c ? { kind: "ok", data: toCollector(c as unknown as Record<string, unknown>), demo: true } : { kind: "none" };
    } catch {
      return { kind: "error" };
    }
  }
  return { kind: "error" };
}

export type ReportReason = "impersonation" | "photo" | "number" | "other";
export type ReportResult = "done" | "dup" | "limited" | "error";

/** 수집가 신고 (같은 기기에서 두 번 보내도 한 번만 센다 — 서버가 기기 id로 거른다) */
export async function reportCollector(id: string, reason: ReportReason): Promise<ReportResult> {
  if (demoOn) return "done"; // 예시 데이터는 서버로 보내지 않는다
  try {
    const r = await fetch("/api/band?a=report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "collector", target: id, device: deviceId(), reason }),
    });
    if (r.status === 429) return "limited";
    if (!r.ok) return "error";
    const b = (await r.json()) as { changed?: boolean };
    return b.changed === false ? "dup" : "done";
  } catch {
    return "error";
  }
}
