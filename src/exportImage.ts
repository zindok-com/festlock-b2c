// 배경화면 이미지(캔버스). 이름·무대·시간 + (private만) 얼굴 사진. 장르·회사 표기는 넣지 않는다.
// 그날 전체 라인업을 그리고, 고른 아티스트는 무대 색, 안 고른 아티스트는 흑백·회색으로 그린다.
import { faceSrc } from "./config";
import { DAYS, STAGES, fmt, type Day, type Item } from "./data";

export interface FaceImg { color: CanvasImageSource; gray: CanvasImageSource; w: number; h: number }
const faceCache = new Map<string, Promise<FaceImg | null>>();

function toGray(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const v = p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114;
    p[i] = p[i + 1] = p[i + 2] = v;
  }
  x.putImageData(d, 0, 0);
  return c;
}

function loadFace(id: string): Promise<FaceImg | null> {
  const src = faceSrc(id);
  if (!src) return Promise.resolve(null);
  let p = faceCache.get(id);
  if (!p) {
    p = new Promise((res) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Blob(다른 주소) 사진을 캔버스로 읽으려면 필요
      img.decoding = "async";
      img.onload = () => {
        try { res({ color: img, gray: toGray(img), w: img.naturalWidth, h: img.naturalHeight }); }
        catch { res(null); }
      };
      img.onerror = () => res(null);
      img.src = src;
    });
    faceCache.set(id, p);
  }
  return p;
}

/** 사진을 미리 불러온다(없으면 빈 맵). 최대 4초까지만 기다린다. */
export async function loadFaces(ids: string[]): Promise<Map<string, FaceImg>> {
  const m = new Map<string, FaceImg>();
  const all = Promise.all(ids.map(async (id) => { const f = await loadFace(id); if (f) m.set(id, f); }));
  await Promise.race([all, new Promise((r) => setTimeout(r, 4000))]);
  return m;
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

export type Ratio = "story" | "phone";
export const RATIOS: Record<Ratio, { h: number; tag: string }> = {
  story: { h: 1920, tag: "story" },
  phone: { h: 2280, tag: "phone" },
};
const W = 1080;
const FONT = '"Rubik","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif';

export function ensureFonts(): Promise<void> {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const jobs = [
    document.fonts.load('900 40px "Rubik"', "EDC"),
    document.fonts.load('800 40px "Rubik"', "EDC"),
    document.fonts.load('700 40px "Rubik"', "EDC"),
    document.fonts.load('600 40px "Rubik"', "EDC"),
    document.fonts.load('500 40px "Rubik"', "EDC"),
    document.fonts.load('700 40px "Noto Sans KR"', "겹침 이동 여유"),
  ];
  return Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 2000))])
    .then(() => undefined)
    .catch(() => undefined);
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function glow(ctx: CanvasRenderingContext2D, H: number, x: number, y: number, r: number, rgb: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "rgba(" + rgb + "," + a + ")"); g.addColorStop(1, "rgba(" + rgb + ",0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function drawBg(ctx: CanvasRenderingContext2D, H: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1d0b45"); g.addColorStop(0.55, "#120730"); g.addColorStop(1, "#080417");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glow(ctx, H, 120, 200, 720, "255,79,160", 0.26);
  glow(ctx, H, 990, 760, 620, "56,217,255", 0.15);
  glow(ctx, H, 180, H * 0.82, 720, "168,107,255", 0.24);
  glow(ctx, H, 920, H - 20, 620, "255,201,51", 0.13);
}

/** 상단 텍스트 축소: "EDC KOREA 2026 ······ Day 1 (SAT)" 한 줄 + 밑줄. 높이 약 100px */
function drawHeaderCompact(ctx: CanvasRenderingContext2D, top: number, d: Day) {
  const x0 = 60, x1 = 1020;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = "900 60px " + FONT;
  const title = "EDC KOREA 2026", tw = ctx.measureText(title).width;
  const g = ctx.createLinearGradient(x0, 0, x0 + tw, 0);
  g.addColorStop(0, "#ffc933"); g.addColorStop(0.6, "#ff5fa8"); g.addColorStop(1, "#b388ff");
  ctx.fillStyle = g; ctx.fillText(title, x0, top + 62);
  ctx.textAlign = "right";
  ctx.fillStyle = "#f3efff"; ctx.font = "800 42px " + FONT;
  const n = DAYS.findIndex((x) => x.id === d.id) + 1;
  ctx.fillText("Day " + n + " (" + d.full.slice(0, 3) + ")", x1, top + 60);
  ctx.fillStyle = "rgba(243,239,255,.9)";
  ctx.fillRect(x0, top + 88, x1 - x0, 4);
}

