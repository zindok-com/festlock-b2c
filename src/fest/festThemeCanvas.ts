// 내보내기 이미지(배경화면)를 "카드 모양"(src/fest/cardTheme.ts)에 맞춰 그린다.
// festMulti.ts 의 drawBlock·stageLabel·renderMulti 가 theme 가 있고 "glass"가 아닐 때 여기를 부른다.
// 화면(fest.css `.zon[data-ct=…]`)과 같은 모양을 캔버스로 다시 그린 것이다. 사진은 이중톤/흑백으로만 쓴다 (누끼는 화면에서만).
import { SANS, cover, hexA, rr, type Img } from "./festCanvas";
import type { CardTheme } from "./cardTheme";
import type { FStage } from "./types";

export interface Look4 {
  time: string;
  line: string;
  fold: string;
  name: string;
  nameSub: string;
  labelBg: string;
}

/** 모양마다 달라지는 글자·선 색 (제목·배경은 페스티벌 것을 그대로 쓴다) */
export function themedLook<T extends Look4>(look: T, theme: CardTheme): T {
  if (theme === "term") return { ...look, time: "#5f8a73", line: "rgba(110,231,168,.14)", fold: "#6ee7a8", name: "#e8fff2", nameSub: "#6ee7a8", labelBg: "#040604" };
  if (theme === "polaroid") return { ...look, time: "#bdb8aa", labelBg: "#1d1c22" };
  return look;
}

const MONO = '"DM Mono",ui-monospace,Menlo,Consolas,monospace';
const MARKER = '"Caveat","Permanent Marker","Noto Sans KR",cursive';
const ANTON = '"Anton","Rubik","Noto Sans KR",sans-serif';

/** 표가 놓이는 자리 뒤 판 (밝은 종이·터미널·유리 빛 등). 모양에 판이 없으면 아무것도 안 그린다 */
export function themedPanel(ctx: CanvasRenderingContext2D, theme: CardTheme, x: number, y: number, w: number, h: number) {
  if (theme === "term") {
    ctx.save();
    rr(ctx, x, y, w, h, 6);
    ctx.clip();
    ctx.fillStyle = "#040604";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,.035)";
    for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1);
    ctx.restore();
    ctx.strokeStyle = "rgba(110,231,168,.35)";
    ctx.lineWidth = 2;
    rr(ctx, x, y, w, h, 6);
    ctx.stroke();
  } else if (theme === "lock") {
    ctx.save();
    rr(ctx, x, y, w, h, 30);
    ctx.clip();
    for (const [cx, cy, r, c] of [[x, y, w * 0.9, "63,214,255,.30"], [x + w, y + h * 0.5, w * 0.8, "255,154,46,.26"], [x, y + h, w * 0.7, "120,70,255,.28"]] as const) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(${c})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 2;
    rr(ctx, x, y, w, h, 30);
    ctx.stroke();
  } else if (theme === "polaroid") {
    ctx.save();
    rr(ctx, x, y, w, h, 24);
    ctx.clip();
    ctx.fillStyle = "#1d1c22";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,.07)";
    for (let yy = y + 8; yy < y + h; yy += 22) for (let xx = x + 8; xx < x + w; xx += 22) ctx.fillRect(xx, yy, 2, 2);
    ctx.restore();
  }
}

/** 글자를 폭에 맞춰 최대 maxLines 줄로 (안 되면 글자를 줄인다) */
function fit(ctx: CanvasRenderingContext2D, text: string, w: number, maxSize: number, minSize: number, maxH: number, font: (s: number) => string, maxLines = 3): { size: number; lines: string[] } {
  for (let size = maxSize; size >= minSize; size--) {
    ctx.font = font(size);
    const lines: string[] = [];
    let cur = "", ok = true;
    for (const wd of text.split(" ")) {
      const t = cur ? cur + " " + wd : wd;
      if (ctx.measureText(t).width <= w) cur = t;
      else {
        if (cur) lines.push(cur);
        cur = wd;
        if (ctx.measureText(wd).width > w) ok = false;
      }
    }
    if (cur) lines.push(cur);
    if (ok && lines.length <= maxLines && lines.length * size * 1.08 <= maxH) return { size, lines };
  }
  ctx.font = font(minSize);
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > w) t = t.slice(0, -1);
  return { size: minSize, lines: [t === text ? t : t + "…"] };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function check(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, bg: string, fg: string, square = false) {
  ctx.fillStyle = bg;
  if (square) ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  else {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = fg;
  ctx.lineWidth = Math.max(3, r / 4);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.34);
  ctx.lineTo(cx + r * 0.46, cy - r * 0.34);
  ctx.stroke();
}

