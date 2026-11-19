/// <reference types="node" />
// /api/band — "나만의 컬렉션"(페스티벌 팔찌 기록) 서버. 함수 개수를 아끼려고 한 파일에서 ?a= 로 동작을 나눈다.
//
//  GET  ?a=design&key=…                       티켓 종류의 첫 디자인 (없으면 404)
//  GET  ?a=collectors[&fest=slug][&sort=recent|most][&cursor=n]   구경하기 목록
//  GET  ?a=collector&id=…                     한 사람의 기록(이름·인스타·팔찌들)
//  POST ?a=profile    { name, ig, cred }                          프로필 만들기 → { id, code }  (code=관리 코드, 한 번만 알려 줌)
//  POST ?a=profile    { id, cred, name, ig }                      프로필 고치기
//  POST ?a=recover    { code }                                    관리 코드로 내 프로필 찾기 (다른 기기에서)
//  POST ?a=design     { id, cred, key, fest, year, grade, day, style, pal, img(base64 webp) }   디자인 올리기(처음 올린 사람 것이 모두의 것)
//  POST ?a=collect    { id, cred, key }                           이미 있는 디자인을 내 기록에 담기
//  POST ?a=uncollect  { id, cred, key }                           내 기록에서 빼기
//  POST ?a=delete-profile { id, cred }                            프로필과 내 기록 지우기 (디자인은 남는다)
//  POST ?a=report     { type: "design"|"collector", target, device, reason }   신고
//
// cred = 이 기기가 만든 무작위 열쇠(ownerKey) 또는 관리 코드. 서버에는 해시만 저장한다 (계정이 없는 대신 열쇠로 내 기록을 지킨다).
//
// DB 키 (Upstash Redis)
//   fl:band:design:{key}        JSON  { key, fest, year, grade, day, style, pal, img, w, h, by(수집가 id), at, status }
//   fl:band:lock:{key}          첫 등록 자리 잠금 (SET NX, 30초) — 동시에 두 사람이 올려도 한 사람만 디자인이 된다
//   fl:band:collector:{id}      해시  name, ig, ownerHash, codeHash, at, hidden
//   fl:band:code:{codeHash}     관리 코드 → 수집가 id
//   fl:band:items:{id}          정렬집합  member=티켓 키, score=담은 시각 (최대 60)
//   fl:band:collectors | bycount | byfest:{slug}   정렬집합(구경하기 목록용)  member=수집가 id
//   fl:band:reports (리스트) · fl:band:reportn:{type}:{target} (횟수) · fl:band:reportset:{type}:{target} (기기 id 집합)
// Blob: bands/{key의 : 를 _ 로}.webp  (공개, 덮어쓰기는 첫 등록 잠금 안에서만)
//
// 자동화·남용 방어 (api/fest-vote.ts 와 같은 방식, 값싼 검사부터):
//  같은 사이트 Origin(쓰기) → 브라우저 요청 검사 → 메모리 횟수 제한 → 값 검사 → DB 횟수 제한 → 관리 코드 추측 방지(실패 횟수 제한)
import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

