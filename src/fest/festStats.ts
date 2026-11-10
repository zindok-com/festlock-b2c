// 새 페스티벌 다운로드 수·아티스트 랭킹 (서버: /api/fest-download, /api/fest-stats)
import { useCallback, useEffect, useState } from "react";
import { GMF_ITEMS } from "./gmf";
import { NOL_ITEMS } from "./nol";
import { ORL_ITEMS } from "./orl";
import { ZON_ITEMS } from "./zon";

export type FestKey = "gmf" | "nol" | "orl" | "zon";

/** 페스티벌별 집계 날짜 (서버 api/fest-download.ts·fest-stats.ts와 같게) */
export const FEST_DAYS: Record<FestKey, string[]> = { gmf: ["sat", "sun"], nol: ["sat", "sun"], orl: ["fri", "sat", "sun"], zon: ["sat"] };

/** 로컬 더미 데이터용 페스티벌별 값 (실제 사이트에서는 쓰이지 않음). 새 페스티벌은 여기에 한 줄 추가 */
const DEMO_META: Record<FestKey, { items: () => { id: string; s: number }[]; seed: number; downloads: Record<string, number> }> = {
  gmf: { items: () => GMF_ITEMS.filter((i) => !i.kind || i.kind === "act"), seed: 11, downloads: { sat: 1284, sun: 1102 } },
  nol: { items: () => NOL_ITEMS, seed: 29, downloads: { sat: 1531, sun: 1206 } },
  orl: { items: () => ORL_ITEMS, seed: 41, downloads: { fri: 642, sat: 811, sun: 733 } },
  zon: { items: () => ZON_ITEMS, seed: 53, downloads: { sat: 418 } },
};

export interface FestStats {
  /** 날짜 id → 다운로드 수 */
  downloads: Record<string, number>;
  /** 아티스트별 선택 수 (많은 순) */
  all: { id: string; count: number }[];
}

/** counted: 새로 집계됨 / dup: 보낼 게 없거나 이미 집계됨 / limited: 너무 자주 눌러 잠시 제한 / error: 실패 */
export type ReportResult = "counted" | "dup" | "limited" | "error";

// ---------------------------------------------------------------------
// 로컬 더미 데이터: 이 컴퓨터(localhost)에서 볼 때만 서버 대신 가짜 숫자를 쓴다.
// 실제 사이트 주소에서는 절대 켜지지 않는다. 지우려면 브라우저 저장소의 fl:demo:* 를 지우면 된다.
// ---------------------------------------------------------------------
export const DEMO = typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const demoKey = (fest: FestKey) => "fl:demo:" + fest;

/** 늦은 시간(헤드라이너)일수록 많이 고른 것처럼 그럴듯한 숫자를 만든다 (매번 같은 값) */
function makeDemo(fest: FestKey): FestStats {
  const meta = DEMO_META[fest];
  const items = meta.items();
  let seed = meta.seed;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const all = items
    .map((it) => {
      const late = Math.max(0, Math.min(1, (it.s - 12 * 60) / (10 * 60)));
      return { id: it.id, count: Math.round(15 + late * late * 260 + rnd() * 90) };
    })
    .sort((a, b) => b.count - a.count);
  return { downloads: { ...meta.downloads }, all };
}

function readDemo(fest: FestKey): FestStats {
  try {
    const r = localStorage.getItem(demoKey(fest));
    if (r) return JSON.parse(r) as FestStats;
  } catch {
    /* 저장소 없음 */
  }
  const d = makeDemo(fest);
  try {
    localStorage.setItem(demoKey(fest), JSON.stringify(d));
  } catch {
    /* 무시 */
  }
  return d;
}

/** 더미에서도 저장을 누르면 숫자가 올라가는 걸 볼 수 있게 */
function demoReport(fest: FestKey, newDay: boolean, fresh: string[]) {
  const d = readDemo(fest);
  return (day: string) => {
    if (newDay) d.downloads[day] = (d.downloads[day] ?? 0) + 1;
    for (const id of fresh) {
      const row = d.all.find((r) => r.id === id);
      if (row) row.count++;
      else d.all.push({ id, count: 1 });
    }
    d.all.sort((a, b) => b.count - a.count);
    try {
      localStorage.setItem(demoKey(fest), JSON.stringify(d));
    } catch {
      /* 무시 */
    }
  };
}

/** 기기 무작위 ID (EDC와 같은 값을 쓴다. 개인정보 없음, 브라우저에만 저장) */
const DID_KEY = "edc26:did";
function deviceId(): string {
  const make = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  try {
    let d = localStorage.getItem(DID_KEY);
    if (!d) {
      d = make();
      localStorage.setItem(DID_KEY, d);
    }
    return d;
  } catch {
    return make();
  }
}

const dayKey = (fest: FestKey, day: string) => `fl:${fest}:dl:${day}`;
const repKey = (fest: FestKey) => `fl:${fest}:rep`;

function readSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

// 제한(429)에 걸리면 1분 동안은 다시 보내지 않는다
let coolUntil = 0;
// 이 기기가 방금 집계됐으면 1분 동안은 통계를 캐시(브라우저·CDN 30초) 없이 새로 받는다 → 다운로드 수·랭킹에 바로 반영
let countedAt = 0;
const COOL_MS = 60_000;

