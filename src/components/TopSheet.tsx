import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { BYID, DAYS, ITEMS, STAGES, fmt, type Item } from "../data";
import { useI18n } from "../i18n";
import { fetchStats, type Stats } from "../stats";
import { useBackClose } from "../backClose";
import { Face } from "./Face";

interface Props {
  onClose: () => void;
  onInfo: (id: string, from?: DOMRect) => void;
}

type Tab = "top" | "hour";

/** 한 시간대(17:00, 18:00 …)와 그 시간에 공연 중인 DJ. 두 시간대에 걸친 세트는 양쪽에 다 들어간다 */
function hourSlots(day: string, counts: Map<string, number>) {
  const items = ITEMS.filter((i) => i.day === day);
  const start = Math.floor(Math.min(...items.map((i) => i.s)) / 60) * 60;
  const end = Math.ceil(Math.max(...items.map((i) => i.e)) / 60) * 60;
  const slots: { from: number; rows: { it: Item; count: number }[] }[] = [];
  for (let m = start; m < end; m += 60) {
    const rows = items
      .filter((i) => i.s < m + 60 && i.e > m)
      .map((it) => ({ it, count: counts.get(it.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.it.si - b.it.si);
    if (rows.length) slots.push({ from: m, rows });
  }
  return slots;
}

/** DJ 랭킹 (아래에서 올라오는 창): TOP 10 / 시간대별 */
export function TopSheet({ onClose, onInfo }: Props) {
  const { t, dayLabel } = useI18n();
  const [stats, setStats] = useState<Stats | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("top");
  const [day, setDay] = useState(DAYS[0].id);

  useEffect(() => {
    let alive = true;
    fetchStats().then((s) => alive && setStats(s));
    return () => {
      alive = false;
    };
  }, []);

  useBackClose(true, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 전체 DJ 카운트 (서버가 all을 주면 전부, 예전 서버면 top만)
  const counts = useMemo(() => new Map((stats?.all ?? stats?.top ?? []).map((r) => [r.id, r.count])), [stats]);
  const rows = (stats?.top ?? []).filter((r) => BYID[r.id]);
  const max = rows.length ? rows[0].count : 1;
  const slots = useMemo(() => hourSlots(day, counts), [day, counts]);

  const avatar = (it: Item, size: number) => (
    <span className="top-av" style={{ width: size, height: size }}>
      <Face it={it} imgClass="top-ph" initClass="top-init" size={size} />
    </span>
  );

  return (
    <div className="sheet slide" role="dialog" aria-modal="true" aria-label={t("top.title")} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card">
        <div className="row">
          <strong>{t("top.title")}</strong>
          <button className="x" type="button" aria-label={t("close")} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-pressed={tab === "top"} aria-selected={tab === "top"} onClick={() => setTab("top")}>
            {t("rank.tabTop")}
          </button>
          <button type="button" role="tab" aria-pressed={tab === "hour"} aria-selected={tab === "hour"} onClick={() => setTab("hour")}>
            {t("rank.tabHour")}
          </button>
        </div>

        {stats === undefined ? (
          <p className="top-msg">{t("top.loading")}</p>
        ) : stats === null ? (
          <p className="top-msg">{t("top.error")}</p>
        ) : tab === "top" ? (
          <>
            <p className="hint top-desc">{t("top.desc")}</p>
            {rows.length === 0 ? (
              <p className="top-msg">{t("top.empty")}</p>
            ) : (
              <ol className="top-list">
                {rows.map((r, i) => {
                  const it = BYID[r.id];
                  const st = STAGES[it.si];
                  return (
                    <li key={r.id} style={{ "--c": st.color } as CSSProperties}>
                      <button type="button" className="top-row" onClick={(e) => onInfo(it.id, e.currentTarget.getBoundingClientRect())}>
                        <span className={"top-rank" + (i < 3 ? " podium" : "")}>{i + 1}</span>
                        {avatar(it, 44)}
                        <span className="top-main">
                          <span className="top-name">{it.name}</span>
                          <span className="top-meta">
                            <span className="dot" />
                            {st.line1} {st.line2} · {dayLabel(it.day)}
                          </span>
                          <span className="top-bar">
                            <span style={{ width: Math.max(6, (r.count / max) * 100) + "%" }} />
                          </span>
                        </span>
                        <span className="top-count">{t("top.count", { n: r.count })}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        ) : (
          <>
            <div className="seg">
              {DAYS.map((d) => (
                <button key={d.id} type="button" aria-pressed={d.id === day} onClick={() => setDay(d.id)}>
                  {dayLabel(d.id)}
                </button>
              ))}
            </div>
            <p className="hint top-desc">{t("rank.hourDesc")}</p>
            <div className="hour-list">
              {slots.map(({ from, rows: hr }) => {
                const hmax = Math.max(1, hr[0].count);
                return (
                  <section key={from} className="hour">
                    <h3 className="hour-h">
                      {fmt(from)}–{fmt(from + 60)}
                    </h3>
                    <ol className="top-list">
                      {hr.map(({ it, count }, i) => {
                        const st = STAGES[it.si];
                        return (
                          <li key={it.id} style={{ "--c": st.color } as CSSProperties}>
                            <button type="button" className="top-row small" onClick={(e) => onInfo(it.id, e.currentTarget.getBoundingClientRect())}>
                              <span className={"top-rank" + (i === 0 && count > 0 ? " podium" : "")}>{i === 0 && count > 0 ? "👑" : i + 1}</span>
                              {avatar(it, 34)}
                              <span className="top-main">
                                <span className="top-name">{it.name}</span>
                                <span className="top-meta">
                                  <span className="dot" />
                                  {st.line1} {st.line2} · {fmt(it.s)}–{fmt(it.e)}
                                </span>
                                <span className="top-bar">
                                  <span style={{ width: (count ? Math.max(6, (count / hmax) * 100) : 0) + "%" }} />
                                </span>
                              </span>
                              <span className="top-count">{t("top.count", { n: count })}</span>
                            </button>
                          </li>
                        );
                      })}
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
