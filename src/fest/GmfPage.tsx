// 그랜드 민트 페스티벌 2026: EDC처럼 무대 4개를 나란히 놓은 타임테이블
import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { LangMenu, Rich, useI18n } from "../i18n";
import { GMF_DAYS, GMF_DOORS, GMF_ITEMS, GMF_STAGES, KIND_COLOR } from "./gmf";
import { firstStart, hourList, isLive, names, useFestTheme, useFont, useNowKst, useSelection } from "./common";
import { FFace, FestSheet, PosterViewer, photoId, useLongPress, usePoster } from "./parts";
import { FestExport, type RenderOpt } from "./FestExport";
import { ensureFonts, loadPhotos, renderGmf } from "./festCanvas";
import { festFace } from "./faces";
import { DEMO, reportFest, useFestStats } from "./festStats";
import { FestRank } from "./FestRank";
import { fmt, timeText, type FItem, type FStage } from "./types";
import { FESTIVALS } from "../festivals";
import { Tutorial, type TutConfig } from "../components/Tutorial";
import { FestFooter, useArmedReset, useBodyLock, useToast } from "./shell";
import "./fest.css";

const GMF_FEST = FESTIVALS.find((f) => f.slug === "grand-mint-festival")!;

const SLUG = "grand-mint-festival";
const FACE = "gmf";
const PPM = 2.5;
const START = 12 * 60;
const END = 23 * 60;
const VALID = new Set(GMF_ITEMS.map((i) => i.id));
const BYID = Object.fromEntries(GMF_ITEMS.map((i) => [i.id, i]));
const STAGE = Object.fromEntries(GMF_STAGES.map((s) => [s.key, s]));
const BAGEL = "https://fonts.googleapis.com/css2?family=Bagel+Fat+One&display=swap";
export const GMF_POSTERS = [
  { src: "/poster/gmf-lineup.webp", key: "f.posterLineup" },
  { src: "/poster/gmf-key.webp", key: "f.posterKey" },
];

/** 튜토리얼: 민트 브리즈 무대 두 번째 공연으로 시연, 3단계 설명은 멜론 포함 문구 */
const TUT: TutConfig = { storageKey: "fl:gmf:tut", block: ".gmf-col .gb:nth-child(2)", blockFallback: ".gb", text: { "tut.s3.b": "f.tut.s3.b" } };

const hours: number[] = [];
for (let m = START; m <= END; m += 60) hours.push(m);

const isAct = (it: FItem) => !it.kind || it.kind === "act";

function colorOf(it: FItem, st: FStage) {
  return it.kind && it.kind !== "act" ? KIND_COLOR[it.kind] : st.color;
}

