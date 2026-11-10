// ZONNAFE(존나페) 2026: 무대 7곳을 한 표에 놓고 옆으로 밀어서 보는 타임테이블 (15:00 – 다음 날 05:00, 하루).
// 무대가 많은 페스티벌의 화면 규칙은 docs/무대-많은-페스티벌-UIUX.md.
//  - 칸 너비를 고정하고 옆으로 민다 (한 화면에 약 4.3칸). 왼쪽 시간축과 위쪽 무대 이름 줄은 고정
//  - 맨 위 "무대 지도"(색 막대 7칸): 지금 화면에 보이는 무대를 테두리로 알려 주고, 누르면 그 무대로 바로 간다
//  - 사진·미리보기 영상은 아티스트·주최측이 제공한 자료 (Vercel Blob)
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LangMenu, Rich, useI18n } from "../i18n";
import { ZON_DAYS, ZON_GENRE, ZON_ITEMS, ZON_STAGES } from "./zon";
import { firstStart, hourList, isLive, names, useFestTheme, useFont, useNowKst, useSelection } from "./common";
import { festFace } from "./faces";
import { FestSheet, PosterViewer, useLongPress, usePoster } from "./parts";
import { FestExport, type ExportOpt, type RenderOpt } from "./FestExport";
import { ensureFonts, loadPhotos } from "./festCanvas";
import { layoutOf, renderMulti } from "./festMulti";
import { ZON_LOOK } from "./zonLook";
import { DEMO, reportFest, totalDownloads, useFestStats } from "./festStats";
import { FestRank } from "./FestRank";
import { fmt, timeText, type FItem } from "./types";
import { Tutorial, type TutConfig } from "../components/Tutorial";
import { FestFooter, useArmedReset, useBodyLock, useToast } from "./shell";
import "./fest.css";

const SLUG = "zonnafe-2026";
const FACE = "zon";
const DAY = ZON_DAYS[0];
const PPM = 2.6;
const START = 15 * 60;
const END = 29 * 60;
const VALID = new Set(ZON_ITEMS.map((i) => i.id));
const BYID = Object.fromEntries(ZON_ITEMS.map((i) => [i.id, i]));
const STAGE = Object.fromEntries(ZON_STAGES.map((s) => [s.key, s]));
const ANTON = "https://fonts.googleapis.com/css2?family=Anton&display=swap";
const POSTERS = [
  { src: "/poster/zon-key.webp", key: "f.posterKey" },
  { src: "/poster/zon-timetable.webp", key: "f.posterTimetable" },
];
const EXPORT_OPTS: ExportOpt[] = ["lock", "compact", "noPhoto"];
const NUDGE_KEY = "fl:zon:nudge";
/**
 * 무대가 이 수 이상이면 "옆으로 밀기 + 맨 위 무대 지도"를 쓴다 (docs/새-페스티벌-표준-지침.md 6번).
 * 그보다 적으면 모든 무대를 한 화면에 나란히 놓고 무대 지도는 숨긴다 (밀 필요가 없으니 "지금 어디"를 알릴 필요도 없다)
 */
const MAP_MIN_STAGES = 6;
const MANY = ZON_STAGES.length >= MAP_MIN_STAGES;
/** 무대가 적으면 칸 너비를 화면에 딱 맞춘다: (화면 너비 − 좌우 여백 12 − 시간축 30 − 칸 사이 간격 3×무대 수) ÷ 무대 수. 많으면 CSS 기본값(한 화면에 약 4.3칸) */
const FIT_STYLE = MANY ? undefined : ({ "--cw": `clamp(48px, calc((min(100vw, 560px) - ${42 + 3 * ZON_STAGES.length}px) / ${ZON_STAGES.length}), 132px)` } as CSSProperties);
const toneVars = (key: string) => ({ "--c": STAGE[key].color, "--ci": STAGE[key].ink }) as CSSProperties;

