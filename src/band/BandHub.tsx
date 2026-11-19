// /collection — 나만의 컬렉션 (전체 화면 3D). 참고 화면처럼 무대가 화면을 다 채운다.
//   왼쪽 위: 구경하기(/collection/browse) · 가운데 위: ‹ 진열 이름 n/4 › · 오른쪽 위: FestLock → 홈
//   아래 가운데: 공유(9:16 스토리 이미지·링크) · ＋ 추가(팔찌 만들기 — 시안의 스캔 화면. AI 디자인만 "앱에서 만나요")
// 이 기기에 내 프로필이 있으면 내 컬렉션, 없으면 최근 올라온 컬렉션을 보여 주다가 첫 팔찌를 걸면 내 컬렉션으로 바뀐다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { useOnline } from "../offline";
import { FESTIVALS } from "../festivals";
import { BrowseButton, HomeBack, ShareIcon, festName } from "./common";
import { loadCollector, loadCollectors, type BandDesign, type Collector } from "./api";
import { BandStage, type Engine } from "./BandStage";
import { SCAN_T } from "./scanStrings";
import { collect, getMe, lookupDesign, saveDesign, type FoundDesign, type Me, type Ticket } from "./mine";
import { CodeDialog, ProfileSheet, ShareSheet, useSaveErrText } from "./MineParts";
import { YearChips, bragYear, useYearFilter, type YearPick } from "./years";

/** 방금 건 팔찌를 목록에도 넣어 둔다 (연도를 바꿔 진열을 다시 그려도 사라지지 않게) */
const toDesign = (t: Ticket, d: FoundDesign): BandDesign => ({ key: t.key, fest: d.fest || t.fest, year: d.year || t.year, grade: t.grade, day: t.day, style: d.style, pal: d.pal, img: d.img, w: 0, h: 0 });

type View = { kind: "loading" } | { kind: "mine"; c: Collector; demo: boolean } | { kind: "featured"; c: Collector; demo: boolean } | { kind: "empty" } | { kind: "error" } | { kind: "offline" };