function db(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const json = (body: unknown, status = 200, cache = "no-store") =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": cache } });

// ---------------------------------------------------------------- 설정
/** 컬렉션 기능을 멈추려면 true (DB·Blob을 쓰지 않고 바로 거절) */
const CLOSED = false;
const MAX_ITEMS = 60;
const NAME_MAX = 20;
const IMG_MAX = 300 * 1024;
const DIM_MIN = 64;
const DIM_MAX = 1024;
const BODY_MAX = 560_000; // base64 300KB ≈ 400KB + 설명
const PAGE = 24;
const FRESH_DESIGN = "public, s-maxage=60, stale-while-revalidate=600";
const FRESH_LIST = "public, s-maxage=30, stale-while-revalidate=300";

// 티켓 종류 키: 페스티벌:연도:등급:날짜  예) edc-korea-2026:2026:ga:day1
const KEY_RE = /^[a-z][a-z0-9-]{0,39}:20\d\d:(ga|pga|vip|etc-[a-z0-9-]{1,20}):(day[1-9]|full[1-9]|etc-[a-z0-9-]{1,20})$/;
const ID_RE = /^c[a-z0-9]{9}$/;
const CRED_RE = /^[A-Za-z0-9_-]{32,80}$/;
const DEVICE_RE = /^[a-zA-Z0-9-]{16,64}$/;
const FEST_RE = /^[a-z][a-z0-9-]{0,39}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const STYLES = ["photo", "design"];

const BOT_UA = /curl|wget|python|httpie|axios|node-fetch|undici|go-http|java\/|okhttp|libwww|scrapy|aiohttp|headless|phantom|selenium|puppeteer|playwright|postman|insomnia|security|test|\bbot\b|crawler|spider/i;

// 관리 코드용 낱말 256개 (4개를 이어 붙이면 약 43억 가지 + 실패 횟수 제한). 중복 금지 — scripts/test-band-api.mjs 가 검사한다
const WORDS = (
  "사과 바다 구름 하늘 나무 별빛 달빛 노을 파도 모래 호수 시냇물 봄바람 여름밤 가을비 겨울잠 눈꽃 단풍 무지개 햇살 안개 이슬 번개 천둥 바람개비 풍선 기차 자전거 우산 모자 신발 안경 " +
  "시계 거울 책상 의자 창문 지붕 계단 다리 정원 마당 골목 시장 공원 도서관 학교 극장 카페 빵집 꽃집 책방 놀이터 해변 섬마을 언덕 동굴 폭포 계곡 숲속 들판 갯벌 포구 등대 " +
  "돛단배 고래 돌고래 거북이 펭귄 토끼 여우 사슴 다람쥐 고양이 강아지 앵무새 부엉이 제비 참새 갈매기 나비 잠자리 반딧불 무당벌레 개구리 올챙이 두더지 호랑이 사자 코끼리 기린 판다 곰돌이 오리 병아리 송아지 " +
  "망아지 양떼 염소 햄스터 수달 너구리 고슴도치 오징어 문어 해파리 불가사리 소라 조개 산호 연어 붕어 잉어 멸치 새우 게딱지 딸기 포도 복숭아 수박 참외 귤 감자 고구마 옥수수 당근 토마토 호박 " +
  "오이 양파 마늘 생강 버섯 도토리 밤톨 호두 땅콩 꿀벌 꿀단지 초콜릿 사탕 젤리 쿠키 케이크 푸딩 도넛 팝콘 샌드위치 김밥 떡볶이 라면 국수 만두 호떡 붕어빵 찐빵 보리차 레몬차 우유 커피 " +
  "주스 얼음 눈사람 썰매 스키 축구공 농구공 야구공 배드민턴 줄넘기 훌라후프 연날리기 팽이 구슬 퍼즐 블록 인형 로봇 우주선 로켓 별똥별 은하수 혜성 달토끼 초승달 보름달 태양 지구 화성 목성 토성 북극성 " +
  "나침반 지도 보물 열쇠 자물쇠 편지 우표 엽서 사진첩 일기장 연필 지우개 크레파스 물감 붓 도화지 피아노 기타 바이올린 드럼 트럼펫 하모니카 북소리 노래 춤 박수 웃음 미소 약속 비밀 소원 꿈 " +
  "모험 여행 휴가 축제 불꽃 폭죽 깃발 풍등 촛불 별자리 마법 요정 용 유니콘 인어 도깨비 장승 탈춤 부채 한복 고무신 대나무 소나무 매화 국화 코스모스 해바라기 장미 튤립 민들레 클로버 나팔꽃"
).split(" ");

// ---------------------------------------------------------------- 요청 검사 (fest-vote.ts 와 같은 방식)
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

function clientIp(request: Request): string {
  return (request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim();
}

const recent = new Map<string, number[]>();
/** 같은 서버 인스턴스에서 (IP·동작)이 1분에 n번을 넘는지 — DB를 쓰지 않는 값싼 제한 */
function memLimited(bucket: string, ip: string, n: number): boolean {
  const now = Date.now();
  const k = bucket + "|" + ip;
  const list = (recent.get(k) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  recent.set(k, list);
  if (recent.size > 5000) recent.clear();
  return list.length > n;
}

/** DB 기준 횟수 제한. 넘으면 true */
async function dbLimited(r: Redis, name: string, who: string, n: number, windowSec: number): Promise<boolean> {
  const k = `fl:band:rl:${name}:${who}`;
  const c = await r.incr(k);
  if (c === 1) await r.expire(k, windowSec);
  return c > n;
}

// ---------------------------------------------------------------- 값 검사
const sha = (s: string) => createHash("sha256").update("fl-band:" + s).digest("hex");

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/** 눈에 안 보이는 글자·꺾쇠를 없애고 길이를 자른다. 비면 null */
function cleanText(x: unknown, max: number): string | null {
  if (typeof x !== "string") return null;
  const s = [...x.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim()].slice(0, max).join("").trim();
  return s ? s : null;
}

/** @handle · handle · instagram.com/handle · 긴 주소(?igsh=…) → 인스타그램 id (소문자). 아니면 null */
function igHandle(x: unknown): string | null {
  if (typeof x !== "string") return null;
  let s = x.trim();
  if (!s || s.length > 200) return null;
  if (/instagram\.com/i.test(s)) {
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s);
      if (!/(^|\.)instagram\.com$/i.test(u.hostname)) return null;
      s = u.pathname.split("/").filter(Boolean)[0] || "";
    } catch {
      return null;
    }
  }
  s = s.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(s)) return null;
  if (/^(p|reel|reels|explore|accounts|stories|tv|direct|about|developers|legal)$/i.test(s)) return null;
  return s.toLowerCase();
}
const igUrl = (handle: string) => `https://www.instagram.com/${handle}/`;

