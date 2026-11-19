// TOMORROWLAND THAILAND 2026 "CONSCIENCIA": 무대 7곳을 한 표에 놓고 옆으로 밀어서 보는 3일 타임테이블 (날짜 탭, 태국 현지 시각).
// ULTRA TAIWAN(UtwPage.tsx)을 복사해 날짜 탭을 붙여 만들었다 (docs/새-페스티벌-표준-지침.md).
//  - 무대가 6곳 이상이라 칸 너비를 고정하고 옆으로 민다
//  - 사진·영상은 아직 없다 (이니셜 아이콘). 장르는 추정 (tmlGenres.ts)
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { OverlapNote } from "./OverlapNote";
import { calcClashes } from "./overlap";
import { LangMenu, Rich, useI18n } from "../i18n";
import { TML_DAYS, TML_GENRE, TML_ITEMS, TML_STAGES } from "./tml";
import { firstStart, hourList, isLive, markAr, names, useFestTheme, useFont, useNowKst, useSelection } from "./common";
import { festFace } from "./faces";
import { cutSrc } from "./cutouts";
import { THEME_FONTS, useCardTheme, type CardTheme } from "./cardTheme";
import { CardThemeMenu } from "./CardThemeMenu";
import { OfflineChip } from "./OfflineSheet";
import { b2bOf } from "./b2b";
import { makeThemeSample, setThemeSample } from "./themeSample";
import { useReverse } from "./viewPrefs";
import { FestSheet, PosterViewer, useLongPress, usePoster } from "./parts";
import { FestExport, type ExportOpt, type RenderOpt } from "./FestExport";
import { ensureFonts, loadPhotos } from "./festCanvas";
import { layoutOf, renderMulti } from "./festMulti";
import { TML_LOOK } from "./tmlLook";
import { DEMO, reportFest, totalDownloads, useFestStats } from "./festStats";
import { FestRank } from "./FestRank";
import { fmt, timeText, type FItem } from "./types";
import { Tutorial, type TutConfig } from "../components/Tutorial";
import { FestFooter, useArmedReset, useBodyLock, useToast } from "./shell";
import "./fest.css";

const SLUG = "tomorrowland-thailand-2026";
const FACE = "tml";
const POSTERS = [{ src: "/poster/tml-key.webp", key: "f.posterKey" }];
const PPM = 2.6;
/** 날(day)마다 표가 시작·끝나는 시각 (그날 공연의 처음·끝을 정시로 맞춘다) */
const RANGE: Record<string, [number, number]> = Object.fromEntries(
  TML_DAYS.map((d) => {
    const l = TML_ITEMS.filter((i) => i.day === d.id);
    return [d.id, [Math.floor(Math.min(...l.map((i) => i.s)) / 60) * 60, Math.ceil(Math.max(...l.map((i) => i.e)) / 60) * 60]];
  }),
);
const VALID = new Set(TML_ITEMS.map((i) => i.id));
const BYID = Object.fromEntries(TML_ITEMS.map((i) => [i.id, i]));
const STAGE = Object.fromEntries(TML_STAGES.map((s) => [s.key, s]));
const ANTON = "https://fonts.googleapis.com/css2?family=Anton&display=swap";
const EXPORT_OPTS: ExportOpt[] = ["lock", "compact", "noPhoto"];
const NUDGE_KEY = "fl:tml:nudge";
/**
 * 무대가 이 수 이상이면 "옆으로 밀기 + 맨 위 무대 지도"를 쓴다 (docs/새-페스티벌-표준-지침.md 6번).
 * 그보다 적으면 모든 무대를 한 화면에 나란히 놓고 무대 지도는 숨긴다 (밀 필요가 없으니 "지금 어디"를 알릴 필요도 없다)
 */