export default function BandHub() {
  const { t, lang } = useI18n();
  const online = useOnline();
  const errText = useSaveErrText();
  const [me, setMeState] = useState<Me | null>(getMe);
  const meRef = useRef(me);
  meRef.current = me;
  const [view, setView] = useState<View>({ kind: "loading" });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [count, setCount] = useState(0);
  const [ask, setAsk] = useState<((m: Me | null) => void) | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [share, setShare] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const engine = useRef<Engine | null>(null);
  // 3D 가 아직 준비되기 전에 ＋ 추가를 누르면 기억해 두었다가 준비되는 즉시 연다 (느린 휴대폰에서 눌러도 반응이 없지 않게)
  const wantScan = useRef(false);
  const openScan = () => {
    if (engine.current) engine.current.openScan();
    else wantScan.current = true;
  };
  const timer = useRef(0);
  // 연도별로 보기 · 이 화면에서 새로 건 팔찌 · 자랑하기(연도를 바꾼 뒤 새 진열이 준비되면 공유 창)
  const [year, setYear] = useState<YearPick>("all");
  const [added, setAdded] = useState<BandDesign[]>([]);
  const yearRef = useRef<YearPick>("all");
  const pendingShare = useRef(false);
  const bornAt = useRef(0);
  const brag = bragYear();
  const remember = (t: Ticket, d: FoundDesign | null) => {
    if (!d) return;
    const nd = toDesign(t, d);
    setAdded((a) => [...a.filter((x) => x.key !== nd.key), nd]);
  };

  // 내 컬렉션 → 없으면 최근 올라온 컬렉션
  useEffect(() => {
    let live = true;
    setAdded([]);
    (async () => {
      const m = meRef.current;
      if (m) {
        const r = await loadCollector(m.id);
        if (!live) return;
        if (r.kind === "ok") return setView({ kind: "mine", c: r.data, demo: r.demo });
        if (r.kind === "offline") return setView({ kind: "offline" });
        // 내 기록이 비어 있으면(아직 팔찌 없음) 빈 내 컬렉션
        if (r.kind === "none") return setView({ kind: "mine", c: { id: m.id, name: m.name, ig: null, count: 0, items: [] }, demo: !!m.demo });
      }
      const l = await loadCollectors({ fest: "", sort: "recent", cursor: 0 });
      if (!live) return;
      if (l.kind !== "ok") return setView(l.kind === "offline" ? { kind: "offline" } : { kind: "error" });
      const first = l.data.list[0];
      if (!first) return setView({ kind: "empty" });
      const c = await loadCollector(first.id);
      if (!live) return;
      setView(c.kind === "ok" ? { kind: "featured", c: c.data, demo: c.demo } : c.kind === "offline" ? { kind: "offline" } : { kind: "error" });
    })();
    return () => {
      live = false;
    };
  }, [tick]);

  useEffect(() => {
    if (online && view.kind === "offline") setTick((n) => n + 1);
  }, [online, view.kind]);

  const say = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  /** 처음 팔찌를 걸 때: 프로필(이름·인스타·공개 동의)을 받는다 */
  const askProfile = useCallback(() => new Promise<Me | null>((resolve) => setAsk(() => resolve)), []);
  const ensureMe = useCallback(async (): Promise<{ m: Me; fresh: boolean } | null> => {
    if (meRef.current) return { m: meRef.current, fresh: false };
    const m = await askProfile();
    if (!m) return null;
    setMeState(m);
    meRef.current = m;
    return { m, fresh: true };
  }, [askProfile]);
  /** 저장이 끝난 뒤: 지금 화면이 내 컬렉션이 아니면 내 컬렉션으로 바꾼다 */
  const afterSave = (fresh: boolean, m: Me, y: number) => {
    if (fresh && m.code) setCode(m.code);
    if (viewRef.current.kind !== "mine") {
      setTick((n) => n + 1);
      return { ok: true, reload: true };
    }
    // 다른 해만 보고 있었으면 "전체"로 돌려 새 팔찌가 보이게 (스캔 화면을 닫은 뒤 다시 그림)
    if (yearRef.current !== "all" && yearRef.current !== y) {
      setTimeout(() => setYear("all"), 60);
      return { ok: true, reload: true };
    }
    return null;
  };

  // 팔찌 만들기(스캔) 연결: 문구 · 페스티벌 목록 · 같은 티켓의 첫 디자인 찾기 · 저장
  const scan = useMemo(
    () => ({
      text: SCAN_T[lang],
      fests: FESTIVALS.map((f) => ({ slug: f.slug, name: f.name[lang], band: festName(f.slug, "en"), year: Number(f.start.slice(0, 4)) || undefined })),
      sampleSrc: "/band/sample-bands.jpg",
      lookup: (key: string) => lookupDesign(key),
      onScan: async ({ ticket, style, pal, canvas }: { ticket: Ticket; style: string; pal: string[]; canvas: HTMLCanvasElement }) => {
        const who = await ensureMe();
        if (!who) return { ok: false, silent: true };
        const r = await saveDesign(who.m, ticket, style, pal, canvas);
        if (!r.ok) return { ok: false, message: errText(r.error) };
        if (viewRef.current.kind === "mine") remember(ticket, r.design);
        return afterSave(who.fresh, who.m, r.design?.year || ticket.year) ?? { ok: true, exists: r.exists, design: r.design };
      },
      onUseExisting: async (ticket: Ticket, d: FoundDesign) => {
        const who = await ensureMe();
        if (!who) return { ok: false, silent: true };
        const r = await collect(who.m, ticket.key, d);
        if (!r.ok) return { ok: false, message: errText(r.error) };
        if (viewRef.current.kind === "mine") remember(ticket, d);
        return afterSave(who.fresh, who.m, d.year || ticket.year) ?? { ok: true };
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );

  const c = view.kind === "mine" || view.kind === "featured" ? view.c : null;
  const all = useMemo(() => {
    const base = c ? c.items : [];
    const more = added.filter((a) => !base.some((b) => b.key === a.key));
    return more.length ? [...base, ...more] : base;
  }, [c, added]);
  const { years, yr, items, fests } = useYearFilter(all, year, setYear);
  yearRef.current = yr;
  // 연도를 바꾸면 진열을 새로 그린다
  const stageKey = (view.kind === "mine" ? "mine:" + view.c.id : view.kind === "featured" ? "c:" + view.c.id : view.kind) + ":" + yr;
  const mineHasBrag = view.kind === "mine" && brag !== null && all.some((d) => d.year === brag);
  const showBrag = brag !== null && (view.kind === "mine" || view.kind === "featured" || view.kind === "empty");
  /** 자랑하기: 올해 팔찌가 있으면 그해만 걸고 공유 창(스토리 이미지), 없으면 팔찌 만들기부터 */
  const onBrag = () => {
    if (brag === null) return;
    if (!mineHasBrag) return openScan();
    if (yr === brag && engine.current) return setShare(true);
    pendingShare.current = true;
    setYear(brag);
  };
  const emptyText =
    view.kind === "loading" ? t("band.loading")
    : view.kind === "mine" && !items.length ? t("band.s.empty")
    : view.kind === "empty" ? t("band.empty")
    : view.kind === "error" ? t("band.error")
    : view.kind === "offline" ? t("band.offline")
    : undefined;
  const link = location.origin + (c ? "/c/" + c.id : "/collection");
  // 연도를 고르면 그해 팔찌 수 (진열을 새로 그리는 동안 3D 쪽 수는 잠깐 예전 값이라 쓰지 않음)
  const shown = view.kind === "mine" && yr === "all" ? Math.max(count, items.length) : items.length;

  return (
    <>
      <BandStage
        full
        items={items}
        stageKey={stageKey}
        scan={scan}
        onEngine={(e) => {
          engine.current = e;
          if (e) bornAt.current = performance.now();
          if (e && pendingShare.current) {
            pendingShare.current = false;
            setShare(true);
          }
          if (e && wantScan.current) {
            wantScan.current = false;
            e.openScan();
          }
        }}
        onCount={setCount}
        emptyText={emptyText}
        toast={toast}
        topLeft={<HomeBack />}
        side={years.length ? <YearChips years={years} value={yr} onChange={setYear} /> : null}
        topRight={<BrowseButton />}
        caption={
          view.kind === "mine" ? (
            <>
              <b className="band-t-name">{t("band.mine")}</b>
              <span className="band-t-sub">{t("band.count", { n: shown })}</span>
              {view.demo && <span className="band-demo">{t("band.demo")}</span>}
            </>
          ) : view.kind === "featured" ? (
            <>
              <a className="band-featured band-t-name" href={"/c/" + view.c.id}>
                {t("band.open", { name: view.c.name })} <span aria-hidden="true">›</span>
              </a>
              <span className="band-t-sub">{t("band.count", { n: items.length })}</span>
              {view.demo && <span className="band-demo">{t("band.demo")}</span>}
            </>
          ) : view.kind === "error" ? (
            <button type="button" className="band-full-btn" onClick={() => setTick((n) => n + 1)}>
              {t("band.retry")}
            </button>
          ) : null
        }
        bottom={
          <>
            {showBrag && (
              <button type="button" className="band-brag" aria-label={t("band.brag.aria", { y: brag! })} onClick={onBrag}>
                {t("band.brag", { y: brag! })}
              </button>
            )}
            {/* 아래 독: 공유 · ＋ 추가 (아이콘 위, 글자 아래) */}
            <div className="band-dock">
              <button type="button" className="band-dock-btn band-share" disabled={!c || !shown} onClick={() => setShare(true)}>
                <span className="band-dock-ic">
                  <ShareIcon />
                </span>
                <span className="band-dock-t">{t("band.share")}</span>
              </button>
              <button type="button" className="band-dock-btn main band-add-btn" onClick={openScan}>
                <span className="band-dock-ic" aria-hidden="true">
                  ＋
                </span>
                <span className="band-dock-t">{t("band.add.short")}</span>
              </button>
            </div>
          </>
        }
      />
      <h1 className="band-sr">{t("band.title")}</h1>

      {ask && (
        <ProfileSheet
          onDone={(m) => {
            const r = ask;
            setAsk(null);
            r(m);
          }}
        />
      )}
      {code && <CodeDialog code={code} onClose={() => setCode(null)} />}
      {share && c && (
        <ShareSheet
          engine={engine.current}
          name={view.kind === "mine" ? me?.name || c.name : c.name}
          count={view.kind === "mine" ? shown : yr === "all" ? c.count : items.length}
          link={link}
          year={yr === "all" ? undefined : { y: yr, fests }}
          bornAt={bornAt.current}
          onClose={() => setShare(false)}
          onToast={say}
        />
      )}
    </>
  );
}
