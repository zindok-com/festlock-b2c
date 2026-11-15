// 아티스트 사진에서 배경을 지운 "누끼"(투명 WebP)를 만든다. 이 PC에서만 처리하고 사진은 밖으로 올라가지 않는다.
//   node scripts/make-cutouts.mjs --map cut-map.json --out faces-src/utw/cut [--lib <라이브러리를 설치한 폴더>]
//
//   cut-map.json : { "아티스트-id": "원본 사진 파일 또는 폴더 경로", … }   (폴더면 그 안의 첫 이미지)
//   --out        : 결과 폴더. <id>.webp 와 contact.png(확인용 모아보기)가 생긴다
//   --lib        : @imgly/background-removal-node 를 설치한 폴더 (저장소 의존성에는 넣지 않았다: 용량이 크다).
//                  없으면 `npm i @imgly/background-removal-node` 를 어디든 한 곳에 하고 그 폴더를 --lib 로 준다.
//
// 만든 뒤에는 contact.png 를 눈으로 보고 "쓸 만한 것"만 골라 Blob(artists/<fest>/cut/<id>.webp)에 올리고
// src/fest/cutouts.ts 의 목록에 id 를 넣는다. 원본에 글자·로고가 섞였거나 해상도가 낮으면 누끼가 깨끗하지 않으니 넣지 않는다
// (목록에 없는 아티스트는 테마 4에서 이중톤 사진으로 대신 나온다).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const args = process.argv.slice(2);
const val = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const mapFile = val("--map");
const out = val("--out");
const lib = val("--lib", process.cwd());
if (!mapFile || !out) {
  console.error("사용법: node scripts/make-cutouts.mjs --map cut-map.json --out faces-src/utw/cut [--lib <폴더>]");
  process.exit(1);
}
let removeBackground, publicPath;
try {
  const resolved = createRequire(path.resolve(lib, "package.json")).resolve("@imgly/background-removal-node");
  ({ removeBackground } = await import(pathToFileURL(resolved).href));
  // 모델 파일 위치를 알려 준다 (안 주면 현재 폴더의 node_modules 에서 찾는다)
  publicPath = pathToFileURL(path.dirname(resolved)).href + "/";
} catch {
  console.error("@imgly/background-removal-node 를 찾을 수 없어요. 어느 폴더에든 `npm i @imgly/background-removal-node` 를 하고 --lib <그 폴더> 로 알려 주세요.");
  process.exit(1);
}

const H = 420; // 결과 높이(px). 카드에서 최대 약 200px(2배 화면 400px)로 보인다
const map = JSON.parse(fs.readFileSync(mapFile, "utf8"));
fs.mkdirSync(out, { recursive: true });
const pickFile = (p) => {
  if (fs.statSync(p).isDirectory()) {
    const f = fs.readdirSync(p).find((x) => /\.(jpe?g|png|webp)$/i.test(x));
    return f ? path.join(p, f) : null;
  }
  return p;
};
const done = [];
for (const [id, p] of Object.entries(map)) {
  const src = pickFile(p);
  if (!src) {
    console.log(id, "→ 이미지 없음");
    continue;
  }
  const meta = await sharp(src).rotate().metadata();
  const png = await sharp(src).rotate().png().toBuffer();
  const blob = await removeBackground(new Blob([png], { type: "image/png" }), { publicPath, output: { format: "image/png" } });
  const cut = await sharp(Buffer.from(await blob.arrayBuffer())).trim({ threshold: 5 }).resize({ height: H, withoutEnlargement: true }).toBuffer();
  const webp = await sharp(cut).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
  fs.writeFileSync(path.join(out, id + ".webp"), webp);
  const m = await sharp(webp).metadata();
  console.log(`${id.padEnd(22)} 원본 ${meta.width}x${meta.height} → ${m.width}x${m.height}  ${Math.round(webp.length / 1024)}KB`);
  done.push(id);
}

// 확인용 모아보기: 체크무늬 바탕 위에 한 줄에 6명씩
const cell = 220, cols = 6, rows = Math.ceil(done.length / cols);
const checker = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell * cols}" height="${cell * rows}"><defs><pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#cfd2d8"/><rect width="10" height="10" fill="#9aa0ab"/><rect x="10" y="10" width="10" height="10" fill="#9aa0ab"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`);
const comps = [];
for (let i = 0; i < done.length; i++) {
  const img = await sharp(path.join(out, done[i] + ".webp")).resize({ width: cell - 12, height: cell - 28, fit: "inside" }).png().toBuffer();
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="22"><rect width="100%" height="100%" fill="rgba(0,0,0,.65)"/><text x="6" y="16" font-family="Arial" font-size="13" fill="#fff">${done[i]}</text></svg>`);
  const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
  comps.push({ input: img, left: x + 6, top: y + 4 }, { input: label, left: x, top: y + cell - 22 });
}
await sharp(checker).composite(comps).png().toFile(path.join(out, "contact.png"));
console.log("확인용 모아보기:", path.join(out, "contact.png"));
