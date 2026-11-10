// 배경화면 "이 배경화면 어때요? 👍 👎" 투표 보기. 나만 본다 (사이트에는 결과를 보여 주는 주소가 없다).
//   node scripts/fest-votes.mjs                 모든 페스티벌 요약
//   node scripts/fest-votes.mjs zon             한 페스티벌만
//   node scripts/fest-votes.mjs zon --log 30    최근 투표 30건도 (기본 10건)
// 연결 정보: 환경변수 KV_REST_API_URL / KV_REST_API_TOKEN (또는 UPSTASH_REDIS_REST_URL / _TOKEN). .env.local 에 있으면 읽는다.
//   처음 한 번: vercel env pull .env.vercel   (.env.local 은 개발용 값이 들어 있으니 덮어쓰지 않게 다른 이름으로. 또는 Vercel → Storage → Upstash → .env.local 탭에서 복사)
// 같은 내용을 Vercel → Storage → Upstash(Redis) → Data Browser 에서도 볼 수 있다: fl:{페스티벌}:votesum (합계), fl:{페스티벌}:votelog (최근 2000건)
// 키 설명은 api/fest-vote.ts 맨 위 주석.
import fs from "node:fs";
import { Redis } from "@upstash/redis";

for (const f of [".env.local", ".env.vercel"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
if (!url || !token) {
  console.error("DB 연결 정보가 없어요. vercel env pull .env.vercel 을 실행하거나, .env.local 에 KV_REST_API_URL, KV_REST_API_TOKEN 을 넣으세요.");
  process.exit(1);
}
const r = new Redis({ url, token });

const args = process.argv.slice(2);
const li = args.indexOf("--log");
const logN = li >= 0 ? Number(args[li + 1]) || 10 : 10;
const only = args.filter((a, i) => !a.startsWith("--") && (li < 0 || i !== li + 1));
const FESTS = only.length ? only : ["gmf", "nol", "orl", "zon"];
const NAME = { ai: "AI 추천", all: "전체 스테이지" };
const LAYOUT = { packed: "고른 공연만(2안)", grid: "전체 표로 바뀜(1안)", text: "사진 뺌(3안)", all: "전체 스테이지" };
const pct = (u, d) => (u + d > 0 ? Math.round((u / (u + d)) * 100) + "%" : "-");
const pad = (s, n) => String(s).padEnd(n, " ");

for (const fest of FESTS) {
  const sum = (await r.hgetall(`fl:${fest}:votesum`)) ?? {};
  const raw = (await r.lrange(`fl:${fest}:votelog`, 0, -1)) ?? [];
  // Upstash 는 JSON 문자열을 알아서 객체로 바꿔 준다. 문자열이면 직접 바꾼다
  const log = raw.map((x) => (typeof x === "string" ? JSON.parse(x) : x));
  if (!Object.keys(sum).length && !log.length) {
    console.log(`\n== ${fest} == 아직 투표가 없어요`);
    continue;
  }
  console.log(`\n== ${fest} ==`);
  // 합계 (기기당 한 표, 바꾼 표 반영)
  const scopes = new Set(Object.keys(sum).map((k) => k.replace(/:(up|down)$/, "")));
  let upAll = 0, downAll = 0;
  console.log(pad("보기", 14) + pad("모양", 22) + pad("👍", 6) + pad("👎", 6) + "호감도");
  for (const sc of [...scopes].sort()) {
    const [view, layout] = sc.split(":");
    const up = Number(sum[sc + ":up"] ?? 0), down = Number(sum[sc + ":down"] ?? 0);
    upAll += up;
    downAll += down;
    console.log(pad(NAME[view] ?? view, 14) + pad(LAYOUT[layout] ?? layout, 22) + pad(up, 6) + pad(down, 6) + pct(up, down));
  }
  console.log(pad("합계", 36) + pad(upAll, 6) + pad(downAll, 6) + pct(upAll, downAll));

  // 어떤 상황에서 불만이 나오는지: 고른 무대 수별 (AI 추천 · 최근 기록 기준)
  const ai = log.filter((e) => e.view === "ai");
  if (ai.length) {
    const by = new Map();
    for (const e of ai) {
      const k = `${e.layout} · 무대 ${e.stages}곳`;
      const v = by.get(k) ?? { up: 0, down: 0 };
      if (e.v === 1) v.up++;
      else v.down++;
      by.set(k, v);
    }
    console.log("\nAI 추천 — 모양·고른 무대 수별 (최근 기록 기준, 바꾼 표도 한 줄씩 들어 있어요)");
    for (const [k, v] of [...by].sort((a, b) => a[0].localeCompare(b[0], "ko"))) console.log("  " + pad(k, 28) + `👍 ${v.up}  👎 ${v.down}  (${pct(v.up, v.down)})`);
  }

  console.log(`\n최근 투표 ${Math.min(logN, log.length)}건 (기록 ${log.length}건 중)`);
  for (const e of log.slice(0, logN)) {
    const t = new Date(e.t).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
    console.log(`  ${t}  ${e.v === 1 ? "👍" : "👎"}${e.flip ? "(바꿈)" : "     "} ${pad(NAME[e.view] ?? e.view, 8)} ${pad(e.layout, 7)} ${e.picks}팀·무대${e.stages}·붐빔${e.busiest}  ${e.ratio ?? "-"}${e.noPhoto ? " 사진뺌" : ""}${e.compact ? " 상단축소" : ""}${e.lock ? " 시계자리" : ""}  ${e.lang ?? "-"}  ${e.ua}`);
  }
}
