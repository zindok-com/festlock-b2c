// 누끼(faces-src/<fest>/cut/<id>.webp)마다 "머리가 가로로 어디쯤인지"(0~100)를 계산해 src/fest/cutFocus.ts 에 적는다.
// 듀오톤 카드가 좁은 열에서 사진을 크게 보여 줄 때 옆을 잘라 내는데, 그때 얼굴이 잘리지 않게 이 값을 기준으로 자른다.
//   node scripts/make-cut-focus.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = "faces-src";
const out = {};
for (const fest of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, fest, "cut");
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".webp"))) {
    const id = f.replace(/\.webp$/, "");
    const { data, info } = await sharp(path.join(dir, f)).resize({ width: 96 }).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    let top = -1, bot = -1;
    for (let y = 0; y < H; y++) {
      let any = false;
      for (let x = 0; x < W; x++) if (data[y * W + x] > 60) { any = true; break; }
      if (any) { if (top < 0) top = y; bot = y; }
    }
    if (top < 0) continue;
    const zone = Math.max(3, Math.round((bot - top) * 0.2)); // 머리가 있는 위쪽 20%
    let sum = 0, wsum = 0;
    for (let y = top; y < Math.min(H, top + zone); y++) for (let x = 0; x < W; x++) { const a = data[y * W + x]; if (a > 60) { sum += x * a; wsum += a; } }
    if (!wsum) continue;
    const fx = Math.round((sum / wsum / W) * 100);
    out[fest] ??= {};
    if (Math.abs(fx - 50) >= 3) out[fest][id] = fx; // 거의 가운데면 적지 않는다
  }
}
let ts = "// 자동 생성 (node scripts/make-cut-focus.mjs). 누끼마다 머리의 가로 위치(0~100, 가운데=50). 가운데에서 3 이내면 적지 않는다.\n";
ts += "export const CUT_FOCUS: Record<string, Record<string, number>> = {\n";
for (const [fest, m] of Object.entries(out)) ts += `  ${fest}: { ${Object.entries(m).sort().map(([k, v]) => `"${k}": ${v}`).join(", ")} },\n`;
ts += "};\n";
fs.writeFileSync("src/fest/cutFocus.ts", ts);
console.log("완료:", Object.entries(out).map(([k, m]) => k + " " + Object.keys(m).length + "개").join(", "));
