import type { CSSProperties } from "react";
import type { Festival } from "../festivals";
import { LangMenu, useI18n } from "../i18n";

const FESTLOCK_INSTA = "https://www.instagram.com/festlock/";

/** 라인업 자료를 넣기 전, 페스티벌별 "준비 중" 페이지 */
export function Soon({ fest }: { fest: Festival }) {
  const { t, lang } = useI18n();
  return (
    <div className="wrap home" style={{ "--fa": fest.color, "--fb": fest.color2 } as CSSProperties}>
      <header className="home-top">
        <a className="fx-back" href="/" aria-label="FestLock">
          <span aria-hidden="true">←</span>
        </a>
        <a className="brand" href="/" aria-label="FestLock">
          <img src="/event/festlock.webp" alt="" width={22} height={22} />
          <span>
            Fest<b>Lock</b>
          </span>
        </a>
        <LangMenu />
      </header>

      <section className="soon-page">
        <span className="fest-badge soon">{t("fest.soon")}</span>
        <h1 className="soon-title">{fest.name[lang]}</h1>
        <p className="fest-meta">
          {fest.dates}
          {fest.venue ? " · " + fest.venue[lang] : ""}
        </p>
        <div className="soon-box">
          <div className="soon-icon" aria-hidden="true">
            🔒
          </div>
          <strong>{t("soon.title")}</strong>
          <p>{t("soon.body")}</p>
        </div>
        <a className="btn main soon-btn" href={FESTLOCK_INSTA} target="_blank" rel="noopener noreferrer">
          {t("evt.follow")}
        </a>
        <a className="btn ghost soon-btn" href="/">
          {t("soon.home")}
        </a>
      </section>

      <footer className="foot">
        <p>{t("home.notice")}</p>
      </footer>
    </div>
  );
}
