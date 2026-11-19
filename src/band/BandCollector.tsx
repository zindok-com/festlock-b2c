// /c/{id} — 한 사람의 팔찌 컬렉션 (전체 화면 3D, /collection 과 같은 모양)
//   왼쪽 위: 구경하기(목록) · 가운데 위: ‹ 진열 이름 n/4 › · 그 아래 이름·팔찌 수 · 오른쪽 위: 신고
//   아래 가운데: 공유 · 인스타그램
// 3D 는 시안 docs/band-collection/sample.html 과 같다 (BandStage). WebGL 이 없으면 사진 격자.
import { useEffect, useRef, useState } from "react";
import { BandStage } from "./BandStage";
import { useI18n } from "../i18n";
import { useOnline } from "../offline";
import { BandDialog, BandTop, BrowseButton, ShareIcon, useBandLabel } from "./common";
import type { Engine } from "./BandStage";
import { ShareSheet } from "./MineParts";
import { YearChips, useYearFilter, type YearPick } from "./years";
import { loadCollector, reportCollector, type Collector, type ReportReason, type ReportResult } from "./api";

type State = { kind: "loading" } | { kind: "ok"; c: Collector; demo: boolean } | { kind: "none" } | { kind: "error" } | { kind: "offline" };
const REASONS: ReportReason[] = ["impersonation", "photo", "number", "other"];

function BackLink() {
  const { t } = useI18n();
  return (
    <a className="band-back" href="/collection/browse">
      <span aria-hidden="true">←</span>
      {t("band.back")}
    </a>
  );
}

function IgIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
    </svg>
  );
}

function ReportDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useI18n();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<ReportResult | null>(null);
  const send = async () => {
    if (!reason || busy) return;
    setBusy(true);
    setRes(await reportCollector(id, reason));
    setBusy(false);
  };
  const finished = res === "done" || res === "dup";
  return (
    <BandDialog label={t("band.report.title")} onClose={onClose}>
      <div className="band-report">
        <h2>{t("band.report.title")}</h2>
        {!finished && (
          <>
            <p className="evt-lead">{t("band.report.lead")}</p>
            <div className="band-reasons" role="radiogroup" aria-label={t("band.report.title")}>
              {REASONS.map((r) => (
                <label key={r} className={reason === r ? "on" : ""}>
                  <input type="radio" name="band-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                  <span>{t("band.report.r." + r)}</span>
                </label>
              ))}
            </div>
          </>
        )}
        {res && (
          <p className={"band-report-msg" + (finished ? " ok" : " bad")} role="status">
            {t("band.report." + (res === "error" ? "fail" : res))}
          </p>
        )}
        {finished ? (
          <button type="button" className="btn main evt-go band-close" onClick={onClose}>
            {t("band.close")}
          </button>
        ) : (
          <button type="button" className="btn main evt-go band-report-send" disabled={!reason || busy} onClick={send}>
            {busy ? t("band.loading") : t("band.report.send")}
          </button>
        )}
      </div>
    </BandDialog>
  );
}

const NO_ITEMS: never[] = [];

