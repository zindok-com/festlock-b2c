// 시간이 겹치는 공연 쌍. 칸 위의 ⚠ 아이콘 대신, 아래 줄 "시간 겹침 N곳"을 누르면 누구와 누가 겹치는지 팝업으로 보여 준다.
import { timeText, type FItem } from "./types";

export interface ClashSide {
  id: string;
  name: string;
  time: string;
}
export interface Clash {
  a: ClashSide;
  b: ClashSide;
  /** 여러 날이 있는 페스티벌이면 날짜 이름 (팝업에서 묶음 제목으로) */
  day?: string;
}

/** 같은 날 시간이 겹치는 모든 쌍 (고른 공연 목록 기준) */
export function calcClashes(list: FItem[], dayLabel?: (day: string) => string): { pairs: number; clashes: Clash[] } {
  const clashes: Clash[] = [];
  const side = (i: FItem): ClashSide => ({ id: i.id, name: i.en, time: timeText(i) });
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const x = list[i], y = list[j];
      if (x.day === y.day && x.s < y.e && y.s < x.e) {
        const [p, q] = x.s <= y.s ? [x, y] : [y, x];
        clashes.push({ a: side(p), b: side(q), day: dayLabel?.(x.day) });
      }
    }
  return { pairs: clashes.length, clashes };
}