export interface BlockData {
  name: string;
  time: string;
  genre?: string;
  st: FStage;
  id: string;
  photo?: Img;
  x: number;
  y: number;
  w: number;
  h: number;
  on: boolean;
  /** 사진을 깔 수 있는 최소 높이 */
  minPhoto: number;
  /** 페스티벌 배경화면의 이름·보조 글자 색 (미니멀 모양이 페스티벌 색을 따라가게) */
  ink?: string;
  sub?: string;
}

/** 공연 칸 하나를 모양에 맞춰 그린다 */
export function drawThemedBlock(ctx: CanvasRenderingContext2D, theme: CardTheme, d: BlockData) {
  switch (theme) {
    case "poster":
      return poster(ctx, d);
    case "minimal":
      return minimal(ctx, d, false);
    case "lock":
      return minimal(ctx, d, true);
    case "duo":
      return duo(ctx, d);
    case "polaroid":
      return polaroid(ctx, d);
    case "term":
      return term(ctx, d);
    case "mono":
      return mono(ctx, d);
  }
}

// ---------- 1 포스터 카드 ----------
function poster(ctx: CanvasRenderingContext2D, d: BlockData) {
  const { x, y, w, h, st, on } = d;
  const r = Math.min(16, h / 4);
  ctx.save();
  ctx.globalAlpha = on ? 1 : 0.62;
  if (on) {
    ctx.shadowColor = hexA(st.color, 0.5);
    ctx.shadowBlur = 24;
  }
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = "#10141c";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = st.color;
  ctx.fillRect(x, y, w, 6);
  ctx.restore();
  const pad = 9;
  const small = h < 96;
  const nameMax = Math.min(32, Math.round(w / 6));
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const nameFit = fit(ctx, d.name, w - pad * 2, nameMax, small ? 12 : 15, small ? h - 20 : 78, (s) => "800 " + s + "px " + SANS, 2);
  const ts = Math.max(13, Math.min(20, Math.round(w / 11)));
  const textH = nameFit.lines.length * nameFit.size * 1.1 + ts + 10;
  const hasPhoto = !!d.photo && h > d.minPhoto && !small;
  const phH = hasPhoto ? h - textH - pad * 2 - 6 : 0;
  if (hasPhoto && phH > 40) {
    ctx.save();
    rr(ctx, x + pad, y + pad + 6, w - pad * 2, phH, 10);
    ctx.clip();
    cover(ctx, d.photo!, true, x + pad, y + pad + 6, w - pad * 2, phH);
    ctx.restore();
  }
  let ty = y + (hasPhoto && phH > 40 ? pad + 6 + phH + 8 : Math.max(10, (h - textH) / 2 + 3));
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 " + nameFit.size + "px " + SANS;
  for (const l of nameFit.lines) {
    ctx.fillText(l, x + w / 2, ty);
    ty += nameFit.size * 1.1;
  }
  ctx.fillStyle = "#9aa3b5";
  ctx.font = "600 " + ts + "px " + SANS;
  ctx.fillText(d.time, x + w / 2, ty + 3);
  ctx.restore();
  if (on) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = st.color;
    rr(ctx, x, y, w, h, r);
    ctx.stroke();
    check(ctx, x + w - 22, y + 24, 12, st.color, st.ink);
    ctx.restore();
  }
}

