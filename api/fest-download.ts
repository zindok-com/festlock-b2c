/// <reference types="node" />
// POST /api/fest-download  { fest: "gmf"|"nol"|"orl"|"zon", device, day: "fri"|"sat"|"sun" (페스티벌마다 다름), ids: string[] }
// 새 페스티벌(그랜드 민트·NOL) 배경화면 다운로드·아티스트 선택 집계. EDC 집계(/api/download)와는 따로다.
//  - 다운로드 수: 기기당 하루(토/일) 1번
//  - 아티스트 랭킹: 기기당 아티스트 1번 (나중에 더 고른 아티스트도 그때 1번 센다)
//
// 자동화 공격 방어 (값싼 검사부터):
//  1) Origin이 이 사이트가 아니면 거절 — DB 사용 없음
//  2) 브라우저가 아닌 요청(curl·파이썬·테스트 도구 등, 브라우저가 항상 붙이는 헤더가 없는 요청)은 거절 — DB 사용 없음
//  3) 같은 서버 인스턴스에서 같은 IP가 1분에 5번 넘게 오면 거절 — DB 사용 없음
//  4) 라인업에 없는 id는 버린다 (아무 이름이나 랭킹에 넣을 수 없음)
//  5) DB 기준 IP당 1분 6번, 하루(요일별) 새 기기 30대까지
//  6) 서킷 브레이커: 사이트 전체에서 새 기기가 1분에 너무 많이 들어오면(여러 IP로 나눠 하는 공격) 10분 동안 새 집계를 멈춘다
//  7) 센 기기마다 IP 해시·시각·브라우저 종류를 남긴다 → 공격이 와도 scripts/fest-rollback.mjs로 그 몫만 골라 되돌릴 수 있다
import { Redis } from "@upstash/redis";