export default function BandCollector({ id }: { id: string }) {
  const { t } = useI18n();
  const online = useOnline();
  const label = useBandLabel();
  const [st, setSt] = useState<State>({ kind: "loading" });
  const [tick, setTick] = useState(0);
  const [report, setReport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    let live = true;
    setSt({ kind: "loading" });
    loadCollector(id).then((r) => {
      if (!live) return;
      setSt(r.kind === "ok" ? { kind: "ok", c: r.data, demo: r.demo } : r);
    });
    return () => {
      live = false;
    };
  }, [id, tick]);

  useEffect(() => {
    if (online && st.kind === "offline") setTick((n) => n + 1);
  }, [online, st.kind]);

  const [sharing, setSharing] = useState(false);
  const engine = useRef<Engine | null>(null);
  const bornAt = useRef(0);
  // 연도별로 보기 (팔찌 목록이 바뀌면 진열을 새로 그린다)
  const [year, setYear] = useState<YearPick>("all");
  const { years, yr, items, fests } = useYearFilter(st.kind === "ok" ? st.c.items : NO_ITEMS, year, setYear);
  const say = (msg: string) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2200);
  };
  const share = () => setSharing(true);

  // 없는 기록·오류·오프라인은 보통 페이지로 안내한다
  if (st.kind === "none" || st.kind === "error" || st.kind === "offline") {
    return (
      <div className="wrap home band-page">
        <BandTop />
        <BackLink />
        {st.kind === "offline" && <p className="band-state band-offline">{t("band.offline")}</p>}
        {st.kind === "error" && (
          <div className="band-state band-error">
            <p>{t("band.c.error")}</p>
            <button type="button" className="btn ghost band-retry" onClick={() => setTick((n) => n + 1)}>
              {t("band.retry")}
            </button>
          </div>
        )}
        {st.kind === "none" && (
          <div className="band-state band-none">
            <h1 className="band-title">{t("band.c.none.title")}</h1>
            <p>{t("band.c.none.body")}</p>
            <a className="btn main band-none-back" href="/collection/browse">
              {t("band.c.none.back")}
            </a>
          </div>
        )}
        <footer className="foot band-foot">
          <p>{t("band.foot")}</p>
        </footer>
      </div>
    );
  }

  const c = st.kind === "ok" ? st.c : null;
  return (
    <>
      <BandStage
        full
        onEngine={(e) => {
          engine.current = e;
          if (e) bornAt.current = performance.now();
        }}
        items={c ? items : []}
        emptyText={st.kind === "loading" ? t("band.loading") : t("band.c.empty")}
        toast={toast}
        topCenter={years.length ? <YearChips years={years} value={yr} onChange={setYear} /> : null}
        topLeft={
          c && (
            <button type="button" className="band-full-btn icon band-flag-btn" aria-label={t("band.report")} onClick={() => setReport(true)}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M5 21V4M5 4h11l-2 4 2 4H5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )
        }
        topRight={<BrowseButton />}
        caption={
          c && (
            <>
              <span className="band-c-cap">
                <b className="band-c-name">{c.name}</b>
                <span className="band-c-n">{t("band.count", { n: c.count })}</span>
              </span>
              {st.kind === "ok" && st.demo && <span className="band-demo">{t("band.demo")}</span>}
            </>
          )
        }
        bottom={
          c && (
            <>
              <div className="band-dock">
                <button type="button" className="band-dock-btn band-share" onClick={share}>
                  <span className="band-dock-ic">
                    <ShareIcon />
                  </span>
                  <span className="band-dock-t">{t("band.share")}</span>
                </button>
                {c.ig && (
                  <a className="band-dock-btn main band-ig-btn" href={c.ig} target="_blank" rel="noopener noreferrer" aria-label={t("band.c.ig")}>
                    <span className="band-dock-ic">
                      <IgIcon />
                    </span>
                    <span className="band-dock-t">{t("band.ig.short")}</span>
                  </a>
                )}
              </div>
            </>
          )
        }
      />
      {c && (
        <>
          <h1 className="band-sr">{c.name}</h1>
          {/* 화면 읽기 프로그램용 팔찌 목록 (3D 캔버스는 읽을 수 없으므로) */}
          <ul className="band-sr">
            {c.items.map((d) => (
              <li key={d.key}>{label(d).alt}</li>
            ))}
          </ul>
          {report && <ReportDialog id={c.id} onClose={() => setReport(false)} />}
          {sharing && (
            <ShareSheet
              engine={engine.current}
              name={c.name}
              count={yr === "all" ? c.count : items.length}
              link={location.origin + "/c/" + c.id}
              year={yr === "all" ? undefined : { y: yr, fests }}
              bornAt={bornAt.current}
              onClose={() => setSharing(false)}
              onToast={say}
            />
          )}
        </>
      )}
    </>
  );
}