function drawHeader(ctx: CanvasRenderingContext2D, top: number, d: Day, n: number) {
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const g = ctx.createLinearGradient(220, 0, 860, 0);
  g.addColorStop(0, "#ffc933"); g.addColorStop(0.6, "#ff5fa8"); g.addColorStop(1, "#b388ff");
  ctx.fillStyle = g; ctx.font = "900 84px " + FONT; ctx.fillText("EDC KOREA 2026", W / 2, top + 80);
  ctx.fillStyle = "#f3efff"; ctx.font = "700 40px " + FONT; ctx.fillText(d.full + " · " + d.date, W / 2, top + 140);
  ctx.fillStyle = "rgba(243,239,255,.62)"; ctx.font = "500 28px " + FONT;
  ctx.fillText("MY LINEUP · " + n + " ARTISTS", W / 2, top + 186);
}

function wrapWords(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] | null {
  const words = text.split(" "), lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (ctx.measureText(w).width > maxW) return null;
    const t = cur ? cur + " " + w : w;
    if (ctx.measureText(t).width <= maxW) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawBlockText(ctx: CanvasRenderingContext2D, name: string, time: string, x: number, y: number, w: number, h: number, ink = "#140a2e", ink2 = "rgba(20,10,46,.72)") {
  const pad = 9, iw = w - pad * 2, ih = h - pad * 2;
  let ok: { size: number; lines: string[]; lh: number; ts: number; time: boolean } | null = null;
  for (let wt = 0; wt < 2 && !ok; wt++) {
    for (let size = 26; size >= 13; size--) {
      ctx.font = "800 " + size + "px " + FONT;
      const lines = wrapWords(ctx, name, iw);
      if (!lines) continue;
      const lh = size * 1.15, ts = Math.max(13, Math.round(size * 0.66));
      const need = lines.length * lh + (wt === 0 ? 4 + ts : 0);
      if (need <= ih) { ok = { size, lines, lh, ts, time: wt === 0 }; break; }
    }
  }
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  if (!ok) {
    ctx.font = "800 13px " + FONT; ctx.fillStyle = ink;
    let nm = name;
    while (nm.length > 1 && ctx.measureText(nm + "…").width > iw) nm = nm.slice(0, -1);
    ctx.fillText(nm === name ? nm : nm + "…", x + pad, y + Math.max(3, (h - 13) / 2));
    return;
  }
  ctx.font = "800 " + ok.size + "px " + FONT; ctx.fillStyle = ink;
  let yy = y + pad;
  for (const line of ok.lines) { ctx.fillText(line, x + pad, yy); yy += ok.lh; }
  if (ok.time) {
    ctx.font = "600 " + ok.ts + "px " + FONT; ctx.fillStyle = ink2;
    ctx.fillText(time, x + pad, yy + 4);
  }
}

/** 사진 블록: 사진이 칸 전체(cover), 시간은 위, 이름은 아래 그라데이션 위 */
function drawPhotoBlock(ctx: CanvasRenderingContext2D, it: Item, on: boolean, face: FaceImg, color: string, x: number, y: number, w: number, h: number) {
  const base = on ? color : "#2b2542";
  ctx.save();
  rr(ctx, x, y, w, h, 12); ctx.clip();
  ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
  // cover: 칸 비율에 맞게 자르되 얼굴이 위쪽에 있으니 위에서 25% 지점 기준
  const s = Math.max(w / face.w, h / face.h), sw = w / s, sh = h / s;
  const sx = (face.w - sw) / 2, sy = (face.h - sh) * 0.25;
  ctx.drawImage(on ? face.color : face.gray, sx, sy, sw, sh, x, y, w, h);
  if (!on) { ctx.fillStyle = "rgba(13,7,34,.5)"; ctx.fillRect(x, y, w, h); }

  const pad = w < 120 ? 6 : 9, iw = w - pad * 2, ts = Math.max(w < 120 ? 11 : 13, Math.min(19, Math.round(h * 0.13)));
  const room = h - pad * 2 - (ts + 12);
  let fit: { size: number; lines: string[]; lh: number } | null = null;
  for (let size = 26; size >= 13 && !fit; size--) {
    ctx.font = "800 " + size + "px " + FONT;
    const lines = wrapWords(ctx, it.name, iw);
    if (lines && lines.length * size * 1.12 <= room) fit = { size, lines, lh: size * 1.12 };
  }
  if (!fit) {
    ctx.font = "800 13px " + FONT;
    let nm = it.name;
    while (nm.length > 1 && ctx.measureText(nm + "…").width > iw) nm = nm.slice(0, -1);
    fit = { size: 13, lines: [nm === it.name ? nm : nm + "…"], lh: 14.5 };
  }
  const textH = fit.lines.length * fit.lh;
  const capH = Math.min(h, textH + pad * 2 + 34);
  const g = ctx.createLinearGradient(0, y + h - capH, 0, y + h);
  g.addColorStop(0, on ? rgba(color, 0) : "rgba(43,37,66,0)");
  g.addColorStop(0.5, on ? rgba(color, 0.96) : "rgba(43,37,66,.96)");
  g.addColorStop(1, base);
  ctx.fillStyle = g; ctx.fillRect(x, y + h - capH, w, capH);

  // 시간(위)
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.font = "700 " + ts + "px " + FONT;
  const time = fmt(it.s) + "–" + fmt(it.e), tw = ctx.measureText(time).width;
  ctx.fillStyle = on ? "rgba(10,5,25,.62)" : "rgba(10,5,25,.5)";
  rr(ctx, x + 6, y + 6, Math.min(tw + 12, w - 12), ts + 8, 7); ctx.fill();
  ctx.fillStyle = on ? "#ffffff" : "rgba(243,239,255,.6)";
  ctx.fillText(time, x + 12, y + 10);

  // 이름(아래)
  ctx.font = "800 " + fit.size + "px " + FONT;
  ctx.fillStyle = on ? "#140a2e" : "rgba(243,239,255,.6)";
  let yy = y + h - pad - textH;
  for (const line of fit.lines) { ctx.fillText(line, x + pad, yy); yy += fit.lh; }
  ctx.restore();
}

/** 표 옵션: 가로 범위(x0~x1), 왼쪽 시간축 표시, 시간 범위(분) 고정. 기본값은 한 장에 하루 */
interface TableOpt { x0?: number; x1?: number; axis?: boolean; range?: [number, number]; colGap?: number; maxPpm?: number }

/** 글자가 maxW 안에 들어가도록 크기를 줄인다 */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: string): number {
  for (; size > 10; size--) {
    ctx.font = weight + " " + size + "px " + FONT;
    if (ctx.measureText(text).width <= maxW) break;
  }
  return size;
}

