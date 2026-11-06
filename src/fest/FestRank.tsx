// 아티스트 랭킹 창 (새 페스티벌 공통): TOP 10 / 시간대별. NOL은 스테이지별로 나눠서 보여준다.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useI18n } from "../i18n";
import { useBackClose } from "../backClose";
import { fetchFestStats, type FestKey, type FestStats } from "./festStats";
import { FFace } from "./parts";
import { fmt, timeText, type FDay, type FItem } from "./types";

interface Props {
  fest: FestKey;
  /** 사진 폴더 (gmf / nol) */
  face: string;
  title: string;
  desc: string;
  /** 순위에 넣을 공연 (그랜드 민트: 토크·이벤트 제외, NOL: 지금 스테이지) */
  items: FItem[];
  days: FDay[];
  nameOf: (it: FItem) => string;
  colorOf: (it: FItem) => string;
  metaOf: (it: FItem) => string;
  onInfo: (id: string) => void;
  onClose: () => void;
  /** 시간대별 탭 (NOL은 스테이지가 하나라 끈다) */
  hourTab?: boolean;
}

type Tab = "top" | "hour";

export function FestRank({ fest, face, title, desc, items, days, nameOf, colorOf, metaOf, onInfo, onClose, hourTab = true }: Props) {
  const { t, lang } = useI18n();
  const [stats, setStats] = useState<FestStats | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("top");
  const [day, setDay] = useState(days[0].id);
  useEffect(() => {
    let alive = true;
    fetchFestStats(fest).then((s) => alive && setStats(s));
    return () => {
      alive = false;
    };
  }, [fest]);
  useBackClose(true, onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  const counts = useMemo(() => new Map((stats?.all ?? []).map((r) => [r.id, r.count])), [stats]);
  const top = useMemo(
    () =>
      items
        .map((it) => ({ it, count: counts.get(it.id) ?? 0 }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count || a.it.s - b.it.s)
        .slice(0, 10),
    [items, counts],
  );
  const max = top.length ? top[0].count : 1;
  const slots = useMemo(() => {
    const list = items.filter((i) => i.day === day);
    if (!list.length) return [];
    const a = Math.floor(Math.min(...list.map((i) => i.s)) / 60) * 60;
    const b = Math.ceil(Math.max(...list.map((i) => i.e)) / 60) * 60;
    const out: { from: number; rows: { it: FItem; count: number }[] }[] = [];
    for (let m = a; m < b; m += 60) {
      const rows = list
        .filter((i) => i.s < m + 60 && i.e > m)
        .map((it) => ({ it, count: counts.get(it.id) ?? 0 }))
        .sort((x, y) => y.count - x.count || x.it.s - y.it.s);
      if (rows.length) out.push({ from: m, rows });
    }
    return out;
  }, [items, day, counts]);

  const row = (it: FItem, count: number, rank: number | string, podium: boolean, small: boolean, bar: number, meta: string) => (
    <li key={it.id} style={{ "--c": colorOf(it) } as CSSProperties}>
      <button type="button" className={"top-row" + (small ? " small" : "")} onClick={() => onInfo(it.id)}>
        <span className={"top-rank" + (podium ? " podium" : "")}>{rank}</span>
        <span className="top-av" style={{ width: small ? 34 : 44, height: small ? 34 : 44 }}>
          <FFace fest={face} id={it.id} name={nameOf(it)} className="top-ph" initClass="top-init" />
        </span>
        <span className="top-main">
          <span className="top-name">{nameOf(it)}</span>
          <span className="top-meta">
            <span className="dot" />
            {meta}
          </span>
          <span className="top-bar">
            <span style={{ width: (count ? Math.max(6, bar * 100) : 0) + "%" }} />
          </span>
        </span>
        <span className="top-count">{t("top.count", { n: count })}</span>
      </button>
    </li>
  );

  return (
    <div className="sheet slide" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card fx-card">
        <div className="row">
          <strong>{title}</strong>
          <button className="x" type="button" aria-label={t("close")} onClick={onClose}>
            ✕
          </button>
        </div>
        {hourTab && (
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-pressed={tab === "top"} aria-selected={tab === "top"} onClick={() => setTab("top")}>
            {t("rank.tabTop")}
          </button>
          <button type="button" role="tab" aria-pressed={tab === "hour"} aria-selected={tab === "hour"} onClick={() => setTab("hour")}>
            {t("rank.tabHour")}
          </button>
        </div>
        )}
        {stats === undefined ? (
          <p className="top-msg">{t("top.loading")}</p>
        ) : stats === null ? (
          <p className="top-msg">{t("top.error")}</p>
        ) : tab === "top" ? (
          <>
            <p className="hint top-desc">{desc}</p>
            {top.length === 0 ? (
              <p className="top-msg">{t("top.empty")}</p>
            ) : (
              <ol className="top-list">{top.map((r, i) => row(r.it, r.count, i + 1, i < 3, false, r.count / max, metaOf(r.it)))}</ol>
            )}
          </>
        ) : (
          <>
            {days.length > 1 && (
              <div className="seg">
                {days.map((d) => (
                  <button key={d.id} type="button" aria-pressed={d.id === day} onClick={() => setDay(d.id)}>
                    {d.label[lang]}
                  </button>
                ))}
              </div>
            )}
            <p className="hint top-desc">{t("f.rank.hourDesc")}</p>
            <div className="hour-list">
              {slots.map(({ from, rows }) => {
                const hmax = Math.max(1, rows[0].count);
                return (
                  <section key={from} className="hour">
                    <h3 className="hour-h">
                      {fmt(from)}–{fmt(from + 60)}
                    </h3>
                    <ol className="top-list">
                      {rows.map(({ it, count }, i) => row(it, count, i === 0 && count > 0 ? "👑" : i + 1, i === 0 && count > 0, true, count / hmax, timeText(it)))}
                    </ol>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
