// EDC Orlando 2026: EDC KOREA처럼 어두운 화면 + 무대 5개(Casa Bacardí 포함)를 나란히 놓은 타임테이블, 장르 표시.
// 시각은 모두 현지(미국 동부, UTC−5) 기준. 공식 로고·포스터 이미지는 쓰지 않는다(글자만)
import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { LangMenu, Rich, useI18n } from "../i18n";
import { ORL_DAYS, ORL_HOSTS, ORL_ITEMS, ORL_STAGES } from "./orl";
import { firstStart, genreText, hourList, isLive, localToday, names, useFestTheme, useFont, useNowKst, useSelection } from "./common";
import { festFace } from "./faces";
import { FestSheet, useLongPress } from "./parts";
import { FestExport, type RenderOpt } from "./FestExport";
import { ensureFonts, loadPhotos, renderEdcGrid } from "./festCanvas";
import { DEMO, reportFest, totalDownloads, useFestStats } from "./festStats";
import { FestRank } from "./FestRank";
import { fmt, timeText, type FItem } from "./types";
import { useLocalFlag } from "./orlFlags";
import { Tutorial, type TutConfig } from "../components/Tutorial";
import { FestFooter, useArmedReset, useBodyLock, useToast } from "./shell";
import "./fest.css";

const SLUG = "edc-orlando-2026";
const FACE = "orl";
const PPM = 2.6;
const START = 13 * 60;
const END = 24 * 60;
const UTC = -5;
const VALID = new Set(ORL_ITEMS.map((i) => i.id));
const BYID = Object.fromEntries(ORL_ITEMS.map((i) => [i.id, i]));
const STAGE = Object.fromEntries(ORL_STAGES.map((s) => [s.key, s]));
const RIGHTEOUS = "https://fonts.googleapis.com/css2?family=Righteous&display=swap";
/** 배경화면에 쓰는 긴 날짜 제목 */
const DAY_TITLE: Record<string, string> = { fri: "FRIDAY NOV 6", sat: "SATURDAY NOV 7", sun: "SUNDAY NOV 8" };
/** 고른 칸은 무대 브랜드 색(--c)으로 글씨 뒤를 채우고 그 위 글자는 --ci. 고르기 전 칸은 무색(회색 이름·옅은 테두리) */
const toneVars = (key: string) => ({ "--c": STAGE[key].color, "--ci": STAGE[key].ink }) as CSSProperties;

/** 튜토리얼: 드랍이 있는 첫 공연으로 시연(유튜브 플레이어가 열리는 단계 포함), 없으면 Kinetic Field 두 번째 공연 */
const TUT: TutConfig = { storageKey: "fl:orl:tut", block: ".orl .col .blk:nth-child(2)", blockFallback: ".orl .blk", text: { "tut.s3.b": "f.tut.s3.b" }, dropSlug: SLUG };

const hours: number[] = [];
for (let m = START; m <= END; m += 60) hours.push(m);

