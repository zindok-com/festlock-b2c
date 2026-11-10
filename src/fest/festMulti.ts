// 무대가 많은 페스티벌(6~8개)의 배경화면. 규칙은 docs/무대-많은-페스티벌-UIUX.md 3장.
//  보기(view)
//   - "ai"  AI 추천(자동 배치). 고른 공연에 맞춰 아래 세 가지 중 가장 읽기 좋은 모양을 고른다
//       · 2안(packed) 고른 공연만. 칸은 최대 5개(많이 고른 무대부터), 나머지 무대는 시간이 안 겹치는 칸에 통째로 끼워 넣고 이름표를 붙인다. 60분 넘게 비는 시간은 접는다
//       · 1안(grid)   한 시간에 5팀 이상 고르는 등 2안으로 못 담을 때. 고른 무대의 공연을 전부 그리고 고른 칸만 색칠
//       · 3안(text)   옵션 "DJ 사진 빼기": 무대 색 블록 + 글자만. 5곳 이상이면 4곳씩 위·아래 두 줄
//   - "all" 전체 스테이지. 고른 공연이 하나라도 있는 무대를 모두 그리고, 안 고른 공연은 어둡게 보여 준다 (고른 공연이 없는 무대는 뺀다)
// 배경·제목만 페스티벌마다 다르게 그린다(MultiLook).
import { RATIO_H, SANS, canvas, cover, hexA, margins, rr, type Img, type Ratio } from "./festCanvas";
import { fmt, type FDay, type FItem, type FStage } from "./types";

const W = 1080;
export const MAX_COLS = 5;
export const BUSY_LIMIT = 5;
/** 이보다 길게 비면 접는다(분) */
const FOLD_MIN = 60;
/** 접힌 줄 높이, 무대 이름 줄 높이 */
const BREAK = 46;
const HEAD = 76;

export type MultiView = "ai" | "all";
/** 실제로 그려진 모양 (투표·기록에 쓴다) */
export type MultiLayout = "empty" | "all" | "text" | "packed" | "grid";

export interface MultiLook {
  /** 배경 */
  bg: (ctx: CanvasRenderingContext2D, H: number) => void;
  /** 제목·날짜·FestLock 표시를 그리고, 표가 시작될 y를 돌려준다 */
  title: (ctx: CanvasRenderingContext2D, top: number, compact: boolean, day: FDay) => number;
  /** 시간 글자, 시간 줄, 접힌 곳 글자·점선, 무대 이름 */
  time: string;
  line: string;
  fold: string;
  name: string;
  nameSub: string;
  /** 이름표 뒤 바탕 (배경과 같은 어두운 색) */
  labelBg: string;
}

export interface MultiOpt {
  look: MultiLook;
  day: FDay;
  stages: FStage[];
  /** 그날 공연 전체 */
  items: FItem[];
  sel: Set<string>;
  photos: Map<string, Img>;
  ratio: Ratio;
  lock: boolean;
  compact: boolean;
  /** DJ 사진 빼기 (3안) */
  noPhoto: boolean;
  /** 보기: AI 추천 / 전체 스테이지 */
  view: MultiView;
  nameOf: (it: FItem) => string;
  photoOf: (it: FItem) => string | undefined;
}

export type Plan =
  | { mode: "packed"; lanes: FStage[]; laneOf: Map<string, number>; busiest: number }
  | { mode: "grid"; reason: "busy" | "stuck"; busiest: number };

const overlaps = (a: FItem, b: FItem) => a.s < b.e && b.s < a.e;

/** 가장 붐비는 1시간에 고른 공연 수 (그 1시간에 조금이라도 걸치면 센다) */
export function busiestHour(list: FItem[]): number {
  let best = 0;
  for (const a of list) best = Math.max(best, list.filter((i) => i.s < a.s + 60 && i.e > a.s).length);
  return best;
}