function drawTable(ctx: CanvasRenderingContext2D, H: number, list: Item[], sel: Set<string>, faces: Map<string, FaceImg>, cy0: number, cy1: number, opt: TableOpt = {}) {
  let minS = Infinity, maxE = -Infinity;
  list.forEach((it) => { if (it.s < minS) minS = it.s; if (it.e > maxE) maxE = it.e; });
  minS = Math.floor(minS / 60) * 60; maxE = Math.ceil(maxE / 60) * 60;
  if (opt.range) [minS, maxE] = opt.range;
  if (maxE - minS < 180) maxE = minS + 180;
  const showAxis = opt.axis !== false;
  const axisX = 60, colX0 = opt.x0 ?? 160, right = opt.x1 ?? 1020, colGap = opt.colGap ?? 8;
  const colW = (right - colX0 - colGap * (STAGES.length - 1)) / STAGES.length;
  const headH = 84, gy0 = cy0 + headH, avail = cy1 - gy0;
  const ppm = Math.min(opt.maxPpm ?? 3.4 * (H / 1920), avail / (maxE - minS)), gy1 = gy0 + (maxE - minS) * ppm;

  ctx.textBaseline = "alphabetic"; ctx.textAlign = "center";
  STAGES.forEach((st, si) => {
    const x = colX0 + si * (colW + colGap);
    ctx.fillStyle = "rgba(255,255,255,.045)"; rr(ctx, x, gy0, colW, gy1 - gy0, 14); ctx.fill();
    ctx.fillStyle = "rgba(243,239,255,.6)"; fitFont(ctx, st.line1, colW - 6, 22, "800"); ctx.fillText(st.line1, x + colW / 2, cy0 + 30);
    ctx.fillStyle = st.color; fitFont(ctx, st.line2, colW - 6, 27, "800"); ctx.fillText(st.line2, x + colW / 2, cy0 + 62);
    ctx.fillRect(x + 10, cy0 + 72, colW - 20, 4);
  });
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let m = minS; m <= maxE; m += 60) {
    const y = gy0 + (m - minS) * ppm;
    ctx.strokeStyle = "rgba(255,255,255,.10)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(showAxis ? axisX + 56 : colX0, y); ctx.lineTo(right, y); ctx.stroke();
    if (showAxis) { ctx.fillStyle = "rgba(243,239,255,.65)"; ctx.font = "600 24px " + FONT; ctx.fillText(fmt(m), axisX + 48, y); }
  }
  list.forEach((it) => {
    const st = STAGES[it.si], x = colX0 + it.si * (colW + colGap);
    const s0 = Math.max(it.s, minS), e0 = Math.min(it.e, maxE);
    if (e0 <= s0) return;
    const y = gy0 + (s0 - minS) * ppm + 1, h = (e0 - s0) * ppm - 2;
    const on = sel.has(it.id), face = faces.get(it.id);
    if (face) { drawPhotoBlock(ctx, it, on, face, st.color, x, y, colW, h); return; }
    ctx.fillStyle = on ? st.color : "rgba(255,255,255,.07)"; rr(ctx, x, y, colW, h, 12); ctx.fill();
    const time = fmt(it.s) + "–" + fmt(it.e);
    if (on) drawBlockText(ctx, it.name, time, x, y, colW, h);
    else drawBlockText(ctx, it.name, time, x, y, colW, h, "rgba(243,239,255,.42)", "rgba(243,239,255,.3)");
  });
}

