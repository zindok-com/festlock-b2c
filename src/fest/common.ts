// 새 페스티벌 페이지 공통: 선택 저장, 지금 시각(KST), 이름 표시, 듣기 링크
import { useCallback, useEffect, useState } from "react";
import type { Lang } from "../i18n";
import type { FDay, FItem } from "./types";

/** 고른 공연 (페스티벌마다 따로 저장) */
export function useSelection(slug: string, valid: Set<string>) {
  const key = "fl:" + slug + ":sel";
  const [sel, setSel] = useState<Set<string>>(() => {
    try {
      const r = localStorage.getItem(key);
      if (r) return new Set((JSON.parse(r) as string[]).filter((x) => valid.has(x)));
    } catch {
      /* 저장소 없음 */
    }
    return new Set();
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(sel)));
    } catch {
      /* 무시 */
    }
  }, [key, sel]);
  const toggle = useCallback((id: string) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  return { sel, setSel, toggle };
}

/** 지금 한국 시각(ms, UTC 기준값에 9시간 더한 값). 30초마다 갱신 */
export function useNowKst(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now + 9 * 3600_000;
}

/** 공연들이 걸친 정시 목록 (배경화면 "입장 시간부터" 선택지). 마지막 공연 시작 시각까지 */
export function hourList(items: FItem[]): number[] {
  if (!items.length) return [];
  const a = Math.floor(Math.min(...items.map((i) => i.s)) / 60) * 60;
  const b = Math.floor(Math.max(...items.map((i) => i.s)) / 60) * 60;
  const out: number[] = [];
  for (let m = a; m <= b; m += 60) out.push(m);
  return out;
}

/** 가장 먼저 시작하는 공연 시각 */
export function firstStart(items: FItem[]): number | null {
  return items.length ? Math.min(...items.map((i) => i.s)) : null;
}

/** 공연의 시작·끝 (KST 기준 ms). 해외 페스티벌은 현지 시각을 한국 시각으로 바꿔서 비교한다 */
export function spanOf(it: FItem, day: FDay): [number, number] {
  const base = Date.parse(day.date + "T00:00:00Z") + (9 - (day.utc ?? 9)) * 3600_000;
  return [base + it.s * 60_000, base + it.e * 60_000];
}

/** 페스티벌 현지의 오늘 날짜 (YYYY-MM-DD) */
export function localToday(nowKst: number, utc = 9): string {
  return new Date(nowKst - (9 - utc) * 3600_000).toISOString().slice(0, 10);
}

/** 장르 글자: 추정이면 앞에 ~, 없으면 null */
export function genreText(it: FItem): string | null {
  if (!it.genre) return null;
  return it.genreConf === "inferred" ? "~ " + it.genre : it.genre;
}

export function isLive(it: FItem, day: FDay | undefined, nowKst: number): boolean {
  if (!day) return false;
  const [a, b] = spanOf(it, day);
  return nowKst >= a && nowKst < b;
}

/** 큰 글씨 이름과 작은 글씨 이름. 그랜드 민트는 한국어 화면에서 한글이 먼저, NOL은 영문(포스터 표기)이 먼저 */
export function names(it: FItem, lang: Lang, koFirst: boolean): [string, string] {
  const [a, b] = koFirst && lang === "ko" ? [it.ko, it.en] : [it.en, it.ko];
  return [a, a.toLowerCase() === b.toLowerCase() ? "" : b];
}

export function initialsOf(name: string): string {
  const w = name.replace(/[()&+:/]/g, " ").split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  if (/[가-힣]/.test(w[0])) return w[0].slice(0, 2);
  if (w.length >= 2 && !/^(X|x)$/.test(w[1])) return (w[0][0] + w[1][0]).toUpperCase();
  return w[0].slice(0, 2).toUpperCase();
}

const q = encodeURIComponent;
export function listenLinks(it: FItem, koFirst: boolean) {
  const main = koFirst ? it.ko : it.en;
  const both = it.ko === it.en ? it.en : it.en + " " + it.ko;
  return {
    spotify: "https://open.spotify.com/search/" + q(main),
    youtube: "https://www.youtube.com/results?search_query=" + q(both),
    melon: "https://www.melon.com/search/total/index.htm?q=" + q(main),
    apple: "https://music.apple.com/kr/search?term=" + q(main),
  };
}

/** 테마 색을 문서 전체(창·바텀시트 포함)에 적용 */
export function useFestTheme(name: string) {
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.fest = name;
    return () => {
      delete el.dataset.fest;
    };
  }, [name]);
}

/** 페이지 전용 구글 폰트를 한 번만 불러온다 */
export function useFont(href: string) {
  useEffect(() => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }, [href]);
}