const MAP_MIN_STAGES = 6;
const MANY = TML_STAGES.length >= MAP_MIN_STAGES;
/** 무대가 적으면 칸 너비를 화면에 딱 맞춘다: (화면 너비 − 좌우 여백 12 − 시간축 30 − 칸 사이 간격 3×무대 수) ÷ 무대 수. 많으면 CSS 기본값(한 화면에 약 4.3칸). 무대가 3곳 이하면 칸이 너무 넓어지지 않게 200px까지만 늘린다 */
const FIT_STYLE = MANY ? undefined : ({ "--cw": `clamp(48px, calc((min(100vw, 560px) - ${42 + 3 * TML_STAGES.length}px) / ${TML_STAGES.length}), ${TML_STAGES.length <= 3 ? 200 : 132}px)` } as CSSProperties);
const toneVars = (key: string) => ({ "--c": STAGE[key].color, "--ci": STAGE[key].ink }) as CSSProperties;

// 튜토리얼: 두 번째 칸으로 시연 (이 페스티벌은 아직 드랍·미리보기 영상이 없다)
const TUT: TutConfig = {
  storageKey: "fl:tml:tut",
  block: ".zon .col .blk:nth-child(2)",
  blockFallback: ".zon .blk",
  text: { "tut.s3.b": "f.tut.s3.b" },
  dropSlug: SLUG,
  prefer: "martin-garrix",
  sample: "/tutorial/tml.webp",
};

function Block({ it, on, live, theme, start, end, reverse, onToggle, onInfo }: { it: FItem; on: boolean; live: boolean; theme: CardTheme; start: number; end: number; reverse: boolean; onToggle: (id: string) => void; onInfo: (id: string) => void }) {
  const { t } = useI18n();
  const st = STAGE[it.stage];
  const lp = useLongPress(() => onInfo(it.id));
  const time = timeText(it);
  const src = festFace(FACE, it.id);
  const [failed, setFailed] = useState(false);
  const [cutFailed, setCutFailed] = useState(false);
  const [b2bFailed, setB2bFailed] = useState(false);
  // B2B: 두 사람 사진·누끼가 준비된 칸은 3·5·7번 모양에서 프로필 두 장, 나머지 모양에서 누끼 두 명 (b2b.ts)
  const b2b = b2bFailed ? null : b2bOf(FACE, it.id);
  const b2bFaces = !!b2b && (theme === "minimal" || theme === "lock" || theme === "term");
  // 듀오톤 블록: 누끼가 있으면 누끼, 없으면 이중톤 사진
  const cut = theme === "duo" && !cutFailed ? (b2b ? b2b.cut : cutSrc(FACE, it.id)) : null;
  const photo = (!!src || !!b2b) && !failed && (it.e - it.s) * PPM >= 64;
  // 가장 긴 단어 글자 수: 긴 이름(MINIMONSTER 등)이 단어 중간에서 끊기지 않게 글자를 줄이는 데 쓴다
  const longest = Math.max(...it.en.split(/\s+/).map((w) => w.length));
  return (
    <div
      data-id={it.id}
      className={"blk" + (on ? " on" : "") + (photo ? " ph" : "") + (photo && b2b ? " b2b" + (b2bFaces ? " b2b-faces" : "") : "") + (it.en.length > 16 ? " long" : "")}
      style={{ ...toneVars(it.stage), "--len": longest, top: (reverse ? end - it.e : it.s - start) * PPM + 1 + "px", height: (it.e - it.s) * PPM - 2 + "px" } as CSSProperties}
    >
      <button
        type="button"
        className="blk-hit"
        aria-pressed={on}
        aria-label={`${it.en}, ${st.name}, ${time}. ${t("blk.hold")}`}
        onClick={() => !lp.consumed() && onToggle(it.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          onInfo(it.id);
        }}
        {...lp.handlers}
      >
        {photo ? (
          <>
            {cut ? (
              <img className="cut" ref={(el) => markAr(el, it.id, FACE)} onLoad={(e) => markAr(e.currentTarget, it.id, FACE)} src={cut} alt="" loading="lazy" decoding="async" draggable={false} onError={() => (b2b ? setB2bFailed(true) : setCutFailed(true))} />
            ) : b2b && b2bFaces ? (
              <span className="phw phw2">
                <img className="ph-img" src={b2b.a} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setB2bFailed(true)} />
                <img className="ph-img" src={b2b.b} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setB2bFailed(true)} />
              </span>
            ) : b2b ? (
              <span className="phw">
                <img className="ph-img b2b-cut" src={b2b.cut} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setB2bFailed(true)} />
              </span>
            ) : (
              <span className="phw">
                <img className="ph-img" src={src!} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />
              </span>
            )}
            <span className="tm tm-top">{time}</span>
            <span className="cap">
              <span className="nm">{it.en}</span>
              {it.genre && <span className="gn">{it.genre}</span>}
            </span>
          </>
        ) : (
          <>
            <span className="nm">{it.en}</span>
            {it.genre && <span className="gn">{it.genre}</span>}
            <span className="tm">{time}</span>
          </>
        )}
      </button>
      {live && <span className="fx-live" role="img" aria-label={t("f.live")} />}
    </div>
  );
}

