// 다운로드 수·인기 DJ 통계 (서버: /api/download, /api/stats)
const DID_KEY = "edc26:did";

/**
 * 표시되는 다운로드 수 = 이 값 + 서버 집계(토+일 기기 수).
 * - 2026-09-29: 집계 서버 전 다운로드 278회를 더해 278로 시작
 * - 2026-10-02: 18:50~19:30 자동화 공격(curl 등)으로 서버 집계가 9,322로 부풀려짐.
 *   공격 기기 ID는 실제와 구분할 수 없어, 그 시점 표시를 1,420회(17시 1,300회 + 이후 실제 증가분)로 맞추도록 보정
 *   → 1,420 − 9,322 = −7,902. 이후 실제 다운로드는 그대로 1씩 올라간다.
 */
export const DOWNLOAD_BASE = -7902;
const doneKey = (day: string) => "edc26:dl:" + day;

export interface Stats {
  downloads: { sat: number; sun: number };
  top: { id: string; count: number }[];
  /** 전체 DJ 카운트 (시간대별 랭킹용) */
  all?: { id: string; count: number }[];
}

/** 이 기기의 무작위 ID (개인정보 없음, 브라우저에만 저장) */
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

/** 그날 배경화면을 처음 받을 때만 서버에 알린다. 새로 집계됐으면 true */
/** counted: 새로 집계됨 / dup: 이미 집계됨 / limited: 너무 자주 눌러 잠시 제한 / error: 그 밖의 실패 */
export type ReportResult = "counted" | "dup" | "limited" | "error";

// 제한(429)에 걸리면 1분 동안은 다시 보내지 않는다 (같은 화면에서 여러 번 눌러도 서버를 두드리지 않게)
let coolUntil = 0;
const COOL_MS = 60_000;

/** 그날 배경화면을 처음 받을 때만 서버에 알린다 */
/** EDC KOREA 2026이 끝나서 다운로드 집계를 멈췄다 (배경화면 저장은 그대로 된다) */
export const COUNTING_ON = false;

export async function reportDownload(day: string, ids: string[]): Promise<ReportResult> {
  if (!COUNTING_ON) return "dup";
  try {
    if (localStorage.getItem(doneKey(day)) === "1") return "dup";
  } catch {
    /* 저장소 없음: 서버가 중복을 막는다 */
  }
  if (Date.now() < coolUntil) return "limited";
  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device: deviceId(), day, ids }),
      keepalive: true,
    });
    if (res.status === 429) {
      coolUntil = Date.now() + COOL_MS;
      return "limited";
    }
    if (!res.ok) return "error";
    const j = (await res.json()) as { counted?: boolean; limited?: boolean };
    // IP당 하루 한도에 걸린 경우: 집계 완료로 표시하지 않아야 나중에 다시 셀 수 있다
    if (j.limited) {
      coolUntil = Date.now() + COOL_MS;
      return "limited";
    }
    try {
      localStorage.setItem(doneKey(day), "1");
    } catch {
      /* 무시 */
    }
    return j.counted ? "counted" : "dup";
  } catch {
    return "error";
  }
}

export async function fetchStats(): Promise<Stats | null> {
  try {
    const res = await fetch("/api/stats");
    if (!res.ok) return null;
    const j = (await res.json()) as Stats;
    return j && j.downloads ? j : null;
  } catch {
    return null;
  }
}
