// NOL·그랜드 민트 등 새 페스티벌 공통 데이터 형식. 시간은 그날 00:00 기준 분(자정 넘으면 1440 이상).
// 서버 집계 함수(api/)도 이 파일을 쓰므로 화면 코드(i18n.tsx)를 불러오지 않는다
export type Lang = "ko" | "en" | "ja" | "zh" | "zht";

export type Kind = "act" | "talk" | "event" | "perf";

export interface FDay {
  id: string;
  /** KST 날짜 (YYYY-MM-DD). "지금 공연 중" 계산에 쓴다 */
  date: string;
  label: Record<Lang, string>;
  /** 배경화면용 짧은 영문 */
  short: string;
  /** 현지 시간대(UTC 기준 시차, 시간). 없으면 한국(+9). 시각은 모두 현지 시각으로 적는다 */
  utc?: number;
}

export interface FStage {
  key: string;
  name: string;
  /** 장소·홀 */
  place?: string;
  color: string;
  /** 무대 색 위 글자색 */
  ink: string;
  /** 무대 사이 빈 시간 이름 */
  gap?: string;
}

export interface FItem {
  id: string;
  day: string;
  stage: string;
  ko: string;
  en: string;
  s: number;
  e: number;
  /** 끝나는 시간 미발표 (e는 블록 높이용 추정값) */
  open?: boolean;
  kind?: Kind;
  /** 포스터에 붙은 작은 꼬리표 (bright #15 등) */
  tag?: string;
  /** 토크·이벤트 설명 */
  desc?: string;
  /** 토크·이벤트에 나오는 아티스트 id (첫 번째 사진을 쓴다) */
  with?: string[];
  /** 두 명이서 하는 공연: 아티스트 창에서 사진 두 장을 따로 보여 준다 (사진 id 두 개). 시간표·배경화면에는 id 의 합친 사진을 쓴다 */
  duo?: [string, string];
  /** 장르 (EDC처럼 장르를 보여 주는 페스티벌만). verified = 확인, inferred = 무대 등으로 추정 */
  genre?: string;
  genreConf?: "verified" | "inferred";
}

export function t2m(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export function fmt(m: number): string {
  return String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}

export function timeText(it: FItem): string {
  return fmt(it.s) + (it.open ? " –" : "–" + fmt(it.e));
}

/**
 * [시작, 끝, id, 한글, 영문, 꼬리표?] 표를 FItem으로.
 * 끝이 "~21:40"이면 종료 시간 미발표(공식 표의 블록 길이로 추정한 값).
 * 자정 넘는 시간은 "24:00", "25:00"처럼 쓴다.
 */
export type Row = [string, string, string, string, string, string?];
export function rows(day: string, stage: string, list: Row[]): FItem[] {
  return list.map(([a, b, id, ko, en, tag]) => {
    const open = b.startsWith("~");
    return { id, day, stage, ko, en, s: t2m(a), e: t2m(open ? b.slice(1) : b), open: open || undefined, tag: tag || undefined, kind: "act" };
  });
}