function Block({ it, on, live, warn, onToggle, onInfo }: { it: FItem; on: boolean; live: boolean; warn: boolean; onToggle: (id: string) => void; onInfo: (id: string) => void }) {
  const { t } = useI18n();
  const st = STAGE[it.stage];
  const lp = useLongPress(() => onInfo(it.id));
  const g = genreText(it);
  const time = timeText(it);
  const src = festFace(FACE, it.id);
  const [failed, setFailed] = useState(false);
  const photo = !!src && !failed && (it.e - it.s) * PPM >= 64;
  const gn = <span className={"gn" + (!g ? " gu" : "")}>{g ?? t("genre.none")}</span>;
  return (
    <div
      data-id={it.id}
      className={"blk" + (on ? " on" : "") + (photo ? " ph" : "")}
      style={{ ...toneVars(it.stage), top: (it.s - START) * PPM + 1 + "px", height: (it.e - it.s) * PPM - 2 + "px" } as CSSProperties}
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
              {gn}
            </span>
          </>
        ) : (
          <>
            <span className="nm">{it.en}</span>
            {gn}
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

export function OrlPage() {
  const { t, lang } = useI18n();
  useFestTheme("orl");
  useFont(RIGHTEOUS);
  const { sel, setSel, toggle } = useSelection(SLUG, VALID);
  const now = useNowKst();
  const [day, setDay] = useState(() => {
    // 행사 당일(현지 날짜)이면 그날 탭으로
    const today = localToday(now, UTC);
    return ORL_DAYS.find((d) => d.date === today)?.id ?? ORL_DAYS[0].id;
  });
  const [showGenre, setShowGenre] = useLocalFlag("fl:orl:genre", true);
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
  const { stats, reload } = useFestStats("orl");
  const { toast, node: toastNode } = useToast();

  useBodyLock(!!info || exporting || ranking || tut);

  const counts = useMemo(() => Object.fromEntries(ORL_DAYS.map((d) => [d.id, ORL_ITEMS.filter((i) => i.day === d.id && sel.has(i.id)).length])), [sel]);
  const total = ORL_DAYS.reduce((a, d) => a + counts[d.id], 0);
  const dayObj = ORL_DAYS.find((d) => d.id === day)!;
  const overlap = useMemo(() => {
    const l = ORL_ITEMS.filter((i) => i.day === day && sel.has(i.id));
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
    async (ids: string[], { ratio, lock, compact, from }: RenderOpt) => {
      const days = ORL_DAYS.filter((d) => ids.includes(d.id));
      const items = ORL_ITEMS.filter((i) => ids.includes(i.day));
      const [, photos] = await Promise.all([ensureFonts(['400 40px "Righteous"']), loadPhotos(FACE, items.map((i) => i.id))]);
      return renderEdcGrid({
        logo: "edc",
        title: "ORLANDO 2026",
        place: "TINKER FIELD",
        dayTitle: (d) => DAY_TITLE[d.id] ?? d.short,
        tone: (key) => ({ line: STAGE[key].color, ink: STAGE[key].ink }),
        days,
        stages: ORL_STAGES,
        items,
        sel,
        photos,
        ratio,
        lock,
        compact,
        from,
        nameOf: (it) => it.en,
        photoOf: (it) => it.id,
      });
    },
    [sel],
  );
  const report = useCallback(
    (ids: string[]) => Promise.all(ids.map((d) => reportFest("orl", d, ORL_ITEMS.filter((i) => i.day === d && sel.has(i.id)).map((i) => i.id)))),
    [sel],
  );

  const infoIt = info ? BYID[info] : null;
  const hosts = ORL_HOSTS[day] ?? {};
  return (
    <>
      <div className="wrap orl">
        <header className="hero orl-hero">
          <span className="orl-orb o1" aria-hidden="true" />
          <span className="orl-orb o2" aria-hidden="true" />
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
          <h1 className="orl-logo" aria-label="EDC Orlando 2026">
            <span className="e" aria-hidden="true">
              edc
            </span>
            <span className="t" aria-hidden="true">
              ORLANDO
              <br />
              2026
            </span>
          </h1>
          <div className="orl-badges" aria-hidden="true">
            <span>NOV 6+7+8</span>
            <span>TINKER FIELD</span>
          </div>
          <p className="orl-where">{t("f.orl.where")}</p>
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
          <p>{t("f.orl.intro")}</p>
          <p className="legend">
            <Rich text={t("f.orl.legend")} />
          </p>
        </header>

        <div className="sticky">
          <div className="tabs">
            <div className="tablist" role="tablist">
              {ORL_DAYS.map((d) => (
                <button key={d.id} type="button" className="tab" role="tab" aria-selected={d.id === day} onClick={() => setDay(d.id)}>
                  <span>{d.label[lang]}</span>
                  {counts[d.id] > 0 && <span className="cnt">{counts[d.id]}</span>}
                </button>
              ))}
            </div>
            <button className="chip" type="button" aria-pressed={showGenre} onClick={() => setShowGenre(!showGenre)}>
              {t("tab.genre")}
            </button>
            <button className="chip help" type="button" aria-label={t("help")} onClick={() => setTut(true)}>
              ?
            </button>
          </div>
          <div className="heads" style={{ "--n": ORL_STAGES.length } as CSSProperties}>
            <div />
            {ORL_STAGES.map((st) => {
              const [a, ...rest] = st.name.split(" ");
              return (
                <div key={st.key} className="head" style={toneVars(st.key)}>
                  <div className="a">{a}</div>
                  <div className="b">{rest.join(" ")}</div>
                  <div className="h">{hosts[st.key] || ""}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={"grid" + (showGenre ? "" : " nogenre")} style={{ "--ppm": PPM + "px", "--n": ORL_STAGES.length } as CSSProperties}>
          <div className="axis" style={{ height: (END - START) * PPM }}>
            {hours.map((m) => (
              <span key={m} style={{ top: (m - START) * PPM }}>
                {fmt(m)}
              </span>
            ))}
          </div>
          {ORL_STAGES.map((st) => (
            <div key={st.key} className="col" style={{ height: (END - START) * PPM }}>
              {ORL_ITEMS.filter((i) => i.day === day && i.stage === st.key).map((it) => (
                <Block key={it.id} it={it} on={sel.has(it.id)} live={isLive(it, dayObj, now)} warn={overlap.ids.has(it.id)} onToggle={toggle} onInfo={setInfo} />
              ))}
            </div>
          ))}
        </div>

        <FestFooter note={t("f.orl.foot")} />
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
          stage={STAGE[infoIt.stage]}
          day={ORL_DAYS.find((d) => d.id === infoIt.day)!}
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
          segs={ORL_DAYS.map((d) => ({ id: d.id, label: d.label[lang] }))}
          initial={counts[day] ? day : ORL_DAYS.find((d) => counts[d.id])?.id ?? day}
          emptyText={t("f.exp.emptyDay")}
          isEmpty={(ids) => !ORL_ITEMS.some((i) => ids.includes(i.day) && sel.has(i.id))}
          render={render}
          hoursFor={(ids) => hourList(ORL_ITEMS.filter((i) => ids.includes(i.day)))}
          firstPick={(ids) => firstStart(ORL_ITEMS.filter((i) => ids.includes(i.day) && sel.has(i.id)))}
          fileName={(k, r) => `EDC-Orlando-2026-${k}-${r}.png`}
          onClose={() => setExporting(false)}
          toast={toast}
          report={report}
          onCounted={reload}
        />
      )}
      {ranking && (
        <FestRank
          fest="orl"
          face={FACE}
          title={t("f.rank.btn")}
          desc={t("f.rank.desc")}
          items={ORL_ITEMS}
          days={ORL_DAYS}
          nameOf={(it) => names(it, lang, false)[0]}
          colorOf={(it) => STAGE[it.stage].color}
          metaOf={(it) => STAGE[it.stage].name + " · " + ORL_DAYS.find((d) => d.id === it.day)!.label[lang]}
          onInfo={(id) => {
            setRanking(false);
            setInfo(id);
          }}
          onClose={() => setRanking(false)}
        />
      )}
      {tut && <Tutorial config={TUT} onClose={() => setTut(false)} onInfo={tutInfo} />}
      {toastNode}
    </>
  );
}
