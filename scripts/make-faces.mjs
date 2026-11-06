// 스크린샷 → 정사각 320×320 webp (faces-src/{id}.webp)
// 사용법:
//   node scripts/make-faces.mjs                 _inbox/{id}.png|jpg 를 가운데 정사각으로 잘라 변환
//   node scripts/make-faces.mjs _inbox/crops.json  크롭 표(아래 형식)대로 변환
//     [{ "id": "sungyoo", "file": "shot.jpg", "left": 28, "top": 1910, "size": 244 }, ...]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = "faces-src";
const lineup = JSON.parse(fs.readFileSync("src/data/lineup.json", "utf8")).lineup;
const ids = new Set(lineup.map((x) => x.id));
fs.mkdirSync(OUT, { recursive: true });

async function write(id, img) {
  await img.resize(320, 320, { fit: "cover" }).webp({ quality: 80 }).toFile(path.join(OUT, id + ".webp"));
}

const done = [], held = [];
const table = process.argv[2];
if (table) {
  const base = path.dirname(table);
  for (const c of JSON.parse(fs.readFileSync(table, "utf8"))) {
    if (!ids.has(c.id)) { held.push(`${c.file} (알 수 없는 id: ${c.id})`); continue; }
    const src = path.join(base, c.file);
    const meta = await sharp(src).metadata();
    const size = Math.min(c.size, meta.width - c.left, meta.height - c.top);
    await write(c.id, sharp(src).extract({ left: c.left, top: c.top, width: size, height: size }));
    done.push(c.id);
  }
} else {
  for (const f of fs.readdirSync("_inbox")) {
    const m = f.match(/^(.+)\.(png|jpe?g)$/i);
    if (!m) continue;
    if (!ids.has(m[1])) { held.push(f); continue; }
    const src = path.join("_inbox", f);
    const { width, height } = await sharp(src).metadata();
    const s = Math.min(width, height);
    await write(m[1], sharp(src).extract({ left: Math.floor((width - s) / 2), top: Math.floor((height - s) / 2), width: s, height: s }));
    done.push(m[1]);
  }
}

const have = new Set(fs.readdirSync(OUT).map((f) => f.replace(/\.webp$/, "")));
console.log(`처리됨 (${done.length}):`, done.join(", ") || "-");
console.log(`보류 (${held.length}):`, held.join(", ") || "-");
const missing = lineup.filter((x) => !have.has(x.id)).map((x) => x.id);
console.log(`사진 없음 → 이니셜 아이콘 (${missing.length}):`, missing.join(", ") || "-");
