// VAC (Vision & Colour) 배경화면의 배경·제목 (포스터 느낌: 짙은 초록 바탕 + 민트 빛 + 금색 포인트)
import { compactRight, tagRow } from "./festCanvas";
import type { MultiLook } from "./festMulti";
import type { FDay } from "./types";

const W = 1080;
const ANTON = '"Anton","Rubik","Noto Sans KR",system-ui,sans-serif';
const ICE = "#e8fff3";
const CYAN = "#7dffc2";
const ORANGE = "#ffcf5a";

function bg(ctx: CanvasRenderingContext2D, H: number) {
  ctx.fillStyle = "#04100c";
  ctx.fillRect(0, 0, W, H);
  // 위쪽 청록 빛
  const cx = W / 2;
  const top = ctx.createRadialGradient(cx, H * 0.08, 0, cx, H * 0.08, H * 0.6);
  top.addColorStop(0, "rgba(40,200,130,.45)");
  top.addColorStop(0.5, "rgba(20,120,80,.2)");
  top.addColorStop(1, "rgba(4,16,12,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H);
  // 아래쪽 주황 빛
  const bot = ctx.createRadialGradient(cx, H * 1.02, 0, cx, H * 1.02, H * 0.5);
  bot.addColorStop(0, "rgba(255,207,90,.22)");
  bot.addColorStop(1, "rgba(4,16,12,0)");
  ctx.fillStyle = bot;
  ctx.fillRect(0, 0, W, H);
  // 포스터의 둥근 고리를 닮은 얇은 원 (매번 같은 모양)
  ctx.save();
  ctx.lineWidth = 3;
  for (const [r, a, col] of [[W * 0.62, 0.3, "125,255,194"], [W * 0.72, 0.18, "125,255,194"], [W * 0.84, 0.14, "255,207,90"]] as const) {
    ctx.strokeStyle = `rgba(${col},${a})`;
    ctx.beginPath();
    ctx.arc(cx, H * 0.5, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // 가장자리를 어둡게 + 얇은 테두리
  const vg = ctx.createRadialGradient(cx, H / 2, H * 0.3, cx, H / 2, H * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,207,90,.55)";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, W - 28, H - 28);
}

/** "VISION & COLOUR" (얼음색 → 청록 그라데이션, 진한 테두리) */
function logo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, align: CanvasTextAlign) {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.font = "400 " + size + "px " + ANTON;
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = "#02140c";
  ctx.strokeText("VISION & COLOUR", x, y);
  const g = ctx.createLinearGradient(0, y - size * 0.82, 0, y);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.5, "#bfffe0");
  g.addColorStop(1, CYAN);
  ctx.fillStyle = g;
  ctx.fillText("VISION & COLOUR", x, y);
  ctx.restore();
}

function title(ctx: CanvasRenderingContext2D, top: number, compact: boolean, day: FDay): number {
  if (compact) {
    logo(ctx, 60, top + 70, 56, "left");
    compactRight(ctx, day.short, top, 300, ORANGE);
    tagRow(ctx, top + 122, null, false, 20);
    return top + 152;
  }
  logo(ctx, W / 2, top + 92, 88, "center");
  tagRow(ctx, top + 140, "NOV 28-29 · HENGQIN", false, 24, ORANGE);
  return top + 176;
}

export const VAC_LOOK: MultiLook = {
  bg,
  title,
  time: "rgba(232,255,243,.8)",
  line: "rgba(232,255,243,.14)",
  fold: ORANGE,
  name: ICE,
  nameSub: "rgba(232,255,243,.65)",
  labelBg: "rgba(4,16,12,.92)",
};
