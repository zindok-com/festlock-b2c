// 연도별로 보기 — [전체 · 2026 · 2025 …] 칩, 그리고 연말 "올해 내가 간 페스티벌 자랑하기"에 쓸 연도
import { useEffect, useMemo } from "react";
import { useI18n } from "../i18n";
import type { BandDesign } from "./api";

export type YearPick = number | "all";

/** 팔찌 목록에서 연도만 뽑아 최근 해부터. 고른 해가 목록에 없으면 "전체"로 (그리고 고른 값도 "전체"로 돌려,
 *  나중에 그해 팔찌가 생겨도 예전에 골랐던 해로 저절로 바뀌지 않게) */
export function useYearFilter(all: BandDesign[], pick: YearPick, setPick: (y: YearPick) => void) {
  const r = useMemo(() => {
    const years = [...new Set(all.map((d) => d.year).filter((y) => y > 0))].sort((a, b) => b - a);
    const yr: YearPick = pick !== "all" && years.includes(pick) ? pick : "all";
    const items = yr === "all" ? all : all.filter((d) => d.year === yr);
    const fests = new Set(items.map((d) => d.fest)).size;
    return { years, yr, items, fests };
  }, [all, pick]);
  useEffect(() => {
    if (r.yr !== pick) setPick(r.yr);
  }, [r.yr, pick, setPick]);
  return r;
}

/** 자랑하기 연도: 11·12월은 올해, 1월은 지난해(연말 결산을 새해 초까지). 나머지 달에는 없음 */
export function bragYear(now = new Date()): number | null {
  const m = now.getMonth();
  if (m >= 10) return now.getFullYear();
  if (m === 0) return now.getFullYear() - 1;
  return null;
}

/** 오른쪽 세로 목록: 전체 · 2026 · 2025 … (고른 칸만 밝은 바탕) */
export function YearChips({ years, value, onChange }: { years: number[]; value: YearPick; onChange: (y: YearPick) => void }) {
  const { t } = useI18n();
  if (!years.length) return null;
  const opts: YearPick[] = ["all", ...years];
  return (
    <div className="band-years" role="radiogroup" aria-label={t("band.y.label")}>
      {opts.map((y) => (
        <button key={y} type="button" role="radio" aria-checked={value === y} className="band-year" onClick={() => onChange(y)}>
          {y === "all" ? t("band.fest.all") : String(y)}
        </button>
      ))}
    </div>
  );
}
