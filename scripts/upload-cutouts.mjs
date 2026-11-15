// faces-src/<fest>/cut/*.webp (누끼)와 faces-src/<fest>/b2b/*.webp (B2B 두 사람 사진·합성 누끼, scripts/make-b2b.mjs)만
// Vercel Blob(artists/<fest>/cut|b2b/…)에 올린다. 얼굴 사진은 건드리지 않는다. 하위 폴더(_tmp 등)는 올리지 않는다.
//   node scripts/upload-cutouts.mjs zon tml vac        (BLOB_READ_WRITE_TOKEN 은 .env.local 에서 읽는다)
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
  console.error("BLOB_READ_WRITE_TOKEN 이 없어요.");
  process.exit(1);
}
const fests = process.argv.slice(2);
if (!fests.length) {
  console.error("사용법: node scripts/upload-cutouts.mjs <fest> [<fest> ...]");
  process.exit(1);
}
const files = [];
for (const f of fests) {
  for (const sub of ["cut", "b2b"]) {
    const dir = path.join("faces-src", f, sub);
    if (!fs.existsSync(dir)) continue;
    for (const n of fs.readdirSync(dir)) if (/\.webp$/i.test(n)) files.push([`${f}/${sub}`, n, path.join(dir, n)]);
  }
}
let done = 0;
const queue = [...files];
async function worker() {
  for (let it; (it = queue.shift()); ) {
    await put(`artists/${it[0]}/${it[1]}`, fs.readFileSync(it[2]), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/webp",
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    done++;
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`uploaded ${done}/${files.length}`);
