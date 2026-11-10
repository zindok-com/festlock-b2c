// ZONNAFE 배경화면의 배경·제목 (포스터 느낌: 검은 바탕 + 가운데서 퍼지는 붉은 집중선 + 주황·크림색 굵은 글자)
import { compactRight, tagRow } from "./festCanvas";
import type { MultiLook } from "./festMulti";
import type { FDay } from "./types";

const W = 1080;
const ANTON = '"Anton","Rubik","Noto Sans KR",system-ui,sans-serif';
const CREAM = "#f6e3c0";
const ORANGE = "#ff8a3d";

function bg(ctx: CanvasRenderingContext2D, H: number) {
  ctx.fillStyle = "#0a0605";
  ctx.fillRect(0, 0, W, H);
  // 가운데 붉은 빛
  const cx = W / 2, cy = H * 0.4;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.62);
  glow.addColorStop(0, "rgba(214,48,24,.42)");
  glow.addColorStop(0.55, "rgba(150,26,14,.16)");
  glow.addColorStop(1, "rgba(10,6,5,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // 집중선 (매번 같은 모양)
  let seed = 14;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = Math.hypot(W, H);
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 110; i++) {
    const a = rnd() * Math.PI * 2, wd = 0.004 + rnd() * 0.014, r0 = 170 + rnd() * 320;
    ctx.fillStyle = rnd() > 0.72 ? "rgba(255,150,70," + (0.05 + rnd() * 0.07).toFixed(3) + ")" : "rgba(226,54,28," + (0.06 + rnd() * 0.12).toFixed(3) + ")";
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a - wd) * R, Math.sin(a - wd) * R);
    ctx.lineTo(Math.cos(a + wd) * R, Math.sin(a + wd) * R);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // 가장자리를 어둡게 + 포스터 같은 얇은 테두리
  const vg = ctx.createRadialGradient(cx, H / 2, H * 0.3, cx, H / 2, H * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(226,54,28,.75)";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, W - 28, H - 28);
}

/** "ZONNAFE" (크림 → 주황 그라데이션, 진한 테두리) */
function logo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, align: CanvasTextAlign) {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.font = "400 " + size + "px " + ANTON;
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = "#1a0503";
  ctx.strokeText("ZONNAFE", x, y);
  const g = ctx.createLinearGradient(0, y - size * 0.82, 0, y);
  g.addColorStop(0, "#fff0cf");
  g.addColorStop(0.45, "#ffb25a");
  g.addColorStop(1, "#e2361c");
  ctx.fillStyle = g;
  ctx.fillText("ZONNAFE", x, y);
  ctx.restore();
}

function title(ctx: CanvasRenderingContext2D, top: number, compact: boolean, day: FDay): number {
  if (compact) {
    logo(ctx, 60, top + 70, 62, "left");
    compactRight(ctx, day.short, top, 300, ORANGE);
    tagRow(ctx, top + 122, null, false, 20);
    return top + 152;
  }
  logo(ctx, W / 2, top + 92, 92, "center");
  tagRow(ctx, top + 140, "NOV 14 SAT · ITAEWON", false, 24, ORANGE);
  return top + 176;
}

export const ZON_LOOK: MultiLook = {
  bg,
  title,
  time: "rgba(246,227,192,.8)",
  line: "rgba(246,227,192,.14)",
  fold: ORANGE,
  name: CREAM,
  nameSub: "rgba(246,227,192,.65)",
  labelBg: "rgba(10,6,5,.92)",
};