// 튜토리얼: 영상이 있는 첫 아티스트로 시연 (영상 칸이 열리는 단계 포함, 연습이라 재생은 안 한다)
const TUT: TutConfig = {
  storageKey: "fl:zon:tut",
  block: ".zon .col .blk:nth-child(2)",
  blockFallback: ".zon .blk",
  text: { "tut.s3.b": "f.tut.s3.b", "tut.drop.t": "f.zon.tut.clip.t", "tut.drop.b": "f.zon.tut.clip.b" },
  clipSlug: SLUG,
};

const hours: number[] = [];
for (let m = START; m <= END; m += 60) hours.push(m);

function Block({ it, on, live, warn, onToggle, onInfo }: { it: FItem; on: boolean; live: boolean; warn: boolean; onToggle: (id: string) => void; onInfo: (id: string) => void }) {
  const { t } = useI18n();
  const st = STAGE[it.stage];
  const lp = useLongPress(() => onInfo(it.id));
  const time = timeText(it);
  const src = festFace(FACE, it.id);
  const [failed, setFailed] = useState(false);
  const photo = !!src && !failed && (it.e - it.s) * PPM >= 64;
  // 가장 긴 단어 글자 수: 긴 이름(MINIMONSTER 등)이 단어 중간에서 끊기지 않게 글자를 줄이는 데 쓴다
  const longest = Math.max(...it.en.split(/\s+/).map((w) => w.length));
  return (
    <div
      data-id={it.id}
      className={"blk" + (on ? " on" : "") + (photo ? " ph" : "")}
      style={{ ...toneVars(it.stage), "--len": longest, top: (it.s - START) * PPM + 1 + "px", height: (it.e - it.s) * PPM - 2 + "px" } as CSSProperties}
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
            <img className="ph-img" src={src!} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />
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
      {warn && (
        <span className="warn" role="img" aria-label={t("overlap")}>
          ⚠
        </span>
      )}
    </div>
  );
}

