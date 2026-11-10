// 아티스트 미리보기 영상 만들기: 원본 영상(크기·형식 제각각) → 폰에서 가볍게 재생되는 mp4 (clips-src/{페스티벌}/{id}.mp4)
// 그리고 public/clips.json 의 그 페스티벌 목록을 새로 쓴다. 올리는 건 scripts/upload-clips.mjs.
//
// 사용법 (ffmpeg·ffprobe 가 설치돼 있어야 한다):
//   npm run clips -- zon                       _inbox/clips/zon/{id}.mp4|mov 를 모두 변환
//   npm run clips -- zon _inbox/zon-clips.json  표(아래 형식)대로 변환 — 원본이 다른 폴더에 있을 때
//     { "ak": { "src": "D:/받은영상/AK.mp4" }, "roha": { "src": "…", "start": 12, "len": 20 } }
//   npm run clips -- zon --force               이미 만든 것도 다시 만든다
//
// 규칙:
//   - 길이: 최대 24초 (len 으로 바꿀 수 있다, 5~60초). 원본이 더 길면 "소리가 가장 큰 구간"을 자동으로 고른다 (start 로 직접 정할 수 있다)
//   - 크기: 긴 변 960px 이하, 30fps 이하, H.264 + AAC (아이폰·안드로이드·앱 안 브라우저에서 모두 재생)
//   - 용량: 영상 650kbps 이하 + 소리 80kbps → 1편 약 1~2MB. Blob 무료 요금제(저장 1GB, 한 달 전송 10GB)를 넘지 않기 위한 값
//   - 소리 크기를 영상마다 비슷하게 맞춘다
//   - 페스티벌 키(zon)는 src/festivals.json 의 "page" 값, id 는 라인업 파일(src/fest/{키}.ts)의 id 와 같아야 한다
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";

const MAX_LEN = 24;
const LONG_SIDE = 960;
const V_RATE = 650;
const A_RATE = 80;
const OUT_ROOT = "clips-src";
const MANIFEST = "public/clips.json";

const args = process.argv.slice(2);
const force = args.includes("--force");
const [fest, table] = args.filter((a) => !a.startsWith("--"));
if (!fest) {
  console.error("사용법: npm run clips -- <페스티벌 키> [표.json] [--force]   예: npm run clips -- zon _inbox/zon-clips.json");
  process.exit(1);
}
const festivals = JSON.parse(fs.readFileSync("src/festivals.json", "utf8"));
const festival = festivals.find((f) => f.page === fest);
if (!festival) {
  console.error(`src/festivals.json 에 "page": "${fest}" 인 페스티벌이 없어요.`);
  process.exit(1);
}
const lineupFile = `src/fest/${fest}.ts`;
const lineup = fs.existsSync(lineupFile) ? new Set([...fs.readFileSync(lineupFile, "utf8").matchAll(/\["\d+:\d+", "~?\d+:\d+", "([a-z0-9-]+)"/g)].map((m) => m[1])) : null;

for (const bin of ["ffmpeg", "ffprobe"]) {
  if (spawnSync(bin, ["-version"], { stdio: "ignore" }).status !== 0) {
    console.error(`${bin} 을 찾을 수 없어요. ffmpeg 를 설치하고 다시 실행하세요. (윈도우: winget install Gyan.FFmpeg)`);
    process.exit(1);
  }
}

// ---- 변환할 목록 ----
/** id → { src, start?, len? } */
let jobs = {};
if (table) jobs = JSON.parse(fs.readFileSync(table, "utf8"));
else {
  const dir = path.join("_inbox", "clips", fest);
  if (!fs.existsSync(dir)) {
    console.error(`${dir} 폴더가 없어요. 원본을 {id}.mp4 이름으로 넣거나, 표(json)를 지정하세요.`);
    process.exit(1);
  }
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(.+)\.(mp4|mov|m4v|webm)$/i);
    if (m) jobs[m[1]] = { src: path.join(dir, f) };
  }
}

function probe(file) {
  const j = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { encoding: "utf8", maxBuffer: 1 << 26 }));
  const v = j.streams.find((s) => s.codec_type === "video");
  const a = j.streams.find((s) => s.codec_type === "audio");
  if (!v) throw new Error("영상이 들어 있지 않아요");
  const rot = Math.abs(Number(v.side_data_list?.find((d) => d.rotation != null)?.rotation ?? v.tags?.rotate ?? 0)) % 180 === 90;
  return {
    dur: Number(j.format.duration) || Number(v.duration) || 0,
    w: rot ? v.height : v.width,
    h: rot ? v.width : v.height,
    audio: !!a,
    // 아이폰 HDR(HLG·PQ) 영상은 그대로 줄이면 색이 뿌옇게 나와서 일반 색으로 바꾼다
    hdr: /arib-std-b67|smpte2084/.test(v.color_transfer || ""),
  };
}

