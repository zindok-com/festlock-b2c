// 배경화면 만들기 창 (새 페스티벌 공통). 저장·공유·크게 보기를 누르면 다운로드·선택 집계를 보낸다.
import { useEffect, useRef, useState } from "react";
import { IN_APP } from "../inApp";
import { Rich, useI18n } from "../i18n";
import { useBackClose } from "../backClose";
import type { Ratio } from "./festCanvas";
import type { ReportResult } from "./festStats";
import { fmt } from "./types";

/** 이미지 옵션 */
export interface RenderOpt {
  ratio: Ratio;
  lock: boolean;
  compact: boolean;
  /** 입장 시간(분). 이 시각 전에 끝나는 공연은 빼고 그린다. null이면 처음부터 */
  from: number | null;
  /** 토+일 한 장일 때: 위아래로 / 좌우로 */
  layout: "stack" | "side";
}

export interface Seg {
  id: string;
  label: string;
}

interface Props {
  segs: Seg[];
  /** 두 칸을 한 장에 (없으면 버튼을 안 보인다) */
  pairLabel?: string;
  initial: string;
  emptyText: string;
  isEmpty: (ids: string[]) => boolean;
  render: (ids: string[], opt: RenderOpt) => Promise<HTMLCanvasElement>;
  /** 고른 날짜에서 고를 수 있는 입장 시각들(분, 정시) */
  hoursFor: (ids: string[]) => number[];
  /** 고른 날짜에서 가장 먼저 고른 공연의 시작(분) */
  firstPick: (ids: string[]) => number | null;
  fileName: (key: string, ratio: Ratio) => string;
  onClose: () => void;
  toast: (msg: string) => void;
  /** 집계 보내기 (고른 칸 id 목록을 받는다) */
  report?: (ids: string[]) => Promise<ReportResult[]>;
  /** 새로 집계되면 (숫자 새로고침) */
  onCounted?: () => void;
}

const PAIR = "__pair";


