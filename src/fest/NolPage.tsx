// NOL 페스티벌: 스테이지마다 티켓이 따로라서 스테이지 탭 → 날짜 탭 → 한 줄 타임라인
import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { LangMenu, Rich, useI18n } from "../i18n";
import { NOL_DAYS, NOL_ITEMS, NOL_STAGES, type NolStage } from "./nol";
import { firstStart, hourList, isLive, listenLinks, names, useFestTheme, useNowKst, useSelection } from "./common";
import { FFace, PosterViewer, usePoster } from "./parts";
import { PlatformIcon, type Platform } from "./icons";
import { FestExport, type RenderOpt } from "./FestExport";
import { ensureFonts, loadPhotos, renderNol, type NolCol } from "./festCanvas";
import { DEMO, reportFest, useFestStats } from "./festStats";
import { FestRank } from "./FestRank";
import { fmt, type FItem } from "./types";
import { FestFooter, useArmedReset, useBodyLock, useToast } from "./shell";
import "./fest.css";

const SLUG = "nol-festival";
const FACE = "nol";
const STAGE_KEY = "fl:nol-festival:stage";
const VALID = new Set(NOL_ITEMS.map((i) => i.id));
const BYID = Object.fromEntries(NOL_ITEMS.map((i) => [i.id, i]));
const DAY = Object.fromEntries(NOL_DAYS.map((d) => [d.id, d]));
export const NOL_POSTERS = [{ src: "/poster/nol-lineup.webp", key: "f.posterLineup" }];
/** 배경화면의 날짜 → 그날 공연 칸 (토요일 밤 애프터 파티는 토요일에 넣는다) */
const EXPORT_DAYS: Record<string, string[]> = { sat: ["sat", "after"], sun: ["sun"] };

/** 카드 높이: 거의 같은 높이 (긴 공연만 조금 더 높게, 최대 104px) */
// 이름이 길면(두 줄 넘게) 아래 로고 줄과 겹치지 않게 조금 더 높인다
const cardH = (min: number, name: string) => Math.round(Math.max(name.length > 22 ? 126 : 84, Math.min(104, 70 + min * 0.45)));

/** 카드 아래 오른쪽 듣기 버튼 (로고 가로 한 줄). 멜론은 한국어로 볼 때만 */
const PLATFORMS: { p: Platform; key: string; link: keyof ReturnType<typeof listenLinks> }[] = [
  { p: "youtube", key: "link.yt", link: "youtube" },
  { p: "spotify", key: "link.sp", link: "spotify" },
  { p: "apple", key: "link.am", link: "apple" },
  { p: "melon", key: "f.link.melon", link: "melon" },
];

function Row({ it, on, live, flash, onToggle }: { it: FItem; on: boolean; live: boolean; flash: boolean; onToggle: (id: string) => void }) {
  const { t, lang } = useI18n();
  const [main, sub] = names(it, lang, false);
  const dur = it.e - it.s;
  const links = listenLinks(it, false);
  return (
    <li data-id={it.id} className={"nr" + (on ? " on" : "") + (live ? " live" : "") + (flash ? " flash" : "")} style={{ "--h": cardH(dur, main) + "px" } as CSSProperties}>
      <div className="nr-time" aria-hidden="true">
        <b>{fmt(it.s)}</b>
        <span>{fmt(it.e)}</span>
      </div>
      <div className="nr-card">
        <button
          type="button"
          className="nr-hit"
          aria-pressed={on}
          aria-label={`${main}, ${fmt(it.s)}–${fmt(it.e)}`}
          onClick={() => onToggle(it.id)}
        >
          <span className="nr-ph">
            <FFace fest={FACE} id={it.id} name={it.en} className="nr-img" initClass="nr-init" />
            <span className="nr-check" aria-hidden="true">
              ✓
            </span>
          </span>
          <span className="nr-txt">
            <span className="nr-top">
              {live && <span className="nr-live">● {t("f.live")}</span>}
              <span className="nr-nm">{main}</span>
              {sub && <span className="nr-sub">{sub}</span>}
            </span>
            <span className="nr-dur">
              {t("f.min", { n: dur })}
            </span>
          </span>
        </button>
        <div className="nr-links">
          {PLATFORMS.filter((x) => x.p !== "melon" || lang === "ko").map((x) => (
            <a key={x.p} className="nr-ic" href={links[x.link]} target="_blank" rel="noopener noreferrer" aria-label={main + " · " + t(x.key)} title={t(x.key)}>
              <PlatformIcon p={x.p} size={19} />
            </a>
          ))}
        </div>
      </div>
    </li>
  );
}