/** all = 그날 전체 라인업, sel = 고른 id */
export function renderExportCanvas(d: Day, all: Item[], sel: Set<string>, faces: Map<string, FaceImg>, ratio: Ratio, lock: boolean, compact = false): HTMLCanvasElement {
  const H = RATIOS[ratio].h;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  drawBg(ctx, H);
  const top = lock ? Math.round(H * 0.245) : compact ? 80 : 110, bottom = lock ? Math.round(H * 0.135) : 120;
  // 축소 헤더는 약 112px, 기본 헤더는 240px → 남는 높이만큼 라인업 카드가 길어진다
  const headerH = compact ? 112 : 240;
  if (compact) drawHeaderCompact(ctx, top, d);
  else drawHeader(ctx, top, d, all.filter((i) => sel.has(i.id)).length);
  drawTable(ctx, H, all, sel, faces, top + headerH, H - bottom);
  return cv;
}

/** 토+일 좌우: 왼쪽에 시간축 하나, 토·일 표가 나란히. 두 날이 같은 시간 범위를 쓴다 */
function drawSideBySide(ctx: CanvasRenderingContext2D, H: number, all: Item[], sel: Set<string>, faces: Map<string, FaceImg>, days: Day[], lock: boolean, compact: boolean) {
  const n = all.filter((i) => sel.has(i.id)).length;
  const top = lock ? Math.round(H * 0.245) : compact ? 50 : 70, bottom = lock ? Math.round(H * 0.135) : 90;
  const grad = (x0: number, w: number) => {
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, "#ffc933"); g.addColorStop(0.6, "#ff5fa8"); g.addColorStop(1, "#b388ff");
    return g;
  };
  ctx.textBaseline = "alphabetic";
  let y0: number;
  if (compact) {
    // 왼쪽 로고 한 줄 + 밑줄
    ctx.textAlign = "left"; ctx.font = "900 46px " + FONT;
    const tw = ctx.measureText("EDC KOREA 2026").width;
    ctx.fillStyle = grad(60, tw); ctx.fillText("EDC KOREA 2026", 60, top + 46);
    ctx.fillStyle = "rgba(243,239,255,.9)"; ctx.fillRect(60, top + 62, 960, 3);
    y0 = top + 80;
  } else {
    ctx.textAlign = "center"; ctx.font = "900 72px " + FONT;
    ctx.fillStyle = grad(240, 600); ctx.fillText("EDC KOREA 2026", W / 2, top + 70);
    ctx.fillStyle = "rgba(243,239,255,.62)"; ctx.font = "500 26px " + FONT;
    ctx.fillText("MY LINEUP · " + n + " ARTISTS", W / 2, top + 112);
    y0 = top + 140;
  }
  // 두 날 고른 세트를 모두 덮는 시간 범위 (정시 단위)
  const picked = all.filter((i) => sel.has(i.id));
  const a = Math.floor(Math.min(...picked.map((i) => i.s)) / 60) * 60;
  const b = Math.ceil(Math.max(...picked.map((i) => i.e)) / 60) * 60;
  const cols: [number, number][] = [[116, 556], [584, 1020]];
  days.forEach((d, k) => {
    const [x0, x1] = cols[k];
    const list = all.filter((i) => i.day === d.id && i.e > a && i.s < b);
    const dn = DAYS.findIndex((x) => x.id === d.id) + 1;
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#f3efff";
    const label = compact ? "Day " + dn + " (" + d.full.slice(0, 3) + ")" : "Day " + dn + " · " + d.full.slice(0, 3) + " · " + d.date;
    fitFont(ctx, label, x1 - x0, 30, "800");
    ctx.fillText(label, x0, y0 + 32);
    drawTable(ctx, H, list, sel, faces, y0 + 48, H - bottom, { x0, x1, axis: k === 0, range: [a, b], colGap: 5, maxPpm: Infinity });
  });
}