/**
 * 배경화면을 저장·공유·크게 볼 때 부른다.
 * 그날 처음이거나, 아직 서버에 안 보낸 아티스트가 있을 때만 서버에 보낸다.
 */
export async function reportFest(fest: FestKey, day: string, ids: string[]): Promise<ReportResult> {
  const sent = readSet(repKey(fest));
  let dayDone = false;
  try {
    dayDone = localStorage.getItem(dayKey(fest, day)) === "1";
  } catch {
    /* 저장소 없음: 서버가 중복을 막는다 */
  }
  const fresh = ids.filter((id) => !sent.has(id));
  if (dayDone && !fresh.length) return "dup";
  if (DEMO) {
    demoReport(fest, !dayDone, fresh)(day);
    try {
      localStorage.setItem(dayKey(fest, day), "1");
      fresh.forEach((id) => sent.add(id));
      localStorage.setItem(repKey(fest), JSON.stringify(Array.from(sent)));
    } catch {
      /* 무시 */
    }
    return "counted";
  }
  if (Date.now() < coolUntil) return "limited";
  try {
    const res = await fetch("/api/fest-download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fest, device: deviceId(), day, ids: fresh }),
      keepalive: true,
    });
    if (res.status === 429) {
      coolUntil = Date.now() + COOL_MS;
      return "limited";
    }
    if (!res.ok) return "error";
    const j = (await res.json()) as { counted?: boolean; picks?: number; limited?: boolean; paused?: boolean };
    // 사이트 전체 급증으로 잠시 멈춤: 안내 없이 넘어가고, "센 걸로" 표시하지 않아 다음 저장 때 다시 보낸다
    if (j.paused) return "error";
    if (j.limited) {
      coolUntil = Date.now() + COOL_MS;
      return "limited";
    }
    try {
      localStorage.setItem(dayKey(fest, day), "1");
      fresh.forEach((id) => sent.add(id));
      localStorage.setItem(repKey(fest), JSON.stringify(Array.from(sent)));
    } catch {
      /* 무시 */
    }
    if (j.counted || j.picks) countedAt = Date.now();
    return j.counted || j.picks ? "counted" : "dup";
  } catch {
    return "error";
  }
}

export async function fetchFestStats(fest: FestKey): Promise<FestStats | null> {
  if (DEMO) return readDemo(fest);
  const fresh = Date.now() - countedAt < 60_000;
  try {
    const res = await fetch("/api/fest-stats?fest=" + fest + (fresh ? "&t=" + Date.now() : ""), fresh ? { cache: "no-store" } : undefined);
    if (!res.ok) return null;
    const j = (await res.json()) as FestStats;
    return j && j.downloads ? j : null;
  } catch {
    return null;
  }
}

/** 모든 날짜 다운로드 합 */
export function totalDownloads(s: FestStats): number {
  return Object.values(s.downloads).reduce((a, b) => a + (Number(b) || 0), 0);
}

/** 통계 불러오기 (서버가 없거나 실패하면 null → 숫자를 숨긴다) */
export function useFestStats(fest: FestKey) {
  const [stats, setStats] = useState<FestStats | null>(null);
  const reload = useCallback(() => {
    fetchFestStats(fest).then((s) => s && setStats(s));
  }, [fest]);
  useEffect(reload, [reload]);
  return { stats, reload };
}

// ---------------------------------------------------------------------
// 배경화면 "이 배경화면 어때요? 👍 👎" 투표 (서버: /api/fest-vote. 결과를 읽는 주소는 없다 — DB에서만 확인)
// ---------------------------------------------------------------------
export interface VoteCtx {
  /** ai = AI 추천, all = 전체 스테이지 */
  view: string;
  /** 실제로 그려진 모양: packed · grid · text · all */
  layout: string;
  picks: number;
  stages: number;
  busiest: number;
  ratio: string;
  lock: boolean;
  compact: boolean;
  noPhoto: boolean;
  lang: string;
}
export type VoteResult = "ok" | "limited" | "error";

const voteLocalKey = (fest: FestKey, view: string, layout: string) => `fl:${fest}:vote:${view}:${layout}`;

/** 이 기기가 이 모양에 이미 던진 표 (1 = 좋아요, -1 = 별로예요, 0 = 아직) */
export function readVote(fest: FestKey, view: string, layout: string): 1 | -1 | 0 {
  try {
    const v = localStorage.getItem(voteLocalKey(fest, view, layout));
    return v === "1" ? 1 : v === "-1" ? -1 : 0;
  } catch {
    return 0;
  }
}

export async function reportVote(fest: FestKey, vote: 1 | -1, ctx: VoteCtx): Promise<VoteResult> {
  const remember = () => {
    try {
      localStorage.setItem(voteLocalKey(fest, ctx.view, ctx.layout), String(vote));
    } catch {
      /* 저장소 없음: 서버가 중복을 막는다 */
    }
  };
  // 이 컴퓨터(localhost)에서는 서버가 없으니 내 표만 기억한다
  if (DEMO) {
    remember();
    return "ok";
  }
  try {
    const res = await fetch("/api/fest-vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fest, device: deviceId(), vote, ...ctx }),
      keepalive: true,
    });
    if (res.status === 429) return "limited";
    if (!res.ok) return "error";
    remember();
    return "ok";
  } catch {
    return "error";
  }
}
