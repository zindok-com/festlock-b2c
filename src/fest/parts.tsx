// 새 페스티벌 페이지 공통 부품: 사진, 꾹 누르기, 아티스트 창, 포스터 보기
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Rich, useI18n } from "../i18n";
import { useBackClose } from "../backClose";
import { festFace } from "./faces";
import { genreText, initialsOf, listenLinks, names } from "./common";
import { timeText, type FDay, type FItem, type FStage } from "./types";
import { DropPlayer } from "../components/DropPlayer";

/** 사진(private만). 없거나 실패하면 이니셜 */
export function FFace({ fest, id, name, className, initClass }: { fest: string; id?: string; name: string; className: string; initClass: string }) {
  const [failed, setFailed] = useState(false);
  const src = festFace(fest, id);
  if (src && !failed) return <img className={className} src={src} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />;
  return (
    <span className={initClass} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}

/** 사진으로 쓸 id (토크·이벤트는 함께 나오는 아티스트 사진) */
export function photoId(it: FItem): string | undefined {
  return it.kind && it.kind !== "act" ? it.with?.[0] : it.id;
}

/** 꾹 누르기. 움직이면 스크롤로 보고 취소 */
export function useLongPress(cb: () => void, ms = 450) {
  const timer = useRef<number>();
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const clear = () => {
    clearTimeout(timer.current);
    start.current = null;
  };
  return {
    consumed() {
      const f = fired.current;
      fired.current = false;
      return f;
    },
    handlers: {
      onPointerDown(e: PointerEvent) {
        if (e.button !== 0) return;
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          fired.current = true;
          start.current = null;
          try {
            navigator.vibrate?.(12);
          } catch {
            /* 진동 미지원 */
          }
          cb();
        }, ms);
      },
      onPointerMove(e: PointerEvent) {
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear();
      },
      onPointerUp: clear,
      onPointerCancel: clear,
      onPointerLeave: clear,
    },
  };
}

interface SheetProps {
  fest: string;
  /** 페이지 주소(nol-festival 등) — 드랍 구간(public/drops.json)을 찾을 때 쓴다 */
  slug: string;
  it: FItem;
  stage: FStage;
  day: FDay;
  koFirst: boolean;
  /** 토크·이벤트에 나오는 아티스트 이름 찾기 */
  nameOf: (id: string) => string;
  on: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** 튜토리얼 시연으로 열린 창이면 뒤로가기는 튜토리얼이 처리한다 */
  inTutorial?: boolean;
}

export function FestSheet({ fest, slug, it, stage, day, koFirst, nameOf, on, onToggle, onClose, inTutorial = false }: SheetProps) {
  const { t, lang } = useI18n();
  const [main, sub] = names(it, lang, koFirst);
  const isAct = !it.kind || it.kind === "act";
  const links = listenLinks(it, koFirst);
  useBackClose(!inTutorial, onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  // 꾹 눌러서 열면 손가락이 아직 화면에 있어, 그 아래 링크가 길게 눌린 걸로 처리되지 않게 잠깐 막는다
  const [live, setLive] = useState(false);
  useEffect(() => {
    const go = () => setLive(true);
    const evs = ["pointerup", "pointercancel", "touchend", "touchcancel"] as const;
    evs.forEach((e) => window.addEventListener(e, go, { once: true }));
    const tm = window.setTimeout(go, 1500);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, go));
      clearTimeout(tm);
    };
  }, []);
  const withNames = (it.with ?? []).map(nameOf).join(", ");
  return (
    <div
      className={"sheet slide" + (live ? "" : " hold")}
      role="dialog"
      aria-modal="true"
      aria-label={main}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="card fx-card">
        <div className="row">
          <strong>{isAct ? t("art.title") : t("f.event")}</strong>
          <button className="x" type="button" aria-label={t("close")} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="art" style={{ "--c": stage.color } as CSSProperties}>
          <FFace fest={fest} id={photoId(it)} name={it.ko} className="fx-art-ph" initClass="art-init" />
          {it.tag && <span className="fx-tag">{it.tag}</span>}
          {!isAct && <span className="fx-kind">{it.kind!.toUpperCase()}</span>}
          <h2>{main}</h2>
          {sub && <p className="g">{sub}</p>}
          {genreText(it) && <p className={"g" + (it.genreConf === "inferred" ? " gi" : "")}>{genreText(it)}</p>}
          {it.desc && <p className="g">{it.desc}</p>}
          {withNames && <p className="g">{t("f.with", { n: withNames })}</p>}
          <p className="meta">
            <span className="dot" />
            {stage.name} · {day.label[lang]} · {timeText(it)}
          </p>
          {it.open && <p className="g">{t("f.endTbd")}</p>}
        </div>
        {isAct && (
          <>
            <DropPlayer slug={slug} artistId={it.id} autoPlay={!inTutorial} />
            {/* 한국어: 멜론 포함 4개 2×2 / 그 밖의 언어: 멜론 빼고 한 줄에 3개(짧은 이름) */}
            <div className={"links" + (lang === "ko" ? "" : " g3")}>
              <a className="link sp" href={links.spotify} target="_blank" rel="noopener noreferrer" aria-label={t("link.sp")}>
                {lang === "ko" ? t("link.sp") : "Spotify"}
              </a>
              <a className="link yt" href={links.youtube} target="_blank" rel="noopener noreferrer" aria-label={t("link.yt")}>
                {lang === "ko" ? t("link.yt") : "YouTube"}
              </a>
              {lang === "ko" && (
                <a className="link ml" href={links.melon} target="_blank" rel="noopener noreferrer">
                  {t("f.link.melon")}
                </a>
              )}
              <a className="link am" href={links.apple} target="_blank" rel="noopener noreferrer" aria-label={t("link.am")}>
                {lang === "ko" ? t("link.am") : "Apple Music"}
              </a>
            </div>
            <p className="hint search-note">
              <Rich text={t("search.note")} />
            </p>
          </>
        )}
        <button type="button" className="btn ghost toggle" onClick={onToggle}>
          {on ? t("tt.remove") : t("tt.add")}
        </button>
      </div>
    </div>
  );
}

export interface Poster {
  src: string;
  label: string;
}

/** 포스터 크게 보기 (여러 장이면 위에서 고른다) */
export function PosterViewer({ title, posters, onClose }: { title: string; posters: Poster[]; onClose: () => void }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  useBackClose(true, onClose);
  useEffect(() => {
    document.body.classList.add("lock");
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => {
      document.body.classList.remove("lock");
      document.removeEventListener("keydown", k);
    };
  }, [onClose]);
  return (
    <div className="viewer fx-poster" role="dialog" aria-modal="true" aria-label={t("f.posterAlt", { name: title })}>
      <div className="v-top">
        {posters.length > 1 ? (
          <div className="seg fx-pseg">
            {posters.map((p, k) => (
              <button key={p.src} type="button" aria-pressed={k === i} onClick={() => setI(k)}>
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          <p>{t("f.posterAlt", { name: title })}</p>
        )}
        <button className="btn ghost" type="button" onClick={onClose}>
          {t("close")}
        </button>
      </div>
      <div className="fx-pbody">
        <img src={posters[i].src} alt={t("f.posterAlt", { name: title })} />
      </div>
    </div>
  );
}

/** 포스터 창 열기·닫기 */
export function usePoster() {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  return { open, show, hide };
}