/** 토+일 한 장 (스토리용). 고른 아티스트가 있는 날만, 각 날은 고른 시간대만 위아래로 그린다 */
export function renderBothCanvas(all: Item[], sel: Set<string>, faces: Map<string, FaceImg>, ratio: Ratio, lock: boolean, compact = false, layout: "stack" | "side" = "stack"): HTMLCanvasElement {
  const H = RATIOS[ratio].h;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  drawBg(ctx, H);

  const days = DAYS.filter((d) => all.some((i) => i.day === d.id && sel.has(i.id)));
  // 좌우: 두 날 모두 고른 게 있을 때만 (한쪽만 있으면 위아래와 같다)
  if (layout === "side" && days.length === 2) {
    drawSideBySide(ctx, H, all, sel, faces, days, lock, compact);
    return cv;
  }
  const n = all.filter((i) => sel.has(i.id)).length;
  const top = lock ? Math.round(H * 0.245) : compact ? 50 : 70, bottom = lock ? Math.round(H * 0.135) : 90;

  // 짧은 헤더 (축소면 생략하고, 날마다 왼쪽 로고 + 오른쪽 Day 한 줄로 대신한다)
  if (!compact) {
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const g = ctx.createLinearGradient(240, 0, 840, 0);
  g.addColorStop(0, "#ffc933"); g.addColorStop(0.6, "#ff5fa8"); g.addColorStop(1, "#b388ff");
  ctx.fillStyle = g; ctx.font = "900 72px " + FONT; ctx.fillText("EDC KOREA 2026", W / 2, top + 70);
  ctx.fillStyle = "rgba(243,239,255,.62)"; ctx.font = "500 26px " + FONT;
  ctx.fillText("MY LINEUP · " + n + " ARTISTS", W / 2, top + 112);
  }

  const y0 = compact ? top : top + 140, gap = compact ? 30 : 36;
  const secH = (H - bottom - y0 - gap * (days.length - 1)) / Math.max(1, days.length);
  days.forEach((d, k) => {
    const sy = y0 + k * (secH + gap);
    const picked = all.filter((i) => i.day === d.id && sel.has(i.id));
    // 고른 세트가 걸친 시간대만 (정시 단위)
    const a = Math.floor(Math.min(...picked.map((i) => i.s)) / 60) * 60;
    const b = Math.ceil(Math.max(...picked.map((i) => i.e)) / 60) * 60;
    const list = all.filter((i) => i.day === d.id && i.e > a && i.s < b);
    const dn = DAYS.findIndex((x) => x.id === d.id) + 1;
    ctx.textBaseline = "alphabetic";
    if (compact) {
      // 왼쪽 EDC KOREA 2026 로고 글자, 오른쪽 Day N (SAT), 아래 밑줄
      ctx.textAlign = "left"; ctx.font = "900 46px " + FONT;
      const tw = ctx.measureText("EDC KOREA 2026").width;
      const lg = ctx.createLinearGradient(60, 0, 60 + tw, 0);
      lg.addColorStop(0, "#ffc933"); lg.addColorStop(0.6, "#ff5fa8"); lg.addColorStop(1, "#b388ff");
      ctx.fillStyle = lg; ctx.fillText("EDC KOREA 2026", 60, sy + 46);
      ctx.textAlign = "right"; ctx.fillStyle = "#f3efff"; ctx.font = "800 34px " + FONT;
      ctx.fillText("Day " + dn + " (" + d.full.slice(0, 3) + ")", 1020, sy + 44);
      ctx.fillStyle = "rgba(243,239,255,.9)"; ctx.fillRect(60, sy + 62, 960, 3);
      drawTable(ctx, H, list, sel, faces, sy + 74, sy + secH);
    } else {
      ctx.textAlign = "left";
      ctx.fillStyle = "#f3efff"; ctx.font = "800 32px " + FONT;
      ctx.fillText("Day " + dn + " · " + d.full + " · " + d.date, 60, sy + 34);
      drawTable(ctx, H, list, sel, faces, sy + 50, sy + secH);
    }
  });
  return cv;
}

export function fileName(day: string, ratio: Ratio): string {
  return "EDC-Korea-2026-" + day + "-" + RATIOS[ratio].tag + ".png";
}
