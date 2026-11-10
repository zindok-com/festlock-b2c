// 새 페스티벌 배경화면 이미지(캔버스). 그날(그 스테이지) 전체를 그리고, 고른 공연만 색으로, 나머지는 흐리게.
import { festFace } from "./faces";
import { fmt, timeText, type FDay, type FItem, type FStage } from "./types";

export type Ratio = "story" | "phone";
export const RATIO_H: Record<Ratio, number> = { story: 1920, phone: 2280 };
const W = 1080;
export const SANS = '"Rubik","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif';
const KR = '"Noto Sans KR","Rubik","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif';
const BAGEL = '"Bagel Fat One","Noto Sans KR",system-ui,sans-serif';

export interface Img { color: CanvasImageSource; gray: CanvasImageSource; w: number; h: number }
const cache = new Map<string, Promise<Img | null>>();

function toGray(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) p[i] = p[i + 1] = p[i + 2] = p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114;
  x.putImageData(d, 0, 0);
  return c;
}

function loadOne(src: string): Promise<Img | null> {
  let p = cache.get(src);
  if (!p) {
    p = new Promise((res) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Blob(다른 주소) 사진을 캔버스로 읽으려면 필요
      img.decoding = "async";
      img.onload = () => {
        try {
          res({ color: img, gray: toGray(img), w: img.naturalWidth, h: img.naturalHeight });
        } catch {
          res(null);
        }
      };
      img.onerror = () => res(null);
      img.src = src;
    });
    cache.set(src, p);
  }
  return p;
}

/** 사진을 미리 불러온다 (id → 이미지). 최대 4초 */
export async function loadPhotos(fest: string, ids: (string | undefined)[]): Promise<Map<string, Img>> {
  const m = new Map<string, Img>();
  const jobs = ids.map(async (id) => {
    const src = festFace(fest, id);
    if (!src || !id) return;
    const f = await loadOne(src);
    if (f) m.set(id, f);
  });
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 4000))]);
  return m;
}

// ---------------------------------------------------------------------
// FestLock 표시 (배경화면 안의 작은 로고)
// ---------------------------------------------------------------------
let brandIcon: HTMLImageElement | null = null;
function loadBrandIcon(): Promise<void> {
  if (brandIcon) return Promise.resolve();
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      brandIcon = img;
      res();
    };
    img.onerror = () => res();
    img.src = "/event/festlock.webp";
  });
}

/**
 * 배경화면 부제 줄의 후킹 문구 (짧게). 사이트 언어가 한국어일 때만 한글, 그 밖(영어·일본어·중국어)은 영어(Make your timetable).
 * 사이트 언어는 사용자가 고른 언어 → 없으면 폰 언어 순서로 정해진다(i18n detect)
 */
function hookText(): string {
  return typeof document !== "undefined" && document.documentElement.lang === "ko" ? "나만의 타임테이블" : "Make your timetable";
}

/**
 * 부제 줄: 왼쪽 후킹 문구 · 가운데 글자 · 오른쪽 FestLock 로고.
 * center가 null이면 후킹 문구와 로고를 가운데에 나란히 놓는다.
 * dark = 밝은 배경(그랜드 민트)
 */
export function tagRow(ctx: CanvasRenderingContext2D, cy: number, center: string | null, dark: boolean, size = 26, color?: string) {
  const ink = dark ? "#3a2533" : "#ffffff";
  ctx.save();
  ctx.textBaseline = "middle";
  // 후킹 문구 칩
  ctx.font = "900 " + size + "px " + KR;
  const hook = hookText();
  const hw = ctx.measureText(hook).width + size * 1.1, hh = size * 1.6;
  // 로고 (아이콘 + FestLock)
  const is = Math.round(size * 1.45);
  ctx.font = "800 " + Math.round(size * 1.1) + "px " + SANS;
  const lw = is + 10 + ctx.measureText("FestLock").width;
  const xs = center == null ? (W - (hw + 26 + lw)) / 2 : 50;
  const xl = center == null ? xs + hw + 26 : W - 50 - lw;
  // 칩
  ctx.save();
  ctx.translate(xs + hw / 2, cy);
  ctx.rotate(-0.025);
  ctx.fillStyle = dark ? "#fff3a8" : "#0b0b14";
  rr(ctx, -hw / 2, -hh / 2, hw, hh, 8);
  ctx.fill();
  if (dark) {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#3a2533";
    ctx.stroke();
  }
  ctx.fillStyle = dark ? "#3a2533" : "#d6f43c";
  ctx.textAlign = "center";
  ctx.font = "900 " + size + "px " + KR;
  ctx.fillText(hook, 0, 2);
  ctx.restore();
  // 로고
  if (brandIcon) {
    ctx.save();
    rr(ctx, xl, cy - is / 2, is, is, is * 0.24);
    ctx.clip();
    ctx.drawImage(brandIcon, xl, cy - is / 2, is, is);
    ctx.restore();
  }
  ctx.textAlign = "left";
  ctx.font = "800 " + Math.round(size * 1.1) + "px " + SANS;
  ctx.fillStyle = ink;
  ctx.fillText("Fest", xl + is + 10, cy + 1);
  ctx.fillStyle = "#ff4fa0";
  ctx.fillText("Lock", xl + is + 10 + ctx.measureText("Fest").width, cy + 1);
  // 가운데 글자
  if (center != null) {
    ctx.textAlign = "center";
    ctx.fillStyle = color ?? ink;
    const room = Math.min(xl - (xs + hw) - 40, W - 2 * Math.max(xs + hw, W - xl) - 40);
    fitFont(ctx, center, room, Math.round(size * 1.3), "800");
    ctx.fillText(center, W / 2, cy + 1);
  }
  ctx.restore();
}

export function ensureFonts(extra: string[] = []): Promise<void> {
  void loadBrandIcon();
  if (!document.fonts?.load) return loadBrandIcon();
  const jobs = [
    document.fonts.load('900 40px "Rubik"', "NOL"),
    document.fonts.load('800 40px "Rubik"', "NOL"),
    document.fonts.load('700 40px "Rubik"', "NOL"),
    document.fonts.load('900 40px "Noto Sans KR"', "그랜드 민트"),
    document.fonts.load('700 40px "Noto Sans KR"', "그랜드 민트"),
    ...extra.map((f) => document.fonts.load(f, "Grand Mint 그랜드")),
  ];
  return Promise.race([Promise.all([...jobs, loadBrandIcon()]), new Promise((r) => setTimeout(r, 2500))])
    .then(() => undefined)
    .catch(() => undefined);
}

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: string, family = SANS): number {
  for (; size > 10; size--) {
    ctx.font = weight + " " + size + "px " + family;
    if (ctx.measureText(text).width <= maxW) break;
  }
  return size;
}

