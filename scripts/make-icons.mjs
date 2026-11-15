// 앱 아이콘(홈 화면 추가용) 만들기: FestLock 휴대폰 모양을 SVG 로 그려서 PNG 로 내보낸다.
//   node scripts/make-icons.mjs        → public/icons/icon-192.png · icon-512.png · icon-maskable-512.png · apple-touch-icon.png (180)
// 가로 로고(festlock-logo.webp)는 아이콘으로 쓰기엔 글자가 작아서, 휴대폰 모양만 따로 그렸다. 디자인을 바꾸면 이 파일만 고치고 다시 실행한다.
import fs from "node:fs";
import sharp from "sharp";

const BG = "#0b0b14";
/** safe: 아이콘 안에서 휴대폰이 차지하는 비율 (maskable 은 가장자리가 잘리므로 더 작게) */
function svg(size, safe, round) {
  const ph = size * safe, pw = ph * 0.58; // 휴대폰 높이·폭
  const x = (size - pw) / 2, y = (size - ph) / 2;
  const r = pw * 0.2, sw = pw * 0.06; // 둥근 모서리, 테두리 굵기
  const pad = pw * 0.12, gap = pw * 0.06;
  const iw = pw - pad * 2, ih = ph - pad * 2;
  const cw = (iw - gap) / 2; // 칸 폭
  const col = (cx, rows) => {
    let yy = y + pad, out = "";
    for (const [h, c] of rows) {
      const hh = (ih - gap * (rows.length - 1)) * h;
      out += `<rect x="${cx}" y="${yy}" width="${cw}" height="${hh}" rx="${cw * 0.18}" fill="${c}"/>`;
      yy += hh + gap;
    }
    return out;
  };
  const left = col(x + pad, [[0.26, "#ffc93c"], [0.46, "#ff4fa0"], [0.28, "#5be15b"]]);
  const right = col(x + pad + cw + gap, [[0.42, "#19c6e8"], [0.32, "#a96bff"], [0.26, "#ffb52b"]]);
  const rect = round ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${BG}"/>` : `<rect width="${size}" height="${size}" fill="${BG}"/>`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rect}` +
      `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="${r}" fill="none" stroke="#fff" stroke-width="${sw}"/>${left}${right}</svg>`,
  );
}

fs.mkdirSync("public/icons", { recursive: true });
const jobs = [
  ["icon-192.png", 192, 0.7, false],
  ["icon-512.png", 512, 0.7, false],
  ["icon-maskable-512.png", 512, 0.52, false], // 안전 영역(가운데 80%) 안에 들어오게
  ["apple-touch-icon.png", 180, 0.7, false], // iOS 가 알아서 모서리를 둥글게 한다
];
for (const [name, size, safe, round] of jobs) {
  await sharp(svg(size, safe, round), { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile("public/icons/" + name);
  console.log("public/icons/" + name, size + "px");
}
