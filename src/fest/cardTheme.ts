// 시간표 "카드 모양"(테마) 8가지. 고른 모양은 이 기기에 저장한다 (페스티벌이 달라도 같은 모양을 쓴다).
// 화면(fest.css `.zon[data-ct=…]`)·아티스트 창·내보내기 이미지(festThemeCanvas.ts)·튜토리얼이 모두 이 값을 따른다.
//  poster  1 포스터 카드   사진 위 · 이름 아래
//  glass   2 포토 글라스   사진이 카드 전체 (기본)
//  minimal 3 미니멀        페스티벌 테마색을 그대로 따라가는 깔끔한 카드 · 작은 원형 사진
//  duo     4 듀오톤 블록   굵은 색 블록 · 큰 글자 · 이중톤 사진 (누끼가 있으면 누끼)
//  lock    5 글라스 잠금화면 반투명 유리 카드
//  polaroid 6 폴라로이드   인화지 프레임 · 마스킹테이프 · 손글씨
//  term    7 터미널 레이브 모노스페이스 · 스캔라인 · [x]
//  mono    8 모노 포토     사진이 카드 전체 · 가운데 이름 · 안 고르면 회색 사진, 고르면 컬러 사진 + 무대색 테두리·글자
import { useCallback, useEffect, useState } from "react";

export type CardTheme = "poster" | "glass" | "minimal" | "duo" | "lock" | "polaroid" | "term" | "mono";
export const CARD_THEMES: CardTheme[] = ["poster", "glass", "minimal", "duo", "lock", "polaroid", "term", "mono"];
export const DEFAULT_THEME: CardTheme = "glass";
const KEY = "fl:cardtheme";

export const isCardTheme = (v: unknown): v is CardTheme => typeof v === "string" && (CARD_THEMES as string[]).includes(v);

function read(): CardTheme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "paper") return "minimal"; // 예전 이름 (미니멀 라이트)
    if (isCardTheme(v)) return v;
  } catch {
    /* 저장소 없음 */
  }
  return DEFAULT_THEME;
}

/** 모양마다 필요한 글꼴 (Google Fonts). 고른 모양에 필요할 때만 불러온다 */
export const THEME_FONTS: Partial<Record<CardTheme, { url: string; canvas: string[] }>> = {
  duo: { url: "https://fonts.googleapis.com/css2?family=Anton&display=swap", canvas: ['400 40px "Anton"'] },
  polaroid: { url: "https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Permanent+Marker&display=swap", canvas: ['700 40px "Caveat"', '400 40px "Permanent Marker"'] },
  term: { url: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@500&display=swap", canvas: ['500 40px "DM Mono"'] },
};

/** 글꼴 링크를 한 번만 넣는다 */
export function ensureThemeFont(theme: CardTheme) {
  const f = THEME_FONTS[theme];
  if (!f || typeof document === "undefined") return;
  if (document.querySelector(`link[data-ctfont="${theme}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = f.url;
  l.dataset.ctfont = theme;
  document.head.appendChild(l);
}

export function useCardTheme(): [CardTheme, (t: CardTheme) => void] {
  const [theme, setTheme] = useState<CardTheme>(read);
  const set = useCallback((t: CardTheme) => {
    setTheme(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* 무시 */
    }
  }, []);
  useEffect(() => ensureThemeFont(theme), [theme]);
  return [theme, set];
}