/** 단어 단위 줄바꿈 (한글은 글자 단위로도 자른다) */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] | null {
  const words = text.split(" "), lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (ctx.measureText(t).width <= maxW) {
      cur = t;
      continue;
    }
    if (cur) lines.push(cur);
    cur = w;
    while (ctx.measureText(cur).width > maxW) {
      if (!/[가-힣]/.test(cur)) return null;
      let k = cur.length - 1;
      while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--;
      lines.push(cur.slice(0, k));
      cur = cur.slice(k);
    }
  }
  if (cur) lines.push(cur);
  return lines.length <= maxLines ? lines : null;
}

/** 사진을 칸에 꽉 채워 그린다 (얼굴이 위쪽이라 위 25% 기준) */
export function cover(ctx: CanvasRenderingContext2D, img: Img, on: boolean, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.w, h / img.h), sw = w / s, sh = h / s;
  ctx.drawImage(on ? img.color : img.gray, (img.w - sw) / 2, (img.h - sh) * 0.25, sw, sh, x, y, w, h);
}

export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export function canvas(H: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  return [cv, cv.getContext("2d")!];
}

/** 잠금화면 시계 자리를 비울 때 위·아래 여백 */
export function margins(H: number, lock: boolean, top: number, bottom: number): [number, number] {
  return lock ? [Math.round(H * 0.245), Math.round(H * 0.135)] : [top, bottom];
}

// =====================================================================
// 그랜드 민트 페스티벌: 4개 무대 표 (한 날 / 두 날 위아래)
// =====================================================================
const GMF_INK = "#3a2533";

/** 작은 반짝이 별 */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = GMF_INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, rr2 = i % 2 ? r * 0.36 : r;
    ctx.lineTo(Math.cos(a - Math.PI / 2) * rr2, Math.sin(a - Math.PI / 2) * rr2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function gmfBg(ctx: CanvasRenderingContext2D, H: number, compact = false) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#efbfdc");
  g.addColorStop(0.62, "#ebc9e0");
  g.addColorStop(1, "#e6f0c6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 종이 질감 (고정 씨앗이라 매번 같은 무늬)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 5200; i++) {
    ctx.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,.18)" : "rgba(90,40,80,.07)";
    ctx.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  // 한 줄 머리글이면 위쪽 별이 글자와 겹치지 않게 아래로
  if (compact) {
    sparkle(ctx, 1046, 168, 14, "#fff3a8");
  } else {
    sparkle(ctx, 58, 64, 22, "#fff3a8");
    sparkle(ctx, 1020, 120, 16, "#bfe9d8");
  }
  sparkle(ctx, 1030, H - 70, 20, "#fff3a8");
  sparkle(ctx, 44, H - 120, 14, "#f7a8c8");
}

function gmfTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, align: CanvasTextAlign) {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.font = "400 " + size + "px " + BAGEL;
  ctx.lineJoin = "round";
  const text = "Grand Mint Festival 2026";
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = GMF_INK;
  ctx.fillStyle = GMF_INK;
  ctx.fillText(text, x + size * 0.05, y + size * 0.07);
  ctx.strokeText(text, x, y);
  const g = ctx.createLinearGradient(0, y - size, 0, y);
  g.addColorStop(0, "#f07aa9");
  g.addColorStop(1, "#8d79e6");
  ctx.fillStyle = g;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export interface GmfOpt {
  days: FDay[];
  stages: FStage[];
  items: FItem[];
  sel: Set<string>;
  photos: Map<string, Img>;
  ratio: Ratio;
  lock: boolean;
  nameOf: (it: FItem) => string;
  photoOf: (it: FItem) => string | undefined;
  kindColor: (it: FItem, st: FStage) => string;
  /** 상단 텍스트 축소 (한 줄 머리글) */
  compact?: boolean;
  /** 입장 시간(분): 이 시각 전에 끝나는 공연은 빼고 그린다 */
  from?: number | null;
  /** 토+일 한 장: 위아래로(stack) / 좌우로(side) */
  layout?: "stack" | "side";
}

/** 표를 그릴 가로 범위와 왼쪽 시간 글자 표시 여부 (좌우로 놓을 때 오른쪽 표는 시간 글자 없음) */
interface Box {
  x0: number;
  x1: number;
  axis: boolean;
}

/**
 * 입장 시간 적용: 그날 고른 마지막 공연이 잘리지 않게, 늦어도 그 공연 시작 정시까지만 당긴다.
 * 반환값은 이 시각부터 그리면 되는 시각(분) 또는 null
 */
function entryFrom(from: number | null | undefined, picked: FItem[]): number | null {
  if (from == null || !picked.length) return null;
  return Math.min(from, Math.floor(Math.max(...picked.map((i) => i.s)) / 60) * 60);
}

/** 한 줄 머리글: 오른쪽 글자 + 밑줄 (왼쪽 제목은 페스티벌마다 따로 그린다) */
export function compactRight(ctx: CanvasRenderingContext2D, text: string, top: number, maxW: number, color: string) {
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  fitFont(ctx, text, maxW, 40, "800");
  ctx.fillText(text, 1020, top + 60);
  ctx.fillRect(60, top + 86, 960, 4);
}

function gmfTable(ctx: CanvasRenderingContext2D, o: GmfOpt, list: FItem[], y0: number, y1: number, range: [number, number], box: Box = { x0: 110, x1: 1040, axis: true }) {
  const [a, b] = range;
  const { x0, x1 } = box, n = o.stages.length;
  const gap = x1 - x0 < 600 ? 5 : 10;
  const colW = (x1 - x0 - gap * (n - 1)) / n;
  const headH = 62, gy0 = y0 + headH, ppm = (y1 - gy0) / (b - a);
  ctx.textBaseline = "alphabetic";
  o.stages.forEach((st, i) => {
    const x = x0 + i * (colW + gap);
    ctx.textAlign = "center";
    // 무대 이름 (2줄까지). 장소 글자는 자리를 아끼려고 넣지 않는다
    ctx.font = "900 24px " + SANS;
    let lines = wrap(ctx, st.name, colW - 4, 2) ?? [st.name];
    let size = 24;
    // 좌우로 놓으면 칸이 좁아서 더 작게까지 줄인다
    while (size > 9 && lines.some((l) => ctx.measureText(l).width > colW - 4)) {
      size--;
      ctx.font = "900 " + size + "px " + SANS;
      lines = wrap(ctx, st.name, colW - 4, 2) ?? [st.name];
    }
    ctx.lineJoin = "round";
    lines.forEach((l, k) => {
      const yy = y0 + 30 + k * (size + 2) - (lines.length - 1) * 10;
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#fff6fb";
      ctx.strokeText(l, x + colW / 2, yy);
      ctx.fillStyle = st.key === "radar" ? "#6d5f78" : st.color;
      ctx.fillText(l, x + colW / 2, yy);
    });
  });
  // 시간 줄
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let m = a; m <= b; m += 60) {
    const y = gy0 + (m - a) * ppm;
    ctx.strokeStyle = "rgba(58,37,51,.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 - 6, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    if (box.axis) {
      ctx.fillStyle = "rgba(58,37,51,.7)";
      ctx.font = "700 22px " + SANS;
      ctx.fillText(fmt(m), x0 - 12, y);
    }
  }
  for (const it of list) {
    const si = o.stages.findIndex((s) => s.key === it.stage);
    if (si < 0) continue;
    const st = o.stages[si], x = x0 + si * (colW + gap);
    const s0 = Math.max(it.s, a), e0 = Math.min(it.e, b);
    if (e0 <= s0) continue;
    const y = gy0 + (s0 - a) * ppm + 2, h = (e0 - s0) * ppm - 4;
    gmfBlock(ctx, o, it, st, x, y, colW, h);
  }
}