export function NolPage() {
  const { t, lang } = useI18n();
  useFestTheme("nol");
  const { sel, setSel, toggle } = useSelection(SLUG, VALID);
  const now = useNowKst();
  const [stageKey, setStageKey] = useState(() => {
    try {
      const s = localStorage.getItem(STAGE_KEY);
      if (s && NOL_STAGES.some((x) => x.key === s)) return s;
    } catch {
      /* 저장소 없음 */
    }
    return NOL_STAGES[0].key;
  });
  const stage = NOL_STAGES.find((s) => s.key === stageKey)! as NolStage;
  const today = new Date(now).toISOString().slice(0, 10);
  const firstDay = (st: NolStage) => st.days.find((d) => DAY[d].date === today && d !== "after") ?? st.days[0];
  const [day, setDay] = useState(() => firstDay(stage));
  // 랭킹에서 누른 아티스트로 이동해서 잠깐 반짝
  const [flash, setFlash] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [ranking, setRanking] = useState(false);
  const { stats, reload } = useFestStats("nol");
  const poster = usePoster();
  const { toast, node: toastNode } = useToast();

  useBodyLock(exporting || ranking);
  useEffect(() => {
    if (!flash) return;
    // 랭킹 창이 닫히며 뒤로가기·스크롤 잠금이 풀린 다음에 이동한다
    const go = window.setTimeout(() => document.querySelector(`[data-id="${flash}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
    const tm = window.setTimeout(() => setFlash(null), 2200);
    return () => {
      clearTimeout(go);
      clearTimeout(tm);
    };
  }, [flash]);
  // 페이지 배경을 스테이지 색으로 (위쪽 주소창 색도 함께)
  useEffect(() => {
    document.documentElement.style.setProperty("--nb", stage.bg);
    document.documentElement.style.setProperty("--nh", stage.hi);
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = stage.bg;
    return () => {
      document.documentElement.style.removeProperty("--nb");
      document.documentElement.style.removeProperty("--nh");
    };
  }, [stage]);

  function pickStage(k: string) {
    const st = NOL_STAGES.find((s) => s.key === k)!;
    setStageKey(k);
    setDay(firstDay(st));
    try {
      localStorage.setItem(STAGE_KEY, k);
    } catch {
      /* 무시 */
    }
  }

  const stageCount = (k: string) => NOL_ITEMS.filter((i) => i.stage === k && sel.has(i.id)).length;
  const list = useMemo(() => NOL_ITEMS.filter((i) => i.stage === stageKey && i.day === day), [stageKey, day]);
  const dayCount = (d: string) => NOL_ITEMS.filter((i) => i.stage === stageKey && i.day === d && sel.has(i.id)).length;
  const here = stageCount(stageKey);
  const total = NOL_ITEMS.filter((i) => sel.has(i.id)).length;
  /** 배경화면 날짜(sat/sun)에 고른 공연 */
  const pickedOn = (d: string) => NOL_ITEMS.filter((i) => EXPORT_DAYS[d].includes(i.day) && sel.has(i.id));

  const { armed, reset } = useArmedReset(() => setSel((prev) => new Set(Array.from(prev).filter((id) => BYID[id]?.stage !== stageKey))));

  const render = useCallback(
    async (ids: string[], { ratio, lock, compact, from, layout }: RenderOpt) => {
      // 고른 공연이 있는 스테이지·날짜만 칸으로 (A·B를 골랐으면 A·B만, 다 골랐으면 전부)
      const cols: NolCol[] = [];
      for (const d of ids)
        for (const st of NOL_STAGES)
          for (const sd of st.days.filter((x) => EXPORT_DAYS[d].includes(x))) {
            const items = NOL_ITEMS.filter((i) => i.stage === st.key && i.day === sd);
            if (items.some((i) => sel.has(i.id))) cols.push({ stage: st, day: DAY[sd], items });
          }
      const [, photos] = await Promise.all([ensureFonts(), loadPhotos(FACE, cols.flatMap((c) => c.items.map((i) => i.id)))]);
      return renderNol({
        cols,
        sub: DAY[ids[0]].short,
        labels: { sat: DAY.sat.short, sun: DAY.sun.short },
        sel,
        photos,
        ratio,
        lock,
        compact,
        from,
        layout,
        nameOf: (it) => names(it, lang, false),
      });
    },
    [sel, lang],
  );
  const report = useCallback(
    (ids: string[]) =>
      Promise.all(
        ids.map((d) =>
          reportFest(
            "nol",
            d as "sat" | "sun",
            NOL_ITEMS.filter((i) => EXPORT_DAYS[d].includes(i.day) && sel.has(i.id)).map((i) => i.id),
          ),
        ),
      ),
    [sel],
  );

  const title = "NOL FESTIVAL";
  return (
    <>
      <div className="wrap fx nol">
        <header className="fx-top">
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

        <section className="nol-hero">
          <div className="nol-hero-txt">
            <p className="nol-when">2026.10.17 – 10.18 · KINTEX</p>
            <h1 className="nol-title">{title}</h1>
            <button type="button" className="fx-pbtn" onClick={poster.show}>
              🖼 {t("f.poster")}
            </button>
          </div>
          <button type="button" className="fx-thumb" onClick={poster.show} aria-label={t("f.posterAlt", { name: title })}>
            <img src="/poster/nol-lineup.webp" alt="" width={120} height={160} />
          </button>
        </section>
        <p className="fx-intro">
          <Rich text={t("f.nol.intro")} />
        </p>
        <div className="stats-row fx-stats">
          {stats && (
            <span className="dl-count">
              <span aria-hidden="true">⬇</span> <Rich text={t("stats.dl", { n: stats.downloads.sat + stats.downloads.sun })} />
            </span>
          )}
          {DEMO && <span className="fx-demo">DEMO · 로컬 더미 데이터</span>}
          <button type="button" className="top-btn" onClick={() => setRanking(true)}>
            <span aria-hidden="true">🔥</span> {t("f.rank.stageBtn", { s: stage.tab })}
          </button>
        </div>

        <div className="nol-sticky">
          <div className="nol-stages" role="tablist">
            {NOL_STAGES.map((st) => {
              const n = stageCount(st.key);
              return (
                <button
                  key={st.key}
                  type="button"
                  role="tab"
                  aria-selected={st.key === stageKey}
                  className="nol-stage"
                  style={{ "--sb": st.bg, "--sh": st.hi } as CSSProperties}
                  onClick={() => pickStage(st.key)}
                >
                  <b>{st.tab}</b>
                  <span>{st.place}</span>
                  {n > 0 && <i className="nol-cnt">{n}</i>}
                </button>
              );
            })}
          </div>
          <div className="nol-days" role="tablist">
            {stage.days.map((d) => {
              const n = dayCount(d);
              return (
                <button key={d} type="button" role="tab" aria-selected={d === day} className="nol-day" onClick={() => setDay(d)}>
                  {d === "sat" && stage.key === "edm" ? "EDM · " + DAY.sat.label[lang] : DAY[d].label[lang]}
                  {n > 0 && <i>{n}</i>}
                </button>
              );
            })}
          </div>
        </div>

        <h2 className="nol-stage-h">
          {stage.name} <span>| {stage.place}</span>
        </h2>
        {day === "after" && <p className="nol-note">{t("f.nol.after")}</p>}

        <ol className="nol-line">
          {list.map((it, k) => {
            const prev = list[k - 1];
            const gap = prev ? it.s - prev.e : 0;
            return (
              <Fragment key={it.id}>
                {gap > 0 && (
                  <li className="nol-gap" style={{ "--g": Math.min(44, 16 + gap) + "px" } as CSSProperties} aria-hidden="true">
                    <span>
                      {stage.gap} · {t("f.min", { n: gap })}
                    </span>
                  </li>
                )}
                <Row it={it} on={sel.has(it.id)} live={isLive(it, DAY[it.day], now)} flash={flash === it.id} onToggle={toggle} />
              </Fragment>
            );
          })}
        </ol>

        <FestFooter note={t("f.foot", { name: "NOL FESTIVAL" })} />
      </div>

      <div className="bar">
        <div className="bar-in">
          <div className="sum" aria-live="polite">
            <div>
              <span className="nol-sum-stage">{stage.tab}</span> <Rich text={t("sum.sel", { n: here })} />
            </div>
            {total > here && <div>{t("f.sumAll", { n: total })}</div>}
          </div>
          <button className="btn ghost" type="button" onClick={reset} disabled={here === 0 && !armed}>
            {armed ? t("reset.arm") : t("reset")}
          </button>
          <button className="btn main" type="button" disabled={total === 0} onClick={() => setExporting(true)}>
            {t("make.wall")}
          </button>
        </div>
      </div>

      {exporting && (
        <FestExport
          segs={["sat", "sun"].map((d) => ({ id: d, label: DAY[d].label[lang].replace(/^DAY \d · /, "") }))}
          pairLabel={t("exp.both")}
          initial={(() => {
            const d = day === "after" ? "sat" : day;
            return pickedOn(d).length ? d : pickedOn("sat").length ? "sat" : "sun";
          })()}
          emptyText={t("f.exp.emptyDay")}
          isEmpty={(ids) => !ids.some((d) => pickedOn(d).length)}
          render={render}
          hoursFor={(ids) => hourList(NOL_ITEMS.filter((i) => ids.some((d) => EXPORT_DAYS[d].includes(i.day))))}
          firstPick={(ids) => firstStart(ids.flatMap(pickedOn))}
          fileName={(k, r) => `NOL-Festival-${k.replace("+", "-")}-${r}.png`}
          onClose={() => setExporting(false)}
          toast={toast}
          report={report}
          onCounted={reload}
        />
      )}
      {ranking && (
        <FestRank
          fest="nol"
          face={FACE}
          title={t("f.rank.stageBtn", { s: stage.tab })}
          desc={t("f.rank.descNol", { s: stage.name })}
          items={NOL_ITEMS.filter((i) => i.stage === stageKey)}
          days={stage.days.map((d) => DAY[d])}
          nameOf={(it) => it.en}
          colorOf={() => stage.bg}
          metaOf={(it) => DAY[it.day].label[lang] + " · " + fmt(it.s) + "–" + fmt(it.e)}
          onInfo={(id) => {
            setRanking(false);
            setDay(BYID[id].day);
            setFlash(id);
          }}
          onClose={() => setRanking(false)}
          hourTab={false}
        />
      )}
      {poster.open && <PosterViewer title={title} posters={NOL_POSTERS.map((p) => ({ src: p.src, label: t(p.key) }))} onClose={poster.hide} />}
      {toastNode}
    </>
  );
}
