import { useEffect } from "react";
import { useBackClose } from "../backClose";
import { Rich, useI18n } from "../i18n";

/** 이벤트를 끝내려면 false로 바꾸면 된다 */
export const EVENT_ON = false;
const HIDE_KEY = "edc26:evt-mse-hide";
const MSE_INSTA = "https://www.instagram.com/mainstageedm/";
const FESTLOCK_INSTA = "https://www.instagram.com/festlock/";

/** 폰 기준 오늘 날짜 (한국이면 자정에 바뀜) */
const today = () => {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
};

/** 오늘 "하루 보지 않기"를 눌렀으면 false */
export function shouldShowEvent(): boolean {
  if (!EVENT_ON) return false;
  try {
    return localStorage.getItem(HIDE_KEY) !== today();
  } catch {
    return true;
  }
}

/** 들어올 때 뜨는 MSE 인스타 스토리 이벤트 안내 */
export function EventPopup({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  useBackClose(true, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hideToday = () => {
    try {
      localStorage.setItem(HIDE_KEY, today());
    } catch {
      /* 무시 */
    }
    onClose();
  };

  return (
    <div className="evt" role="dialog" aria-modal="true" aria-label={t("evt.title")} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="evt-card">
        <button className="x evt-x" type="button" aria-label={t("close")} onClick={onClose}>
          ✕
        </button>
        <div className="evt-logos" aria-hidden="true">
          <img src="/event/mse.png" alt="" width={64} height={64} />
          <span>×</span>
          <img src="/event/festlock.webp" alt="" width={64} height={64} />
        </div>
        <span className="evt-badge">🔥 {t("evt.badge")} 🔥</span>
        <h2>{t("evt.title")}</h2>
        <p className="evt-lead">{t("evt.body")}</p>
        <ol className="evt-steps">
          <li>{t("evt.step1")}</li>
          <li>{t("evt.step2")}</li>
          <li>
            <Rich text={t("evt.step3")} />
          </li>
        </ol>
        <p className="hint evt-note">{t("evt.note")}</p>
        <button className="btn main evt-go" type="button" onClick={onClose}>
          {t("evt.go")}
        </button>
        <a className="btn ghost evt-insta" href={MSE_INSTA} target="_blank" rel="noopener noreferrer">
          {t("evt.insta")}
        </a>
        <button className="evt-hide" type="button" onClick={hideToday}>
          {t("evt.hideToday")}
        </button>
        {/* 맨 아래: FestLock 팔로우 유도 */}
        <a className="evt-follow" href={FESTLOCK_INSTA} target="_blank" rel="noopener noreferrer">
          <img src="/event/festlock.webp" alt="" width={36} height={36} />
          <span>
            <b>{t("evt.tagline")}</b>
            <span>{t("evt.follow")} →</span>
          </span>
        </a>
      </div>
    </div>
  );
}