/** 같은 주소를 휴대폰 기본 브라우저로 여는 링크 (가능한 경우만) */
function externalUrl(): string | null {
  const url = location.href;
  if (IN_APP === "kakao") return "kakaotalk://web/openExternal?url=" + encodeURIComponent(url);
  if (/Android/i.test(navigator.userAgent)) return "intent://" + url.replace(/^https?:\/\//, "") + "#Intent;scheme=https;package=com.android.chrome;end";
  return null; // 아이폰 인스타 안 브라우저는 오른쪽 위 ⋯ 메뉴로만 열 수 있다
}

export function FestExport({ segs, pairLabel, initial, emptyText, isEmpty, render, hoursFor, firstPick, fileName, onClose, toast, report, onCounted }: Props) {
  const { t } = useI18n();
  const [seg, setSeg] = useState(initial);
  const [ratio, setRatio] = useState<Ratio>("story");
  const [lock, setLock] = useState(false);
  const [compact, setCompact] = useState(false);
  const [layout, setLayout] = useState<"stack" | "side">("stack");
  // 입장 시간부터 (켜면 시각을 고른다)
  const [fromOn, setFromOn] = useState(false);
  const [fromVal, setFromVal] = useState<number | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [viewer, setViewer] = useState(false);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  // 공유·저장용 파일을 미리 만들어 둔다 (탭한 순간 바로 공유 창을 열어야 아이폰에서 막히지 않는다)
  const blobRef = useRef<Blob | null>(null);
  const [inAppNotice, setInAppNotice] = useState(false);
  // 너무 자주 눌러 집계가 잠시 제한됐을 때 안내 (1분에 한 번만)
  const [limitNotice, setLimitNotice] = useState(false);
  const noticeAt = useRef(0);
  const ids = seg === PAIR ? segs.map((s) => s.id) : [seg];
  const empty = isEmpty(ids);
  const idKey = ids.join("+");
  const hours = hoursFor(ids);
  // 고른 날짜가 바뀌어 목록에 없는 시각이면 첫 공연 시각으로
  const fromNow = fromOn ? (fromVal != null && hours.includes(fromVal) ? fromVal : defaultFrom()) : null;
  function defaultFrom(): number | null {
    const f = firstPick(ids);
    if (f == null) return hours[0] ?? null;
    const h = Math.floor(f / 60) * 60;
    return hours.includes(h) ? h : hours[0] ?? null;
  }

  useEffect(() => {
    let alive = true;
    if (empty) {
      cvRef.current = null;
      blobRef.current = null;
      setSrc(null);
      return;
    }
    render(ids, { ratio, lock, compact, from: fromNow, layout }).then((cv) => {
      if (!alive) return;
      cvRef.current = cv;
      blobRef.current = null;
      setSrc(cv.toDataURL("image/png"));
      cv.toBlob((b) => {
        if (alive && cvRef.current === cv) blobRef.current = b;
      }, "image/png");
    });
    return () => {
      alive = false;
    };
    // ids는 idKey로 대신 비교
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, ratio, lock, compact, fromNow, layout, empty, render]);

  useBackClose(true, onClose);
  useBackClose(viewer, () => setViewer(false));
  useBackClose(limitNotice, () => setLimitNotice(false));
  useBackClose(inAppNotice, () => setInAppNotice(false));

  function mark() {
    if (empty || !report) return;
    report(ids).then((r) => {
      if (r.includes("counted")) onCounted?.();
      if (r.includes("limited") && Date.now() - noticeAt.current > 60_000) {
        noticeAt.current = Date.now();
        setLimitNotice(true);
      }
    });
  }
  const view = () => {
    mark();
    setViewer(true);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (viewer) setViewer(false);
      else onClose();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [viewer, onClose]);

  const name = fileName(seg === PAIR ? idKey : seg, ratio);
  function blob(): Promise<Blob | null> {
    return new Promise((res) => (cvRef.current ? cvRef.current.toBlob((b) => res(b), "image/png") : res(null)));
  }
  async function save() {
    const b = await blob();
    if (!b) return;
    mark();
    try {
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
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
  /** 공유 → (휴대폰 공유 창) Instagram → 스토리. 기다리지 않고 바로 연다 */
  function share() {
    if (IN_APP) {
      setInAppNotice(true);
      return;
    }
    const b = blobRef.current;
    if (!b) {
      toast(t("f.share.wait"));
      return;
    }
    const f = new File([b], name, { type: "image/png" });
    let ok = false;
    try {
      ok = !!navigator.canShare && navigator.canShare({ files: [f] });
    } catch {
      ok = false;
    }
    if (!ok) {
      toast(t("toast.shareNo"));
      return;
    }
    navigator.share({ files: [f] }).catch((err) => {
      if (err && err.name === "AbortError") return;
      toast(t("toast.shareFail"));
    });
    mark();
  }

  return (
    <>
      <div className="sheet slide" role="dialog" aria-modal="true" aria-label={t("exp.aria")} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="card fx-card">
          <div className="row">
            <strong>{t("make.wall")}</strong>
            <button className="x" type="button" aria-label={t("close")} onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="seg">
            {segs.map((s) => (
              <button key={s.id} type="button" aria-pressed={s.id === seg} onClick={() => setSeg(s.id)}>
                {s.label}
              </button>
            ))}
            {pairLabel && (
              <button type="button" aria-pressed={seg === PAIR} onClick={() => setSeg(PAIR)}>
                {pairLabel}
              </button>
            )}
          </div>
          {seg === PAIR && (
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
          <div className="seg opts">
            <button type="button" aria-pressed={lock} onClick={() => setLock((v) => !v)}>
              {lock && <span aria-hidden="true">✓ </span>}
              {t("f.exp.lock")}
            </button>
            <button type="button" aria-pressed={fromOn} onClick={() => setFromOn((v) => !v)}>
              {fromOn && <span aria-hidden="true">✓ </span>}
              {t("f.exp.from")}
            </button>
            <button type="button" aria-pressed={compact} onClick={() => setCompact((v) => !v)}>
              {compact && <span aria-hidden="true">✓ </span>}
              {t("exp.compact")}
            </button>
          </div>
          {fromOn && hours.length > 0 && (
            <label className="fx-from">
              <span>{t("f.exp.fromLabel")}</span>
              <select value={fromNow ?? ""} onChange={(e) => setFromVal(Number(e.target.value))}>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {fmt(h)}
                  </option>
                ))}
              </select>
              <span>{t("f.exp.fromTail")}</span>
            </label>
          )}
          <div className="pv">
            {empty ? (
              <p>{emptyText}</p>
            ) : (
              src && <img src={src} alt={t("exp.pvAlt")} style={{ aspectRatio: ratio === "story" ? "1080/1920" : "1080/2280" }} onClick={view} />
            )}
          </div>
          <div className="acts">
            <button className="btn main" type="button" disabled={empty || !src} onClick={save}>
              {t("exp.save")}
            </button>
            <button className="btn ghost" type="button" disabled={empty || !src} onClick={view}>
              {t("exp.view")}
            </button>
            <button className="btn ghost fx-share" type="button" disabled={empty || !src} onClick={share}>
              {t("f.share.btn")}
            </button>
          </div>
          <p className="hint">{t("f.share.hint")}</p>
          <p className="hint">{t("exp.hint")}</p>
        </div>
      </div>
      {inAppNotice && (
        <div className="evt" role="alertdialog" aria-modal="true" aria-label={t("f.inapp.title")} onClick={(e) => e.target === e.currentTarget && setInAppNotice(false)}>
          <div className="evt-card limit-card">
            <div className="limit-emoji" aria-hidden="true">
              📲
            </div>
            <h2>{t("f.inapp.title")}</h2>
            <p className="evt-lead">{t(IN_APP === "kakao" ? "f.inapp.kakao" : "f.inapp.body")}</p>
            {externalUrl() && (
              <a className="btn main evt-go" href={externalUrl()!}>
                {t("f.inapp.open")}
              </a>
            )}
            <button
              className="btn ghost evt-go"
              type="button"
              onClick={() => {
                setInAppNotice(false);
                view();
              }}
            >
              {t("f.inapp.view")}
            </button>
          </div>
        </div>
      )}
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
