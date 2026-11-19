// 새 페스티벌 페이지 공통: 선택 저장, 지금 시각(KST), 이름 표시, 듣기 링크
import { useCallback, useEffect, useState } from "react";
import { CUT_FOCUS } from "./cutFocus";
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

/** 라인업의 2인조 — 사진을 위로 키우며 옆을 잘라 내면 한 명이 사라지므로 전체가 보이게 둔다 */
const DUO_ACTS = new Set(["rave-republic", "goldfish", "vini-vici", "bassjackers", "cosmic-gate", "aly-and-fila", "pegassi", "da-tweekaz", "xy", "tripical-note", "luna-and-lenthe", "lucas-and-steve", "matisse-and-sadko", "yellow-claw", "camelphat", "solardo", "funk-tribu", "eli-and-fur", "dimitri-vegas-and-like-mike"]);

/**
 * 듀오톤 카드의 누끼 크기를 정한다. 열이 좁아서(약 80px) 그대로 두면 사진이 작으므로, 세로로 큰 사진은 높이를 키우고 옆을 최대 35%까지만 잘라 낸다
 * (자를 때는 머리 위치 cutFocus 를 기준으로 해서 얼굴이 잘리지 않게). 가로로 넓거나 2인조인 사진은 전체가 보이게 그대로 둔다. 이름은 카드 아래쪽에 있으므로 사진은 위쪽 얼굴 기준.
 */
export function markAr(el: HTMLImageElement | null, id: string, fest: string) {
  const box = el?.parentElement;
  if (!el || !box || !el.naturalWidth) return;
  const ar = el.naturalWidth / el.naturalHeight;
  el.style.bottom = "";
  if (DUO_ACTS.has(id)) {
    el.dataset.ar = "wide";
    el.style.height = "";
    el.style.objectPosition = "";
    return;
  }
  const bw = box.clientWidth - 4;
  const avail = box.clientHeight - 26; // 위쪽 시간 표시 자리
  if (bw <= 0 || avail <= 20) return;
  const fx = (CUT_FOCUS[fest]?.[id] ?? 50) / 100;
  // 가로로 넓은데 얼굴이 가운데 있는 사진(얼굴 클로즈업)은 자르면 얼굴이 잘리므로 그대로 두고, 이름 글자 바로 위로 올려서 가리지 않게 한다
  if (ar > 1.12 && Math.abs(fx - 0.5) <= 0.2) {
    const capH = box.querySelector<HTMLElement>(".cap")?.offsetHeight ?? 30;
    const room = avail - capH;
    if (room < 24) {
      el.dataset.ar = "wide";
      el.style.height = "";
      el.style.bottom = "";
      el.style.objectPosition = "";
      return;
    }
    el.dataset.ar = "lift";
    el.style.bottom = capH + 2 + "px";
    el.style.height = Math.min(room, bw / ar) + "px";
    el.style.objectPosition = "";
    return;
  }
  // 가로로 넓은 사진(한 명이 비스듬히 찍힌 경우 등)은 열 너비에 막혀 아주 작아지므로 더 많이 자르되 머리 위치 기준으로 자른다
  const keep = ar > 1.12 ? 0.5 : Math.abs(fx - 0.5) > 0.2 ? 0.85 : 0.65;
  const capH = box.querySelector<HTMLElement>(".cap")?.offsetHeight ?? 30;
  let h = Math.max(20, Math.min(avail, 320, bw / (keep * ar)));
  // 이름이 여러 줄이라 사진 아래 40%보다 높으면, 모자란 만큼 사진을 위로 올려 얼굴을 가리지 않게 한다
  const lift = Math.max(0, Math.round(capH - h * 0.4));
  h = Math.max(20, Math.min(h, avail - lift));
  const k = Math.min(1, bw / (h * ar)); // 가로로 보이는 비율
  const pos = k >= 1 ? 0.5 : Math.min(1, Math.max(0, (fx - k / 2) / (1 - k)));
  el.dataset.ar = "tall";
  el.style.bottom = lift ? lift + "px" : "";
  el.style.height = h + "px";
  el.style.objectPosition = pos * 100 + "% 4%";
}