function gmfBlock(ctx: CanvasRenderingContext2D, o: GmfOpt, it: FItem, st: FStage, x: number, y: number, w: number, h: number) {
  const on = o.sel.has(it.id), base = o.kindColor(it, st), photo = o.photos.get(o.photoOf(it) ?? "");
  const r = Math.min(14, h / 3);
  if (on) {
    ctx.fillStyle = GMF_INK;
    rr(ctx, x + 4, y + 5, w, h, r);
    ctx.fill();
  }
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = on ? base : "rgba(255,248,252,.55)";
  ctx.fillRect(x, y, w, h);
  if (photo && h > 64) {
    cover(ctx, photo, on, x, y, w, h);
    if (!on) {
      ctx.fillStyle = "rgba(246,232,240,.62)";
      ctx.fillRect(x, y, w, h);
    }
  }
  // 이름·시간
  const ink = on ? (st.key === "radar" ? GMF_INK : st.ink) : "rgba(58,37,51,.42)";
  const name = o.nameOf(it), pad = 8, iw = w - pad * 2;
  const time = timeText(it);
  let fit: { size: number; lines: string[] } | null = null;
  for (let size = 26; size >= 13 && !fit; size--) {
    ctx.font = "900 " + size + "px " + KR;
    const lines = wrap(ctx, name, iw, 3);
    const ts = Math.max(12, Math.round(size * 0.68));
    if (lines && lines.length * size * 1.15 + ts + 6 <= h - pad * 2) fit = { size, lines };
  }
  if (!fit) {
    ctx.font = "900 13px " + KR;
    let nm = name;
    while (nm.length > 1 && ctx.measureText(nm + "…").width > iw) nm = nm.slice(0, -1);
    fit = { size: 13, lines: [nm === name ? nm : nm + "…"] };
  }
  const ts = Math.max(12, Math.round(fit.size * 0.68));
  const textH = fit.lines.length * fit.size * 1.15 + (h - pad * 2 >= fit.lines.length * fit.size * 1.15 + ts + 6 ? ts + 6 : 0);
  if (photo && h > 64) {
    // 사진 위에서는 아래쪽에 무대 색 그라데이션을 깔고 글씨
    const capH = Math.min(h, textH + pad * 2 + 30);
    const g = ctx.createLinearGradient(0, y + h - capH, 0, y + h);
    const c = on ? base : "#f6e8f0";
    g.addColorStop(0, hexA(c, 0));
    g.addColorStop(0.45, hexA(c, 0.95));
    g.addColorStop(1, c);
    ctx.fillStyle = g;
    ctx.fillRect(x, y + h - capH, w, capH);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let yy = photo && h > 64 ? y + h - pad - textH : y + pad;
  ctx.fillStyle = ink;
  ctx.font = "900 " + fit.size + "px " + KR;
  for (const l of fit.lines) {
    ctx.fillText(l, x + pad, yy);
    yy += fit.size * 1.15;
  }
  if (textH > fit.lines.length * fit.size * 1.15) {
    ctx.font = "700 " + ts + "px " + SANS;
    ctx.globalAlpha = 0.85;
    ctx.fillText(time, x + pad, yy + 4);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.lineWidth = on ? 3 : 2;
  ctx.strokeStyle = on ? GMF_INK : "rgba(58,37,51,.25)";
  rr(ctx, x, y, w, h, r);
  ctx.stroke();
}

export function renderGmf(o: GmfOpt): HTMLCanvasElement {
  const H = RATIO_H[o.ratio];
  const [cv, ctx] = canvas(H);
  gmfBg(ctx, H, o.compact);
  const [top, bottom] = margins(H, o.lock, 70, 90);
  const days = o.days.filter((d) => o.items.some((i) => i.day === d.id && o.sel.has(i.id)));
  if (!days.length) return cv;
  const single = days.length === 1;
  let y0: number;
  if (o.compact) {
    // 왼쪽 로고 글자(줄여서), 오른쪽 날짜, 아래 밑줄
    let size = 58;
    ctx.font = "400 " + size + "px " + BAGEL;
    while (size > 30 && ctx.measureText("Grand Mint Festival 2026").width > 660) {
      size -= 2;
      ctx.font = "400 " + size + "px " + BAGEL;
    }
    gmfTitle(ctx, 60, top + 64, size, "left");
    compactRight(ctx, single ? days[0].short : "10/17–10/18", top, 260, GMF_INK);
    tagRow(ctx, top + 122, null, true, 20);
    y0 = top + 150;
  } else {
    gmfTitle(ctx, W / 2, top + 64, single ? 74 : 62, "center");
    tagRow(ctx, top + 112, single ? days[0].short + " · OLYMPIC PARK" : null, true, 24);
    y0 = top + 146;
  }
  // 날짜 띠 (노란 글자 + 진한 테두리)
  const dayBand = (text: string, x: number, y: number, size: number) => {
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "400 " + size + "px " + BAGEL;
    ctx.lineWidth = size * 0.18;
    ctx.lineJoin = "round";
    ctx.strokeStyle = GMF_INK;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = "#fff3a8";
    ctx.fillText(text, x, y);
  };

  // 토+일 좌우로: 왼쪽 토, 오른쪽 일. 시간축 하나를 같이 쓴다 (같은 시각 = 같은 높이)
  if (!single && o.layout === "side") {
    const picked = o.items.filter((i) => o.sel.has(i.id));
    const f = entryFrom(o.from, picked);
    const range: [number, number] = [
      Math.max(Math.floor(Math.min(...picked.map((i) => i.s)) / 60) * 60, f ?? 0),
      Math.max(...picked.map((i) => i.e)),
    ];
    if (range[1] - range[0] < 180) range[1] = range[0] + 180;
    const halves: Box[] = [
      { x0: 104, x1: 566, axis: true },
      { x0: 588, x1: 1046, axis: false },
    ];
    days.forEach((d, k) => {
      dayBand(d.short, halves[k].x0, y0 + 36, 34);
      const list = o.items.filter((i) => i.day === d.id && i.e > range[0] && i.s < range[1]);
      gmfTable(ctx, o, list, y0 + 48, H - bottom, range, halves[k]);
    });
    return cv;
  }

  const gapY = 34;
  const secH = (H - bottom - y0 - gapY * (days.length - 1)) / days.length;
  days.forEach((d, k) => {
    const sy = y0 + k * (secH + gapY);
    const dayItems = o.items.filter((i) => i.day === d.id);
    let range: [number, number];
    const f = entryFrom(o.from, dayItems.filter((i) => o.sel.has(i.id)));
    if (single) {
      range = [Math.floor(Math.min(...dayItems.map((i) => i.s)) / 60) * 60, Math.max(...dayItems.map((i) => i.e))];
      if (f != null) range[0] = Math.max(range[0], f);
    } else {
      const picked = dayItems.filter((i) => o.sel.has(i.id));
      range = [Math.floor(Math.min(...picked.map((i) => i.s)) / 60) * 60, Math.max(...picked.map((i) => i.e))];
      if (f != null) range[0] = Math.max(range[0], f);
      if (range[1] - range[0] < 180) range[1] = range[0] + 180;
      dayBand(d.short, 44, sy + 40, 40);
    }
    const list = dayItems.filter((i) => i.e > range[0] && i.s < range[1]);
    gmfTable(ctx, o, list, single ? sy : sy + 52, sy + secH, range);
  });
  return cv;
}

// =====================================================================
// NOL 페스티벌: 스테이지 하나면 한 줄 타임라인, 여러 스테이지면 같은 시간축 위에 칸을 나란히.
// 토+일은 날짜별로 위아래 따로
// =====================================================================
export interface NolStageLook extends FStage {
  tab: string;
  bg: string;
  hi: string;
}
export interface NolCol {
  stage: NolStageLook;
  day: FDay;
  items: FItem[];
}
export interface NolOpt {
  cols: NolCol[];
  /** 한 날짜 여러 칸일 때 위쪽 검은 태그 (예: DAY 1 · 10.17 SAT) */
  sub: string;
  /** 토+일일 때 날짜별 제목 */
  labels: { sat: string; sun: string };
  sel: Set<string>;
  photos: Map<string, Img>;
  ratio: Ratio;
  lock: boolean;
  nameOf: (it: FItem) => [string, string];
  /** 상단 텍스트 축소 (한 줄 머리글) */
  compact?: boolean;
  /** 입장 시간(분): 이 시각 전에 끝나는 공연은 빼고 그린다 */
  from?: number | null;
  /** 토+일 한 장: 위아래로(stack) / 좌우로(side) */
  layout?: "stack" | "side";
}

/** DAY 1 · 10.17 SAT → DAY 1 (SAT), 애프터 파티는 그대로 */
const dayTag = (d: FDay) => (d.id === "after" ? "AFTER PARTY" : d.short.replace(/ · [\d.]+ (\w+)$/, " ($1)"));
/** 배경화면 날짜 묶음 (토요일 밤 애프터 파티는 토요일) */
const groupOf = (c: NolCol) => (c.day.id === "sun" ? "sun" : "sat");
function nolBg(ctx: CanvasRenderingContext2D, H: number, bg: string, hi: string) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // 포스터처럼 큼직한 반투명 조각들
  ctx.fillStyle = "rgba(255,255,255,.07)";
  const shapes: [number, number, number, number, number][] = [
    [-60, 180, 380, 260, -0.3],
    [700, 40, 460, 300, 0.25],
    [620, H * 0.55, 520, 320, -0.2],
    [-80, H * 0.72, 420, 360, 0.35],
  ];
  for (const [x, y, w, h, r] of shapes) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(r);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  // 체크무늬 모서리
  ctx.fillStyle = hi;
  // 아래 여백 안에만 (시간 글자와 겹치지 않게 3줄)
  for (let i = 0; i < 3; i++)
    for (let j = 0; j <= i; j++) {
      if ((i + j) % 2) continue;
      ctx.fillRect(j * 30, H - (3 - i) * 30, 30, 30);
    }
}

/** 검은 사선 태그 (포스터의 DAY 1 표시). 반환값은 높이 */
function blackTag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  ctx.font = "800 " + size + "px " + SANS;
  const tw = ctx.measureText(text).width, h = size * 1.7, w = tw + size * 1.6;
  ctx.fillStyle = "#0b0b14";
  ctx.beginPath();
  ctx.moveTo(x + h * 0.25, y);
  ctx.lineTo(x + w, y + 2);
  ctx.lineTo(x + w - h * 0.2, y + h);
  ctx.lineTo(x, y + h - 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + size * 0.8, y + h / 2 + 1);
  return h;
}