/** 시간축 조각: 고른 공연이 있는 구간들. FOLD_MIN분 넘게 비는 곳은 끊어서 접는다 */
export function segmentsOf(list: FItem[]): [number, number][] {
  const iv = list.map((i) => [i.s, i.e] as [number, number]).sort((x, y) => x[0] - y[0]);
  const segs: [number, number][] = [];
  for (const [s, e] of iv) {
    const last = segs[segs.length - 1];
    if (last && s - last[1] <= FOLD_MIN) last[1] = Math.max(last[1], e);
    else segs.push([s, e]);
  }
  // 조각 시작은 정각·30분에 맞춘다
  for (const g of segs) g[0] = Math.floor(g[0] / 30) * 30;
  if (segs.length === 1 && segs[0][1] - segs[0][0] < 120) segs[0][1] = segs[0][0] + 120;
  return segs;
}

function combos<T>(arr: T[], r: number): T[][] {
  if (r === 0) return [[]];
  if (arr.length < r) return [];
  const [h, ...t] = arr;
  return [...combos(t, r - 1).map((c) => [h, ...c]), ...combos(t, r)];
}

/**
 * 2안 배치: 칸이 될 무대(최대 5개)를 많이 고른 조합부터 시도하고, 칸에 못 든 무대는
 * 그 무대 공연 전부를 받아 줄 수 있는 한 칸에 통째로 넣는다. 어떤 조합으로도 안 되면 1안.
 */
export function planPacked(stages: FStage[], picked: FItem[]): Plan {
  const busiest = busiestHour(picked);
  if (busiest >= BUSY_LIMIT) return { mode: "grid", reason: "busy", busiest };
  const byStage = (k: string) => picked.filter((i) => i.stage === k);
  const used = stages.filter((s) => byStage(s.key).length > 0);
  const weight = (l: FStage[]) => l.reduce((t, s) => t + byStage(s.key).length, 0);
  const tries = used.length <= MAX_COLS ? [used] : combos(used, MAX_COLS).sort((a, b) => weight(b) - weight(a));
  for (const lanes of tries) {
    const laneItems = lanes.map((s) => byStage(s.key));
    const guests = used.filter((s) => !lanes.includes(s)).sort((a, b) => byStage(b.key).length - byStage(a.key).length);
    const pick: number[] = [];
    const place = (g: number): boolean => {
      if (g === guests.length) return true;
      const its = byStage(guests[g].key);
      for (let k = 0; k < lanes.length; k++) {
        if (laneItems[k].some((o) => its.some((it) => overlaps(o, it)))) continue;
        laneItems[k].push(...its);
        pick[g] = k;
        if (place(g + 1)) return true;
        laneItems[k].splice(laneItems[k].length - its.length, its.length);
      }
      return false;
    };
    if (!place(0)) continue;
    const laneOf = new Map<string, number>();
    lanes.forEach((s, k) => byStage(s.key).forEach((it) => laneOf.set(it.id, k)));
    guests.forEach((s, g) => byStage(s.key).forEach((it) => laneOf.set(it.id, pick[g])));
    return { mode: "packed", lanes, laneOf, busiest };
  }
  return { mode: "grid", reason: "stuck", busiest };
}

/** 어떤 모양으로 그려지는지 (그리기 전에 사진을 얼마나 불러올지 정하고, 투표 기록에도 쓴다) */
export function layoutOf(o: Pick<MultiOpt, "stages" | "items" | "sel" | "noPhoto" | "view">): MultiLayout {
  const picked = o.items.filter((i) => o.sel.has(i.id));
  if (!picked.length) return "empty";
  if (o.view === "all") return "all";
  if (o.noPhoto) return "text";
  return planPacked(o.stages, picked).mode;
}

/** 글자를 폭에 맞춰 최대 3줄로 (안 되면 글자를 줄이고, 그래도 넘치면 …) */
function fitLines(ctx: CanvasRenderingContext2D, text: string, w: number, maxSize: number, minSize: number, maxH: number): { size: number; lines: string[] } {
  for (let size = maxSize; size >= minSize; size--) {
    ctx.font = "800 " + size + "px " + SANS;
    const lines: string[] = [];
    let cur = "";
    let ok = true;
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
    if (ok && lines.length <= 3 && lines.length * size * 1.1 <= maxH) return { size, lines };
  }
  ctx.font = "800 " + minSize + "px " + SANS;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > w) t = t.slice(0, -1);
  return { size: minSize, lines: [t === text ? t : t + "…"] };
}