function Block({ it, on, live, warn, onToggle, onInfo }: { it: FItem; on: boolean; live: boolean; warn: boolean; onToggle: (id: string) => void; onInfo: (id: string) => void }) {
  const { t, lang } = useI18n();
  const st = STAGE[it.stage];
  const [main] = names(it, lang, true);
  const lp = useLongPress(() => onInfo(it.id));
  const h = (it.e - it.s) * PPM;
  const isAct = !it.kind || it.kind === "act";
  const pid = photoId(it);
  const photo = isAct && !!festFace(FACE, pid) && h >= 70;
  const withName = !isAct && it.with?.length ? it.with.map((w) => names(BYID[w], lang, true)[0]).join(", ") : "";
  return (
    <div
      data-id={it.id}
      className={"gb" + (on ? " on" : "") + (photo ? " ph" : "") + (isAct ? "" : " ev")}
      style={{ "--c": colorOf(it, st), "--k": st.ink, top: (it.s - START) * PPM + 2 + "px", height: h - 4 + "px" } as CSSProperties}
    >
      <button
        type="button"
        className="gb-hit"
        aria-pressed={on}
        aria-label={`${main}, ${st.name}, ${timeText(it)}. ${t("blk.hold")}`}
        onClick={() => !lp.consumed() && onToggle(it.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          onInfo(it.id);
        }}
        {...lp.handlers}
      >
        {photo && <FFace fest={FACE} id={pid} name={main} className="gb-img" initClass="gb-none" />}
        {photo && <span className="gb-tm top">{timeText(it)}</span>}
        <span className="gb-cap">
          {!isAct && <span className="gb-kind">{it.kind!.toUpperCase()}</span>}
          <span className="gb-nm">{main}</span>
          {withName && <span className="gb-with">{t("f.with", { n: withName })}</span>}
          {!photo && <span className="gb-tm">{timeText(it)}</span>}
        </span>
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

export function GmfPage() {
  const { t, lang } = useI18n();
  useFestTheme("gmf");
  useFont(BAGEL);
  const { sel, setSel, toggle } = useSelection(SLUG, VALID);
  const now = useNowKst();
  const [day, setDay] = useState(() => {
    // 행사 당일이면 그날 탭으로
    const today = new Date(now).toISOString().slice(0, 10);
    return GMF_DAYS.find((d) => d.date === today)?.id ?? GMF_DAYS[0].id;
  });
  const [info, setInfo] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [ranking, setRanking] = useState(false);
  // 처음 들어오면 사용법 안내
  const [tut, setTut] = useState(() => {
    try {
      return localStorage.getItem(TUT.storageKey) !== "1";
    } catch {
      return true;
    }
  });
  const tutInfo = useCallback((id: string | null) => setInfo(id), []);
  const { stats, reload } = useFestStats("gmf");
  const poster = usePoster();
  const { toast, node: toastNode } = useToast();

  useBodyLock(!!info || exporting || ranking || tut);

  const counts = useMemo(() => Object.fromEntries(GMF_DAYS.map((d) => [d.id, GMF_ITEMS.filter((i) => i.day === d.id && sel.has(i.id)).length])), [sel]);
  const total = counts.sat + counts.sun;
  const dayObj = GMF_DAYS.find((d) => d.id === day)!;
  const overlap = useMemo(() => {
    const l = GMF_ITEMS.filter((i) => i.day === day && sel.has(i.id));
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
  }, [sel, day]);

  const { armed, reset } = useArmedReset(() => setSel(new Set()));

  const render = useCallback(
    async (ids: string[], { ratio, lock, compact, from, layout }: RenderOpt) => {
      const days = GMF_DAYS.filter((d) => ids.includes(d.id));
      const items = GMF_ITEMS.filter((i) => ids.includes(i.day));
      const [, photos] = await Promise.all([ensureFonts(['400 40px "Bagel Fat One"']), loadPhotos(FACE, items.map(photoId))]);
      return renderGmf({
        days,
        stages: GMF_STAGES,
        items,
        sel,
        photos,
        ratio,
        lock,
        compact,
        from,
        layout,
        nameOf: (it) => names(it, lang, true)[0],
        photoOf: (it) => (!it.kind || it.kind === "act" ? it.id : undefined),
        kindColor: colorOf,
      });
    },
    [sel, lang],
  );
  // 저장·공유·크게 보기를 누르면 그날 고른 아티스트(토크·이벤트 제외)를 집계에 보낸다
  const report = useCallback(
    (ids: string[]) =>
      Promise.all(ids.map((d) => reportFest("gmf", d as "sat" | "sun", GMF_ITEMS.filter((i) => i.day === d && sel.has(i.id) && isAct(i)).map((i) => i.id)))),
    [sel],
  );

  const infoIt = info ? BYID[info] : null;
  const fname = t("f.posterAlt", { name: "Grand Mint Festival 2026" });
  return (
    <>
      <div className="wrap fx gmf">
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

        <section className="gmf-hero">
          <button type="button" className="fx-thumb" onClick={poster.show} aria-label={fname}>
            <img src="/poster/gmf-key.webp" alt="" width={120} height={168} />
          </button>
          <div className="gmf-hero-txt">
            <p className="gmf-when">10/17 SAT – 10/18 SUN</p>
            <h1 className="gmf-title">
              Grand Mint
              <br />
              Festival 2026
            </h1>
            <p className="gmf-where">OLYMPIC PARK · {GMF_FEST.venue?.[lang]}</p>
            <button type="button" className="fx-pbtn" onClick={poster.show}>
              🖼 {t("f.poster")}
            </button>
          </div>
        </section>
        <p className="fx-intro">{t("f.gmf.intro")}</p>
        <p className="fx-legend">
          <Rich text={t("f.gmf.legend")} />
        </p>
        <div className="stats-row fx-stats">
          {stats && (
            <span className="dl-count">
              <span aria-hidden="true">⬇</span> <Rich text={t("stats.dl", { n: stats.downloads.sat + stats.downloads.sun })} />
            </span>
          )}
          {DEMO && <span className="fx-demo">DEMO · 로컬 더미 데이터</span>}
          <button type="button" className="top-btn" onClick={() => setRanking(true)}>
            <span aria-hidden="true">🔥</span> {t("f.rank.btn")}
          </button>
        </div>

        <div className="sticky gmf-sticky">
          <div className="tabs">
            <div className="tablist" role="tablist">
              {GMF_DAYS.map((d) => (
                <button key={d.id} type="button" className="tab" role="tab" aria-selected={d.id === day} onClick={() => setDay(d.id)}>
                  <span>{d.label[lang]}</span>
                  {counts[d.id] > 0 && <span className="cnt">{counts[d.id]}</span>}
                </button>
              ))}
            </div>
            <button className="chip help" type="button" aria-label={t("help")} onClick={() => setTut(true)}>
              ?
            </button>
          </div>
          <div className="gmf-heads">
            <div />
            {GMF_STAGES.map((st) => (
              <div key={st.key} className="gmf-head" style={{ "--c": st.color } as CSSProperties}>
                <div className="p">{st.place}</div>
                <div className="n">{st.name}</div>
                <div className="d">{GMF_DOORS[day][st.key] ? t("f.door", { t: GMF_DOORS[day][st.key] }) : ""}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="gmf-grid" style={{ "--ppm": PPM + "px" } as CSSProperties}>
          <div className="gmf-axis" style={{ height: (END - START) * PPM }}>
            {hours.map((m) => (
              <span key={m} style={{ top: (m - START) * PPM }}>
                {fmt(m)}
              </span>
            ))}
          </div>
          {GMF_STAGES.map((st) => (
            <div key={st.key} className="gmf-col" style={{ height: (END - START) * PPM }}>
              {GMF_ITEMS.filter((i) => i.day === day && i.stage === st.key).map((it) => (
                <Block key={it.id} it={it} on={sel.has(it.id)} live={isLive(it, dayObj, now)} warn={overlap.ids.has(it.id)} onToggle={toggle} onInfo={setInfo} />
              ))}
            </div>
          ))}
        </div>

        <FestFooter note={t("f.foot", { name: "Grand Mint Festival" })} />
      </div>

      <div className="bar">
        <div className="bar-in">
          <div className="sum" aria-live="polite">
            <div>
              <Rich text={t("sum.sel", { n: counts[day] })} />
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
          stage={{ ...STAGE[infoIt.stage], color: colorOf(infoIt, STAGE[infoIt.stage]) }}
          day={GMF_DAYS.find((d) => d.id === infoIt.day)!}
          koFirst
          nameOf={(id) => (BYID[id] ? names(BYID[id], lang, true)[0] : id)}
          on={sel.has(infoIt.id)}
          onToggle={() => toggle(infoIt.id)}
          onClose={() => setInfo(null)}
          inTutorial={tut}
        />
      )}
      {exporting && (
        <FestExport
          segs={GMF_DAYS.map((d) => ({ id: d.id, label: d.label[lang] }))}
          pairLabel={t("exp.both")}
          initial={counts[day] ? day : GMF_DAYS.find((d) => counts[d.id])?.id ?? day}
          emptyText={t("f.exp.emptyDay")}
          isEmpty={(ids) => !GMF_ITEMS.some((i) => ids.includes(i.day) && sel.has(i.id))}
          render={render}
          hoursFor={(ids) => hourList(GMF_ITEMS.filter((i) => ids.includes(i.day)))}
          firstPick={(ids) => firstStart(GMF_ITEMS.filter((i) => ids.includes(i.day) && sel.has(i.id)))}
          fileName={(k, r) => `GrandMintFestival-2026-${k}-${r}.png`}
          onClose={() => setExporting(false)}
          toast={toast}
          report={report}
          onCounted={reload}
        />
      )}
      {ranking && (
        <FestRank
          fest="gmf"
          face={FACE}
          title={t("f.rank.btn")}
          desc={t("f.rank.desc")}
          items={GMF_ITEMS.filter(isAct)}
          days={GMF_DAYS}
          nameOf={(it) => names(it, lang, true)[0]}
          colorOf={(it) => STAGE[it.stage].color}
          metaOf={(it) => STAGE[it.stage].name + " · " + GMF_DAYS.find((d) => d.id === it.day)!.label[lang]}
          onInfo={(id) => {
            setRanking(false);
            setInfo(id);
          }}
          onClose={() => setRanking(false)}
        />
      )}
      {tut && <Tutorial config={TUT} onClose={() => setTut(false)} onInfo={tutInfo} />}
      {poster.open && <PosterViewer title="Grand Mint Festival 2026" posters={GMF_POSTERS.map((p) => ({ src: p.src, label: t(p.key) }))} onClose={poster.hide} />}
      {toastNode}
    </>
  );
}