// ---------- 3 미니멀 / 5 글라스 잠금화면: 동그란 사진 + 이름·시간·장르 ----------
// 미니멀은 흰 종이가 아니라 페스티벌 배경 위에 반투명 카드 + 무대 색 막대, 글자는 페스티벌 글자색을 쓴다.
function minimal(ctx: CanvasRenderingContext2D, d: BlockData, glass: boolean) {
  const { x, y, w, h, st, on } = d;
  const r = Math.min(glass ? 26 : 16, h / 3);
  ctx.save();
  if (glass) {
    if (on) {
      ctx.shadowColor = hexA(st.color, 0.45);
      ctx.shadowBlur = 26;
    }
    rr(ctx, x, y, w, h, r);
    if (on) {
      const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
      g.addColorStop(0, hexA(st.color, 0.78));
      g.addColorStop(1, hexA(st.color, 0.4));
      ctx.fillStyle = g;
    } else ctx.fillStyle = "rgba(255,255,255,.11)";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = on ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.22)";
    rr(ctx, x, y, w, h, r);
    ctx.stroke();
  } else {
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = on ? hexA(st.color, 0.3) : "rgba(255,255,255,.07)";
    ctx.fill();
    ctx.save();
    rr(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.fillStyle = st.color;
    ctx.fillRect(x, y, 9, h);
    ctx.restore();
    ctx.lineWidth = on ? 3 : 1.5;
    ctx.strokeStyle = on ? st.color : "rgba(255,255,255,.18)";
    rr(ctx, x, y, w, h, r);
    ctx.stroke();
  }
  const dark = !glass;
  const ink = dark ? d.ink ?? "#ffffff" : "#ffffff";
  const sub = dark ? d.sub ?? "rgba(255,255,255,.72)" : "rgba(255,255,255,.78)";
  const small = h < 70;
  const pad = 16;
  const av0 = small ? 0 : Math.min(84, Math.max(52, Math.round(w * 0.28)));
  const av = av0 && h - pad * 2 >= 40 ? Math.min(av0, h - pad * 2) : 0;
  const left = x + pad + (dark ? 6 : 0);
  let tx = left;
  if (av && d.photo) {
    // B2B(두 사람 사진이 준비된 칸)는 프로필 두 장을 겹쳐 붙인다
    const imgs = d.photo.pair ?? [d.photo];
    const step = av * 0.68;
    const cy = y + pad + av / 2;
    imgs.forEach((im, k) => {
      const cx = left + av / 2 + k * step;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, av / 2, 0, Math.PI * 2);
      ctx.clip();
      cover(ctx, im, on, cx - av / 2, cy - av / 2, av, av);
      ctx.restore();
      if (glass || d.photo!.pair) {
        ctx.lineWidth = glass ? 4 : 3;
        ctx.strokeStyle = st.color;
        ctx.beginPath();
        ctx.arc(cx, cy, av / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    tx = left + av + (imgs.length - 1) * step + 12;
  }
  const avail = x + w - pad - tx - (on ? 24 : 4);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const nameMax = Math.min(30, Math.round(w / 8));
  const nf = fit(ctx, d.name, avail, nameMax, small ? 12 : 14, small ? h - 22 : 64, (s) => "800 " + s + "px " + SANS, 2);
  ctx.fillStyle = ink;
  ctx.font = "800 " + nf.size + "px " + SANS;
  let ty = y + (small ? 8 : av ? y * 0 + pad + Math.max(0, (av - (nf.lines.length * nf.size * 1.1 + 22)) / 2) : pad);
  for (const l of nf.lines) {
    ctx.fillText(l, tx, ty);
    ty += nf.size * 1.1;
  }
  const ts = Math.max(13, Math.min(19, Math.round(w / 13)));
  ctx.fillStyle = sub;
  ctx.font = "600 " + ts + "px " + SANS;
  if (h - (ty - y) > ts + 6) ctx.fillText(d.time, tx, ty + 3);
  if (d.genre && !small && h > 130) {
    ctx.fillStyle = dark ? sub : "rgba(255,255,255,.65)";
    const gf = fit(ctx, d.genre, w - pad * 2 - 6, 17, 12, 40, (s) => "600 " + s + "px " + SANS, 2);
    ctx.font = "600 " + gf.size + "px " + SANS;
    let gy = y + pad + (av || 0) + 16;
    for (const l of gf.lines) {
      ctx.fillText(l, left, gy);
      gy += gf.size * 1.2;
    }
  }
  ctx.restore();
  if (on) check(ctx, x + w - 22, y + 24, 12, dark ? st.color : "#ffffff", dark ? st.ink : "#111111");
}

// ---------- 8 모노 포토: 사진이 카드 전체 · 가운데 이름 ----------
function mono(ctx: CanvasRenderingContext2D, d: BlockData) {
  const { x, y, w, h, st, on } = d;
  const r = Math.min(16, h / 4);
  ctx.save();
  if (on) {
    ctx.shadowColor = hexA(st.color, 0.5);
    ctx.shadowBlur = 22;
  }
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = "#15161a";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  const hasPhoto = !!d.photo && h > d.minPhoto;
  if (hasPhoto) {
    cover(ctx, d.photo!, on, x, y, w, h);
    // 안 고른 카드는 어둡게(회색 사진), 고른 카드는 글자가 읽힐 만큼만 살짝
    ctx.fillStyle = on ? "rgba(0,0,0,.4)" : "rgba(0,0,0,.5)";
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  ctx.lineWidth = on ? 4 : 2;
  ctx.strokeStyle = on ? st.color : "rgba(255,255,255,.2)";
  rr(ctx, x + 1, y + 1, w - 2, h - 2, r);
  ctx.stroke();
  const fg = on ? st.color : "#e9eaee";
  const sub = on ? st.color : "#aeb1b9";
  const ts = Math.max(13, Math.min(19, Math.round(w / 12)));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const nameMax = Math.min(36, Math.round(w / 6.5));
  const nf = fit(ctx, d.name.toUpperCase(), w - 22, nameMax, h < 80 ? 12 : 14, Math.max(24, h - ts - 26), (s) => "800 " + s + "px " + SANS, 3);
  const bh = nf.lines.length * nf.size * 1.08;
  let ty = y + (h - ts - 8) / 2 - bh / 2 + nf.size * 0.54;
  ctx.shadowColor = "rgba(0,0,0,.85)";
  ctx.shadowBlur = 6;
  ctx.font = "800 " + nf.size + "px " + SANS;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, nf.size / 5);
  ctx.strokeStyle = "rgba(0,0,0,.72)";
  for (const l of nf.lines) {
    if (on) ctx.strokeText(l, x + w / 2, ty);
    ctx.fillStyle = fg;
    ctx.fillText(l, x + w / 2, ty);
    ty += nf.size * 1.08;
  }
  ctx.font = "600 " + ts + "px " + SANS;
  ctx.lineWidth = 4;
  if (h > 56) {
    if (on) ctx.strokeText(d.time, x + w / 2, y + h - ts / 2 - 8);
    ctx.fillStyle = sub;
    ctx.fillText(d.time, x + w / 2, y + h - ts / 2 - 8);
  }
  ctx.shadowBlur = 0;
  ctx.restore();
  if (on) check(ctx, x + w - 20, y + 22, 11, st.color, st.ink);
}

// ---------- 4 듀오톤 블록 ----------
function duo(ctx: CanvasRenderingContext2D, d: BlockData) {
  const { x, y, w, h, st, on } = d;
  const bw = 4;
  ctx.save();
  if (on) {
    ctx.fillStyle = "rgba(255,255,255,.22)";
    ctx.fillRect(x + 6, y + 6, w, h);
  }
  ctx.fillStyle = on ? st.color : "rgba(11,11,13,.94)";
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // 이중톤 사진: 정사각형을 오른쪽 위에 두고 왼쪽·아래를 부드럽게 지운다
  if (d.photo && h > d.minPhoto) {
    const s = Math.round(w * 0.74);
    const oc = document.createElement("canvas");
    oc.width = s;
    oc.height = s;
    const o = oc.getContext("2d")!;
    o.fillStyle = st.color;
    o.fillRect(0, 0, s, s);
    o.globalCompositeOperation = "multiply";
    const img = d.photo;
    const k = Math.max(s / img.w, s / img.h);
    const sw = s / k, sh = s / k;
    o.drawImage(img.gray, (img.w - sw) / 2, (img.h - sh) * 0.3, sw, sh, 0, 0, s, s);
    o.globalCompositeOperation = "destination-in";
    const gx = o.createLinearGradient(0, 0, s, 0);
    gx.addColorStop(0, "rgba(0,0,0,0)");
    gx.addColorStop(0.38, "rgba(0,0,0,1)");
    gx.addColorStop(1, "rgba(0,0,0,1)");
    o.fillStyle = gx;
    o.fillRect(0, 0, s, s);
    const gy = o.createLinearGradient(0, 0, 0, s);
    gy.addColorStop(0, "rgba(0,0,0,1)");
    gy.addColorStop(0.62, "rgba(0,0,0,1)");
    gy.addColorStop(1, "rgba(0,0,0,0)");
    o.fillStyle = gy;
    o.fillRect(0, 0, s, s);
    ctx.globalAlpha = on ? 1 : 0.7;
    ctx.drawImage(oc, x + w - s, y);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.lineWidth = bw * 2;
  ctx.strokeStyle = st.color;
  ctx.strokeRect(x, y, w, h);
  const small = h < 70;
  const pad = 14;
  // 시간 칩
  const ts = Math.max(13, Math.min(20, Math.round(w / 11)));
  ctx.font = "700 " + ts + "px " + SANS;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  if (!small) {
    const cw = ctx.measureText(d.time).width + ts;
    const ch = Math.round(ts * 1.6);
    ctx.fillStyle = on ? st.ink : "rgba(0,0,0,.76)";
    rr(ctx, x + 10, y + 10, cw, ch, 4);
    ctx.fill();
    ctx.fillStyle = st.color;
    ctx.fillText(d.time, x + 10 + ts / 2, y + 10 + ch / 2 + 1);
  }
  // 이름 (Anton, 선택하면 하얀 테두리 글자)
  ctx.textBaseline = "top";
  const nameMax = Math.min(46, Math.round(w / 4.6));
  const nf = fit(ctx, d.name.toUpperCase(), w - pad * 2, nameMax, small ? 13 : 17, small ? h - 14 : Math.min(h * 0.4, 130), (s) => "400 " + s + "px " + ANTON, 3);
  const nh = nf.lines.length * nf.size * 1.0;
  let ty = small ? y + Math.max(6, (h - nh - (small ? 0 : ts)) / 2) : y + h - 14 - nh;
  ctx.font = "400 " + nf.size + "px " + ANTON;
  ctx.lineJoin = "round";
  for (const l of nf.lines) {
    if (on) {
      ctx.lineWidth = nf.size * 0.24;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeText(l, x + pad, ty);
    }
    ctx.fillStyle = on ? st.ink : "#ffffff";
    ctx.fillText(l, x + pad, ty);
    ty += nf.size;
  }
  if (small) {
    ctx.font = "700 " + Math.max(12, ts - 2) + "px " + SANS;
    ctx.fillStyle = on ? st.ink : st.color;
    ctx.fillText(d.time, x + pad, ty + 2);
  }
  ctx.restore();
  if (on && !small) check(ctx, x + w - 22, y + 22, 11, st.ink, st.color, true);
}

// ---------- 6 폴라로이드 ----------
function polaroid(ctx: CanvasRenderingContext2D, d: BlockData) {
  const { x, y, w, h, st, on } = d;
  const k = hash(d.id);
  const ang = ((k % 2 ? -1 : 1) * (0.9 + (k % 5) * 0.25) * Math.PI) / 180;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(ang);
  ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.shadowColor = "rgba(0,0,0,.55)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = on ? "#fbf8f0" : "#c9c4b8";
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (on) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = st.color;
    ctx.strokeRect(x, y, w, h);
  }
  const small = h < 90;
  const pad = 10;
  const cap = small ? 0 : Math.min(60, Math.max(46, h * 0.18));
  if (d.photo && h > d.minPhoto && !small) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + pad, y + pad, w - pad * 2, h - pad - cap - 6);
    ctx.clip();
    cover(ctx, d.photo, on, x + pad, y + pad, w - pad * 2, h - pad - cap - 6);
    ctx.restore();
  }
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const ts = Math.max(12, Math.min(18, Math.round(w / 13)));
  const timeW = (() => {
    ctx.font = "500 " + ts + "px " + MONO;
    return ctx.measureText(d.time).width;
  })();
  const capY = small ? y + h / 2 : y + h - cap / 2 - 2;
  const nameMax = Math.min(40, Math.round(w / 6.2));
  const nf = fit(ctx, d.name, w - pad * 2 - (small ? 0 : Math.min(timeW, w * 0.4) + 10), nameMax, small ? 14 : 18, cap + (small ? h - 16 : 0), (s) => "700 " + s + "px " + MARKER, 2);
  ctx.fillStyle = "#25231f";
  ctx.font = "700 " + nf.size + "px " + MARKER;
  const nh = nf.lines.length * nf.size;
  let ly = capY - nh / 2 + nf.size / 2;
  for (const l of nf.lines) {
    ctx.fillText(l, x + pad + 2, ly);
    ly += nf.size;
  }
  ctx.fillStyle = "#6d675a";
  ctx.font = "500 " + ts + "px " + MONO;
  ctx.textAlign = "right";
  if (!small) ctx.fillText(d.time, x + w - pad - 2, capY);
  else {
    ctx.textAlign = "left";
    ctx.fillText(d.time, x + pad + 2, y + h - 14);
  }
  // 마스킹테이프
  ctx.save();
  ctx.translate(x + w / 2, y);
  ctx.rotate(-0.05);
  ctx.globalAlpha = on ? 0.95 : 0.6;
  ctx.fillStyle = st.color;
  ctx.fillRect(-36, -12, 72, 24);
  ctx.restore();
  ctx.restore();
  if (on) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(ang);
    ctx.translate(-(x + w / 2), -(y + h / 2));
    check(ctx, x + w - 4, y + 4, 15, "#e8402f", "#ffffff");
    ctx.restore();
  }
}

