import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SHOW_FACES } from "./config";
import { LangMenu, Rich, useI18n } from "./i18n";
import { BYID, DAYS, conflicts, dayOf, pickOf } from "./data";
import { StageHeads, Timetable } from "./components/Timetable";
import { ArtistSheet } from "./components/ArtistSheet";
import { ExportSheet } from "./components/ExportSheet";
import { TUT_KEY, Tutorial } from "./components/Tutorial";
import { TopSheet } from "./components/TopSheet";
import { EventPopup, shouldShowEvent } from "./components/EventPopup";
import { DOWNLOAD_BASE, fetchStats, type Stats } from "./stats";

const SEL_KEY = "edc26:sel";
const GENRE_KEY = "edc26:genre";

function loadSel(): Set<string> {
  try {
    const r = localStorage.getItem(SEL_KEY);
    if (r) return new Set((JSON.parse(r) as string[]).filter((x) => BYID[x]));
  } catch {
    /* 저장소 없음 */
  }
  return new Set();
}

export default function App() {
  const { t, dayLabel } = useI18n();
  const [day, setDay] = useState(DAYS[0].id);
  const [sel, setSel] = useState<Set<string>>(loadSel);
  const [showGenre, setShowGenre] = useState(() => {
    try {
      return localStorage.getItem(GENRE_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const [info, setInfo] = useState<string | null>(null);
  const [infoFrom, setInfoFrom] = useState<{ rect: DOMRect; back: boolean } | null>(null);
  const openInfo = useCallback((id: string, rect?: DOMRect, back = true) => {
    setInfoFrom(rect ? { rect, back } : null);
    setInfo(id);
  }, []);
  const tutInfo = useCallback((id: string | null, rect?: DOMRect) => (id ? openInfo(id, rect) : setInfo(null)), [openInfo]);
  const [exporting, setExporting] = useState(false);
  const [exportDay, setExportDay] = useState(DAYS[0].id);
  const [armed, setArmed] = useState(false);
  // 들어올 때 이벤트 안내 (닫은 뒤에 튜토리얼)
  const [eventOpen, setEventOpen] = useState(shouldShowEvent);
  const closeEvent = useCallback(() => setEventOpen(false), []);
  // 다른 앱·페이지에 갔다가 돌아와서 브라우저가 페이지를 새로고침 없이 되살린 경우(bfcache)에도 다시 보여준다
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && shouldShowEvent() && setEventOpen(true);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  const [tut, setTut] = useState(() => {
    try {
      return localStorage.getItem(TUT_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [topOpen, setTopOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef<number>();
  const armTimer = useRef<number>();

  useEffect(() => {
    try {
      localStorage.setItem(SEL_KEY, JSON.stringify(Array.from(sel)));
    } catch {
      /* 무시 */
    }
  }, [sel]);

  useEffect(() => {
    try {
      localStorage.setItem(GENRE_KEY, showGenre ? "1" : "0");
    } catch {
      /* 무시 */
    }
  }, [showGenre]);

  useEffect(() => {
    document.body.classList.toggle("lock", !!info || exporting || tut || topOpen || eventOpen);
  }, [info, exporting, tut, topOpen, eventOpen]);

  // 다운로드 수 (서버가 없거나 실패하면 숨김)
  const loadStats = useCallback(() => {
    fetchStats().then((s) => s && setStats(s));
  }, []);
  useEffect(loadStats, [loadStats]);


  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastOn(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOn(false), 2800);
  }, []);

  const toggle = useCallback((id: string) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function reset() {
    if (armed) {
      setSel(new Set());
      setArmed(false);
      clearTimeout(armTimer.current);
      return;
    }
    setArmed(true);
    armTimer.current = window.setTimeout(() => setArmed(false), 3000);
  }

  const d = dayOf(day);
  const cf = useMemo(() => conflicts(sel, day), [sel, day]);
  const counts = useMemo(() => Object.fromEntries(DAYS.map((x) => [x.id, pickOf(sel, x.id).length])), [sel]);
  const total = DAYS.reduce((a, x) => a + counts[x.id], 0);
  const infoItem = info ? BYID[info] : null;
  const closeExport = useCallback(() => setExporting(false), []);

  function openExport() {
    const first = counts[day] ? day : DAYS.find((x) => counts[x.id])?.id ?? day;
    setExportDay(first);
    setExporting(true);
  }
  return (
    <>
      <div className="wrap">
        <header className="hero">
          <div className="hero-top">
            {/* 아주 작은 FestLock 로고 (언어 버튼과 같은 줄, 왼쪽) */}
            <a className="fx-back" href="/" aria-label="FestLock">
              <span aria-hidden="true">←</span>
            </a>
            <a className="brand" href="/" aria-label="FestLock">
              <img src="/event/festlock.webp" alt="" width={22} height={22} />
              <span>
                Fest<b>Lock</b>
              </span>
            </a>
            <h1>EDC KOREA 2026</h1>
            <LangMenu />
          </div>
          <div className="stats-row">
            {stats && (
              <span className="dl-count">
                <span aria-hidden="true">⬇</span> <Rich text={t("stats.dl", { n: DOWNLOAD_BASE + stats.downloads.sat + stats.downloads.sun })} />
              </span>
            )}
            <button type="button" className="top-btn" onClick={() => setTopOpen(true)}>
              <span aria-hidden="true">🔥</span> {t("top.btn")}
            </button>
          </div>
          <p className="ended-note">{t("edc.ended")}</p>
          <p>{t("hero.intro")}</p>
          <p className="legend">
            <Rich text={t("hero.legend")} />
          </p>
        </header>

        <div className="sticky">
          <div className="tabs">
            <div className="tablist" role="tablist">
              {DAYS.map((x) => (
                <button key={x.id} type="button" className="tab" role="tab" aria-selected={x.id === day} onClick={() => setDay(x.id)}>
                  <span>{dayLabel(x.id)}</span>
                  {counts[x.id] > 0 && <span className="cnt">{counts[x.id]}</span>}
                </button>
              ))}
            </div>
            <button className="chip" type="button" aria-pressed={showGenre} onClick={() => setShowGenre((v) => !v)}>
              {t("tab.genre")}
            </button>
            <button className="chip help" type="button" aria-label={t("help")} onClick={() => setTut(true)}>
              ?
            </button>
          </div>
          <StageHeads day={d} />
        </div>

        <Timetable day={d} sel={sel} warn={cf.ids} showGenre={showGenre} onToggle={toggle} onInfo={openInfo} />

        <footer className="foot">
          <a className="evt-follow foot-follow" href="https://www.instagram.com/festlock/" target="_blank" rel="noopener noreferrer">
            <img src="/event/festlock.webp" alt="" width={36} height={36} />
            <span>
              <b>{t("evt.tagline")}</b>
              <span>{t("evt.follow")} →</span>
            </span>
          </a>
          <p>{t("foot.notice")}</p>
          {SHOW_FACES && <p>{t("foot.private")}</p>}
        </footer>
      </div>

      <div className="bar">
        <div className="bar-in">
          <div className="sum" aria-live="polite">
            <div>
              <Rich text={t("sum.sel", { n: counts[day] })} />
            </div>
            {cf.pairs > 0 && <div>{t("sum.overlap", { n: cf.pairs })}</div>}
          </div>
          <button className="btn ghost" type="button" onClick={reset} disabled={total === 0 && !armed}>
            {armed ? t("reset.arm") : t("reset")}
          </button>
          <button className="btn main" type="button" disabled={total === 0} onClick={openExport}>
            {t("make.wall")}
          </button>
        </div>
      </div>

      {infoItem && (
        <ArtistSheet
          key={infoItem.id}
          it={infoItem}
          on={sel.has(infoItem.id)}
          onToggle={() => toggle(infoItem.id)}
          onClose={() => setInfo(null)}
          from={infoFrom?.rect}
          back={infoFrom?.back}
          inTutorial={tut}
        />
      )}
      {eventOpen && <EventPopup onClose={closeEvent} />}
      {tut && !eventOpen && <Tutorial onClose={() => setTut(false)} onInfo={tutInfo} />}
      {exporting && <ExportSheet sel={sel} initialDay={exportDay} onClose={closeExport} toast={toast} onDownloaded={loadStats} />}
      {topOpen && (
        <TopSheet
          onClose={() => setTopOpen(false)}
          onInfo={(id, rect) => {
            setTopOpen(false);
            // TOP 10 창은 닫히므로 닫을 때는 아래로 내려가게
            openInfo(id, rect, false);
          }}
        />
      )}

      <div className={"toast" + (toastOn ? " show" : "")} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </>
  );
}
