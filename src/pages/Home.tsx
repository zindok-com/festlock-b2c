import { useState, type CSSProperties } from "react";
import { FESTIVALS, festState, type Festival } from "../festivals";
import { LangMenu, useI18n } from "../i18n";
import { PosterViewer } from "../fest/parts";

const FESTLOCK_INSTA = "https://www.instagram.com/festlock/";

function Badge({ f }: { f: Festival }) {
  const { t } = useI18n();
  const s = festState(f);
  const text = s.kind === "dday" ? t("f.dday", { n: s.n }) : s.kind === "today" ? t("f.today") : s.kind === "ended" ? t("fest.ended") : t("fest.soon");
  return <span className={"fest-badge " + s.kind}>{text}</span>;
}

/** FestLock 메인: 포스터가 붙은 페스티벌 목록 */
export function Home() {
  const { t, lang } = useI18n();
  const [poster, setPoster] = useState<Festival | null>(null);
  return (
    <div className="wrap home">
      <header className="home-top">
        <a className="brand" href="/" aria-label="FestLock">
          <img src="/event/festlock.webp" alt="" width={22} height={22} />
          <span>
            Fest<b>Lock</b>
          </span>
        </a>
        <LangMenu />
      </header>

      <section className="home-hero">
        <img className="home-logo" src="/brand/festlock-logo.webp" alt="FestLock" width={180} height={180} />
        <h1 className="home-title">{t("home.title")}</h1>
        <p className="home-sub">{t("home.sub")}</p>
      </section>

      <h2 className="home-h2">{t("home.list")}</h2>
      <ul className="fest-list">
        {FESTIVALS.map((f) => {
          const ended = festState(f).kind === "ended";
          return (
            <li key={f.slug} className={"fc" + (ended ? " past" : "")} style={{ "--fa": f.color, "--fb": f.color2 } as CSSProperties}>
              {f.thumb ? (
                <button type="button" className="fc-thumb" onClick={() => setPoster(f)} aria-label={t("f.posterAlt", { name: f.name[lang] })}>
                  <img src={f.thumb} alt="" loading="lazy" width={104} height={140} />
                  <span className="fc-zoom" aria-hidden="true">
                    ⤢
                  </span>
                </button>
              ) : (
                <a className="fc-mono" href={"/" + f.slug} aria-hidden="true" tabIndex={-1}>
                  {f.name.en}
                </a>
              )}
              <a className="fc-body" href={"/" + f.slug}>
                <Badge f={f} />
                <span className="fc-name">{f.name[lang]}</span>
                <span className="fc-meta">
                  {f.dates}
                  {f.venue ? " · " + f.venue[lang] : ""}
                </span>
                <span className="fc-go">{t("f.tt")} →</span>
              </a>
            </li>
          );
        })}
      </ul>

      <a className="evt-follow foot-follow" href={FESTLOCK_INSTA} target="_blank" rel="noopener noreferrer">
        <img src="/event/festlock.webp" alt="" width={36} height={36} />
        <span>
          <b>{t("evt.tagline")}</b>
          <span>{t("evt.follow")} →</span>
        </span>
      </a>
      <footer className="foot">
        <p>{t("home.notice")}</p>
      </footer>
      {poster?.posters && <PosterViewer title={poster.name[lang]} posters={poster.posters.map((p) => ({ src: p.src, label: t(p.key) }))} onClose={() => setPoster(null)} />}
    </div>
  );
}
