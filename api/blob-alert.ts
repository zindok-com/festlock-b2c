/// <reference types="node" />
// POST /api/blob-alert  — 브라우저가 사진·영상(Vercel Blob)을 못 불러올 때 알려 오는 곳 (src/blobHealth.ts)
// 여러 사람이 실패를 알리면 서버가 Blob 사진 하나를 직접 확인하고, 정말 막혀 있으면 이메일을 한 통 보낸다. 6시간에 한 번까지만.
// (Hobby 요금제는 한 달 전송량 10GB를 넘으면 요금이 아니라 스토어가 막혀서 사진·영상이 모두 안 나온다)
//
// 환경변수 (Vercel → Project → Settings → Environment Variables, 바꾸면 Redeploy)
//   ALERT_EMAIL     알림 받을 이메일. 없으면 아무것도 보내지 않는다 (필수)
//   RESEND_API_KEY  Resend(resend.com, 무료 월 3,000통·하루 100통) API 키 (필수)
//   ALERT_FROM      (선택) 보내는 주소. 기본 "FestLock <onboarding@resend.dev>" — 도메인이 없어도 되고, 무료 계정은 Resend에 가입한 이메일로만 받을 수 있다
//   ALERT_PROBE_URL (선택) 직접 확인할 사진 주소. 기본 VITE_FACE_BASE + "/zon/ak.webp"
//   RESEND_API_URL  (시험용) Resend 주소를 바꾼다
// 받는 이메일 주소는 코드·저장소에 적지 않는다 (환경변수에만 있다).
//
// 막는 것: 같은 사이트가 아닌 요청 · 브라우저가 아닌 요청 · 한 IP의 잦은 요청 · 서로 다른 IP 3곳 미만의 신고 (한 사람의 인터넷 문제로는 메일이 가지 않는다)
import { Redis } from "@upstash/redis";

function db(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** 10분 안에 서로 다른 IP가 이만큼 신고해야 서버가 확인한다 */
const MIN_REPORTERS = 3;
/** 메일은 이 시간(초)에 한 번까지 */
const COOLDOWN_SEC = 6 * 60 * 60;
const MEM_PER_MIN = 6;

const BOT_UA = /curl|wget|python|httpie|axios|node-fetch|undici|go-http|java\/|okhttp|libwww|scrapy|aiohttp|headless|phantom|selenium|puppeteer|playwright|postman|insomnia|security|test|\bbot\b|bot\/|spider|crawl/i;

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

async function ipHash(ip: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("festlock-alert|" + ip));
  return Array.from(new Uint8Array(d).slice(0, 6), (b) => b.toString(16).padStart(2, "0")).join("");
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

/** Blob 사진 하나를 서버가 직접 확인. 막혀 있으면 이유(상태 코드·오류)를 돌려주고, 멀쩡하면 null */
async function probe(): Promise<string | null> {
  const base = (process.env.VITE_FACE_BASE || "").replace(/\/+$/, "");
  const url = process.env.ALERT_PROBE_URL || (base ? base + "/zon/ak.webp" : "");
  if (!url) return "확인할 사진 주소(VITE_FACE_BASE)가 설정돼 있지 않아요";
  try {
    // 파일 전체를 받지 않도록 1바이트만 요청 (이것도 전송량에 거의 안 잡힌다)
    const r = await fetch(url + (url.includes("?") ? "&" : "?") + "alertprobe=" + Date.now(), { headers: { range: "bytes=0-0" }, signal: AbortSignal.timeout(6000) });
    if (r.status === 200 || r.status === 206) return null;
    return `HTTP ${r.status} ${r.statusText}`.trim();
  } catch (e) {
    return "연결 실패: " + (e instanceof Error ? e.message : String(e)).slice(0, 120);
  }
}

async function sendMail(reason: string, reporters: number): Promise<boolean> {
  const to = process.env.ALERT_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!to || !key) {
    console.warn("blob-alert: ALERT_EMAIL 또는 RESEND_API_KEY 가 없어 메일을 보내지 않았어요");
    return false;
  }
  const kst = new Date(Date.now() + 9 * 3600_000).toISOString().replace("T", " ").slice(0, 16);
  const text = [
    "FestLock 사진·영상 저장소(Vercel Blob)에서 파일을 못 불러오고 있어요.",
    "",
    `- 확인 시각: ${kst} (한국 시간)`,
    `- 서버가 직접 확인한 결과: ${reason}`,
    `- 최근 10분 동안 서로 다른 ${reporters}곳에서 불러오기 실패를 알려 왔어요.`,
    "",
    "가장 흔한 원인은 Hobby 요금제의 한 달 전송량(10GB) 초과예요. 넘으면 요금이 나오는 대신 스토어가 막혀서 사진과 영상이 모두 안 나와요.",
    "",
    "먼저 확인: Vercel → Storage → festlock-blob → Usage 의 Data Transfer",
    "",
    "할 수 있는 일",
    "1) Pro 요금제로 올리기 (Blob 전송량 100GB 포함)",
    "2) 급하면 영상만 끄기: public/clips.json 에서 그 페스티벌 칸을 비우고 배포 (사진은 그대로)",
    "3) 영상 자동 재생 끄기: src/components/ClipPlayer.tsx 의 AUTOPLAY = false",
    "",
    "이 메일은 6시간에 한 번까지만 와요.",
  ].join("\n");
  try {
    const r = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.ALERT_FROM || "FestLock <onboarding@resend.dev>",
        to: [to],
        subject: "[FestLock] 사진·영상이 안 나올 수 있어요 (Vercel Blob 한도 의심)",
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.warn("blob-alert: 메일 서비스가 거절했어요", r.status);
    return r.ok;
  } catch (e) {
    console.warn("blob-alert: 메일을 보내지 못했어요", e instanceof Error ? e.message : e);
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!sameSite(request)) return json({ error: "forbidden" }, 403);
  if (!looksLikeBrowser(request)) return json({ error: "forbidden" }, 403);
  const ip = clientIp(request);
  if (memLimited(ip)) return json({ error: "rate" }, 429);

  const r = db();
  if (!r) return json({ ok: true });

  // 10분 단위로, 서로 다른 IP가 몇 곳에서 신고했는지
  const bucket = Math.floor(Date.now() / 600_000);
  const setKey = `fl:alert:ips:${bucket}`;
  await r.sadd(setKey, await ipHash(ip));
  await r.expire(setKey, 1200);
  const reporters = await r.scard(setKey);
  if (reporters < MIN_REPORTERS) return json({ ok: true });

  // 6시간에 한 번만 (먼저 자리를 잡아 두면 동시에 여러 요청이 와도 한 번만 진행한다)
  const claimed = await r.set("fl:alert:sent", String(Date.now()), { nx: true, ex: COOLDOWN_SEC });
  if (!claimed) return json({ ok: true });

  const reason = await probe();
  if (reason === null) {
    // 서버에서 보면 멀쩡하다: 신고한 사람들의 인터넷 문제였을 수 있다. 다음에 진짜로 막히면 알릴 수 있게 자리를 비운다
    await r.del("fl:alert:sent");
    return json({ ok: true });
  }
  const sent = await sendMail(reason, reporters);
  if (!sent) await r.del("fl:alert:sent"); // 못 보냈으면 다음 신고 때 다시 시도
  return json({ ok: true });
}