/** 공연 카드: 고른 공연은 흰 카드 + 오른쪽 포인트 색 띠, 안 고른 공연은 반투명. 사진은 왼쪽 */
function nolCard(ctx: CanvasRenderingContext2D, o: NolOpt, st: NolStageLook, it: FItem, x: number, y: number, w: number, h: number, wide: boolean) {
  const on = o.sel.has(it.id);
  // 연노랑(K-POP)은 흰 카드 위에서 잘 안 보여서 진하게
  const bar = st.hi === "#fff3a6" ? "#ffd23b" : st.hi;
  const r = Math.min(wide ? 14 : 10, h / 3);
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = on ? "#ffffff" : "rgba(255,255,255,.12)";
  ctx.fillRect(x, y, w, h);
  const photo = o.photos.get(it.id);
  let tx = x + (wide ? 18 : 9);
  if (photo && h >= 40) {
    const pw = Math.min(h, wide ? 170 : w * 0.3);
    cover(ctx, photo, on, x, y, pw, h);
    if (!on) {
      ctx.fillStyle = hexA(st.bg, 0.55);
      ctx.fillRect(x, y, pw, h);
    }
    tx = x + pw + (wide ? 16 : 8);
  }
  if (on) {
    ctx.fillStyle = bar;
    ctx.fillRect(x + w - (wide ? 10 : 6), y, wide ? 10 : 6, h);
  }
  ctx.restore();

  const [main, sub] = o.nameOf(it);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const ink = on ? "#10123a" : "rgba(255,255,255,.62)";
  if (wide) {
    const pill = it.e - it.s + "′";
    ctx.font = "800 22px " + SANS;
    const pillW = ctx.measureText(pill).width + 20;
    const iw = x + w - tx - pillW - 26;
    const size = fitFont(ctx, main, iw, Math.min(42, Math.max(18, h * 0.32)), "800");
    const subSize = Math.max(14, Math.round(size * 0.55));
    const showSub = !!sub && h > size + subSize + 22;
    const blockH = size + (showSub ? subSize + 6 : 0);
    let ty = y + (h - blockH) / 2;
    ctx.fillStyle = ink;
    ctx.font = "800 " + size + "px " + SANS;
    ctx.fillText(main, tx, ty);
    ty += size + 6;
    if (showSub) {
      ctx.fillStyle = on ? "rgba(16,18,58,.6)" : "rgba(255,255,255,.42)";
      fitFont(ctx, sub, iw, subSize, "700", KR);
      ctx.fillText(sub, tx, ty);
    }
    const px = x + w - pillW - 22, py = y + h / 2 - 16;
    ctx.fillStyle = on ? "#0b0b14" : "rgba(0,0,0,.25)";
    rr(ctx, px, py, pillW, 32, 7);
    ctx.fill();
    ctx.fillStyle = on ? "#ffffff" : "rgba(255,255,255,.55)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 22px " + SANS;
    ctx.fillText(pill, px + pillW / 2, py + 17);
    return;
  }
  // 좁은 칸: 이름(2줄까지) + 시간
  const iw = x + w - tx - 10;
  const ts = Math.max(12, Math.min(19, Math.round(h * 0.2)));
  let size = Math.min(28, Math.max(12, Math.round(h * 0.32)));
  let lines: string[] | null = null;
  for (; size >= 11 && !lines; size--) {
    ctx.font = "800 " + size + "px " + SANS;
    const l = wrap(ctx, main, iw, 2);
    if (l && l.length * size * 1.1 <= h - 6) lines = l;
  }
  size++;
  if (!lines) {
    size = Math.max(10, Math.min(13, h - 4));
    ctx.font = "800 " + size + "px " + SANS;
    let nm = main;
    while (nm.length > 1 && ctx.measureText(nm + "…").width > iw) nm = nm.slice(0, -1);
    lines = [nm === main ? nm : nm + "…"];
  }
  const showTime = lines.length * size * 1.1 + ts + 4 <= h - 8;
  const blockH = lines.length * size * 1.1 + (showTime ? ts + 4 : 0);
  let ty = y + (h - blockH) / 2;
  ctx.fillStyle = ink;
  ctx.font = "800 " + size + "px " + SANS;
  for (const l of lines) {
    ctx.fillText(l, tx, ty);
    ty += size * 1.1;
  }
  if (showTime) {
    ctx.font = "700 " + ts + "px " + SANS;
    ctx.fillStyle = on ? "rgba(16,18,58,.7)" : "rgba(255,255,255,.5)";
    ctx.fillText(timeText(it), tx, ty + 4);
  }
}

