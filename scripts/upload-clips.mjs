// clips-src/ 의 미리보기 영상을 Vercel Blob(얼굴 사진과 같은 공개 스토어)의 clips/ 폴더에 올린다.
//   BLOB_READ_WRITE_TOKEN=... node scripts/upload-clips.mjs      (또는 .env.local 에 넣고 npm run upload-clips)
//   npm run upload-clips -- --all      이미 올린 것도 전부 다시 올린다
// - 바뀐 영상만 올린다 (올린 기록: clips-src/.uploaded.json)
// - 끝나면 public/clips.json 의 "base"(Blob 주소)를 채운다 → 이 파일을 커밋·배포하면 사이트에 영상이 나온다
// - 영상을 내리려면: clips-src 에서 파일을 지우고 npm run clips -- <키> 로 목록을 새로 쓴 뒤 배포. Blob 대시보드에서 파일을 지우면 바로 내려간다
import fs from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";

if (fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN 이 없어요. .env.local 에 넣거나 환경변수로 지정하세요.");
  console.error("(Vercel → Storage → festlock-blob → .env.local 탭에서 복사. 저장소에는 절대 올리지 마세요)");
  process.exit(1);
}

const ROOT = "clips-src";
const MANIFEST = "public/clips.json";
const LOG = path.join(ROOT, ".uploaded.json");
if (!fs.existsSync(MANIFEST)) {
  console.error(`${MANIFEST} 이 없어요. 먼저 npm run clips -- <페스티벌 키> 를 실행하세요.`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const all = process.argv.includes("--all");
/** 파일 경로 → 올린 내용 값(v) */
const uploaded = !all && fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : {};

const queue = [];
let total = 0;
for (const clips of Object.values(manifest.festivals)) {
  for (const c of Object.values(clips)) {
    total++;
    const local = path.join(ROOT, c.file);
    if (uploaded[c.file] === c.v) continue;
    if (!fs.existsSync(local)) {
      console.warn(`건너뜀: ${local} 이 내 PC에 없어요 (다른 사람이 올린 영상이면 괜찮아요)`);
      continue;
    }
    queue.push(c);
  }
}

let base = manifest.base || "";
let done = 0, bytes = 0;
const n = queue.length;
async function worker() {
  for (let c; (c = queue.shift()); ) {
    const buf = fs.readFileSync(path.join(ROOT, c.file));
    const r = await put("clips/" + c.file, buf, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "video/mp4",
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    base = r.url.slice(0, r.url.indexOf("/clips/") + "/clips".length);
    uploaded[c.file] = c.v;
    bytes += buf.length;
    if (++done % 10 === 0 || done === n) console.log(done + "/" + n);
    fs.writeFileSync(LOG, JSON.stringify(uploaded, null, 2));
  }
}
await Promise.all(Array.from({ length: 4 }, worker));

if (base && base !== manifest.base) {
  manifest.base = base;
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
}
console.log(`올림 ${done}편 (${(bytes / 1048576).toFixed(0)}MB) · 목록에 있는 영상 ${total}편`);
console.log("주소: " + (base || "(아직 없음)"));
console.log(`다음: ${MANIFEST} 을 커밋하고 배포하세요.`);
