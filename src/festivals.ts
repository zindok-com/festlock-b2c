// FestLock에서 다루는 페스티벌 목록의 형식. 실제 목록(데이터)은 festivals.json — 새 페스티벌은 거기에 추가한다.
import type { Lang } from "./i18n";
import data from "./festivals.json";

export interface Festival {
  /** 주소 /{slug} */
  slug: string;
  /** 같은 페이지로 보내는 다른 주소 (예: /edc) */
  aliases?: string[];
  /** 어떤 화면을 쓰는지: src/fest/registry.tsx의 PAGES 키. ready가 false거나 키가 없으면 "준비 중" 페이지 */
  page?: string;
  /** 브라우저 탭 제목 문구 키 (i18n 사전) */
  titleKey?: string;
  /** 링크 미리보기(카톡·인스타)용. scripts/route-html.mjs가 읽는다 */
  og: { title: string; desc: string; img: string };
  name: Record<Lang, string>;
  /** 표시용 날짜 (포스터 기준) */
  dates: string;
  /** KST 첫날·마지막 날 (YYYY-MM-DD). 배지(D-n·진행 중·종료)를 계산한다 */
  start: string;
  end: string;
  venue?: Record<Lang, string>;
  /** 타임테이블이 들어갔는지 (아니면 "준비 중" 페이지) */
  ready: boolean;
  /** 카드에 붙는 포스터 (없으면 글자만) */
  thumb?: string;
  posters?: { src: string; key: string }[];
  /** 카드 강조색 */
  color: string;
  color2: string;
  /** 현지 시간대(UTC 기준 시차). 없으면 한국(+9) — D-day·진행 중·종료 배지를 현지 날짜로 계산 */
  utc?: number;
}

export const FESTIVALS = data as Festival[];

/** 주소(/slug 또는 별칭)로 페스티벌 찾기 */
export function findFestival(path: string): Festival | undefined {
  const p = path.replace(/^\/+/, "");
  return FESTIVALS.find((f) => f.slug === p || f.aliases?.includes(p));
}

export type FestState = { kind: "soon" } | { kind: "dday"; n: number } | { kind: "today" } | { kind: "ended" };

/** 오늘(KST) 기준 배지 */
export function festState(f: Festival, nowMs = Date.now()): FestState {
  const today = new Date(nowMs + (f.utc ?? 9) * 3600_000).toISOString().slice(0, 10);
  if (today > f.end) return { kind: "ended" };
  if (today >= f.start) return { kind: "today" };
  if (!f.ready) return { kind: "soon" };
  const n = Math.round((Date.parse(f.start) - Date.parse(today)) / 86400_000);
  return { kind: "dday", n };
}
