/// <reference types="node" />
// POST /api/download  { device, day: "sat"|"sun", ids: string[] }
// 기기당 하루(토/일) 1번만 센다. 인기 DJ는 그 첫 다운로드에 담긴 DJ만 +1 (기기당 DJ 1번).
//
// 자동화 공격 방어 (값싼 검사부터):
//  1) Origin이 이 사이트가 아니면 거절 (브라우저는 POST에 항상 Origin을 붙인다) — DB 사용 없음
//  2) 같은 서버 인스턴스에서 같은 IP가 1분에 5번 넘게 오면 거절 — DB 사용 없음
//  3) DB 기준 IP당 1분 6번, 하루(요일별) 집계 30번까지
import { Redis } from "@upstash/redis";

function db(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const DEVICE_RE = /^[a-zA-Z0-9-]{16,64}$/;
const ID_RE = /^[a-z0-9-]{1,48}$/;
const MAX_IDS = 30; // 하루 무대 전체를 다 골라도 20명 남짓
const MEM_PER_MIN = 5;
const DB_PER_MIN = 6;
const DB_COUNTED_PER_IP_DAY = 30; // 같은 와이파이·통신사 IP를 여러 명이 함께 쓰는 경우를 고려

/** 이 사이트에서 온 요청인지 (Origin 또는 Referer의 호스트가 요청 호스트와 같아야 함) */
function sameSite(request: Request): boolean {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const from = request.headers.get("origin") || request.headers.get("referer") || "";
  if (!host || !from) return false;
  try {
    return new URL(from).host === host;
  } catch {
    return false;
  }
}

function clientIp(request: Request): string {
  return (request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim();
}

// 인스턴스 메모리 속 IP별 최근 요청 시각 (서버가 재사용되는 동안만 유지, DB 비용 없음)
const recent = new Map<string, number[]>();
function memLimited(ip: string): boolean {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  recent.set(ip, list);
  if (recent.size > 5000) recent.clear(); // 메모리 보호
  return list.length > MEM_PER_MIN;
}

/** EDC KOREA 2026 종료로 집계를 멈춤. 다시 열려면 false로 */
const CLOSED = true;

export async function POST(request: Request): Promise<Response> {
  // 종료: DB를 전혀 쓰지 않고 바로 거절 (공격이 와도 비용 없음)
  if (CLOSED) return json({ error: "closed" }, 410);
  if (!sameSite(request)) return json({ error: "forbidden" }, 403);
  const ip = clientIp(request);
  if (memLimited(ip)) return json({ error: "rate" }, 429);

  const r = db();
  if (!r) return json({ error: "no-db" }, 503);

  let body: { device?: unknown; day?: unknown; ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad-json" }, 400);
  }
  const { device, day, ids } = body;
  if (typeof device !== "string" || !DEVICE_RE.test(device)) return json({ error: "bad-device" }, 400);
  if (day !== "sat" && day !== "sun") return json({ error: "bad-day" }, 400);
  if (!Array.isArray(ids) || ids.length > MAX_IDS) return json({ error: "bad-ids" }, 400);
  const list = [...new Set(ids.filter((x): x is string => typeof x === "string" && ID_RE.test(x)))];

  // IP당 1분 요청 수 (여러 서버 인스턴스 공통)
  const minKey = `edc26:rl:min:${ip}`;
  const perMin = await r.incr(minKey);
  if (perMin === 1) await r.expire(minKey, 60);
  if (perMin > DB_PER_MIN) return json({ error: "rate" }, 429);

  // 이미 센 기기면 여기서 끝 (IP 하루 한도를 쓰지 않음)
  if ((await r.sismember(`edc26:dl:${day}`, device)) === 1) return json({ counted: false });

  // IP당 하루(요일별) 새로 셀 수 있는 횟수
  const dayKey = `edc26:rl:day:${day}:${ip}`;
  const perDay = await r.incr(dayKey);
  if (perDay === 1) await r.expire(dayKey, 60 * 60 * 48);
  if (perDay > DB_COUNTED_PER_IP_DAY) return json({ counted: false, limited: true });

  // SADD는 새로 들어간 경우에만 1 → 같은 기기·같은 날은 다시 세지 않는다
  const added = await r.sadd(`edc26:dl:${day}`, device);
  if (added === 1 && list.length) {
    const p = r.pipeline();
    for (const id of list) p.zincrby("edc26:top", 1, id);
    await p.exec();
  }
  return json({ counted: added === 1 });
}