/** 한 스테이지: 왼쪽 시간 열 + 카드 한 줄 */
function nolList(ctx: CanvasRenderingContext2D, o: NolOpt, st: NolStageLook, list: FItem[], x0: number, x1: number, y0: number, y1: number) {
  const gap = 10;
  const ws = list.map((it) => 0.7 + (it.e - it.s) / 50);
  const sum = ws.reduce((a, b) => a + b, 0);
  const avail = y1 - y0 - gap * (list.length - 1);
  const hs = ws.map((w) => Math.min(190, (avail * w) / sum));
  const used = hs.reduce((a, b) => a + b, 0) + gap * (list.length - 1);
  let y = y0 + Math.max(0, (y1 - y0 - used) / 2);
  const timeW = 118;
  list.forEach((it, k) => {
    const h = hs[k], on = o.sel.has(it.id);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = on ? "#ffffff" : "rgba(255,255,255,.55)";
    ctx.font = "800 30px " + SANS;
    ctx.fillText(fmt(it.s), x0, y + 6);
    ctx.font = "600 21px " + SANS;
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.fillText(fmt(it.e), x0 + 2, y + 42);
    nolCard(ctx, o, st, it, x0 + timeW, y, x1 - x0 - timeW, h, true);
    y += h + gap;
  });
}

/** 여러 스테이지: 칸마다 스테이지 색 이름표 + 공통 시간축 (같은 시각 = 같은 높이). 범위는 고른 공연이 걸친 시간만 */
/** 고른 공연이 걸친 시간 (입장 시간 적용, 최소 2시간) */
function nolRange(o: NolOpt, cols: NolCol[]): [number, number] {
  const picked = cols.flatMap((c) => c.items.filter((i) => o.sel.has(i.id)));
  const a = Math.max(Math.floor(Math.min(...picked.map((i) => i.s)) / 60) * 60, entryFrom(o.from, picked) ?? 0);
  let b = Math.max(...picked.map((i) => i.e));
  if (b - a < 120) b = a + 120;
  return [a, b];
}

function nolGrid(ctx: CanvasRenderingContext2D, o: NolOpt, cols: NolCol[], ty: number, yEnd: number, box: Box = { x0: 98, x1: W - 30, axis: true }, range = nolRange(o, cols)) {
  const [a, b] = range;
  const n = cols.length;
  const { x0, x1 } = box;
  const gap = x1 - x0 < 600 ? 6 : n > 3 ? 10 : 14;
  const colW = (x1 - x0 - gap * (n - 1)) / n;
  const tagH = 52;
  const gy0 = ty + tagH + 14, gy1 = yEnd;
  const ppm = (gy1 - gy0) / (b - a);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let m = a; m <= b; m += 60) {
    const y = gy0 + (m - a) * ppm;
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 - 6, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    if (box.axis) {
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.font = "700 22px " + SANS;
      ctx.fillText(fmt(m), x0 - 12, y);
    }
  }
  cols.forEach((c, k) => {
    const cx = x0 + k * (colW + gap);
    const label = c.day.id === "after" ? "AFTER PARTY" : c.stage.tab;
    ctx.fillStyle = c.stage.bg;
    rr(ctx, cx, ty, colW, tagH, 12);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = c.stage.hi;
    ctx.stroke();
    ctx.fillStyle = c.stage.hi;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitFont(ctx, label, colW - 14, 30, "900");
    ctx.fillText(label, cx + colW / 2, ty + tagH / 2 + 1);
    ctx.fillStyle = "rgba(0,0,0,.08)";
    rr(ctx, cx, gy0, colW, gy1 - gy0, 12);
    ctx.fill();
    for (const it of c.items) {
      const s0 = Math.max(it.s, a), e0 = Math.min(it.e, b);
      if (e0 <= s0) continue;
      const y = gy0 + (s0 - a) * ppm + 2, h = (e0 - s0) * ppm - 4;
      if (h < 6) continue;
      nolCard(ctx, o, c.stage, it, cx, y, colW, h, false);
    }
  });
}

