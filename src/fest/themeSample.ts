// 카드 모양 고르기 팝업의 미리보기에 쓸 "예시 공연" 하나. 각 페스티벌 페이지가 자기 라인업에서 골라 등록한다.
// 얼굴 사진과 누끼가 둘 다 있는 아티스트를 먼저 쓰고, 없으면 얼굴 사진이 있는 첫 아티스트를 쓴다.
import { cutSrc } from "./cutouts";
import { festFace } from "./faces";
import { timeText, type FItem, type FStage } from "./types";

export interface ThemeSample {
  /** 페이지 최상위 클래스(tml·utw·zon·vac): 페스티벌 색 규칙을 그대로 받는다 */
  fest: string;
  name: string;
  genre?: string;
  time: string;
  src: string | null;
  cut: string | null;
  color: string;
  ink: string;
  len: number;
}

let SAMPLE: ThemeSample | null = null;

export function makeThemeSample(fest: string, items: FItem[], stages: FStage[]): ThemeSample | null {
  const withFace = items.filter((i) => festFace(fest, i.id));
  const it = withFace.find((i) => cutSrc(fest, i.id)) ?? withFace[0] ?? items[0];
  if (!it) return null;
  const st = stages.find((s) => s.key === it.stage) ?? stages[0];
  return {
    fest,
    name: it.en,
    genre: it.genre,
    time: timeText(it),
    src: festFace(fest, it.id),
    cut: cutSrc(fest, it.id),
    color: st.color,
    ink: st.ink,
    len: Math.max(...it.en.split(/\s+/).map((w) => w.length)),
  };
}

export function setThemeSample(s: ThemeSample | null) {
  SAMPLE = s;
}
export function getThemeSample(): ThemeSample | null {
  return SAMPLE;
}
