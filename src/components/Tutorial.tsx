import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { useBackClose } from "../backClose";
import { findDrop, loadDrops } from "../drops";
import { DROP_DEMO } from "./DropPlayer";

export const TUT_KEY = "edc26:tut";

interface Step {
  /** 강조할 요소를 찾는 함수 */
  target: () => Element | null;
  icon?: "tap" | "hold" | "save";
  /** 이 단계에서 아티스트 창을 실제로 열어서 보여줄지 */
  sheet?: boolean;
  /** 이 단계에서 창 위쪽에 드랍 플레이어를 펼쳐 보일지 */
  demoDrop?: boolean;
  /** 번역 키 */
  title: string;
  /** 번역 키 */
  body: string;
}

/** 페스티벌마다 다른 부분 (기본값은 EDC) */
export interface TutConfig {
  /** 다 봤는지 저장하는 키 */
  storageKey: string;
  /** 시연에 쓸 블록 */
  block: string;
  /** 블록이 없을 때 대신 */
  blockFallback: string;
  /** 바꿔 쓸 문구 키 (예: 3단계 설명) */
  text?: Partial<Record<string, string>>;
  /** 드랍 구간을 찾을 페이지 주소. 주면 드랍이 있는 아티스트로 시연하고, 유튜브 플레이어가 열리는 단계를 보여 준다 */
  dropSlug?: string;
}
const EDC_TUT: TutConfig = { storageKey: TUT_KEY, block: ".col .blk:nth-child(2)", blockFallback: ".blk" };

function makeSteps(firstBlock: () => Element | null, withDrop: boolean): Step[] {
  const steps: Step[] = [
  {
    target: firstBlock,
    icon: "tap",
    title: "tut.s1.t",
    body: "tut.s1.b",
  },
  {
    target: firstBlock,
    icon: "hold",
    title: "tut.s2.t",
    body: "tut.s2.b",
  },
  {
    target: () => document.querySelector(".sheet .links"),
    sheet: true,
    title: "tut.s3.t",
    body: "tut.s3.b",
  },
  {
    target: () => document.querySelector(".bar .btn.main"),
    icon: "save",
    title: "tut.s4.t",
    body: "tut.s4.b",
  },
  ];
  // 드랍이 있는 아티스트면: 창 위쪽에 유튜브 플레이어가 열리는 모습 (소리는 내지 않음)
  if (withDrop) steps.splice(3, 0, { target: () => document.querySelector(".sheet .drop-top"), sheet: true, demoDrop: true, title: "tut.drop.t", body: "tut.drop.b" });
  return steps;
}

interface Rect { x: number; y: number; w: number; h: number }
const PAD = 6;

interface Props {
  onClose: () => void;
  /** 아티스트 창 열기/닫기 (시연용) */
  onInfo: (id: string | null, from?: DOMRect) => void;
  config?: TutConfig;
}

