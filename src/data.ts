import raw from "./data/lineup.json";

export type GenreConf = "verified" | "inferred" | "unknown";
export interface Stage { key: string; line1: string; line2: string; color: string }
export interface Day { id: string; label: string; full: string; date: string; hosts: Record<string, string> }
export interface Links { spotify?: string; youtube?: string; appleMusic?: string }
export interface Item {
  id: string;
  name: string;
  day: string;
  stage: string;
  si: number;
  s: number; // 17:00 기준 분
  e: number;
  genre: string | null;
  genreConf: GenreConf;
  links?: Links;
}

interface RawItem {
  id: string; name: string; day: string; stage: string; start: string; end: string;
  genre: string | null; genreConf: string; links?: Links;
}

/** 화면 타임테이블 세로 배율(분당 px). 배경화면 이미지는 exportImage.ts의 자체 배율을 쓴다. */
export const PPM = 2.6;
export const TOTAL = 600; // 17:00 → 27:00(새벽 3시)

export const STAGES: Stage[] = raw.stages;
export const DAYS: Day[] = raw.days;

export function P(s: string): number {
  const [h, m] = s.split(":");
  return (+h - 17) * 60 + +m;
}
export function fmt(m: number): string {
  const tot = 17 * 60 + m, h = Math.floor(tot / 60) % 24, mm = tot % 60;
  return String(h).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}

export const ITEMS: Item[] = (raw.lineup as RawItem[]).map((r) => ({
  id: r.id,
  name: r.name,
  day: r.day,
  stage: r.stage,
  si: STAGES.findIndex((st) => st.key === r.stage),
  s: P(r.start),
  e: P(r.end),
  genre: r.genre,
  genreConf: r.genreConf as GenreConf,
  links: r.links,
}));
export const BYID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function dayOf(id: string): Day {
  return DAYS.find((d) => d.id === id) ?? DAYS[0];
}

export function genreOf(it: Item): { t: string; c: string } {
  if (it.genreConf === "unknown" || !it.genre) return { t: "장르 정보 없음", c: "gu" };
  if (it.genreConf === "inferred") return { t: "~ " + it.genre, c: "gi" };
  return { t: it.genre, c: "" };
}

export function pickOf(sel: Set<string>, d: string): Item[] {
  return ITEMS.filter((i) => i.day === d && sel.has(i.id)).sort((a, b) => a.s - b.s || a.si - b.si);
}

/** 겹침: a.start < b.end && b.start < a.end (끝=시작은 겹침 아님) */
export function conflicts(sel: Set<string>, d: string): { ids: Set<string>; pairs: number } {
  const l = pickOf(sel, d), ids = new Set<string>();
  let pairs = 0;
  for (let i = 0; i < l.length; i++)
    for (let j = i + 1; j < l.length; j++)
      if (l[i].s < l[j].e && l[j].s < l[i].e) { pairs++; ids.add(l[i].id); ids.add(l[j].id); }
  return { ids, pairs };
}

export function initials(name: string): string {
  const words = name.replace(/[()&+]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length >= 2 && !/^(B2B|B3B|X|PRESENTS)$/i.test(words[1])) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0].slice(0, 2).toUpperCase();
}

export function spotifyUrl(it: Item): string {
  return it.links?.spotify || "https://open.spotify.com/search/" + encodeURIComponent(it.name);
}
export function appleMusicUrl(it: Item): string {
  return it.links?.appleMusic || "https://music.apple.com/kr/search?term=" + encodeURIComponent(it.name);
}
export function youtubeUrl(it: Item): string {
  return it.links?.youtube || "https://www.youtube.com/results?search_query=" + encodeURIComponent(it.name + " DJ");
}