export function renderNol(o: NolOpt): HTMLCanvasElement {
  const H = RATIO_H[o.ratio];
  const [cv, ctx] = canvas(H);
  // 한 스테이지만이면 그 스테이지 색, 여러 스테이지면 NOL 파란색
  const one = o.cols.every((c) => c.stage.key === o.cols[0].stage.key && c.day.id === o.cols[0].day.id);
  const sameStage = o.cols.every((c) => c.stage.key === o.cols[0].stage.key);
  const look = sameStage ? o.cols[0].stage : { bg: "#3443ee", hi: "#d6f43c" };
  nolBg(ctx, H, look.bg, look.hi);
  const groups = (["sat", "sun"] as const).map((g) => o.cols.filter((c) => groupOf(c) === g)).filter((g) => g.length);
  const [top, bottom] = margins(H, o.lock, o.compact ? 56 : 66, 110);
  let y0: number;
  if (o.compact) {
    // 왼쪽 NOL FESTIVAL, 오른쪽 스테이지·날짜, 아래 밑줄
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = look.hi;
    ctx.font = "900 66px " + SANS;
    ctx.fillText("NOL FESTIVAL", 60, top + 64);
    const tw = ctx.measureText("NOL FESTIVAL").width;
    const c0 = o.cols[0];
    const right = one ? (c0.day.id === "after" ? "AFTER PARTY" : c0.stage.tab + " · " + dayTag(c0.day)) : groups.length > 1 ? "MY LINEUP" : o.sub;
    compactRight(ctx, right, top, 960 - tw - 30, "#ffffff");
    tagRow(ctx, top + 122, null, false, 20);
    y0 = top + 152;
  } else {
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = look.hi;
    ctx.font = "900 " + (o.cols.length > 2 ? 92 : 104) + "px " + SANS;
    ctx.fillText("NOL FESTIVAL", W / 2, top + 88);
    const head = one ? o.cols[0].stage.tab + " | " + (o.cols[0].stage.place ?? "") : "MY LINEUP";
    tagRow(ctx, top + 136, head, false, 25, look.hi);
    y0 = top + 178;
  }

  // 한 스테이지·한 날짜: 크게 한 줄
  if (one) {
    const c = o.cols[0];
    let listTop = y0;
    if (!o.compact) {
      ctx.font = "800 30px " + SANS;
      const tw = ctx.measureText(c.day.short).width + 48;
      listTop = y0 + blackTag(ctx, c.day.short, (W - tw) / 2, y0, 30) + 26;
    }
    // 입장 시간 전에 끝나는 공연은 빼서 남은 공연을 크게
    const f = entryFrom(o.from, c.items.filter((i) => o.sel.has(i.id)));
    nolList(ctx, o, c.stage, f == null ? c.items : c.items.filter((i) => i.e > f), 60, 1020, listTop, H - bottom);
    return cv;
  }

  // 한 날짜 여러 스테이지: 날짜 태그(축소면 생략) + 칸
  if (groups.length === 1) {
    let ty = y0;
    if (!o.compact) {
      ctx.font = "800 28px " + SANS;
      const sw = ctx.measureText(o.sub).width + 44;
      ty = y0 + blackTag(ctx, o.sub, (W - sw) / 2, y0, 28) + 22;
    }
    nolGrid(ctx, o, groups[0], ty, H - bottom);
    return cv;
  }

  // 토+일 좌우로: 왼쪽 토요일 칸들, 오른쪽 일요일 칸들. 시간축 하나를 같이 쓴다
  if (o.layout === "side") {
    const range = nolRange(o, o.cols);
    const nSat = groups[0].length, nSun = groups[1].length;
    // 칸 수에 비례해 가로를 나눈다
    const L = 98, R = W - 30, mid = 20;
    const split = L + ((R - L - mid) * nSat) / (nSat + nSun);
    const halves: Box[] = [
      { x0: L, x1: split, axis: true },
      { x0: split + mid, x1: R, axis: false },
    ];
    groups.forEach((cols, k) => {
      const label = groupOf(cols[0]) === "sun" ? o.labels.sun : o.labels.sat;
      ctx.font = "800 22px " + SANS;
      const th = blackTag(ctx, label.replace(/^DAY \d · /, ""), halves[k].x0, y0, 22);
      nolGrid(ctx, o, cols, y0 + th + 12, H - bottom, halves[k], range);
    });
    return cv;
  }

  // 토+일: 날짜별로 위아래 따로 (각자 날짜 태그·시간축). 높이는 그날 고른 시간 길이에 맞춰 나눈다 (한쪽 최소 35%)
  const gapY = 34;
  const span = groups.map((cols) => {
    const p = cols.flatMap((c) => c.items.filter((i) => o.sel.has(i.id)));
    const a = Math.max(Math.floor(Math.min(...p.map((i) => i.s)) / 60) * 60, entryFrom(o.from, p) ?? 0);
    return Math.max(120, Math.max(...p.map((i) => i.e)) - a);
  });
  const total = H - bottom - y0 - gapY;
  const share0 = Math.min(0.65, Math.max(0.35, span[0] / (span[0] + span[1])));
  const secHs = [total * share0, total * (1 - share0)];
  groups.forEach((cols, k) => {
    const secH = secHs[k];
    const sy = y0 + (k ? secHs[0] + gapY : 0);
    const label = groupOf(cols[0]) === "sun" ? o.labels.sun : o.labels.sat;
    const th = blackTag(ctx, label, 40, sy, 26);
    nolGrid(ctx, o, cols, sy + th + 14, sy + secH);
  });
  return cv;
}

