import { memo, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";
import { CARD_THEMES, ensureThemeFont, type CardTheme } from "./cardTheme";
import { getThemeSample, type ThemeSample } from "./themeSample";

// 사진이 없을 때 미리보기에 쓰는 사람 실루엣
const SILHOUETTE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="260" viewBox="0 0 200 260"><rect width="200" height="260" fill="#4a4f5c"/><circle cx="100" cy="98" r="44" fill="#9aa1b1"/><path d="M20 260c4-58 36-88 80-88s76 30 80 88z" fill="#9aa1b1"/></svg>',
  );
const FALLBACK: ThemeSample = { fest: "zon", name: "DJ NAME", genre: "HOUSE", time: "21:00–22:00", src: null, cut: null, color: "#ffd98a", ink: "#2a1c00", len: 4 };

/** 팝업 안의 카드 한 장. 고른 모양(anim)만 "고르기 전 ↔ 고른 뒤"를 되풀이해서 움직임을 보여 주고, 나머지는 고르기 전 모습 그대로 멈춰 있다 (가볍게) */
const Preview = memo(function Preview({ id, anim, reduced, s }: { id: CardTheme; anim: boolean; reduced: boolean; s: ThemeSample }) {
  const [failed, setFailed] = useState(false);
  const [tickOn, setTickOn] = useState(false);
  useEffect(() => {
    setTickOn(false);
    if (!anim || reduced) return;
    const first = window.setTimeout(() => setTickOn(true), 500);
    const h = window.setInterval(() => setTickOn((v) => !v), 1300);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(h);
    };
  }, [anim, reduced]);
  const on = anim && (reduced ? true : tickOn);
  const photo = !failed ? s.src || SILHOUETTE : SILHOUETTE;
  const cut = id === "duo" && s.cut ? s.cut : null;
  return (
    <div className={"zon ctp-pv " + s.fest} data-ct={id} aria-hidden="true">
      <div className="ctp-col">
        <div className={"blk ph" + (on ? " on" : "")} style={{ "--c": s.color, "--ci": s.ink, "--len": s.len, top: 0, height: "100%" } as CSSProperties}>
          <span className="blk-hit">
            {cut ? (
              <img className="cut" src={cut} alt="" draggable={false} />
            ) : (
              <span className="phw">
                <img className="ph-img" src={photo} alt="" draggable={false} onError={() => setFailed(true)} />
              </span>
            )}
            <span className="tm tm-top">{s.time}</span>
            <span className="cap">
              <span className="nm">{s.name}</span>
              {s.genre && <span className="gn">{s.genre}</span>}
            </span>
            <span className="ck">✓</span>
          </span>
        </div>
      </div>
      <i className={"ctp-tap" + (on ? " go" : "")} />
    </div>
  );
});

function Popup({ value, onApply, onClose }: { value: CardTheme; onApply: (t: CardTheme) => void; onClose: () => void }) {
  const { t } = useI18n();
  const s = getThemeSample() ?? FALLBACK;
  const [sel, setSel] = useState<CardTheme>(value);
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 모양마다 글꼴이 달라서, 팝업이 열리면 전부 미리 불러 둔다
  useEffect(() => {
    CARD_THEMES.forEach(ensureThemeFont);
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return createPortal(
    <div className="ctp" onClick={onClose}>
      <div className="ctp-card" role="dialog" aria-modal="true" aria-label={t("f.ct.label")} onClick={(e) => e.stopPropagation()}>
        <div className="ctp-head">
          <strong>{t("f.ct.label")}</strong>
          <button type="button" className="x" aria-label={t("close")} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="ctp-grid" role="radiogroup" aria-label={t("f.ct.label")}>
          {CARD_THEMES.map((id, k) => (
            <div
              key={id}
              role="radio"
              tabIndex={0}
              aria-checked={sel === id}
              className={"ctp-item" + (sel === id ? " cur" : "")}
              onClick={() => setSel(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSel(id);
                }
              }}
            >
              <div className="ctp-tile" data-ct={id}>
                <Preview id={id} anim={sel === id} reduced={reduced} s={s} />
              </div>
              <span className="ctp-name">
                <i aria-hidden="true">{k + 1}</i>
                {t("f.ct." + id)}
              </span>
            </div>
          ))}
        </div>
        <button type="button" className="ctp-apply" onClick={() => onApply(sel)}>
          {t("f.ct.apply")} · {t("f.ct." + sel)}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * 튜토리얼용: 8가지 모양이 차례로 바뀌면서 "고르기 전 → 고른 뒤" 모션을 계속 보여 준다 (한 번에 하나만 움직여서 가볍다).
 * children 은 오른쪽에 같이 놓을 것 (카드 모양 버튼 등). 지금 고른 모양부터 시작한다.
 */
export function ThemeShowcase({ value, children }: { value: CardTheme; children?: ReactNode }) {
  const { t } = useI18n();
  const s = getThemeSample() ?? FALLBACK;
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [k, setK] = useState(() => Math.max(0, CARD_THEMES.indexOf(value)));
  useEffect(() => {
    CARD_THEMES.forEach(ensureThemeFont);
  }, []);
  useEffect(() => {
    if (reduced) return;
    const h = window.setInterval(() => setK((n) => (n + 1) % CARD_THEMES.length), 3400);
    return () => window.clearInterval(h);
  }, [reduced]);
  const id = CARD_THEMES[k];
  return (
    <div className="tut-theme">
      <div className="ctp-tile tut-theme-tile" data-ct={id} aria-hidden="true">
        <Preview key={id} id={id} anim reduced={reduced} s={s} />
      </div>
      <div className="tut-theme-side">
        <span className="ctp-name" aria-live="polite">
          <i aria-hidden="true">{k + 1}</i>
          {t("f.ct." + id)}
        </span>
        <span className="tut-theme-dots" aria-hidden="true">
          {CARD_THEMES.map((x, n) => (
            <b key={x} className={n === k ? "on" : ""} />
          ))}
        </span>
        {children}
      </div>
    </div>
  );
}

/** 카드 모양 고르기: 버튼을 누르면 팝업이 열리고, 모양을 누르면 그 모양만 "고르기 전 ↔ 고른 뒤"로 움직이고, 적용을 눌러야 바뀐다. compact 면 라벨 없이 버튼만 */
export function CardThemeMenu({ value, onChange, compact = false, extra }: { value: CardTheme; onChange: (t: CardTheme) => void; compact?: boolean; extra?: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const idx = CARD_THEMES.indexOf(value);
  return (
    <div className={"ct-menu" + (compact ? " compact" : "")}>
      {!compact && <span className="ct-label">{t("f.ct.label")}</span>}
      <button type="button" className="ct-open" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <i aria-hidden="true">{idx + 1}</i>
        {t("f.ct." + value)}
        <span className="ct-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {extra}
      {open && (
        <Popup
          value={value}
          onApply={(v) => {
            onChange(v);
            close();
          }}
          onClose={close}
        />
      )}
    </div>
  );
}
