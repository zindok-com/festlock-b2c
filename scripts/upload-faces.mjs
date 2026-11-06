// faces-src/ 의 사진을 Vercel Blob(공개 스토어)에 올린다. 이미 있는 파일은 같은 이름으로 덮어쓴다.
//   BLOB_READ_WRITE_TOKEN=... node scripts/upload-faces.mjs      (또는 .env.local 에 넣고 실행)
// 올린 뒤 출력되는 주소 앞부분(…/artists)을 VITE_FACE_BASE 로 설정한다.
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
  process.exit(1);
}

const ROOT = "faces-src";
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.webp$/i.test(e.name)) files.push(p);
  }
})(ROOT);

let base = "";
let done = 0;
const queue = [...files];
async function worker() {
  for (let f; (f = queue.shift()); ) {
    const rel = path.relative(ROOT, f).split(path.sep).join("/");
    const r = await put("artists/" + rel, fs.readFileSync(f), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/webp",
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    base ||= r.url.slice(0, r.url.indexOf("/artists/") + "/artists".length);
    if (++done % 50 === 0) console.log(done + "/" + files.length);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`uploaded ${done}/${files.length}`);
console.log("VITE_FACE_BASE=" + base);
