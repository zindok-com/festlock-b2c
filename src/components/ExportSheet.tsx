import { useEffect, useRef, useState } from "react";
import { SHOW_FACES } from "../config";
import { DAYS, ITEMS, dayOf, pickOf } from "../data";
import { Rich, useI18n } from "../i18n";
import { reportDownload, type ReportResult } from "../stats";
import { useBackClose } from "../backClose";
import { IN_APP } from "../inApp";
import { InAppSaveNotice } from "./InAppSaveNotice";
import { ensureFonts, fileName, loadFaces, renderBothCanvas, renderExportCanvas, type FaceImg, type Ratio } from "../exportImage";

interface Props {
  sel: Set<string>;
  initialDay: string;
  onClose: () => void;
  toast: (msg: string) => void;
  /** 새로 집계되면 호출(통계 새로고침) */
  onDownloaded?: () => void;
}

export function ExportSheet({ sel, initialDay, onClose, toast, onDownloaded }: Props) {
  const { t, dayLabel } = useI18n();
  const [day, setDay] = useState(initialDay);
  const [ratio, setRatio] = useState<Ratio>("story");
  const [lock, setLock] = useState(false);
  const [compact, setCompact] = useState(false);
  const [layout, setLayout] = useState<"stack" | "side">("stack");
  // 너무 자주 눌러 집계가 잠시 제한됐을 때 안내
  const [limitNotice, setLimitNotice] = useState(false);
  /** 앱 안 브라우저에서 "이미지 저장"을 눌렀을 때 안내 */
  const [saveNotice, setSaveNotice] = useState(false);
  const noticeShownAt = useRef(0);
  const [src, setSrc] = useState<string | null>(null);
  const [viewer, setViewer] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // "both" = 토+일 한 장
  const days = day === "both" ? DAYS.map((d) => d.id) : [day];
  const list = days.flatMap((d) => pickOf(sel, d));
  const empty = list.length === 0;

  useEffect(() => {
    let alive = true;
    if (empty) {
      canvasRef.current = null;
      setSrc(null);
      return;
    }
    const all = ITEMS.filter((i) => days.includes(i.day));
    const faces: Promise<Map<string, FaceImg>> = SHOW_FACES ? loadFaces(all.map((i) => i.id)) : Promise.resolve(new Map());
    Promise.all([ensureFonts(), faces]).then(([, fm]) => {
      if (!alive) return;
      const cv = day === "both" ? renderBothCanvas(all, sel, fm, ratio, lock, compact, layout) : renderExportCanvas(dayOf(day), all, sel, fm, ratio, lock, compact);
      canvasRef.current = cv;
      setSrc(cv.toDataURL("image/png"));
    });
    return () => {
      alive = false;
    };
  }, [day, ratio, lock, compact, layout, sel, empty]);

  // 뒤로가기: 크게 보기가 열려 있으면 그것만, 아니면 배경화면 창을 닫는다
  useBackClose(true, onClose);
  useBackClose(viewer, () => setViewer(false));
  useBackClose(limitNotice, () => setLimitNotice(false));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (viewer) setViewer(false);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewer, onClose]);

  // 기기당 그날 1번만 서버에 기록 (중복은 서버·브라우저 양쪽에서 막음)
  function markDownloaded() {
    if (empty) return;
    // 토+일이면 고른 게 있는 날마다 1번씩 (기기당 하루 1번 규칙은 그대로)
    const jobs = days
      .map((d) => pickOf(sel, d).map((i) => i.id))
      .map((ids, k) => (ids.length ? reportDownload(days[k], ids) : Promise.resolve<ReportResult>("dup")));
    Promise.all(jobs).then((r) => {
      if (r.includes("counted")) onDownloaded?.();
      // 1분에 한 번만 안내 (계속 눌러도 팝업이 반복되지 않게)
      if (r.includes("limited") && Date.now() - noticeShownAt.current > 60_000) {
        noticeShownAt.current = Date.now();
        setLimitNotice(true);
      }
    });
  }

  function getBlob(): Promise<Blob | null> {
    return new Promise((res) => {
      if (!canvasRef.current) return res(null);
      canvasRef.current.toBlob((b) => res(b), "image/png");
    });
  }

  async function save() {
    // 앱 안 브라우저(인스타·카톡 등)는 <a download>를 조용히 무시한다 → 저장한 척하지 않고 안내한다
    if (IN_APP) {
      setSaveNotice(true);
      return;
    }
    const blob = await getBlob();
    if (!blob) return;
    markDownloaded();
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(day, ratio);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast(t("toast.saved"));
    } catch {
      setViewer(true);
      toast(t("toast.saveFail"));
    }
  }

  async function share() {
    const blob = await getBlob();
    if (!blob) return;
    markDownloaded();
    try {
      const f = new File([blob], fileName(day, ratio), { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f] }).catch((err) => {
          if (err && err.name === "AbortError") return;
          toast(t("toast.shareFail"));
        });
        return;
      }
    } catch {
      /* 아래 안내로 */
    }
    toast(t("toast.shareNo"));
  }

  return (
    <>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t("exp.aria")} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="card">
          <div className="row">
            <strong>{t("make.wall")}</strong>
            <button className="x" type="button" aria-label={t("close")} onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="seg">
            {DAYS.map((d) => (
              <button key={d.id} type="button" aria-pressed={d.id === day} onClick={() => setDay(d.id)}>
                {dayLabel(d.id)}
              </button>
            ))}
            <button type="button" aria-pressed={day === "both"} onClick={() => setDay("both")}>
              {t("exp.both")}
            </button>
          </div>
          {day === "both" && (
            <div className="seg">
              <button type="button" aria-pressed={layout === "stack"} onClick={() => setLayout("stack")}>
                {t("exp.stack")}
              </button>
              <button type="button" aria-pressed={layout === "side"} onClick={() => setLayout("side")}>
                {t("exp.side")}
              </button>
            </div>
          )}
          <div className="seg">
            <button type="button" aria-pressed={ratio === "story"} onClick={() => setRatio("story")}>
              {t("exp.story")}
            </button>
            <button type="button" aria-pressed={ratio === "phone"} onClick={() => setRatio("phone")}>
              {t("exp.phone")}
            </button>
          </div>
          {/* 켜고 끄는 옵션 두 개 (서로 독립) */}
          <div className="seg opts">
            <button type="button" aria-pressed={lock} onClick={() => setLock((v) => !v)}>
              {lock && <span aria-hidden="true">✓ </span>}
              {t("exp.lock")}
            </button>
            <button type="button" aria-pressed={compact} onClick={() => setCompact((v) => !v)}>
              {compact && <span aria-hidden="true">✓ </span>}
              {t("exp.compact")}
            </button>
          </div>
          <div className="pv">
            {empty ? (
              <p>{t("exp.empty")}</p>
            ) : (
              src && (
                <img
                  src={src}
                  alt={t("exp.pvAlt")}
                  style={{ aspectRatio: ratio === "story" ? "1080/1920" : "1080/2280" }}
                  onClick={() => {
                    markDownloaded();
                    setViewer(true);
                  }}
                />
              )
            )}
          </div>
          <div className="acts">
            <button className="btn main" type="button" disabled={empty || !src} onClick={save}>
              {t("exp.save")}
            </button>
            <button className="btn ghost" type="button" disabled={empty || !src} onClick={() => {
                markDownloaded();
                setViewer(true);
              }}>
              {t("exp.view")}
            </button>
            <button className="btn ghost" type="button" disabled={empty || !src} onClick={share}>
              {t("exp.share")}
            </button>
          </div>
          <p className="hint">{t("exp.hint")}</p>
        </div>
      </div>
      {limitNotice && (
        <div className="evt" role="alertdialog" aria-modal="true" aria-label={t("limit.title")} onClick={(e) => e.target === e.currentTarget && setLimitNotice(false)}>
          <div className="evt-card limit-card">
            <div className="limit-emoji" aria-hidden="true">
              🙏
            </div>
            <h2>{t("limit.title")}</h2>
            <p className="evt-lead">{t("limit.body")}</p>
            <button className="btn main evt-go" type="button" onClick={() => setLimitNotice(false)} autoFocus>
              {t("limit.ok")}
            </button>
          </div>
        </div>
      )}
      {saveNotice && (
        <InAppSaveNotice
          onClose={() => setSaveNotice(false)}
          onView={() => {
            markDownloaded();
            setViewer(true);
          }}
        />
      )}
      {viewer && src && (
        <div className="viewer" role="dialog" aria-modal="true" aria-label={t("viewer.aria")}>
          <div className="v-top">
            <p>
              <Rich text={t("viewer.hint")} />
            </p>
            <button className="btn ghost" type="button" onClick={() => setViewer(false)}>
              {t("close")}
            </button>
          </div>
          <div className="v-body">
            <img src={src} alt={t("viewer.alt")} />
          </div>
        </div>
      )}
    </>
  );
}
