// B2B(두 사람이 번갈아 트는 한 칸) 사진 만들기: 두 사람 사진 → 프로필 두 장 + 누끼 두 명 합성 이미지 (규칙은 src/fest/b2b.ts 맨 위)
//   node scripts/make-b2b.mjs --fest tml --id artbat-b2b-r3hab --a <A 사진> --b <B 사진> --lib <@imgly/background-removal-node 를 설치한 폴더> [--out <폴더>] [--no-register]
// 결과(--out, 기본 faces-src/<fest>/b2b/):
//   <id>-a.webp  <id>-b.webp   프로필 사진(정사각 420px)
//   <id>-cut.webp              두 사람 누끼를 나란히 붙인 투명 이미지 (두 번째 사람이 앞, 가운데가 살짝 겹침)
//   _tmp/                      각자 누끼·미리보기 (올라가지 않는다. 눈으로 확인용: _tmp/<id>-preview.png)
// 그다음: node scripts/upload-cutouts.mjs <fest>   (Blob 의 artists/<fest>/b2b/ 에 올림)
// 기본으로 src/fest/b2b.ts 의 B2B_READY 목록에도 id 를 넣는다 (--no-register 로 끔). 올리기 전에 켜면 사진이 아직 없는 주소를 부르니, 올린 뒤에 배포하면 된다.
// 사진 주의: 두 사람이 함께 찍힌 사진은 이 스크립트를 쓰지 않고 평소처럼 <fest>/<id>.webp 로 올리면 그대로 쓴다.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const args = process.argv.slice(2);
const val = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const fest = val("--fest"), id = val("--id"), a = val("--a"), b = val("--b"), lib = val("--lib");
const out = val("--out", fest ? `faces-src/${fest}/b2b` : "");
if (!fest || !id || !a || !b || !lib) {
  console.error("사용법: node scripts/make-b2b.mjs --fest tml --id artbat-b2b-r3hab --a <A 사진> --b <B 사진> --lib <폴더> [--out <폴더>] [--no-register]");
  process.exit(1);
}
for (const f of [a, b]) if (!fs.existsSync(f)) { console.error("파일이 없어요:", f); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const tmp = path.join(out, "_tmp");
fs.mkdirSync(tmp, { recursive: true });

// 1) 프로필 사진
for (const [k, f] of [["a", a], ["b", b]]) {
  await sharp(f).rotate().resize(420, 420, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 82 }).toFile(path.join(out, `${id}-${k}.webp`));
}

// 2) 각자 누끼 (make-cutouts.mjs: 투명 배경, 높이 420px)
const mapFile = path.join(tmp, "map.json");
fs.writeFileSync(mapFile, JSON.stringify({ [`${id}-a`]: path.resolve(a), [`${id}-b`]: path.resolve(b) }));
const r = spawnSync(process.execPath, ["scripts/make-cutouts.mjs", "--map", mapFile, "--out", tmp, "--lib", lib], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);

// 3) 두 명 합성: 높이를 맞추고, 가운데를 폭의 30% 겹쳐서 두 번째 사람이 앞에 오게
const H = 420;
const pa = await sharp(path.join(tmp, `${id}-a.webp`)).resize({ height: H }).png().toBuffer();
const pb = await sharp(path.join(tmp, `${id}-b.webp`)).resize({ height: H }).png().toBuffer();
const wa = (await sharp(pa).metadata()).width, wb = (await sharp(pb).metadata()).width;
const overlap = Math.round(Math.min(wa, wb) * 0.3);
const W = wa + wb - overlap;
const pair = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: pa, left: 0, top: 0 }, { input: pb, left: wa - overlap, top: 0 }])
  .webp({ quality: 85, alphaQuality: 90 })
  .toBuffer();
fs.writeFileSync(path.join(out, `${id}-cut.webp`), pair);

// 확인용 미리보기 (체크무늬 바탕에 합성본 + 프로필 두 장)
const checker = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W + 460}" height="${H}"><defs><pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#cfd2d8"/><rect width="10" height="10" fill="#9aa0ab"/><rect x="10" y="10" width="10" height="10" fill="#9aa0ab"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`);
const prof = await Promise.all(["a", "b"].map((k) => sharp(path.join(out, `${id}-${k}.webp`)).resize(220, 220).png().toBuffer()));
await sharp(checker)
  .composite([{ input: await sharp(pair).png().toBuffer(), left: 0, top: 0 }, { input: prof[0], left: W + 6, top: 6 }, { input: prof[1], left: W + 232, top: 6 }])
  .png()
  .toFile(path.join(tmp, `${id}-preview.png`));
console.log(`만들었어요: ${out}/${id}-a.webp, ${id}-b.webp, ${id}-cut.webp  (미리보기: ${tmp}/${id}-preview.png)`);

// 4) b2b.ts 의 B2B_READY 에 등록
if (!args.includes("--no-register")) {
  const p = "src/fest/b2b.ts";
  const raw = fs.readFileSync(p, "utf8");
  const crlf = raw.includes("\r\n");
  let s = raw.split("\r\n").join("\n");
  const re = new RegExp(`(  ${fest}: new Set<string>\\(\\[)([^\\]]*)(\\]\\),)`);
  if (!re.test(s)) console.error(`b2b.ts 에서 ${fest} 목록을 못 찾았어요. 직접 B2B_READY 에 "${id}" 를 넣어 주세요.`);
  else {
    s = s.replace(re, (m, head, body, tail) => {
      const ids = body.split(",").map((x) => x.trim()).filter(Boolean);
      if (!ids.includes(JSON.stringify(id))) ids.push(JSON.stringify(id));
      return head + ids.join(", ") + tail;
    });
    fs.writeFileSync(p, crlf ? s.split("\n").join("\r\n") : s);
    console.log(`b2b.ts 의 B2B_READY.${fest} 에 "${id}" 를 넣었어요.`);
  }
}