// =====================================================================
// EDC Orlando 2026 공식 포스터 느낌: 검은 우주 + 궤도 고리 + 붉은 성운 + 유리 구슬 + 초록 지형.
// 고르기 전 칸은 무색: 어두운 상자 + 옅은 회색 테두리 + 회색 이름.
// 고른 칸은 글씨 뒤를 무대 브랜드 색(Kinetic 분홍 · Circuit 파랑 · Neon 초록 · Stereo 보라 · Casa 산호)으로 채운다.
// 공식 로고·포스터 이미지는 쓰지 않고 글자로만 그린다
// =====================================================================
const ORL_LIME = "#e2f55c";
const ORL_TX = "#f4f6ff";
const RIGHTEOUS = '"Righteous","Rubik",system-ui,sans-serif';

export interface EdcOpt {
  /** 제목 앞부분(초록 크롬 글자)과 뒷부분(흰 글자). 예: "edc", "ORLANDO 2026" */
  logo: string;
  title: string;
  /** 장소 (예: TINKER FIELD) */
  place: string;
  /** 날짜 id → 긴 제목 (예: FRIDAY NOV 6) */
  dayTitle: (d: FDay) => string;
  /** 무대 key → 고른 칸 색 (글씨 뒤 line, 그 위 글자 ink) */
  tone: (stage: string) => { line: string; ink: string };
  days: FDay[];
  stages: FStage[];
  items: FItem[];
  sel: Set<string>;
  photos: Map<string, Img>;
  ratio: Ratio;
  lock: boolean;
  nameOf: (it: FItem) => string;
  photoOf: (it: FItem) => string | undefined;
  compact?: boolean;
  from?: number | null;
}

function orlGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number, H: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "rgba(" + rgb + "," + a + ")");
  g.addColorStop(1, "rgba(" + rgb + ",0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** 유리 구슬 */
function orb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c1: string, c2: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.18, c1);
  g.addColorStop(0.75, c2);
  g.addColorStop(1, "rgba(0,0,0,.85)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function orlBg(ctx: CanvasRenderingContext2D, H: number) {
  ctx.fillStyle = "#04050b";
  ctx.fillRect(0, 0, W, H);
  // 위쪽 붉은 덩어리 빛, 가운데 푸른 기운, 아래 주황·빨강 성운
  orlGlow(ctx, -60, 120, 520, "214,58,38", 0.42, H);
  orlGlow(ctx, W + 60, 260, 480, "214,58,38", 0.32, H);
  orlGlow(ctx, W / 2, H * 0.36, 620, "60,110,200", 0.16, H);
  const neb = ctx.createLinearGradient(0, H * 0.62, 0, H);
  neb.addColorStop(0, "rgba(120,40,20,0)");
  neb.addColorStop(0.55, "rgba(170,60,28,.38)");
  neb.addColorStop(1, "rgba(230,110,40,.5)");
  ctx.fillStyle = neb;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);
  // 별
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = "rgba(255,255,255," + (0.18 + rnd() * 0.6).toFixed(2) + ")";
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, rnd() * 1.7 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // 궤도 고리
  ctx.save();
  ctx.strokeStyle = "rgba(150,180,255,.16)";
  ctx.lineWidth = 2;
  for (let k = 1; k <= 8; k++) {
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.3, 120 * k, 120 * k * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // 구슬
  // 구슬: 시간 글자·표와 겹치지 않게 위 모서리와 맨 아래(지형 위)에만
  orb(ctx, 44, 40, 20, "#9fd8ff", "#2b5fb8");
  orb(ctx, W - 46, 54, 24, "#ffe08a", "#b07a12");
  orb(ctx, W - 120, H - 52, 22, "#8ff0b8", "#1f8a52");
  orb(ctx, 150, H - 46, 16, "#e2b3ff", "#7a3fb8");
  // 아래 초록 지형
  const g = ctx.createLinearGradient(0, H - 90, 0, H);
  g.addColorStop(0, "#3d9b3f");
  g.addColorStop(1, "#0d3514");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, H);
  const hills = [0, 58, 120, 36, 230, 70, 340, 30, 470, 64, 590, 26, 720, 60, 850, 34, 960, 70, 1080, 40];
  for (let i = 0; i < hills.length; i += 2) ctx.lineTo(hills[i], H - hills[i + 1]);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

/** "edc"(초록 크롬) + "ORLANDO 2026"(흰 글자, 진한 테두리) */
function orlTitle(ctx: CanvasRenderingContext2D, logo: string, title: string, x: number, y: number, size: number, align: "center" | "left") {
  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = "400 " + size * 1.18 + "px " + RIGHTEOUS;
  const lw = ctx.measureText(logo).width;
  ctx.font = "400 " + size + "px " + RIGHTEOUS;
  const tw = ctx.measureText(title).width;
  const gap = size * 0.28;
  const x0 = align === "center" ? x - (lw + gap + tw) / 2 : x;
  // edc
  ctx.font = "400 " + size * 1.18 + "px " + RIGHTEOUS;
  const g = ctx.createLinearGradient(0, y - size * 1.1, 0, y + size * 0.1);
  g.addColorStop(0, "#e9ffb0");
  g.addColorStop(0.35, "#7bea6a");
  g.addColorStop(0.7, "#1f9e57");
  g.addColorStop(1, "#0c5a35");
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.12;
  ctx.strokeStyle = "#062414";
  ctx.strokeText(logo, x0, y);
  ctx.fillStyle = g;
  ctx.fillText(logo, x0, y);
  // ORLANDO 2026
  ctx.font = "400 " + size + "px " + RIGHTEOUS;
  ctx.lineWidth = size * 0.1;
  ctx.strokeStyle = "#0b0d18";
  ctx.strokeText(title, x0 + lw + gap, y);
  ctx.fillStyle = ORL_TX;
  ctx.fillText(title, x0 + lw + gap, y);
  ctx.restore();
}