export function ZonPage() {
  const { t, lang } = useI18n();
  useFestTheme("zon");
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
  const { stats, reload } = useFestStats("zon");
  const { toast, node: toastNode } = useToast();
  const poster = usePoster();

  useBodyLock(!!info || exporting || ranking || tut);

  const total = sel.size;
  const perStage = useMemo(() => Object.fromEntries(ZON_STAGES.map((s) => [s.key, ZON_ITEMS.filter((i) => i.stage === s.key && sel.has(i.id)).length])), [sel]);
  const overlap = useMemo(() => {
    const l = ZON_ITEMS.filter((i) => sel.has(i.id));
    const ids = new Set<string>();
    let pairs = 0;
    for (let i = 0; i < l.length; i++)
      for (let j = i + 1; j < l.length; j++)
        if (l[i].s < l[j].e && l[j].s < l[i].e) {
          pairs++;
          ids.add(l[i].id);
          ids.add(l[j].id);
        }
    return { ids, pairs };
  }, [sel]);

  const { armed, reset } = useArmedReset(() => setSel(new Set()));

  // ----- 옆으로 밀기: 시간표(scroller)와 무대 이름 줄(heads)을 같이 움직이고, 무대 지도에 보이는 범위를 표시 -----
  const scroller = useRef<HTMLDivElement>(null);
  const heads = useRef<HTMLDivElement>(null);
  const map = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  // 한 방향 동기화: 시간표(scroller)만 실제로 스크롤하고, 무대 이름 줄은 transform 으로 따라가게 한다
  // (예전엔 두 스크롤러가 서로 scrollLeft 를 덮어써서 천천히 밀 때 어긋나고 버벅였다)
  const apply = useCallback(() => {
    raf.current = 0;
    const g = scroller.current, h = heads.current;
    if (!g) return;
    const x = g.scrollLeft;
    if (h) h.style.transform = `translate3d(${-x}px,0,0)`;
    // 보이는 범위 = 시간축(30px) 오른쪽부터
    const track = g.scrollWidth - 30, view = g.clientWidth - 30;
    if (track > 0 && map.current) {
      map.current.style.setProperty("--vl", ((x / track) * 100).toFixed(2) + "%");
      map.current.style.setProperty("--vw", (Math.min(1, view / track) * 100).toFixed(2) + "%");
    }
    wrap.current?.classList.toggle("at-end", x + g.clientWidth >= g.scrollWidth - 4);
    wrap.current?.classList.toggle("at-start", x <= 4);
  }, []);
  const sync = useCallback(() => {
    // 이름 줄은 즉시(같은 프레임) 옮기고, 나머지(지도 테두리 등)는 프레임당 한 번만
    const g = scroller.current, h = heads.current;
    if (g && h) h.style.transform = `translate3d(${-g.scrollLeft}px,0,0)`;
    if (!raf.current) raf.current = requestAnimationFrame(apply);
  }, [apply]);
  useEffect(() => {
    sync();
    const on = () => sync();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [sync]);
  /** 무대 지도에서 고른 무대가 시간축 바로 옆에 오게 민다 */
  const goStage = useCallback((key: string) => {
    const g = scroller.current;
    const col = g?.querySelector<HTMLElement>(`.col[data-stage="${key}"]`);
    const axisEl = g?.querySelector<HTMLElement>(".axis");
    if (!g || !col || !axisEl) return;
    const smooth = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    g.scrollTo({ left: col.offsetLeft - axisEl.offsetWidth - 3, behavior: smooth ? "smooth" : "auto" });
  }, []);
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
  const nowMin = (now - Date.parse(DAY.date + "T00:00:00Z")) / 60_000;
  const nowOn = nowMin >= START && nowMin <= END;

  const render = useCallback(
    async (_ids: string[], { ratio, lock, compact, noPhoto, view: v }: RenderOpt) => {
      const view = v === "all" ? "all" : "ai";
      const picked = ZON_ITEMS.filter((i) => sel.has(i.id));
      // 사진: 고른 공연만 그리는 모양이면 고른 공연 것만, 전체 표 모양이면 고른 무대의 모든 공연 것
      const layout = layoutOf({ stages: ZON_STAGES, items: ZON_ITEMS, sel, noPhoto, view });
      const stageKeys = new Set(picked.map((i) => i.stage));
      const need = layout === "packed" ? picked : ZON_ITEMS.filter((i) => stageKeys.has(i.stage));
      const [, photos] = await Promise.all([ensureFonts(['400 40px "Anton"']), noPhoto ? Promise.resolve(new Map()) : loadPhotos(FACE, need.map((i) => i.id))]);
      return renderMulti({ look: ZON_LOOK, day: DAY, stages: ZON_STAGES, items: ZON_ITEMS, sel, photos, ratio, lock, compact, noPhoto, view, nameOf: (it) => it.en, photoOf: (it) => it.id });
    },
    [sel],
  );
  const report = useCallback(() => Promise.all([reportFest("zon", DAY.id, ZON_ITEMS.filter((i) => sel.has(i.id)).map((i) => i.id))]), [sel]);

  const infoIt = info ? BYID[info] : null;
  const colStyle = { height: (END - START) * PPM } as CSSProperties;
  return (
    <>
      <div className="wrap zon" style={FIT_STYLE}>
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
              <img src="/poster/zon-key.webp" alt="" width={112} height={140} />
            </button>
            <div className="zon-head-txt">
              <p className="zon-when">{t("f.zon.when")}</p>
              <h1 className="zon-logo" aria-label="ZONNAFE 2026">
                ZONNAFE
              </h1>
              <p className="zon-where">{t("f.zon.where")}</p>
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
            <Rich text={t("f.zon.intro")} />
          </p>
          <p className="legend">
            <Rich text={t("f.zon.legend")} />
          </p>
        </header>

        <div className="sticky zon-sticky">
          <div className="zon-bar">
            {MANY && (
              <div className="zon-map" ref={map} style={{ "--n": ZON_STAGES.length } as CSSProperties} role="group" aria-label={t("f.zon.map")}>
                {ZON_STAGES.map((st) => (
                  <button key={st.key} type="button" className="zon-seg" style={toneVars(st.key)} onClick={() => goStage(st.key)} aria-label={t("f.zon.goStage", { s: st.name })}>
                    <span className="g">{ZON_GENRE[st.key]}</span>
                    {perStage[st.key] > 0 && <i>{perStage[st.key]}</i>}
                  </button>
                ))}
                <span className="zon-view" aria-hidden="true" />
              </div>
            )}
            <button className="chip help" type="button" aria-label={t("help")} onClick={() => setTut(true)}>
              ?
            </button>
          </div>
          <div className="zon-heads" ref={heads} >
            <div className="heads zon-track" style={{ "--n": ZON_STAGES.length } as CSSProperties}>
              <div className="zon-corner" />
              {ZON_STAGES.map((st) => (
                <div key={st.key} className="head" style={toneVars(st.key)}>
                  <div className="b">{st.name}</div>
                  <div className="h">{ZON_GENRE[st.key]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="zon-wrap at-start" ref={wrap}>
          <div className="zon-scroll" ref={scroller} onScroll={sync}>
            <div className="grid zon-track" style={{ "--ppm": PPM + "px", "--n": ZON_STAGES.length } as CSSProperties}>
              <div className="axis" style={colStyle}>
                {hours.map((m) => (
                  <span key={m} style={{ top: (m - START) * PPM }}>
                    {fmt(m)}
                  </span>
                ))}
              </div>
              {ZON_STAGES.map((st) => (
                <div key={st.key} className="col" data-stage={st.key} style={colStyle}>
                  {ZON_ITEMS.filter((i) => i.stage === st.key).map((it) => (
                    <Block key={it.id} it={it} on={sel.has(it.id)} live={isLive(it, DAY, now)} warn={overlap.ids.has(it.id)} onToggle={toggle} onInfo={setInfo} />
                  ))}
                </div>
              ))}
              {nowOn && (
                <div className="zon-now" style={{ top: (nowMin - START) * PPM }} aria-hidden="true">
                  <span>{t("f.zon.now")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <FestFooter note={t("f.zon.foot")} />
      </div>

      <div className="bar">
        <div className="bar-in">
          <div className="sum" aria-live="polite">
            <div>
              <Rich text={t("sum.sel", { n: total })} />
            </div>
            {overlap.pairs > 0 && <div>{t("sum.overlap", { n: overlap.pairs })}</div>}
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
          day={DAY}
          koFirst={false}
          nameOf={(id) => (BYID[id] ? BYID[id].en : id)}
          on={sel.has(infoIt.id)}
          onToggle={() => toggle(infoIt.id)}
          onClose={() => setInfo(null)}
          inTutorial={tut}
        />
      )}
      {exporting && (
        <FestExport
          segs={[{ id: DAY.id, label: DAY.label[lang] }]}
          initial={DAY.id}
          emptyText={t("f.exp.emptyDay")}
          isEmpty={() => total === 0}
          render={render}
          hoursFor={() => hourList(ZON_ITEMS)}
          firstPick={() => firstStart(ZON_ITEMS.filter((i) => sel.has(i.id)))}
          fileName={(_k, r) => `ZONNAFE-2026-${r}.png`}
          onClose={() => setExporting(false)}
          toast={toast}
          report={report}
          onCounted={reload}
          opts={EXPORT_OPTS}
          views={[
            { id: "ai", label: "✨ " + t("f.exp.viewAi") },
            { id: "all", label: t("f.exp.viewAll") },
          ]}
          voteFest="zon"
        />
      )}
      {ranking && (
        <FestRank
          fest="zon"
          face={FACE}
          title={t("f.rank.btn")}
          desc={t("f.rank.desc")}
          items={ZON_ITEMS}
          days={ZON_DAYS}
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
      {poster.open && <PosterViewer title="ZONNAFE 2026" posters={POSTERS.map((p) => ({ src: p.src, label: t(p.key) }))} onClose={poster.hide} />}
      {tut && <Tutorial config={TUT} onClose={() => setTut(false)} onInfo={tutInfo} />}
      {toastNode}
    </>
  );
}