function db(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// <lineup:auto>
// scripts/sync-lineup.mjs가 src/fest/gmf.ts·nol.ts에서 자동으로 만든 목록. 손으로 고치지 말 것
const GMF_IDS = ["yeonjeong","hi-fi-unicorn","jisokuryclub","jung-joonil","jukjae","peppertones","chang-kiha","lee-sora","futurepeerclub","leaveourtears","owalloil","lacuna","car-the-garden","redoor","touched","lee-seung-yoon","confined-white","love-is-cycle","gonny","sumin","youra","aleph","bye-bye-badman","isaac-hong","sanbo","shin-in-ryu","dragon-pony","bol4","jung-seung-hwan","roy-kim","cnblue","younha","kwacamolee","lee-oh-wook","onewe","far-east-asian-tigers","the-solutions","n-flying","thornapple","10cm-x-soran","gugu","tokai","rothy","nib-archive","shin-ji-hoon","kachisan","sunwoojunga","lee-souk-won"];
const NOL_IDS = ["daybreak","lee-mujin","dynamicduo","guckkasten","gummy","nell","jaurim","yb","god","choco1-x-choco2","hrtz-wav","ha-sung-woon","nowimyoung","haon","sandara-park","street-world-fighter","kyuhyun","woodz","beenzino","xia","hype-princess","daily-direction","close-your-eyes","lun8","billlie","rescene","hearts2hearts","82major","kiss-of-life","kep1er","cravity","cortis","nct-wish","keyveatz","modyssey","ahof","kiiikiii","izna","kickflip","allday-project","alpha-drive-one","meovv","nmixx","evan","ive","treasure","juntaro","4ura","retrovision","merow","andy-c","don-diablo","alan-walker","vandal-rock","lucas-and-steve","pure-100","hills","loozbone","sick-individuals","advanced"];
const ORL_IDS = ["zack-martino","joa","hayla","pegassi","alesso","kream","afrojack","mau-p","david-guetta","sloth","benda-b2b-vastive","big-florida","kompany","adventure-club","bou-b2b-kanine","level-up","whethan","levity","wooli","matthias","inbal","azzecca","obskur","omar-plus","brunello","josh-baker","raje","aat","idemi","joshwa","malugi","bullet-tooth-b2b-sidney-charles","interplanetary-criminal","mph","chris-lorenzo","2ar","seeing-double","night-tales","me-n-u-casa","aat-casa","eve-lauren","crespo","kashovski","chantel-jeffries","monoky","me-n-u","twinsick","aaron-hibell","acraze-b2b-cid","alan-walker","nico-moreno","steve-aoki","disco-lines","kaskade","fury-with-mc-dino","madvktm","subsonic","avello","jkyl-and-hyde","layz","alleycvt","ray-volpe","skull-machine","alison-wonderland","mai-iachetti","kinahau","miguelle-and-tons","luke-dean-b2b-george-smeddles","rossi","dennis-cruz","franky-rizardo","alves","gabbs","greg-99","fallon","devault","discip","roddy-lima","ayybo","chasewest","jfuse","landis","raje-casa","allnightkev","gabbs-casa","cc-love","juos","rommii","esse","ar-co","jessica-audiffred","ian-asher","slander","i-hate-models","alok","hardwell","martin-garrix","discovery-project","a-little-sound","kaivon","san-holo","of-the-trees","meduza","maddix","deorro-b2b-dj-diesel","atliens","holy-priest","ultrathem","shdw","adrian-mills","marlon-hoffstadt","boys-noize-b2b-brutalismus-3000","ki-ki","klangkuenstler","m81","contra","chef-boyarbeatz","phrva","sippy","know-good","taiki-nulight","ravenscoon","boogie-t","troyboi","bryan-softwell-b2b-chini","marian-br","brosa","alves-casa","joe-vanditti","andrea-quintero","kofla","william-kiss"];
const ZON_IDS = ["fiore","kei","hao","moeuv","vincan","ginjo","grace-kim","mushxxx","better","juntaro","sielo","minji","taesco","pierre-blanche","ybt","loco-soound","dpole","rubato","lilygarden","casepeat","izreal","kataploks","onseal","half-step","jamjari","miniverse","weback","flash-finger","ceejay","8train","zb","beom","ak","ari","joody","vandal-rock","jeb","oing","pure-100","juncoco","inside-core","yuka","kindergarten","zuin","hb","bagagee-viphex13","strange1","wish","valssa","narsis","san-ha","caleb","dj-ap","dj-tezz","chun-haeun","18crew","jakkeychan","dj-it","sky","real-hyunsong","aircon","hustlexhen","dal-bong","katapii","xpider","hardnendz","minimonster","hiyoh","augments","daizy","hime-isnotdead","roha","cream","riran","zayda","ssombo","basskrap","ping-pong","greennavy","king","voidrover","zi-zero","kim-dongsun","kim-qna","zomdol","g1kim","songpancake","soraere-brocken","blancat","stann-lumo","jade","sophi","jvvn","adroit-joe","leesoongan","superfly","edgsnd","puf","yh","honn","funkin-cat","dj-bowlcut","coral-the-animal"];
// </lineup:auto>

/** 페스티벌별로 셀 수 있는 공연 id (토크·이벤트 제외) */
const LINEUP: Record<string, Set<string>> = { gmf: new Set(GMF_IDS), nol: new Set(NOL_IDS), orl: new Set(ORL_IDS), zon: new Set(ZON_IDS) };
/** 페스티벌별 집계 날짜 */
const DAYS: Record<string, string[]> = { gmf: ["sat", "sun"], nol: ["sat", "sun"], orl: ["fri", "sat", "sun"], zon: ["sat"] };

/** 집계를 멈추려면 true (DB를 쓰지 않고 바로 거절) */
const CLOSED = false;

const DEVICE_RE = /^[a-zA-Z0-9-]{16,64}$/;
const MAX_IDS = 60;
const MEM_PER_MIN = 5;
const DB_PER_MIN = 6;
const DB_NEW_DEVICE_PER_IP_DAY = 30; // 같은 와이파이·통신사 IP를 여러 명이 함께 쓰는 경우를 고려
const DEVICE_TTL = 60 * 60 * 24 * 30;
/** 사이트 전체 새 기기 1분 상한. 평소 축제 당일에도 1분에 수십 대 수준이라 넉넉하게 */
const GLOBAL_NEW_PER_MIN = 120;
const PAUSE_SEC = 10 * 60;

/** 브라우저가 아닌 프로그램의 이름이 들어간 User-Agent */
const BOT_UA = /curl|wget|python|httpie|axios|node-fetch|undici|go-http|java\/|okhttp|libwww|scrapy|aiohttp|headless|phantom|selenium|puppeteer|playwright|postman|insomnia|security|test|\bbot\b|bot\/|spider|crawl/i;

/**
 * 브라우저에서 온 요청처럼 보이는지.
 * 브라우저는 fetch에 User-Agent·Accept-Language를 항상 붙이고, 최신 브라우저는 Sec-Fetch-Site: same-origin도 붙인다.
 * (curl·스크립트는 이런 헤더를 일부러 꾸며 넣지 않는 한 없다)
 */
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

/** IP를 그대로 저장하지 않고 해시 앞 12자만 (되돌리기 때 "같은 곳에서 온 것"만 알 수 있으면 된다) */
async function ipHash(ip: string): Promise<string> {
  const salt = process.env.AUDIT_SALT || "festlock-audit";
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + "|" + ip));
  return Array.from(new Uint8Array(d).slice(0, 6), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** User-Agent를 짧은 종류로 (기록용) */
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

export async function POST(request: Request): Promise<Response> {
  if (CLOSED) return json({ error: "closed" }, 410);
  if (!sameSite(request)) return json({ error: "forbidden" }, 403);
  if (!looksLikeBrowser(request)) return json({ error: "forbidden" }, 403);
  const ip = clientIp(request);
  if (memLimited(ip)) return json({ error: "rate" }, 429);

  let body: { fest?: unknown; device?: unknown; day?: unknown; ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad-json" }, 400);
  }
  const { fest, device, day, ids } = body;
  if (typeof fest !== "string" || !LINEUP[fest]) return json({ error: "bad-fest" }, 400);
  if (typeof device !== "string" || !DEVICE_RE.test(device)) return json({ error: "bad-device" }, 400);
  if (typeof day !== "string" || !DAYS[fest].includes(day)) return json({ error: "bad-day" }, 400);
  if (!Array.isArray(ids) || ids.length > MAX_IDS) return json({ error: "bad-ids" }, 400);
  const lineup = LINEUP[fest];
  const list = [...new Set(ids.filter((x): x is string => typeof x === "string" && lineup.has(x)))];

  const r = db();
  if (!r) return json({ error: "no-db" }, 503);
  const P = "fl:" + fest;

  const minKey = `${P}:rl:min:${ip}`;
  const perMin = await r.incr(minKey);
  if (perMin === 1) await r.expire(minKey, 60);
  if (perMin > DB_PER_MIN) return json({ error: "rate" }, 429);

  // 처음 보는 기기만 IP 하루 한도·전체 급증 검사를 거친다
  const dlKey = `${P}:dl:${day}`;
  const known = (await r.sismember(dlKey, device)) === 1;
  if (!known) {
    // 서킷 브레이커가 걸려 있으면 새 기기는 잠시 세지 않는다 (이미 센 기기는 아티스트가 라인업 수만큼만 늘 수 있어 그대로 둔다)
    // paused면 브라우저는 "센 걸로" 표시하지 않아서, 사용자가 나중에 다시 저장하면 그때 센다
    if (await r.get(`${P}:pause`)) return json({ counted: false, paused: true });
    const dayKey = `${P}:rl:day:${day}:${ip}`;
    const perDay = await r.incr(dayKey);
    if (perDay === 1) await r.expire(dayKey, 60 * 60 * 48);
    if (perDay > DB_NEW_DEVICE_PER_IP_DAY) return json({ counted: false, limited: true });
    const gKey = `${P}:rl:new:${Math.floor(Date.now() / 60_000)}`;
    const perMinAll = await r.incr(gKey);
    if (perMinAll === 1) await r.expire(gKey, 120);
    if (perMinAll > GLOBAL_NEW_PER_MIN) {
      await r.set(`${P}:pause`, String(Date.now()), { ex: PAUSE_SEC });
      return json({ counted: false, paused: true });
    }
  }

  // 다운로드 수(기기·요일당 1번) + 이 기기가 처음 고른 아티스트만 +1
  const devKey = `${P}:dev:${device}`;
  const p = r.pipeline();
  p.sadd(dlKey, device);
  for (const id of list) p.sadd(devKey, id);
  const res = (await p.exec()) as number[];
  const fresh = list.filter((_, k) => res[k + 1] === 1);
  if (list.length) await r.expire(devKey, DEVICE_TTL);
  // 되돌리기용 기록: 새로 센 기기의 IP 해시 | 분 | 브라우저 종류
  if (res[0] === 1) {
    const whoKey = `${P}:who:${day}`;
    const ua = (request.headers.get("user-agent") || "").slice(0, 300);
    await r.hset(whoKey, { [device]: `${await ipHash(ip)}|${Math.floor(Date.now() / 60_000)}|${uaKind(ua)}` });
    await r.expire(whoKey, DEVICE_TTL);
  }
  if (fresh.length) {
    const z = r.pipeline();
    for (const id of fresh) z.zincrby(`${P}:top`, 1, id);
    await z.exec();
  }
  return json({ counted: res[0] === 1, picks: fresh.length });
}