interface BlockStyle {
  /** 고른 공연이면 true (false = 어둡게) */
  on: boolean;
  /** 테두리를 그릴지 (전체 표에서 고른 칸·안 고른 칸을 구분) */
  frame: boolean;
  /** 이 높이(px)보다 커야 사진을 깐다 */
  minPhoto: number;
}
const PACKED: BlockStyle = { on: true, frame: false, minPhoto: 110 };

/**
 * 공연 칸 하나. 사진이 있는 칸은 시간을 위쪽 알약으로, 이름을 아래쪽에 둔다 (시간 글자가 바닥에 붙어 보이지 않게).
 * 사진이 없거나 작은 칸은 이름 아래에 시간을 둔다.
 */
function drawBlock(ctx: CanvasRenderingContext2D, o: MultiOpt, st: FStage, it: FItem, photo: Img | undefined, x: number, y: number, w: number, h: number, bs: BlockStyle = PACKED) {
  const { on } = bs;
  const r = Math.min(14, h / 3);
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = on ? st.color : "rgba(16,9,7,.94)";
  ctx.fillRect(x, y, w, h);
  const hasPhoto = !!photo && h > bs.minPhoto;
  if (photo && hasPhoto) {
    cover(ctx, photo, on, x, y, w, h);
    if (!on) {
      ctx.fillStyle = "rgba(10,6,4,.22)";
      ctx.fillRect(x, y, w, h);
    }
    // 아래쪽 이름이 읽히도록 무대 색(안 고른 칸은 검정)으로 서서히 덮는다. 얼굴(위쪽)은 가리지 않게 아래 45%만
    const gh = Math.min(h, Math.max(h * 0.45, 70));
    const gc = on ? st.color : "#100907";
    const gr = ctx.createLinearGradient(0, y + h - gh, 0, y + h);
    gr.addColorStop(0, hexA(gc, 0));
    gr.addColorStop(0.6, hexA(gc, on ? 0.92 : 0.82));
    gr.addColorStop(1, hexA(gc, on ? 1 : 0.94));
    ctx.fillStyle = gr;
    ctx.fillRect(x, y + h - gh, w, gh);
  }
  const small = h < 64;
  const pad = small ? 7 : 10;
  const timeStr = fmt(it.s) + "–" + fmt(it.e);
  const ts = Math.max(13, Math.min(22, Math.round(w / 9)));
  ctx.textAlign = "left";
  // 시간 알약 (사진 칸, 높이 96px 이상)
  const pill = hasPhoto && h >= 96;
  let topUsed = 0;
  if (pill) {
    ctx.font = "800 " + ts + "px " + SANS;
    const ph = Math.round(ts * 1.6);
    const pw = ctx.measureText(timeStr).width + ts;
    ctx.fillStyle = "rgba(8,5,4,.78)";
    rr(ctx, x + 8, y + 8, pw, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(timeStr, x + 8 + ts / 2, y + 8 + ph / 2 + 1);
    topUsed = 8 + ph;
  }
  // 이름 (+ 알약이 없으면 이름 아래에 시간)
  ctx.textBaseline = "top";
  const timeUnder = !pill;
  let maxNameH = Math.max(16, h - pad * 2 - topUsed - (timeUnder ? ts + 4 : 0));
  // 사진이 있으면 이름이 얼굴을 덮지 않게 칸 높이의 38%까지만 (넘으면 글자를 줄인다)
  if (hasPhoto) maxNameH = Math.max(18, Math.min(maxNameH, h * 0.38));
  const fit = fitLines(ctx, o.nameOf(it), w - pad * 2, Math.min(34, Math.round(w / 5.5)), small ? 11 : 14, maxNameH);
  const nameH = fit.lines.length * fit.size * 1.1;
  const showTime = timeUnder && h - pad * 2 - topUsed >= nameH + ts + 4;
  const blockH = nameH + (showTime ? ts + 4 : 0);
  // 사진 칸은 아래에서부터(바닥 여백 12px), 그 밖의 칸은 위에서부터
  let ty = hasPhoto ? y + h - (pill ? 14 : pad) - blockH : y + pad + topUsed;
  ctx.fillStyle = on ? st.ink : "rgba(236,224,200,.86)";
  ctx.font = "800 " + fit.size + "px " + SANS;
  for (const l of fit.lines) {
    ctx.fillText(l, x + pad, ty);
    ty += fit.size * 1.1;
  }
  if (showTime) {
    ctx.fillStyle = on ? hexA(st.ink.length === 7 ? st.ink : "#000000", 0.82) : "rgba(236,224,200,.7)";
    ctx.font = "700 " + ts + "px " + SANS;
    ctx.fillText(timeStr, x + pad, ty + 2);
  }
  ctx.restore();
  if (bs.frame) {
    ctx.lineWidth = on ? 3 : 1.5;
    ctx.strokeStyle = on ? "#ffffff" : "rgba(246,227,192,.2)";
    rr(ctx, x, y, w, h, r);
    ctx.stroke();
  }
  ctx.textBaseline = "alphabetic";
}

/** 무대 이름 + 무대 색 밑줄. cy = 밑줄 위치. 이름이 두 단어 이상이면 첫 단어를 작게 윗줄에 */
function stageLabel(ctx: CanvasRenderingContext2D, look: MultiLook, st: FStage, x: number, w: number, cy: number, bg?: string) {
  const [a, ...rest] = st.name.split(" ");
  const l1 = rest.length ? a : "", l2 = rest.length ? rest.join(" ") : a;
  if (bg) {
    ctx.fillStyle = bg;
    rr(ctx, x, cy - 60, w, 68, 10);
    ctx.fill();
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (l1) {
    ctx.fillStyle = look.nameSub;
    let f1 = 18;
    ctx.font = "800 " + f1 + "px " + SANS;
    while (f1 > 11 && ctx.measureText(l1).width > w - 8) ctx.font = "800 " + --f1 + "px " + SANS;
    ctx.fillText(l1, x + w / 2, cy - 34);
  }
  ctx.fillStyle = look.name;
  let f2 = l1 ? 26 : 30;
  ctx.font = "800 " + f2 + "px " + SANS;
  while (f2 > 12 && ctx.measureText(l2).width > w - 8) ctx.font = "800 " + --f2 + "px " + SANS;
  ctx.fillText(l2, x + w / 2, cy - (l1 ? 8 : 14));
  ctx.fillStyle = st.color;
  ctx.fillRect(x + 4, cy, w - 8, 5);
}

/** 시간 → y. 접힌 곳은 BREAK 만큼만 차지한다 */
function scale(segs: [number, number][], gy0: number, ppm: number) {
  return (t: number) => {
    let acc = 0;
    for (let k = 0; k < segs.length; k++) {
      const [s0, s1] = segs[k];
      if (t <= s1 || k === segs.length - 1) return gy0 + (acc + Math.max(0, t - s0)) * ppm + k * BREAK;
      acc += s1 - s0;
    }
    return gy0;
  };
}

/** 시간 줄 + 접힌 곳 표시 */
function axis(ctx: CanvasRenderingContext2D, look: MultiLook, segs: [number, number][], yOf: (t: number) => number, x0: number, x1: number) {
  ctx.textBaseline = "middle";
  segs.forEach(([s0, s1], k) => {
    const marks = [s0];
    for (let m = Math.ceil((s0 + 1) / 60) * 60; m <= s1; m += 60) marks.push(m);
    for (const m of marks) {
      const y = yOf(m);
      ctx.strokeStyle = look.line;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0 - 4, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillStyle = look.time;
      ctx.font = "700 22px " + SANS;
      ctx.fillText(fmt(m), x0 - 12, y);
    }
    if (k < segs.length - 1) {
      const yb = yOf(s1) + BREAK / 2;
      ctx.strokeStyle = hexA(look.fold, 0.4);
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(x0 - 4, yb);
      ctx.lineTo(x1, yb);
      ctx.stroke();
      ctx.setLineDash([]);
      const label = "⋯  " + fmt(s1) + " – " + fmt(segs[k + 1][0]) + "  ⋯";
      ctx.font = "700 20px " + SANS;
      const lw = ctx.measureText(label).width + 28;
      ctx.fillStyle = look.labelBg;
      rr(ctx, (x0 + x1) / 2 - lw / 2, yb - 16, lw, 32, 8);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = look.fold;
      ctx.fillText(label, (x0 + x1) / 2, yb);
    }
  });
  ctx.textBaseline = "alphabetic";
}

const X0 = 104, X1 = W - 40, GAP = 10;

/** 2안: 고른 공연만 한 줄 */
function drawPacked(ctx: CanvasRenderingContext2D, o: MultiOpt, picked: FItem[], plan: Extract<Plan, { mode: "packed" }>, y0: number, y1: number) {
  const byKey = Object.fromEntries(o.stages.map((s) => [s.key, s]));
  const n = plan.lanes.length;
  // 칸이 1~2개면 너무 넓어지지 않게 가운데로 모은다
  const colW = Math.min((X1 - X0 - GAP * (n - 1)) / n, 300);
  const xs = X0 + (X1 - X0 - (colW * n + GAP * (n - 1))) / 2;
  const segs = segmentsOf(picked);
  const mins = segs.reduce((t, g) => t + g[1] - g[0], 0);
  const gy0 = y0 + HEAD;
  const ppm = (y1 - gy0 - BREAK * (segs.length - 1)) / mins;
  const yOf = scale(segs, gy0, ppm);
  plan.lanes.forEach((st, k) => stageLabel(ctx, o.look, st, xs + k * (colW + GAP), colW, y0 + 58));
  axis(ctx, o.look, segs, yOf, X0, X1);
  // 칸 안에서 무대가 바뀌는 곳에 무대 이름표 (끼워 넣은 무대가 시작될 때, 다시 원래 무대로 돌아올 때)
  const LABEL = 76;
  for (const it of picked) {
    const k = plan.laneOf.get(it.id)!;
    const x = xs + k * (colW + GAP);
    let y = yOf(it.s) + 2, h = yOf(it.e) - yOf(it.s) - 4;
    const before = picked.filter((p) => p !== it && plan.laneOf.get(p.id) === k && p.e <= it.s).sort((a, b) => b.e - a.e);
    const prevStage = before[0]?.stage ?? plan.lanes[k].key;
    if (prevStage !== it.stage) {
      const prevEnd = Math.max(gy0, ...before.map((p) => yOf(p.e)));
      if (y - prevEnd >= LABEL + 6) stageLabel(ctx, o.look, byKey[it.stage], x, colW, y - 12, o.look.labelBg);
      else {
        // 빈자리가 없으면 칸 위쪽을 이름표로 쓰고 공연 칸은 그만큼 아래로
        stageLabel(ctx, o.look, byKey[it.stage], x, colW, y + LABEL - 12, o.look.labelBg);
        y += LABEL;
        h -= LABEL;
      }
    }
    if (h > 8) drawBlock(ctx, o, byKey[it.stage], it, o.photos.get(o.photoOf(it) ?? ""), x, y, colW, h);
  }
}

/** 3안 (DJ 사진 빼기): 무대 색 블록에 글자만. 5곳 이상이면 앞 4곳은 위, 나머지는 아래 */
function drawTextBands(ctx: CanvasRenderingContext2D, o: MultiOpt, picked: FItem[], y0: number, y1: number) {
  const used = o.stages.filter((s) => picked.some((i) => i.stage === s.key));
  const groups = used.length > 4 ? [used.slice(0, 4), used.slice(4)] : [used];
  const gapY = 40;
  const cols = Math.max(...groups.map((g) => g.length));
  const colW = Math.min((X1 - X0 - GAP * (cols - 1)) / cols, 300);
  const xs = X0 + (X1 - X0 - (colW * cols + GAP * (cols - 1))) / 2;
  // 위·아래 줄 높이를 똑같이 나누고, 줄마다 그 높이를 시간으로 꽉 채운다
  const bandH = (y1 - y0 - gapY * (groups.length - 1)) / groups.length;
  let by = y0;
  for (const stages of groups) {
    const list = picked.filter((i) => stages.some((s) => s.key === i.stage));
    const segs = segmentsOf(list);
    const mins = segs.reduce((t, g) => t + g[1] - g[0], 0);
    const gy0 = by + HEAD;
    const ppm = (bandH - HEAD - BREAK * (segs.length - 1)) / mins;
    const yOf = scale(segs, gy0, ppm);
    stages.forEach((st, k) => stageLabel(ctx, o.look, st, xs + k * (colW + GAP), colW, by + 58));
    axis(ctx, o.look, segs, yOf, X0, X1);
    for (const it of list) {
      const k = stages.findIndex((s) => s.key === it.stage);
      const y = yOf(it.s) + 2, h = yOf(it.e) - yOf(it.s) - 4;
      if (h > 8) drawBlock(ctx, o, stages[k], it, undefined, xs + k * (colW + GAP), y, colW, h);
    }
    by += bandH + gapY;
  }
}

/**
 * 전체 표: 고른 공연이 하나라도 있는 무대만 그리고(없는 무대는 뺀다), 그 무대의 공연을 모두 보여 준다.
 * 고른 공연은 무대 색 + 흰 테두리, 안 고른 공연은 어둡게(흑백 사진). scope "all" = 그 무대들의 전체 시간, "picked" = 고른 공연 범위만
 */
function drawFull(ctx: CanvasRenderingContext2D, o: MultiOpt, picked: FItem[], y0: number, y1: number, scope: "all" | "picked") {
  const stages = o.stages.filter((s) => picked.some((i) => i.stage === s.key));
  const items = o.items.filter((i) => stages.some((s) => s.key === i.stage));
  const base = scope === "all" ? items : picked;
  const a = Math.floor(Math.min(...base.map((i) => i.s)) / 60) * 60;
  let b = Math.max(...base.map((i) => i.e));
  if (b - a < 180) b = a + 180;
  const n = stages.length;
  const colW = Math.min((X1 - X0 - GAP * (n - 1)) / n, 300);
  const xs = X0 + (X1 - X0 - (colW * n + GAP * (n - 1))) / 2;
  const gy0 = y0 + HEAD;
  const ppm = (y1 - gy0) / (b - a);
  stages.forEach((st, k) => stageLabel(ctx, o.look, st, xs + k * (colW + GAP), colW, y0 + 58));
  // 시간 줄
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  for (let m = Math.ceil(a / 60) * 60; m <= b; m += 60) {
    const y = gy0 + (m - a) * ppm;
    ctx.strokeStyle = o.look.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X0 - 4, y);
    ctx.lineTo(X1, y);
    ctx.stroke();
    ctx.fillStyle = o.look.time;
    ctx.font = "700 22px " + SANS;
    ctx.fillText(fmt(m), X0 - 12, y);
  }
  ctx.textBaseline = "alphabetic";
  const byKey = Object.fromEntries(stages.map((s) => [s.key, s]));
  for (const it of items) {
    const k = stages.findIndex((s) => s.key === it.stage);
    const s0 = Math.max(it.s, a), e0 = Math.min(it.e, b);
    if (k < 0 || e0 <= s0) continue;
    const h = (e0 - s0) * ppm - 4;
    if (h > 8) drawBlock(ctx, o, byKey[it.stage], it, o.photos.get(o.photoOf(it) ?? ""), xs + k * (colW + GAP), gy0 + (s0 - a) * ppm + 2, colW, h, { on: o.sel.has(it.id), frame: true, minPhoto: 70 });
  }
}

export function renderMulti(o: MultiOpt): HTMLCanvasElement {
  const H = RATIO_H[o.ratio];
  const [cv, ctx] = canvas(H);
  o.look.bg(ctx, H);
  const picked = o.items.filter((i) => o.sel.has(i.id)).sort((a, b) => a.s - b.s);
  if (!picked.length) return cv;
  const [top, bottom] = margins(H, o.lock, 70, 96);
  const y0 = o.look.title(ctx, top, o.compact, o.day);
  const y1 = H - bottom;
  const layout = layoutOf(o);
  // 투표·기록에 쓸 정보를 캔버스에 붙여 둔다
  cv.dataset.layout = layout;
  cv.dataset.view = o.view;
  cv.dataset.picks = String(picked.length);
  cv.dataset.stages = String(new Set(picked.map((i) => i.stage)).size);
  cv.dataset.busiest = String(busiestHour(picked));
  if (layout === "all") drawFull(ctx, o, picked, y0, y1, "all");
  else if (layout === "text") drawTextBands(ctx, o, picked, y0, y1);
  else {
    const plan = planPacked(o.stages, picked);
    if (plan.mode === "packed") drawPacked(ctx, o, picked, plan, y0, y1);
    else drawFull(ctx, o, picked, y0, y1, "picked"); // 1안
  }
  return cv;
}
