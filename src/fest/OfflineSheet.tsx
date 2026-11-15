import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { shortTime } from "../components/OfflineBadge";
import { LANGS, dictText, useI18n } from "../i18n";
import { IN_APP, externalUrl } from "../inApp";
import { OFFLINE_FESTS, deleteOffline, isIOS, isStandalone, promptInstall, saveOffline, swSupported, useCanInstall, useOnline, useSaved } from "../offline";

/**
 * "오프라인으로 쓰기" 칩 (카드 모양 줄에 놓는다). 누르면 안내 시트: ① 홈 화면에 추가 ② 오프라인 저장.
 * OFFLINE_FESTS 에 없는 페스티벌에서는 아무것도 그리지 않는다. 기획: docs/오프라인-PWA-기획안.md
 */
export function OfflineChip({ slug }: { slug: string }) {
  const { t } = useI18n();
  const saved = useSaved();
  const [open, setOpen] = useState(false);
  if (!OFFLINE_FESTS.has(slug)) return null;
  return (
    <>
      <button type="button" className={"chip off-chip" + (saved ? " saved" : "")} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span aria-hidden="true">📶</span> {t(saved ? "off.chip.on" : "off.chip")}
      </button>
      {open && <OfflineSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function OfflineSheet({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n();
  const saved = useSaved();
  const online = useOnline();
  const canInstall = useCanInstall();
  const standalone = isStandalone();
  const supported = swSupported();
  const [tab, setTab] = useState<"ios" | "android">(isIOS() ? "ios" : "android");
  const [phase, setPhase] = useState<"idle" | "saving" | "error">("idle");
  const [prog, setProg] = useState<[number, number]>([0, 0]);
  const [code, setCode] = useState("");

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function save() {
    setPhase("saving");
    setProg([0, 0]);
    try {
      // 화면에 쓰이는 글자: 지금 언어의 모든 문구 + 지금 화면의 글자 (그 글자를 덮는 글꼴 조각만 저장한다)
      await saveOffline(lang, dictText(lang) + " " + document.body.innerText, (d, n) => setProg([d, n]));
      setPhase("idle");
    } catch (e) {
      setCode(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }
  async function remove() {
    await deleteOffline();
    setPhase("idle");
  }

  const ext = IN_APP ? externalUrl() : null;
  const langName = LANGS.find((l) => l.id === lang)?.name ?? lang;
  const pct = prog[1] ? Math.round((prog[0] / prog[1]) * 100) : 4;
  return createPortal(
    <div className="ofp" onClick={onClose}>
      <div className="ofp-card" role="dialog" aria-modal="true" aria-label={t("off.title")} onClick={(e) => e.stopPropagation()}>
        <div className="ofp-head">
          <strong>{t("off.title")}</strong>
          <button type="button" className="x" aria-label={t("close")} onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="ofp-lead">{t("off.lead")}</p>

        {IN_APP ? (
          <section className="ofp-step">
            <p className="ofp-warn">{t("off.inapp")}</p>
            {ext && (
              <a className="ofp-btn" href={ext}>
                {t("f.inapp.open")}
              </a>
            )}
          </section>
        ) : (
          <>
            <section className="ofp-step">
              <h4>{t("off.s1")}</h4>
              {standalone ? (
                <p className="ofp-ok">{t("off.installed")}</p>
              ) : (
                <>
                  <div className="ofp-tabs" role="tablist">
                    {(["ios", "android"] as const).map((k) => (
                      <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
                        {t("off.tab." + k)}
                      </button>
                    ))}
                  </div>
                  <p>{tab === "ios" ? t("off.ios") : t("off.android")}</p>
                  {tab === "android" && canInstall && (
                    <button type="button" className="ofp-btn" onClick={() => void promptInstall()}>
                      {t("off.install")}
                    </button>
                  )}
                  <p className="ofp-note">{t("off.always")}</p>
                  {tab === "ios" && <p className="ofp-note ofp-ios">{t("off.iosnote")}</p>}
                </>
              )}
            </section>

            <section className="ofp-step">
              <h4>{t("off.s2")}</h4>
              {!supported ? (
                <p className="ofp-warn">{t("off.unsupported")}</p>
              ) : (
                <>
                  {saved && (
                    <p className="ofp-ok">
                      ✓ {t("off.saved", { t: shortTime(saved.at, lang) })} · {t("off.size", { mb: Math.max(0.1, saved.bytes / 1048576).toFixed(1) })}
                    </p>
                  )}
                  <div className="ofp-row">
                    <button type="button" className={"ofp-btn" + (saved ? " ghost" : "")} onClick={() => void save()} disabled={phase === "saving" || !online}>
                      {phase === "saving" ? t("off.saving", { n: prog[0], total: prog[1] || "…" }) : t("off.save")}
                    </button>
                    {saved && (
                      <button type="button" className="ofp-btn ghost" onClick={() => void remove()} disabled={phase === "saving"}>
                        {t("off.delete")}
                      </button>
                    )}
                  </div>
                  {phase === "saving" && (
                    <div className="ofp-bar" aria-hidden="true">
                      <i style={{ width: pct + "%" }} />
                    </div>
                  )}
                  {phase === "error" && (
                    <p className="ofp-warn">
                      {t("off.fail")} <small>({code})</small>
                    </p>
                  )}
                  <p className="ofp-note">{t("off.fonthint", { lang: langName })}</p>
                </>
              )}
            </section>
          </>
        )}
        <p className="ofp-note">{t("off.nophoto")}</p>
      </div>
    </div>,
    document.body,
  );
}