// ---------- 7 터미널 레이브 ----------
function term(ctx: CanvasRenderingContext2D, d: BlockData) {
  const { x, y, w, h, st, on } = d;
  ctx.save();
  if (on) {
    ctx.shadowColor = hexA(st.color, 0.55);
    ctx.shadowBlur = 20;
  }
  ctx.fillStyle = on ? st.color : "rgba(10,18,13,.94)";
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = on ? st.color : hexA(st.color, 0.7);
  if (!on) ctx.setLineDash([8, 6]);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.setLineDash([]);
  const fg = on ? st.ink : st.color;
  const pad = 12;
  const ts = Math.max(12, Math.min(18, Math.round(w / 13)));
  ctx.textBaseline = "top";
  ctx.font = "500 " + ts + "px " + MONO;
  ctx.fillStyle = fg;
  ctx.textAlign = "left";
  ctx.fillText(d.time, x + pad, y + 10);
  ctx.textAlign = "right";
  ctx.fillText(on ? "[x]" : "[ ]", x + w - pad, y + 10);
  ctx.textAlign = "left";
  const small = h < 80;
  const ph = small ? 0 : Math.min(124, Math.max(70, Math.round(w * 0.36)));
  let tx = x + pad;
  const top = y + 10 + ts + 8;
  if (d.photo && ph && h > d.minPhoto) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + pad, top, ph, ph);
    ctx.clip();
    ctx.fillStyle = "#000";
    ctx.fillRect(x + pad, top, ph, ph);
    if (d.photo.pair) {
      d.photo.pair.forEach((im, k) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + pad + (k * ph) / 2, top, ph / 2, ph);
        ctx.clip();
        cover(ctx, im, on, x + pad + (k * ph) / 2, top, ph / 2, ph);
        ctx.restore();
      });
    } else cover(ctx, d.photo, on, x + pad, top, ph, ph);
    // 선택하면 색 입히기를 걷어내고 원본 컬러 그대로
    if (!on) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = st.color;
      ctx.fillRect(x + pad, top, ph, ph);
    }
    ctx.restore();
    tx = x + pad + ph + 10;
  }
  const avail = x + w - pad - tx;
  const nf = fit(ctx, d.name.toUpperCase(), avail, Math.min(26, Math.round(w / 9)), small ? 12 : 13, small ? h - ts - 24 : 70, (s) => "500 " + s + "px " + MONO, 3);
  ctx.fillStyle = on ? st.ink : "#e8fff2";
  ctx.font = "500 " + nf.size + "px " + MONO;
  let ty = small ? top : top;
  for (const l of nf.lines) {
    ctx.fillText(l, tx, ty);
    ty += nf.size * 1.12;
  }
  if (d.genre && !small && h > 120) {
    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.78;
    const gf = fit(ctx, d.genre.toUpperCase(), avail, 15, 11, 44, (s) => "500 " + s + "px " + MONO, 2);
    ctx.font = "500 " + gf.size + "px " + MONO;
    for (const l of gf.lines) {
      ctx.fillText(l, tx, ty + 4);
      ty += gf.size * 1.15;
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** 무대 이름 줄 (모양에 따라 블록·유리 알약·테이프·터미널 틀). poster·minimal 은 기본 표기를 그대로 쓰므로 false 를 돌려준다 */
export function themedStageLabel(ctx: CanvasRenderingContext2D, theme: CardTheme, st: FStage, x: number, w: number, cy: number): boolean {
  const top = cy - 52, hh = 58;
  const name = st.name.toUpperCase();
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  if (theme === "duo") {
    ctx.fillStyle = st.color;
    ctx.fillRect(x, top, w, hh);
    const f = fit(ctx, name, w - 16, 28, 12, hh - 8, (s) => "400 " + s + "px " + ANTON, 2);
    ctx.fillStyle = st.ink;
    ctx.font = "400 " + f.size + "px " + ANTON;
    const lh = f.size * 1.02;
    f.lines.forEach((l, i) => ctx.fillText(l, x + w / 2, top + hh / 2 - ((f.lines.length - 1) * lh) / 2 + i * lh));
    return true;
  }
  if (theme === "lock") {
    ctx.fillStyle = "rgba(255,255,255,.14)";
    rr(ctx, x, top + 6, w, hh - 12, (hh - 12) / 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = 2;
    rr(ctx, x, top + 6, w, hh - 12, (hh - 12) / 2);
    ctx.stroke();
    const f = fit(ctx, name, w - 56, 24, 12, 40, (s) => "800 " + s + "px " + SANS, 1);
    ctx.font = "800 " + f.size + "px " + SANS;
    const tw = ctx.measureText(f.lines[0]).width;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(f.lines[0], x + w / 2 + 10, cy - 23);
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(x + w / 2 - tw / 2 - 6, cy - 23, 8, 0, Math.PI * 2);
    ctx.fill();
    return true;
  }
  if (theme === "polaroid") {
    // 글자가 작아 보이지 않게 칸을 크게(64px) 하고 두 줄까지 쓴다
    const H2 = 66, t2 = cy - 62;
    ctx.save();
    ctx.translate(x + w / 2, t2 + H2 / 2);
    ctx.rotate(-0.02);
    ctx.fillStyle = st.color;
    ctx.fillRect(-w / 2 + 2, -H2 / 2, w - 4, H2);
    ctx.restore();
    const f = fit(ctx, name, w - 20, 32, 14, H2 - 10, (z) => "800 " + z + "px " + SANS, 2);
    ctx.fillStyle = "#1b1b1b";
    ctx.font = "800 " + f.size + "px " + SANS;
    ctx.textAlign = "center";
    const lh = f.size * 1.05;
    f.lines.forEach((l, k) => ctx.fillText(l, x + w / 2, t2 + H2 / 2 - ((f.lines.length - 1) * lh) / 2 + k * lh));
    return true;
  }
  if (theme === "term") {
    const H2 = 66, t2 = cy - 62;
    ctx.fillStyle = hexA(st.color, 0.16);
    ctx.fillRect(x, t2, w, H2);
    ctx.strokeStyle = st.color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 1.25, t2 + 1.25, w - 2.5, H2 - 2.5);
    const f = fit(ctx, "> " + name, w - 22, 30, 13, H2 - 12, (z) => "500 " + z + "px " + MONO, 2);
    ctx.fillStyle = st.color;
    ctx.font = "500 " + f.size + "px " + MONO;
    ctx.textAlign = "left";
    const lh = f.size * 1.08;
    f.lines.forEach((l, k) => ctx.fillText(l, x + 12, t2 + H2 / 2 - ((f.lines.length - 1) * lh) / 2 + k * lh));
    return true;
  }
  return false;
}