export function TmlPage() {
  const { t, lang } = useI18n();
  const [dayId, setDayId] = useState(TML_DAYS[0].id);
  const DAY = TML_DAYS.find((d) => d.id === dayId) ?? TML_DAYS[0];
  const [START, END] = RANGE[DAY.id];
  const dayItems = useMemo(() => TML_ITEMS.filter((i) => i.day === dayId), [dayId]);
  const hours = useMemo(() => {
    const l: number[] = [];
    for (let m = START; m <= END; m += 60) l.push(m);
    return l;
  }, [START, END]);
  useFestTheme("tml");
  const [ctheme, setCtheme] = useCardTheme();
  const poster = usePoster();
  useMemo(() => setThemeSample(makeThemeSample(FACE, TML_ITEMS, TML_STAGES)), []);
  const [reverse, toggleReverse] = useReverse();
  useFont(ANTON);
  const { sel, setSel, toggle } = useSelection(SLUG, VALID);
  const now = useNowKst();
  const [info, setInfo] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [tut, setTut] = useState(() => {
    try {
      return localStorage.getItem(TUT.storageKey) !== "1";
    } catch {
      return true;
    }
  });
  const tutInfo = useCallback((id: string | null) => setInfo(id), []);
  const { stats, reload } = useFestStats("tml");
  const { toast, node: toastNode } = useToast();

  useBodyLock(!!info || exporting || ranking || tut);

  const total = sel.size;
  const perDay = useMemo(() => Object.fromEntries(TML_DAYS.map((d) => [d.id, TML_ITEMS.filter((i) => i.day === d.id && sel.has(i.id)).length])), [sel]);
  const overlap = useMemo(() => {
    const l = TML_ITEMS.filter((i) => sel.has(i.id));
    return calcClashes(l, (d) => TML_DAYS.find((x) => x.id === d)?.label[lang] ?? d);
  }, [sel, lang]);

  const { armed, reset } = useArmedReset(() => setSel(new Set()));

  // ----- 옆으로 밀기: 시간표(scroller)와 무대 이름 줄(heads)을 같이 움직이고, 무대 지도에 보이는 범위를 표시 -----
  const scroller = useRef<HTMLDivElement>(null);
  const heads = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  /** 시간표 크기 (크기가 바뀔 때만 다시 잰다. 스크롤마다 scrollWidth 를 읽으면 매 프레임 강제 레이아웃이 일어난다) */
  const dims = useRef({ track: 0, view: 0, range: 0, vw: 1 });
  /**
   * 무대 이름 줄이 시간표를 따라가는 방법:
   *  - 스크롤 연동 애니메이션(CSS `animation-timeline`)을 쓸 수 있는 브라우저(안드로이드 크롬 등)에서는 CSS 가 직접 따라간다.
   *    스크롤은 컴포지터 스레드에서 처리되는데 자바스크립트로 옮기면 한 프레임 늦게 따라가서, 천천히 밀 때 이름 줄과 열이 미세하게
   *    어긋나며 떨린다. CSS 연동은 같은 프레임에 움직이므로 어긋나지 않는다 (`--range` 만 JS 가 크기가 바뀔 때 알려 준다).
   *  - 쓸 수 없는 브라우저(아이폰 사파리 등)는 예전처럼 JS 가 transform 으로 옮긴다.
   */
  const cssSync = useMemo(() => {
    try {
      return typeof CSS !== "undefined" && CSS.supports("animation-timeline", "scroll()") && CSS.supports("timeline-scope", "--zs");
    } catch {
      return false;
    }
  }, []);
  const measure = useCallback(() => {
    const g = scroller.current;
    if (!g) return;
    // 보이는 범위 = 시간축(30px) 오른쪽부터
    const track = g.scrollWidth - 30, view = g.clientWidth - 30;
    const d = dims.current;
    d.track = track;
    d.view = view;
    d.range = Math.max(0, g.scrollWidth - g.clientWidth);
    d.vw = track > 0 ? Math.min(1, view / track) : 1;
    root.current?.style.setProperty("--range", d.range + "px");
  }, []);
  // 한 방향 동기화: 시간표(scroller)만 실제로 스크롤하고, 무대 이름 줄은 따라가게 한다
  // (예전엔 두 스크롤러가 서로 scrollLeft 를 덮어써서 천천히 밀 때 어긋나고 버벅였다)
  const apply = useCallback(() => {
    raf.current = 0;
    const g = scroller.current, h = heads.current;
    if (!g) return;
    const x = g.scrollLeft;
    if (h && !cssSync) h.style.transform = `translate3d(${-x}px,0,0)`;
    wrap.current?.classList.toggle("at-end", x + g.clientWidth >= g.scrollWidth - 4);
    wrap.current?.classList.toggle("at-start", x <= 4);
  }, [cssSync]);
  const sync = useCallback(() => {
    // JS 방식일 때 이름 줄은 즉시(같은 프레임) 옮기고, 나머지는 프레임당 한 번만
    const g = scroller.current, h = heads.current;
    if (g && h && !cssSync) h.style.transform = `translate3d(${-g.scrollLeft}px,0,0)`;
    if (!raf.current) raf.current = requestAnimationFrame(apply);
  }, [apply, cssSync]);
  useEffect(() => {
    measure();
    sync();
    const on = () => {
      measure();
      sync();
    };
    window.addEventListener("resize", on);
    // 칸 크기·글꼴이 바뀌어 시간표 폭이 달라질 때도 다시 잰다
    const g = scroller.current;
    const ro = typeof ResizeObserver !== "undefined" && g ? new ResizeObserver(on) : null;
    if (g && ro) {
      ro.observe(g);
      if (g.firstElementChild) ro.observe(g.firstElementChild);
    }
    return () => {
      window.removeEventListener("resize", on);
      ro?.disconnect();
    };
  }, [measure, sync]);
  // 처음 한 번: 튜토리얼이 끝나면 시간표를 살짝 옆으로 밀었다 돌아와 "옆에 더 있다"를 보여 준다
  useEffect(() => {
    if (tut || !MANY) return;
    let done = false;
    try {
      done = localStorage.getItem(NUDGE_KEY) === "1";
    } catch {
      done = true;
    }
    if (done || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const g = scroller.current;
    if (!g || g.scrollLeft > 0) return;
    const t1 = window.setTimeout(() => g.scrollTo({ left: 110, behavior: "smooth" }), 500);
    const t2 = window.setTimeout(() => {
      g.scrollTo({ left: 0, behavior: "smooth" });
      try {
        localStorage.setItem(NUDGE_KEY, "1");
      } catch {
        /* 무시 */
      }
    }, 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [tut]);

  // 지금 시각 줄 (행사 중에만)
  const nowMin = (now - (9 - (DAY.utc ?? 9)) * 3600_000 - Date.parse(DAY.date + "T00:00:00Z")) / 60_000;
  const nowOn = nowMin >= START && nowMin <= END;

  const render = useCallback(
    async (ids: string[], { ratio, lock, compact, noPhoto, view: v, theme }: RenderOpt) => {
      const view = v === "all" ? "all" : "ai";
      const day = TML_DAYS.find((d) => d.id === ids[0]) ?? TML_DAYS[0];
      const dItems = TML_ITEMS.filter((i) => i.day === day.id);
      const picked = dItems.filter((i) => sel.has(i.id));
      // 사진: 고른 공연만 그리는 모양이면 고른 공연 것만, 전체 표 모양이면 고른 무대의 모든 공연 것
      const layout = layoutOf({ stages: TML_STAGES, items: dItems, sel, noPhoto, view });
      const stageKeys = new Set(picked.map((i) => i.stage));
      const need = layout === "packed" ? picked : dItems.filter((i) => stageKeys.has(i.stage));
      const [, photos] = await Promise.all([ensureFonts(['400 40px "Anton"', ...(theme ? THEME_FONTS[theme]?.canvas ?? [] : [])]), noPhoto ? Promise.resolve(new Map()) : loadPhotos(FACE, need.map((i) => i.id))]);
      return renderMulti({ look: TML_LOOK, day, stages: TML_STAGES, items: dItems, sel, photos, ratio, lock, compact, noPhoto, view, nameOf: (it) => it.en, photoOf: (it) => it.id, theme });
    },
    [sel],
  );
  const report = useCallback((ids: string[]) => Promise.all(ids.map((d) => reportFest("tml", d, TML_ITEMS.filter((i) => i.day === d && sel.has(i.id)).map((i) => i.id)))), [sel]);

  const infoIt = info ? BYID[info] : null;
  const colStyle = { height: (END - START) * PPM } as CSSProperties;
  return (
    <>
      <div className={"wrap zon tml" + (cssSync && MANY ? " css-sync" : "")} style={FIT_STYLE} data-ct={ctheme} ref={root}>
        <header className="hero zon-hero">
          <div className="hero-top">
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
          </div>
          <div className="zon-head">
            <button type="button" className="fx-thumb" onClick={poster.show} aria-label={t("f.poster")}>
              <img src="/poster/tml-key.webp" alt="" width={105} height={131} />
            </button>
            <div className="zon-head-txt">
              <p className="zon-when">{t("f.tml.when")}</p>
              <h1 className="zon-logo" aria-label="TOMORROWLAND THAILAND 2026">
                TOMORROWLAND
              </h1>
              <p className="zon-where">{t("f.tml.where")}</p>
              <button type="button" className="fx-pbtn" onClick={poster.show}>
                {t("f.poster")}
              </button>
            </div>
          </div>
          <div className="stats-row">
            {stats && (
              <span className="dl-count">
                <span aria-hidden="true">⬇</span> <Rich text={t("stats.dl", { n: totalDownloads(stats) })} />
              </span>
            )}
            {DEMO && <span className="fx-demo">DEMO · 로컬 더미 데이터</span>}
            <button type="button" className="top-btn" onClick={() => setRanking(true)}>
              <span aria-hidden="true">🔥</span> {t("f.rank.btn")}
            </button>
          </div>
          <p>
            <Rich text={t("f.tml.intro")} />
          </p>
          <p className="legend">
            <Rich text={t("f.tml.legend")} />
          </p>
          <CardThemeMenu
            value={ctheme}
            onChange={setCtheme}
            extra={
              <>
                <button className="chip rev" type="button" aria-pressed={reverse} title={t("f.rev.hint")} onClick={toggleReverse}>
                  <span aria-hidden="true">↕</span> {t("f.rev.label")}
                </button>
                <OfflineChip slug={SLUG} />
              </>
            }
          />
        </header>

        <div className="sticky zon-sticky">
          <div className="seg ft-days" role="tablist" aria-label={t("f.days.aria")}>
            {TML_DAYS.map((d) => (
              <button key={d.id} type="button" role="tab" aria-selected={d.id === dayId} aria-pressed={d.id === dayId} onClick={() => setDayId(d.id)}>
                {d.label[lang]}
                {perDay[d.id] > 0 && <i>{perDay[d.id]}</i>}
              </button>
            ))}
          </div>
          <div className="zon-bar">
            <button className="chip help" type="button" aria-label={t("help")} onClick={() => setTut(true)}>
              ?
            </button>
          </div>
          <div className="zon-heads" ref={heads} >
            <div className="heads zon-track" style={{ "--n": TML_STAGES.length } as CSSProperties}>
              <div className="zon-corner" />
              {TML_STAGES.map((st) => (
                <div key={st.key} className="head" style={toneVars(st.key)}>
                  <div className="b">{st.name}</div>
                  <div className="h">{TML_GENRE[st.key]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="zon-wrap at-start" ref={wrap}>
          <div className="zon-scroll" ref={scroller} onScroll={sync}>
            <div className="grid zon-track" style={{ "--ppm": PPM + "px", "--n": TML_STAGES.length } as CSSProperties}>
              <div className="axis" style={colStyle}>
                {hours.map((m) => (
                  <span key={m} style={{ top: (reverse ? END - m : m - START) * PPM }}>
                    {fmt(m)}
                  </span>
                ))}
              </div>
              {TML_STAGES.map((st) => (
                <div key={st.key} className="col" data-stage={st.key} style={colStyle}>
                  {dayItems.filter((i) => i.stage === st.key).map((it) => (
                    <Block key={it.id} it={it} on={sel.has(it.id)} live={isLive(it, DAY, now)} theme={ctheme} start={START} end={END} reverse={reverse} onToggle={toggle} onInfo={setInfo} />
                  ))}
                </div>
              ))}
              {nowOn && (
                <div className="zon-now" style={{ top: (reverse ? END - nowMin : nowMin - START) * PPM }} aria-hidden="true">
                  <span>{t("f.tml.now")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <FestFooter note={t("f.tml.foot")} />
      </div>

      <div className="bar">
        <div className="bar-in">
          <div className="sum" aria-live="polite">
            <div>
              <Rich text={t("sum.sel", { n: total })} />
            </div>
            {overlap.pairs > 0 && <OverlapNote clashes={overlap.clashes} />}
          </div>
          <button className="btn ghost" type="button" onClick={reset} disabled={total === 0 && !armed}>
            {armed ? t("reset.arm") : t("reset")}
          </button>
          <button className="btn main" type="button" disabled={total === 0} onClick={() => setExporting(true)}>
            {t("make.wall")}
          </button>
        </div>
      </div>

      {infoIt && (
        <FestSheet
          key={infoIt.id}
          fest={FACE}
          slug={SLUG}
          it={infoIt}
          stage={STAGE[infoIt.stage]}
          day={TML_DAYS.find((d) => d.id === infoIt.day) ?? DAY}
          koFirst={false}
          nameOf={(id) => (BYID[id] ? BYID[id].en : id)}
          on={sel.has(infoIt.id)}
          onToggle={() => toggle(infoIt.id)}
          onClose={() => setInfo(null)}
          inTutorial={tut}
          ct={ctheme}
        />
      )}
      {exporting && (
        <FestExport
          segs={TML_DAYS.map((d) => ({ id: d.id, label: d.label[lang] }))}
          initial={(TML_DAYS.find((d) => perDay[d.id] > 0) ?? DAY).id}
          emptyText={t("f.exp.emptyDay")}
          isEmpty={(ids) => !TML_ITEMS.some((i) => ids.includes(i.day) && sel.has(i.id))}
          render={render}
          hoursFor={(ids) => hourList(TML_ITEMS.filter((i) => ids.includes(i.day)))}
          firstPick={(ids) => firstStart(TML_ITEMS.filter((i) => ids.includes(i.day) && sel.has(i.id)))}
          fileName={(k, r) => `TOMORROWLAND-THAILAND-2026-${k}-${r}.png`}
          onClose={() => setExporting(false)}
          toast={toast}
          report={report}
          onCounted={reload}
          opts={EXPORT_OPTS}
          views={[
            { id: "ai", label: "✨ " + t("f.exp.viewAi") },
            { id: "all", label: t("f.exp.viewAll") },
          ]}
          theme={ctheme}
          onTheme={setCtheme}
          voteFest="tml"
        />
      )}
      {ranking && (
        <FestRank
          fest="tml"
          face={FACE}
          title={t("f.rank.btn")}
          desc={t("f.rank.desc")}
          items={TML_ITEMS}
          days={TML_DAYS}
          nameOf={(it) => names(it, lang, false)[0]}
          colorOf={(it) => STAGE[it.stage].color}
          metaOf={(it) => STAGE[it.stage].name + " · " + timeText(it)}
          onInfo={(id) => {
            setRanking(false);
            setInfo(id);
          }}
          onClose={() => setRanking(false)}
        />
      )}
      {poster.open && <PosterViewer title="TOMORROWLAND THAILAND 2026" posters={POSTERS.map((p) => ({ src: p.src, label: t(p.key) }))} onClose={poster.hide} />}
      {tut && <Tutorial config={TUT} onClose={() => setTut(false)} onInfo={tutInfo} themePick={{ value: ctheme, onChange: setCtheme }} />}
      {toastNode}
    </>
  );
}