function webpSize(b: Buffer): { w: number; h: number } | null {
  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  if (b.readUInt32LE(4) + 8 > b.length) return null;
  const t = b.toString("ascii", 12, 16);
  if (t === "VP8 ") {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  }
  if (t === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (t === "VP8X") return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
  return null;
}

/** JPEG 크기 (SOF 표지에서). 아이폰 Safari 는 캔버스를 WebP 로 못 내보내서 JPEG 도 받는다 */
function jpegSize(b: Buffer): { w: number; h: number } | null {
  if (b.length < 20 || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = b.readUInt16BE(i + 2);
    if (len < 2) return null;
    // SOF0~SOF15 (DHT c4·JPG c8·DAC cc 제외)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

/** 올린 그림 확인: WebP 또는 JPEG 만. 크기와 확장자·형식을 돌려준다 */
function imageInfo(b: Buffer): { w: number; h: number; ext: "webp" | "jpg"; type: string } | null {
  const w = webpSize(b);
  if (w) return { ...w, ext: "webp", type: "image/webp" };
  const j = jpegSize(b);
  if (j) return { ...j, ext: "jpg", type: "image/jpeg" };
  return null;
}

type Obj = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));
/** Upstash 는 JSON 처럼 보이는 문자열을 알아서 풀어 줄 수 있어서(JSON 문자열 ↔ 객체) 둘 다 받는다 */
function asObj(v: unknown): Obj | null {
  if (v && typeof v === "object") return v as Obj;
  if (typeof v === "string") {
    try {
      const o = JSON.parse(v);
      return o && typeof o === "object" ? (o as Obj) : null;
    } catch {
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------- 공개용 모양
interface Design {
  key: string;
  fest: string;
  year: number;
  grade: string;
  day: string;
  style: string;
  pal: string[];
  img: string;
  w: number;
  h: number;
  by: string | null;
  at: number;
  status: string;
}

function publicDesign(d: Design, byName: string | null) {
  return { key: d.key, fest: d.fest, year: d.year, grade: d.grade, day: d.day, style: d.style, pal: d.pal, img: d.img, w: d.w, h: d.h, at: d.at, by: d.by && byName ? { id: d.by, name: byName } : null };
}

async function readDesign(r: Redis, key: string): Promise<Design | null> {
  const o = asObj(await r.get(`fl:band:design:${key}`));
  if (!o || o.status === "hidden") return null;
  return o as unknown as Design;
}

async function readCollector(r: Redis, id: string): Promise<{ name: string; ig: string; hidden: boolean; at: number } | null> {
  const h = (await r.hgetall(`fl:band:collector:${id}`)) as Obj | null;
  if (!h || !h.name) return null;
  return { name: str(h.name), ig: str(h.ig), hidden: str(h.hidden) === "1", at: Number(h.at) || 0 };
}

/** 인증: id 의 주인이 보낸 열쇠(또는 관리 코드)가 맞는지. 틀린 횟수를 세어서 추측을 막는다 */
async function authorize(r: Redis, request: Request, id: unknown, cred: unknown): Promise<{ ok: true; id: string } | { ok: false; res: Response }> {
  const credOk = typeof cred === "string" && (CRED_RE.test(cred) || isCode(cred));
  if (typeof id !== "string" || !ID_RE.test(id) || !credOk) {
    return { ok: false, res: json({ error: "bad-auth" }, 400) };
  }
  const failKey = `fl:band:authfail:${id}`;
  const fails = Number(await r.get(failKey)) || 0;
  if (fails >= 10) return { ok: false, res: json({ error: "locked" }, 429) };
  const h = (await r.hgetall(`fl:band:collector:${id}`)) as Obj | null;
  const hash = sha(normCred(cred as string));
  if (!h || !(sameHash(hash, str(h.ownerHash)) || sameHash(hash, str(h.codeHash)))) {
    const c = await r.incr(failKey);
    if (c === 1) await r.expire(failKey, 600);
    return { ok: false, res: json({ error: "no-auth" }, 403) };
  }
  void request;
  return { ok: true, id };
}

/** 관리 코드: 낱말 4개를 -로 이은 것 (공백·대소문자 정리) */
const isCode = (s: string) => {
  const parts = s.trim().split(/[\s-]+/);
  return parts.length === 4 && parts.every((p) => WORDS.includes(p));
};
const normCred = (s: string) => (isCode(s) ? s.trim().split(/[\s-]+/).join("-") : s.replace(/\s+/g, ""));

function newId(): string {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  const b = randomBytes(9);
  let s = "c";
  for (let i = 0; i < 9; i++) s += a[b[i] % a.length];
  return s;
}

function newCode(): string {
  const b = randomBytes(4);
  return [0, 1, 2, 3].map((i) => WORDS[b[i]]).join("-");
}

/** 목록·인기순 색인을 지금 기록 수에 맞춘다 */
async function reindex(r: Redis, id: string): Promise<number> {
  const keys = (await r.zrange(`fl:band:items:${id}`, 0, -1)) as string[];
  const n = keys.length;
  const now = Date.now();
  const fests = new Set(keys.map((k) => String(k).split(":")[0]));
  if (n === 0) {
    await r.zrem("fl:band:collectors", id);
    await r.zrem("fl:band:bycount", id);
  } else {
    await r.zadd("fl:band:collectors", { score: now, member: id });
    await r.zadd("fl:band:bycount", { score: n, member: id });
  }
  // 페스티벌별 색인: 그 페스티벌 기록이 하나라도 있는 사람만. 빠진 페스티벌은 지운다
  const known = (await r.smembers(`fl:band:festsof:${id}`)) as string[];
  for (const f of known) if (!fests.has(String(f))) {
    await r.zrem(`fl:band:byfest:${f}`, id);
    await r.srem(`fl:band:festsof:${id}`, f);
  }
  for (const f of fests) {
    await r.zadd(`fl:band:byfest:${f}`, { score: now, member: id });
    await r.sadd(`fl:band:festsof:${id}`, f);
  }
  return n;
}

async function readJson(request: Request): Promise<Obj | Response> {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > BODY_MAX) return json({ error: "too-big" }, 413);
  try {
    const raw = await request.text();
    if (raw.length > BODY_MAX) return json({ error: "too-big" }, 413);
    const b = JSON.parse(raw);
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Obj) : json({ error: "bad-json" }, 400);
  } catch {
    return json({ error: "bad-json" }, 400);
  }
}

// ---------------------------------------------------------------- 읽기
export async function GET(request: Request): Promise<Response> {
  if (CLOSED) return json({ error: "closed" }, 410);
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return json({ error: "forbidden" }, 403);
  const ip = clientIp(request);
  if (memLimited("get", ip, 60)) return json({ error: "rate" }, 429);
  const r = db();
  if (!r) return json({ error: "no-db" }, 503);
  const url = new URL(request.url);
  const a = url.searchParams.get("a");

  if (a === "design") {
    const key = url.searchParams.get("key") || "";
    if (!KEY_RE.test(key)) return json({ error: "bad-key" }, 400);
    const d = await readDesign(r, key);
    if (!d) return json({ error: "none" }, 404, "no-store");
    const by = d.by ? await readCollector(r, d.by) : null;
    return json({ design: publicDesign(d, by && !by.hidden ? by.name : null) }, 200, FRESH_DESIGN);
  }

  if (a === "collectors") {
    const fest = url.searchParams.get("fest");
    if (fest && !FEST_RE.test(fest)) return json({ error: "bad-fest" }, 400);
    const most = url.searchParams.get("sort") === "most" && !fest;
    const offset = Math.max(0, Math.min(5000, Number(url.searchParams.get("cursor")) || 0));
    const src = fest ? `fl:band:byfest:${fest}` : most ? "fl:band:bycount" : "fl:band:collectors";
    const ids = ((await r.zrange(src, offset, offset + PAGE - 1, { rev: true })) as string[]).map(String);
    const list: Obj[] = [];
    for (const id of ids) {
      if (!ID_RE.test(id)) continue;
      const c = await readCollector(r, id);
      if (!c || c.hidden) continue;
      const keys = ((await r.zrange(`fl:band:items:${id}`, 0, 2, { rev: true })) as string[]).map(String);
      const count = Number(await r.zcard(`fl:band:items:${id}`)) || 0;
      const thumbs: string[] = [];
      for (const k of keys) {
        const d = await readDesign(r, k);
        if (d) thumbs.push(d.img);
      }
      list.push({ id, name: c.name, count, thumbs });
    }
    return json({ list, next: ids.length === PAGE ? offset + PAGE : null }, 200, FRESH_LIST);
  }

  if (a === "collector") {
    const id = url.searchParams.get("id") || "";
    if (!ID_RE.test(id)) return json({ error: "bad-id" }, 400);
    const c = await readCollector(r, id);
    if (!c || c.hidden) return json({ error: "none" }, 404, "no-store");
    const keys = ((await r.zrange(`fl:band:items:${id}`, 0, -1, { rev: true })) as string[]).map(String);
    const items: Obj[] = [];
    for (const k of keys) {
      const d = await readDesign(r, k);
      if (d) items.push({ key: k, design: publicDesign(d, null) });
    }
    return json({ id, name: c.name, ig: igUrl(c.ig), count: items.length, items }, 200, FRESH_LIST);
  }

  return json({ error: "bad-action" }, 400);
}

// ---------------------------------------------------------------- 쓰기
export async function POST(request: Request): Promise<Response> {
  if (CLOSED) return json({ error: "closed" }, 410);
  if (!sameSite(request)) return json({ error: "forbidden" }, 403);
  if (!looksLikeBrowser(request)) return json({ error: "forbidden" }, 403);
  const ip = clientIp(request);
  const a = new URL(request.url).searchParams.get("a") || "";
  if (memLimited("post:" + a, ip, a === "design" ? 3 : 20)) return json({ error: "rate" }, 429);

  const b = await readJson(request);
  if (b instanceof Response) return b;
  const r = db();
  if (!r) return json({ error: "no-db" }, 503);

  // ---- 프로필 만들기 / 고치기
  if (a === "profile") {
    const name = cleanText(b.name, NAME_MAX);
    const handle = igHandle(b.ig);
    if (!name) return json({ error: "bad-name" }, 400);
    if (!handle) return json({ error: "bad-ig" }, 400);
    if (b.id !== undefined) {
      const au = await authorize(r, request, b.id, b.cred);
      if (!au.ok) return au.res;
      await r.hset(`fl:band:collector:${au.id}`, { name, ig: handle });
      return json({ ok: true, id: au.id });
    }
    const cred = b.cred;
    if (typeof cred !== "string" || !CRED_RE.test(cred)) return json({ error: "bad-cred" }, 400);
    if (await dbLimited(r, "newprofile", ip, 5, 3600)) return json({ error: "rate" }, 429);
    const id = newId();
    let code = "";
    for (let i = 0; i < 6; i++) {
      const c = newCode();
      const ok = await r.set(`fl:band:code:${sha(c)}`, id, { nx: true });
      if (ok) {
        code = c;
        break;
      }
    }
    if (!code) return json({ error: "busy" }, 503);
    await r.hset(`fl:band:collector:${id}`, { name, ig: handle, ownerHash: sha(cred), codeHash: sha(code), at: Date.now() });
    return json({ ok: true, id, code });
  }

  // ---- 관리 코드로 내 프로필 찾기 (다른 기기에서)
  if (a === "recover") {
    const code = typeof b.code === "string" ? b.code : "";
    if (!isCode(code)) return json({ error: "bad-code" }, 400);
    const failKey = `fl:band:recoverfail:${ip}`;
    if ((Number(await r.get(failKey)) || 0) >= 8) return json({ error: "locked" }, 429);
    const id = str(await r.get(`fl:band:code:${sha(normCred(code))}`));
    if (!ID_RE.test(id)) {
      const c = await r.incr(failKey);
      if (c === 1) await r.expire(failKey, 600);
      return json({ error: "no-code" }, 404);
    }
    const c = await readCollector(r, id);
    if (!c) return json({ error: "no-code" }, 404);
    return json({ ok: true, id, name: c.name, ig: igUrl(c.ig) });
  }

  // ---- 이미 있는 디자인을 내 기록에 담기 / 빼기
  if (a === "collect" || a === "uncollect") {
    const key = typeof b.key === "string" ? b.key : "";
    if (!KEY_RE.test(key)) return json({ error: "bad-key" }, 400);
    if (await dbLimited(r, "collect", ip, 60, 60)) return json({ error: "rate" }, 429);
    const au = await authorize(r, request, b.id, b.cred);
    if (!au.ok) return au.res;
    const items = `fl:band:items:${au.id}`;
    if (a === "collect") {
      const d = await readDesign(r, key);
      if (!d) return json({ error: "none" }, 404);
      const has = (await r.zscore(items, key)) !== null;
      if (!has) {
        if ((Number(await r.zcard(items)) || 0) >= MAX_ITEMS) return json({ error: "full", max: MAX_ITEMS }, 409);
        await r.zadd(items, { score: Date.now(), member: key });
      }
    } else {
      await r.zrem(items, key);
    }
    const count = await reindex(r, au.id);
    return json({ ok: true, count });
  }

  // ---- 프로필 지우기 (디자인은 남는다)
  if (a === "delete-profile") {
    if (await dbLimited(r, "delprofile", ip, 5, 3600)) return json({ error: "rate" }, 429);
    const au = await authorize(r, request, b.id, b.cred);
    if (!au.ok) return au.res;
    const h = (await r.hgetall(`fl:band:collector:${au.id}`)) as Obj | null;
    const keys = (await r.zrange(`fl:band:items:${au.id}`, 0, -1)) as string[];
    for (const k of keys) await r.zrem(`fl:band:items:${au.id}`, k);
    await reindex(r, au.id);
    await r.del(`fl:band:collector:${au.id}`, `fl:band:festsof:${au.id}`, `fl:band:authfail:${au.id}`);
    if (h?.codeHash) await r.del(`fl:band:code:${str(h.codeHash)}`);
    return json({ ok: true });
  }

  // ---- 신고
  if (a === "report") {
    const type = b.type === "design" || b.type === "collector" ? b.type : null;
    const target = typeof b.target === "string" ? b.target : "";
    const device = b.device;
    if (!type || (type === "design" ? !KEY_RE.test(target) : !ID_RE.test(target))) return json({ error: "bad-target" }, 400);
    if (typeof device !== "string" || !DEVICE_RE.test(device)) return json({ error: "bad-device" }, 400);
    if (await dbLimited(r, "report", ip, 5, 3600)) return json({ error: "rate" }, 429);
    const exists = type === "design" ? !!(await readDesign(r, target)) : !!(await readCollector(r, target));
    if (!exists) return json({ error: "none" }, 404);
    const added = await r.sadd(`fl:band:reportset:${type}:${target}`, device);
    if (added !== 1) return json({ ok: true, changed: false });
    const n = await r.incr(`fl:band:reportn:${type}:${target}`);
    await r.lpush("fl:band:reports", JSON.stringify({ t: Date.now(), type, target, n, reason: cleanText(b.reason, 80) }));
    await r.ltrim("fl:band:reports", 0, 499);
    return json({ ok: true, changed: true });
  }

  // ---- 디자인 올리기: 이 티켓 종류의 첫 사람이면 그 디자인이 모두의 것이 된다
  if (a === "design") {
    const key = typeof b.key === "string" ? b.key : "";
    if (!KEY_RE.test(key)) return json({ error: "bad-key" }, 400);
    const fest = cleanText(b.fest, 40);
    const grade = cleanText(b.grade, 20);
    const day = cleanText(b.day, 20);
    const year = Number(b.year);
    const style = STYLES.includes(b.style as string) ? (b.style as string) : null;
    const pal = Array.isArray(b.pal) ? (b.pal as unknown[]).filter((c): c is string => typeof c === "string" && HEX_RE.test(c)).slice(0, 6) : [];
    if (!fest || !grade || !day || !Number.isInteger(year) || year < 2000 || year > 2100 || !style) return json({ error: "bad-ticket" }, 400);
    if (key.split(":")[1] !== String(year)) return json({ error: "bad-ticket" }, 400);
    if (style === "design" && pal.length < 2) return json({ error: "bad-ticket" }, 400);
    const raw = typeof b.img === "string" ? b.img : "";
    if (!raw || raw.length > Math.ceil((IMG_MAX * 4) / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return json({ error: "bad-image" }, 400);
    const bytes = Buffer.from(raw, "base64");
    const dim = bytes.length <= IMG_MAX ? imageInfo(bytes) : null;
    if (!dim || dim.w < DIM_MIN || dim.h < DIM_MIN || dim.w > DIM_MAX || dim.h > DIM_MAX) return json({ error: "bad-image" }, 400);

    if (await dbLimited(r, "design10", ip, 3, 600)) return json({ error: "rate" }, 429);
    if (await dbLimited(r, "designday", ip, 20, 86400)) return json({ error: "rate" }, 429);
    const au = await authorize(r, request, b.id, b.cred);
    if (!au.ok) return au.res;

    // 이미 있으면 올리지 않고 기존 디자인을 돌려준다 (클라이언트가 "담기"로 이어 간다)
    const had = await readDesign(r, key);
    if (had) {
      const by = had.by ? await readCollector(r, had.by) : null;
      return json({ ok: true, exists: true, design: publicDesign(had, by && !by.hidden ? by.name : null) });
    }
    if ((Number(await r.zcard(`fl:band:items:${au.id}`)) || 0) >= MAX_ITEMS) return json({ error: "full", max: MAX_ITEMS }, 409);

    // 동시에 두 사람이 처음 올릴 때: 잠금을 잡은 사람만 저장한다
    const lock = `fl:band:lock:${key}`;
    if (!(await r.set(lock, au.id, { nx: true, ex: 30 }))) return json({ error: "busy" }, 409);
    try {
      const again = await readDesign(r, key);
      if (again) {
        const by = again.by ? await readCollector(r, again.by) : null;
        return json({ ok: true, exists: true, design: publicDesign(again, by && !by.hidden ? by.name : null) });
      }
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (!token) return json({ error: "no-blob" }, 503);
      const blob = await put(`bands/${key.replace(/:/g, "_")}.${dim.ext}`, bytes, {
        access: "public",
        contentType: dim.type,
        addRandomSuffix: false,
        allowOverwrite: true, // 잠금 안이고 디자인 기록이 없을 때만 여기 온다 (이전에 올리다 멈춘 파일이 있어도 다시 올릴 수 있게)
        cacheControlMaxAge: 31536000,
        token,
      });
      const design: Design = { key, fest, year, grade, day, style, pal, img: blob.url, w: dim.w, h: dim.h, by: au.id, at: Date.now(), status: "ok" };
      const saved = await r.set(`fl:band:design:${key}`, JSON.stringify(design), { nx: true });
      if (!saved) {
        const other = await readDesign(r, key);
        return json({ ok: true, exists: true, design: other ? publicDesign(other, null) : null });
      }
      await r.zadd(`fl:band:items:${au.id}`, { score: Date.now(), member: key });
      const count = await reindex(r, au.id);
      const me = await readCollector(r, au.id);
      return json({ ok: true, exists: false, count, design: publicDesign(design, me?.name ?? null) });
    } finally {
      await r.del(lock);
    }
  }

  return json({ error: "bad-action" }, 400);
}