/** 소리가 가장 큰 len초 구간의 시작(초). 드랍·하이라이트일 가능성이 높다 */
function loudestStart(file, dur, len) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  if (r.status !== 0 || !r.stdout?.length) return 0;
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 2));
  const secs = Math.floor(pcm.length / 8000);
  if (secs <= len) return 0;
  const e = new Float64Array(secs);
  for (let s = 0; s < secs; s++) {
    let sum = 0;
    for (let i = s * 8000; i < (s + 1) * 8000; i++) sum += pcm[i] * pcm[i];
    e[s] = Math.sqrt(sum / 8000);
  }
  let best = 0, bestSum = -1, cur = 0;
  for (let s = 0; s < secs; s++) {
    cur += e[s];
    if (s >= len) cur -= e[s - len];
    if (s >= len - 1 && cur > bestSum) {
      bestSum = cur;
      best = s - len + 1;
    }
  }
  // 구간이 드랍 한가운데서 시작하지 않게 2초 앞에서 시작
  return Math.max(0, Math.min(best - 2, Math.floor(dur - len)));
}

const outDir = path.join(OUT_ROOT, fest);
fs.mkdirSync(outDir, { recursive: true });
const made = [], skipped = [], failed = [], unknown = [];

for (const [id, job] of Object.entries(jobs)) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
    failed.push(`${id} (id 는 영문 소문자·숫자·하이픈)`);
    continue;
  }
  if (lineup && !lineup.has(id)) unknown.push(id);
  const out = path.join(outDir, id + ".mp4");
  const stamp = out + ".src";
  // 원본·설정이 그대로면 다시 만들지 않는다
  let key = "";
  try {
    const st = fs.statSync(job.src);
    key = [job.src, st.size, st.mtimeMs, job.start ?? "auto", job.len ?? MAX_LEN, LONG_SIDE, V_RATE, A_RATE].join("|");
  } catch {
    failed.push(`${id} (원본이 없어요: ${job.src})`);
    continue;
  }
  if (!force && fs.existsSync(out) && fs.existsSync(stamp) && fs.readFileSync(stamp, "utf8") === key) {
    skipped.push(id);
    continue;
  }
  try {
    const p = probe(job.src);
    const len = Math.max(5, Math.min(60, Number(job.len) || MAX_LEN, p.dur || MAX_LEN));
    const start = job.start != null ? Math.max(0, Number(job.start)) : p.audio && p.dur > len + 1 ? loudestStart(job.src, p.dur, len) : 0;
    const tone = p.hdr ? "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv," : "";
    const vf =
      tone +
      `scale='if(gt(iw,ih),min(${LONG_SIDE},iw),-2)':'if(gt(iw,ih),-2,min(${LONG_SIDE},ih))':flags=lanczos,` +
      `fps=30,format=yuv420p,fade=t=in:st=0:d=0.25,fade=t=out:st=${(len - 0.4).toFixed(2)}:d=0.4`;
    const af = `loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.15,afade=t=out:st=${(len - 0.5).toFixed(2)}:d=0.5`;
    const cmd = [
      "-v", "error", "-y", "-ss", String(start), "-i", job.src, "-t", String(len),
      "-map", "0:v:0", ...(p.audio ? ["-map", "0:a:0"] : []), "-map_metadata", "-1",
      "-vf", vf,
      "-c:v", "libx264", "-profile:v", "main", "-preset", "slow", "-crf", "29", "-maxrate", V_RATE + "k", "-bufsize", V_RATE * 2 + "k",
      ...(p.audio ? ["-af", af, "-c:a", "aac", "-b:a", A_RATE + "k", "-ac", "2", "-ar", "44100"] : ["-an"]),
      "-movflags", "+faststart", out,
    ];
    const r = spawnSync("ffmpeg", cmd, { encoding: "utf8" });
    if (r.status !== 0) throw new Error((r.stderr || "").trim().split("\n").pop() || "ffmpeg 오류");
    fs.writeFileSync(stamp, key);
    made.push(`${id} (${start ? start + "초부터 " : ""}${len.toFixed(0)}초, ${(fs.statSync(out).size / 1048576).toFixed(1)}MB)`);
  } catch (e) {
    failed.push(`${id} (${e.message})`);
  }
}

// ---- 목록(public/clips.json): 이 페스티벌 칸을 clips-src 에 있는 파일 기준으로 새로 쓴다 ----
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { version: 1, base: "", updatedAt: null, festivals: {} };
const list = {};
let bytes = 0;
for (const f of fs.readdirSync(outDir).filter((x) => x.endsWith(".mp4")).sort()) {
  const file = path.join(outDir, f);
  const p = probe(file);
  bytes += fs.statSync(file).size;
  list[f.replace(/\.mp4$/, "")] = {
    file: fest + "/" + f,
    w: p.w,
    h: p.h,
    dur: Math.round(p.dur * 10) / 10,
    v: crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 8),
  };
}
const before = JSON.stringify(manifest.festivals[festival.slug] ?? {});
manifest.festivals[festival.slug] = list;
if (before !== JSON.stringify(list)) manifest.updatedAt = new Date().toISOString();
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

console.log(`만듦 (${made.length}):`, made.join(", ") || "-");
console.log(`그대로 둠 (${skipped.length})`);
if (failed.length) console.log(`실패 (${failed.length}):`, failed.join(", "));
if (unknown.length) console.log(`라인업(${lineupFile})에 없는 id (${unknown.length}):`, unknown.join(", "));
console.log(`${festival.slug}: 영상 ${Object.keys(list).length}편, 합계 ${(bytes / 1048576).toFixed(0)}MB → ${MANIFEST}`);
console.log(manifest.base ? "다음: npm run upload-clips  (바뀐 영상만 올라가요)" : "다음: .env.local 에 BLOB_READ_WRITE_TOKEN 을 넣고 npm run upload-clips");
if (failed.length) process.exit(1);