export function Tutorial({ onClose, onInfo, config = EDC_TUT }: Props) {
  const { t: tr } = useI18n();
  const t = (k: string) => tr(config.text?.[k] ?? k);
  // 드랍이 있는 아티스트를 시연용으로 고른다 (undefined = 아직 찾는 중 → 그동안은 안 그린다)
  const [dropPick, setDropPick] = useState<string | null | undefined>(config.dropSlug ? undefined : null);
  useEffect(() => {
    const slug = config.dropSlug;
    if (!slug) return;
    let alive = true;
    const late = new Promise<null>((res) => window.setTimeout(() => res(null), 1500));
    Promise.race([loadDrops(), late]).then((d) => {
      if (!alive) return;
      const el = d ? Array.from(document.querySelectorAll<HTMLElement>(config.blockFallback)).find((b) => b.dataset.id && findDrop(d, slug, b.dataset.id)) : undefined;
      setDropPick(el?.dataset.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, [config]);
  const firstBlock = useCallback(
    () => (dropPick ? document.querySelector(`${config.blockFallback}[data-id="${dropPick}"]`) : null) ?? document.querySelector(config.block) ?? document.querySelector(config.blockFallback),
    [config, dropPick],
  );
  const STEPS = useMemo(() => makeSteps(firstBlock, !!dropPick), [firstBlock, dropPick]);
  const [i, setI] = useState(0);
  const [r, setR] = useState<Rect | null>(null);
  const demoId = useRef<string | null>(null);
  const step = STEPS[i];

  const measure = useCallback(() => {
    const el = step.target();
    if (!el) return setR(null);
    const b = el.getBoundingClientRect();
    setR({ x: b.left - PAD, y: b.top - PAD, w: b.width + PAD * 2, h: b.height + PAD * 2 });
  }, [step]);

  // 단계가 바뀌면: 필요하면 아티스트 창을 열거나 닫고, 대상을 화면에 보이게 한 뒤 위치를 잰다
  useLayoutEffect(() => {
    if (dropPick === undefined) return;
    if (!demoId.current) demoId.current = (firstBlock() as HTMLElement | null)?.dataset.id ?? null;
    onInfo(step.sheet ? demoId.current : null, step.sheet ? firstBlock()?.getBoundingClientRect() : undefined);
    let raf = 0;
    const place = () => {
      const el = step.target();
      if (el && !el.closest(".bar")) el.scrollIntoView({ block: step.sheet ? "nearest" : "center", behavior: "auto" });
      measure();
    };
    place();
    // 창이 열린 뒤(다음 렌더) 다시 잰다
    raf = requestAnimationFrame(() => requestAnimationFrame(place));
    const t = window.setTimeout(place, 150);
    const t2 = window.setTimeout(place, 450); // 창 열림 애니메이션(0.38초)이 끝난 뒤
    // 드랍 단계: 플레이어 자리를 펼치고(소리 없이), 펼쳐진 뒤 다시 잰다
    const t3 = step.demoDrop ? window.setTimeout(() => window.dispatchEvent(new Event(DROP_DEMO)), 250) : 0;
    const t4 = step.demoDrop ? window.setTimeout(place, 900) : 0;
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [step, measure, onInfo, firstBlock, dropPick]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
    };
  }, [measure]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(config.storageKey, "1");
    } catch {
      /* 무시 */
    }
    onInfo(null);
    onClose();
  }, [onClose, onInfo, config]);

  useBackClose(true, finish);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setI((v) => (v < STEPS.length - 1 ? v + 1 : v));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [finish, STEPS.length]);

  if (dropPick === undefined) return null;
  const last = i === STEPS.length - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // 설명 카드는 강조 영역 아래에 공간이 있으면 아래, 없으면 위
  const below = r ? vh - (r.y + r.h) > 230 : true;
  const cardStyle = r
    ? below
      ? { top: Math.min(r.y + r.h + 14, vh - 220) }
      : { bottom: Math.max(vh - r.y + 14, 12) }
    : { top: vh / 2 - 100 };

  return (
    <div className="tut" role="dialog" aria-modal="true" aria-label={t("tut.aria")}>
      {r ? (
        <>
          {/* 강조 영역 바깥 4면만 흑백 + 어둡게 */}
          <div className="tut-dim" style={{ left: 0, top: 0, width: vw, height: Math.max(0, r.y) }} />
          <div className="tut-dim" style={{ left: 0, top: r.y + r.h, width: vw, height: Math.max(0, vh - r.y - r.h) }} />
          <div className="tut-dim" style={{ left: 0, top: r.y, width: Math.max(0, r.x), height: r.h }} />
          <div className="tut-dim" style={{ left: r.x + r.w, top: r.y, width: Math.max(0, vw - r.x - r.w), height: r.h }} />
          <div className="tut-hole" style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>
            {step.icon && (
              <span className={"tut-hand " + step.icon} aria-hidden="true">
                <span className="ring" />
                {step.icon === "save" ? "⬇" : "👆"}
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="tut-dim" style={{ inset: 0 }} />
      )}

      <div className="tut-card" style={cardStyle}>
        <div className="tut-step">
          {i + 1} / {STEPS.length}
        </div>
        <strong>{t(step.title)}</strong>
        <p>{t(step.body)}</p>
        <div className="tut-acts">
          <button type="button" className="tut-skip" onClick={finish}>
            {t("tut.skip")}
          </button>
          <div className="tut-dots" aria-hidden="true">
            {STEPS.map((_, k) => (
              <span key={k} className={k === i ? "on" : ""} />
            ))}
          </div>
          <button type="button" className="btn main" onClick={() => (last ? finish() : setI(i + 1))} autoFocus>
            {last ? t("tut.start") : t("tut.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
