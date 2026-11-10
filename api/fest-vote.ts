/// <reference types="node" />
// POST /api/fest-vote { fest, device, vote: 1|-1, view, layout, picks, stages, busiest, ratio, lock, compact, noPhoto, lang }
// 배경화면 만들기 창의 "이 배경화면 어때요? 👍 👎" 투표를 저장한다. (AI 추천 배치를 다듬기 위한 의견 수집)
// 읽는 주소는 일부러 만들지 않았다 → 사이트에서는 아무도 결과를 볼 수 없고, 나만 DB에서 본다:
//   Vercel → Storage → Upstash(Redis) → Data Browser, 또는  node scripts/fest-votes.mjs  (docs/ADD-FESTIVAL.md "투표 보기")
//
// DB 키 (Upstash Redis)
//   fl:{fest}:vote:{view}:{layout}:up | :down   기기 id 집합. 한 기기는 한 모양에 한 표 (👍↔👎로 바꿀 수 있다)
//   fl:{fest}:votesum                           해시. "{view}:{layout}:up" → 수  (한눈에 보는 합계)
//   fl:{fest}:votelog                           리스트(최근 2000건). 한 표마다 JSON 한 줄 (언제·무엇에·어떤 상황에서)
//   view = ai(AI 추천) | all(전체 스테이지),  layout = 실제로 그려진 모양: packed(고른 공연만) | grid(전체 표로 바뀜) | text(사진 뺌) | all
//
// 자동화 공격 방어 (api/fest-download.ts와 같은 방식, 값싼 검사부터): 같은 사이트 Origin → 브라우저 요청 → 메모리 횟수 제한 → 값 검사 → DB 횟수 제한
import { Redis } from "@upstash/redis";

function db(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** 투표를 받는 페스티벌 (src/fest/festStats.ts FestKey 와 같게) */
const FESTS = ["gmf", "nol", "orl", "zon", "utw"];
const VIEWS = ["ai", "all"];
const LAYOUTS = ["packed", "grid", "text", "all"];
const RATIOS = ["story", "phone"];
const LANGS = ["ko", "en", "ja", "zh"];

/** 투표를 멈추려면 true (DB를 쓰지 않고 바로 거절) */
const CLOSED = false;
const DEVICE_RE = /^[a-zA-Z0-9-]{16,64}$/;
const MEM_PER_MIN = 12;
const DB_PER_MIN = 12;
const LOG_MAX = 2000;

const BOT_UA = /curl|wget|python|httpie|axios|node-fetch|undici|go-http|java\/|okhttp|libwww|scrapy|aiohttp|headless|phantom|selenium|puppeteer|playwright|postman|insomnia|security|test|\bbot\b|bot\/|spider|crawl/i;

/** 브라우저에서 온 요청처럼 보이는지 (fest-download.ts와 같은 검사) */
function looksLikeBrowser(request: Request): boolean {
  const ua = request.headers.get("user-agent") || "";
  if (ua.length < 20 || !/Mozilla\//.test(ua) || BOT_UA.test(ua)) return false;
  if (!request.headers.get("accept-language")) return false;
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const mode = request.headers.get("sec-fetch-mode");
  if (mode && mode !== "cors") return false;
  return true;
}

function uaKind(ua: string): string {
  const os = /iPhone|iPad/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : /Windows/.test(ua) ? "win" : /Mac OS/.test(ua) ? "mac" : "other";
  const app = /KAKAOTALK/i.test(ua) ? "kakao" : /Instagram/i.test(ua) ? "insta" : /SamsungBrowser/.test(ua) ? "samsung" : /CriOS|Chrome/.test(ua) ? "chrome" : /Safari/.test(ua) ? "safari" : /Firefox/.test(ua) ? "firefox" : "etc";
  return os + "-" + app;
}

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

const recent = new Map<string, number[]>();
function memLimited(ip: string): boolean {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  recent.set(ip, list);
  if (recent.size > 5000) recent.clear();
  return list.length > MEM_PER_MIN;
}

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? Math.max(0, Math.min(999, Math.round(x))) : 0);
const pick = (x: unknown, allowed: string[]) => (typeof x === "string" && allowed.includes(x) ? x : null);

export async function POST(request: Request): Promise<Response> {
  if (CLOSED) return json({ error: "closed" }, 410);
  if (!sameSite(request)) return json({ error: "forbidden" }, 403);
  if (!looksLikeBrowser(request)) return json({ error: "forbidden" }, 403);
  const ip = clientIp(request);
  if (memLimited(ip)) return json({ error: "rate" }, 429);

  let b: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return json({ error: "too-big" }, 413);
    b = JSON.parse(raw);
  } catch {
    return json({ error: "bad-json" }, 400);
  }
  const fest = pick(b.fest, FESTS);
  const view = pick(b.view, VIEWS);
  const layout = pick(b.layout, LAYOUTS);
  if (!fest || !view || !layout) return json({ error: "bad-scope" }, 400);
  // 전체 스테이지 보기는 모양이 항상 all, AI 추천은 all 이 될 수 없다
  if ((view === "all") !== (layout === "all")) return json({ error: "bad-scope" }, 400);
  const device = b.device;
  if (typeof device !== "string" || !DEVICE_RE.test(device)) return json({ error: "bad-device" }, 400);
  const vote = b.vote === 1 ? 1 : b.vote === -1 ? -1 : 0;
  if (!vote) return json({ error: "bad-vote" }, 400);

  const r = db();
  if (!r) return json({ error: "no-db" }, 503);
  const P = "fl:" + fest;

  const minKey = `${P}:rl:vote:${ip}`;
  const perMin = await r.incr(minKey);
  if (perMin === 1) await r.expire(minKey, 60);
  if (perMin > DB_PER_MIN) return json({ error: "rate" }, 429);

  // 한 기기 한 표 (같은 표를 또 보내면 그대로, 반대 표를 보내면 바꾼다)
  const base = `${P}:vote:${view}:${layout}`;
  const mine = vote === 1 ? "up" : "down";
  const other = vote === 1 ? "down" : "up";
  const added = await r.sadd(`${base}:${mine}`, device);
  if (added !== 1) return json({ ok: true, changed: false });
  const removed = await r.srem(`${base}:${other}`, device);
  const sum = `${P}:votesum`;
  await r.hincrby(sum, `${view}:${layout}:${mine}`, 1);
  if (removed === 1) await r.hincrby(sum, `${view}:${layout}:${other}`, -1);

  const entry = {
    t: Date.now(),
    v: vote,
    flip: removed === 1,
    view,
    layout,
    picks: num(b.picks),
    stages: num(b.stages),
    busiest: num(b.busiest),
    ratio: pick(b.ratio, RATIOS),
    lock: b.lock === true,
    compact: b.compact === true,
    noPhoto: b.noPhoto === true,
    lang: pick(b.lang, LANGS),
    ua: uaKind((request.headers.get("user-agent") || "").slice(0, 300)),
  };
  await r.lpush(`${P}:votelog`, JSON.stringify(entry));
  await r.ltrim(`${P}:votelog`, 0, LOG_MAX - 1);
  return json({ ok: true, changed: true });
}
