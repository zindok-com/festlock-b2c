// 새 페스티벌(그랜드 민트·NOL) 집계 점검·되돌리기
// api/fest-download.ts가 센 기기마다 "IP 해시 | 분 | 브라우저 종류"를 fl:{fest}:who:{day}에 남긴다.
// 공격이 오면 이걸로 어디서·언제 몰려 들어왔는지 보고, 그 기기들만 골라 다운로드 수·아티스트 랭킹에서 뺀다.
//
// 준비 (PowerShell, Upstash 콘솔의 REST URL·TOKEN):
//   $env:UPSTASH_REDIS_REST_URL="https://..."; $env:UPSTASH_REDIS_REST_TOKEN="..."
//
// 1) 살펴보기:   node scripts/fest-rollback.mjs report nol sat
// 2) 미리보기:   node scripts/fest-rollback.mjs remove nol sat --ip 1a2b3c4d5e6f --from "2026-10-17 18:50" --to "2026-10-17 19:30"
// 3) 실제 삭제:  위 명령 끝에 --yes
//    --ip, --from/--to(한국 시간), --ua(브라우저 종류) 중 하나 이상을 줘야 한다. 조건은 모두 만족해야 지운다.

/** "2026-10-17 18:50"(한국 시간) → 분 단위 숫자 */
export function kstMinute(s) {
  const t = Date.parse(s.trim().replace(" ", "T") + ":00+09:00");
  if (Number.isNaN(t)) throw new Error("시간 형식: \"2026-10-17 18:50\" (" + s + ")");
  return Math.floor(t / 60_000);
}
const minuteText = (m) => new Date(m * 60_000 + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");

async function readWho(r, fest, day) {
  const h = (await r.hgetall(`fl:${fest}:who:${day}`)) || {};
  return Object.entries(h).map(([device, v]) => {
    const [ip, min, ua] = String(v).split("|");
    return { device, ip, min: Number(min), ua };
  });
}

function top(rows, key, n = 12) {
  const m = new Map();
  for (const r of rows) m.set(key(r), (m.get(key(r)) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export async function report(r, fest, day, log = console.log) {
  const rows = await readWho(r, fest, day);
  const total = await r.scard(`fl:${fest}:dl:${day}`);
  log(`[${fest} ${day}] 다운로드 기기 ${total}대 (기록 있는 기기 ${rows.length}대)`);
  log("\n많이 들어온 IP 해시 (같은 와이파이·통신사면 여러 명일 수 있음):");
  for (const [k, n] of top(rows, (x) => x.ip)) log(`  ${k}  ${n}대`);
  log("\n10분 단위로 들어온 수 (갑자기 튀는 구간을 보면 된다):");
  for (const [k, n] of top(rows, (x) => Math.floor(x.min / 10) * 10, 15).sort((a, b) => a[0] - b[0])) log(`  ${minuteText(k)}~  ${n}대`);
  log("\n브라우저 종류:");
  for (const [k, n] of top(rows, (x) => x.ua)) log(`  ${k}  ${n}대`);
  const paused = await r.get(`fl:${fest}:pause`);
  if (paused) log(`\n※ 지금 서킷 브레이커가 걸려 있어요 (${minuteText(Math.floor(Number(paused) / 60_000))}부터 10분). 새 기기를 잠시 세지 않는 중이에요.`);
  return rows;
}

export async function remove(r, fest, day, f, apply, log = console.log) {
  if (!f.ip && f.from == null && f.to == null && !f.ua) throw new Error("--ip, --from/--to, --ua 중 하나는 있어야 해요 (전부 지우는 걸 막기 위해)");
  const rows = (await readWho(r, fest, day)).filter(
    (x) => (!f.ip || x.ip === f.ip) && (f.from == null || x.min >= f.from) && (f.to == null || x.min <= f.to) && (!f.ua || x.ua === f.ua),
  );
  log(`[${fest} ${day}] 조건에 맞는 기기 ${rows.length}대`);
  const minus = new Map();
  for (const x of rows) for (const id of (await r.smembers(`fl:${fest}:dev:${x.device}`)) || []) minus.set(id, (minus.get(id) || 0) + 1);
  const list = [...minus.entries()].sort((a, b) => b[1] - a[1]);
  log("빠질 아티스트 표: " + (list.length ? list.slice(0, 15).map(([id, n]) => `${id} -${n}`).join(", ") + (list.length > 15 ? " …" : "") : "없음"));
  if (!apply) {
    log("\n미리보기만 했어요. 실제로 지우려면 같은 명령 끝에 --yes 를 붙이세요.");
    return { devices: rows.length, picks: list };
  }
  for (const x of rows) {
    const p = r.pipeline();
    p.srem(`fl:${fest}:dl:${day}`, x.device);
    for (const id of (await r.smembers(`fl:${fest}:dev:${x.device}`)) || []) p.zincrby(`fl:${fest}:top`, -1, id);
    p.del(`fl:${fest}:dev:${x.device}`);
    p.hdel(`fl:${fest}:who:${day}`, x.device);
    await p.exec();
  }
  log(`\n지웠어요: 기기 ${rows.length}대, 아티스트 표 ${list.reduce((a, [, n]) => a + n, 0)}개`);
  return { devices: rows.length, picks: list };
}

// ---- 명령줄 ----
async function main() {
  const [cmd, fest, day, ...rest] = process.argv.slice(2);
  if (!["report", "remove"].includes(cmd) || !["gmf", "nol", "orl"].includes(fest) || !["fri", "sat", "sun"].includes(day)) {
    console.log("사용법: node scripts/fest-rollback.mjs report|remove gmf|nol|orl fri|sat|sun [--ip 해시] [--from \"2026-10-17 18:50\"] [--to \"...\"] [--ua 종류] [--yes]");
    process.exit(1);
  }
  const opt = (name) => {
    const i = rest.indexOf("--" + name);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.log("UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN 환경 변수를 먼저 넣어 주세요.");
    process.exit(1);
  }
  const { Redis } = await import("@upstash/redis");
  const r = new Redis({ url, token });
  if (cmd === "report") await report(r, fest, day);
  else
    await remove(
      r,
      fest,
      day,
      { ip: opt("ip"), from: opt("from") ? kstMinute(opt("from")) : null, to: opt("to") ? kstMinute(opt("to")) : null, ua: opt("ua") },
      rest.includes("--yes"),
    );
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/fest-rollback.mjs")) main();