export function orlTable(ctx: CanvasRenderingContext2D, o: EdcOpt, list: FItem[], y0: number, y1: number, range: [number, number]) {
  const [a, b] = range;
  const x0 = 104, x1 = 1040, n = o.stages.length, gap = 8;
  const colW = (x1 - x0 - gap * (n - 1)) / n;
  const headH = 70, gy0 = y0 + headH, ppm = (y1 - gy0) / (b - a);
  // 무대 이름: 흰 글자 (첫 단어 작게)
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  o.stages.forEach((st, i) => {
    const x = x0 + i * (colW + gap);
    const [w1, ...rest] = st.name.split(" ");
    const l2 = rest.length ? rest.join(" ") : w1;
    if (rest.length) {
      ctx.fillStyle = "rgba(244,246,255,.7)";
      fitFont(ctx, w1, colW - 6, 19, "800");
      ctx.fillText(w1, x + colW / 2, y0 + 24);
    }
    ctx.fillStyle = ORL_TX;
    fitFont(ctx, l2, colW - 6, 24, "800");
    ctx.fillText(l2, x + colW / 2, y0 + 52);
    ctx.fillStyle = o.tone(st.key).line;
    ctx.fillRect(x + 4, y0 + 60, colW - 8, 4);
  });
  // 시간 줄
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let m = Math.ceil(a / 60) * 60; m <= b; m += 60) {
    const y = gy0 + (m - a) * ppm;
    ctx.strokeStyle = "rgba(160,190,255,.13)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0 - 4, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(236,240,255,.75)";
    ctx.font = "700 22px " + SANS;
    ctx.fillText(fmt(m), x0 - 10, y);
  }
  for (const it of list) {
    const si = o.stages.findIndex((s) => s.key === it.stage);
    if (si < 0) continue;
    const x = x0 + si * (colW + gap);
    const s0 = Math.max(it.s, a), e0 = Math.min(it.e, b);
    if (e0 <= s0) continue;
    orlBlock(ctx, o, it, x, gy0 + (s0 - a) * ppm + 2, colW, (e0 - s0) * ppm - 4);
  }
}

function orlBlock(ctx: CanvasRenderingContext2D, o: EdcOpt, it: FItem, x: number, y: number, w: number, h: number) {
  const on = o.sel.has(it.id), photo = o.photos.get(o.photoOf(it) ?? "");
  const tn = o.tone(it.stage);
  const r = Math.min(10, h / 3);
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = on ? tn.line : "rgba(6,10,24,.84)";
  ctx.fillRect(x, y, w, h);
  const usePhoto = !!photo && h > 70;
  if (photo && usePhoto) {
    cover(ctx, photo, on, x, y, w, h);
    if (!on) {
      ctx.fillStyle = "rgba(4,6,14,.55)";
      ctx.fillRect(x, y, w, h);
    }
  }
  const nameInk = on ? tn.ink : "#b8bdd0";
  const timeInk = on ? hexA(tn.ink, 0.8) : "rgba(244,246,255,.85)";
  const name = o.nameOf(it), pad = 7, iw = w - pad * 2, time = timeText(it);
  let fit: { size: number; lines: string[] } | null = null;
  for (let size = 24; size >= 12 && !fit; size--) {
    ctx.font = "800 " + size + "px " + SANS;
    const lines = wrap(ctx, name, iw, 3);
    const ts = Math.max(11, Math.round(size * 0.66));
    if (lines && lines.length * size * 1.13 + ts + 5 <= h - pad * 2) fit = { size, lines };
  }
  if (!fit) {
    ctx.font = "800 12px " + SANS;
    let nm = name;
    while (nm.length > 1 && ctx.measureText(nm + "…").width > iw) nm = nm.slice(0, -1);
    fit = { size: 12, lines: [nm === name ? nm : nm + "…"] };
  }
  const ts = Math.max(11, Math.round(fit.size * 0.66));
  const nameH = fit.lines.length * fit.size * 1.13;
  const showTime = h - pad * 2 >= nameH + ts + 5;
  const textH = nameH + (showTime ? ts + 5 : 0);
  if (usePhoto) {
    const capH = Math.min(h, textH + pad * 2 + 30);
    const g = ctx.createLinearGradient(0, y + h - capH, 0, y + h);
    const c = on ? tn.line : "#060a18";
    g.addColorStop(0, hexA(c, 0));
    g.addColorStop(0.5, hexA(c, 0.94));
    g.addColorStop(1, c);
    ctx.fillStyle = g;
    ctx.fillRect(x, y + h - capH, w, capH);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let yy = usePhoto ? y + h - pad - textH : y + pad;
  ctx.fillStyle = nameInk;
  ctx.font = "800 " + fit.size + "px " + SANS;
  for (const l of fit.lines) {
    ctx.fillText(l, x + pad, yy);
    yy += fit.size * 1.13;
  }
  if (showTime) {
    ctx.fillStyle = timeInk;
    ctx.font = "700 " + ts + "px " + SANS;
    ctx.fillText(time, x + pad, yy + 3);
  }
  ctx.restore();
  // 고른 공연은 흰 테두리, 나머지는 옅은 회색
  ctx.lineWidth = on ? 3 : 1.5;
  ctx.strokeStyle = on ? "#ffffff" : "rgba(170,180,210,.24)";
  rr(ctx, x, y, w, h, r);
  ctx.stroke();
}

export function renderEdcGrid(o: EdcOpt): HTMLCanvasElement {
  const H = RATIO_H[o.ratio];
  const [cv, ctx] = canvas(H);
  orlBg(ctx, H);
  const [top, bottom] = margins(H, o.lock, 70, 96);
  const days = o.days.filter((d) => o.items.some((i) => i.day === d.id && o.sel.has(i.id)));
  if (!days.length) return cv;
  const single = days.length === 1;
  let y0: number;
  if (o.compact) {
    orlTitle(ctx, o.logo, o.title, 60, top + 64, 52, "left");
    compactRight(ctx, single ? days[0].short : days.map((d) => d.short.split(" ")[1]).join("+"), top, 300, ORL_LIME);
    tagRow(ctx, top + 122, null, false, 20);
    y0 = top + 150;
  } else {
    orlTitle(ctx, o.logo, o.title, W / 2, top + 80, 74, "center");
    tagRow(ctx, top + 128, single ? o.dayTitle(days[0]) + " · " + o.place : null, false, 24, ORL_LIME);
    y0 = top + 162;
  }
  const gapY = 34;
  const secH = (H - bottom - y0 - gapY * (days.length - 1)) / days.length;
  days.forEach((d, k) => {
    const sy = y0 + k * (secH + gapY);
    const dayItems = o.items.filter((i) => i.day === d.id);
    const picked = dayItems.filter((i) => o.sel.has(i.id));
    const f = entryFrom(o.from, picked);
    const base = single ? dayItems : picked;
    const range: [number, number] = [Math.floor(Math.min(...base.map((i) => i.s)) / 60) * 60, Math.max(...base.map((i) => i.e))];
    if (f != null) range[0] = Math.max(range[0], f);
    if (range[1] - range[0] < 180) range[1] = range[0] + 180;
    let ty = sy;
    if (!single) {
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = ORL_LIME;
      ctx.font = "400 34px " + RIGHTEOUS;
      ctx.fillText(o.dayTitle(d), 44, sy + 36);
      ty = sy + 46;
    }
    orlTable(ctx, o, dayItems.filter((i) => i.e > range[0] && i.s < range[1]), ty, sy + secH, range);
  });
  return cv;
}
