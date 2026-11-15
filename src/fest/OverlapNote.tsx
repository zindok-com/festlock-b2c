import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";
import type { Clash } from "./overlap";

/** 아래 바의 "⚠ 시간 겹침 N곳" 줄. 누르면 어떤 공연끼리 겹치는지 목록 팝업을 연다 */
export function OverlapNote({ clashes }: { clashes: Clash[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, close]);
  // 선택을 풀어서 겹침이 없어지면 팝업도 닫는다
  useEffect(() => {
    if (open && clashes.length === 0) setOpen(false);
  }, [open, clashes.length]);
  if (!clashes.length) return null;
  const days = new Set(clashes.map((c) => c.day ?? ""));
  const groups: { day: string; list: Clash[] }[] = [];
  for (const c of clashes) {
    const d = c.day ?? "";
    const g = groups.find((x) => x.day === d);
    if (g) g.list.push(c);
    else groups.push({ day: d, list: [c] });
  }
  return (
    <>
      <button type="button" className="clash-btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        {t("sum.overlap", { n: clashes.length })}
        <span aria-hidden="true"> ›</span>
      </button>
      {open &&
        createPortal(
          <div className="clp" onClick={close}>
            <div className="clp-card" role="dialog" aria-modal="true" aria-label={t("clash.title", { n: clashes.length })} onClick={(e) => e.stopPropagation()}>
              <div className="clp-head">
                <strong>{t("clash.title", { n: clashes.length })}</strong>
                <button type="button" className="x" aria-label={t("close")} onClick={close}>
                  ✕
                </button>
              </div>
              <p className="clp-hint">{t("clash.hint")}</p>
              <div className="clp-body">
                {groups.map((g) => (
                  <section key={g.day}>
                    {days.size > 1 && g.day && <h4>{g.day}</h4>}
                    <ul>
                      {g.list.map((c) => (
                        <li key={c.a.id + "|" + c.b.id}>
                          <span className="clp-p">
                            <b>{c.a.name}</b>
                            <i>{c.a.time}</i>
                          </span>
                          <span className="clp-x" aria-hidden="true">
                            ↔
                          </span>
                          <span className="clp-p">
                            <b>{c.b.name}</b>
                            <i>{c.b.time}</i>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
