import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { STAGES, appleMusicUrl, fmt, spotifyUrl, youtubeUrl, type Item } from "../data";
import { Rich, useI18n } from "../i18n";
import { useBackClose } from "../backClose";
import { DropPlayer } from "./DropPlayer";
import { Face } from "./Face";

// 공식 Insomniac Events 앱 (스토어 검색으로 확인: iOS id561212119, Android com.insomniac.mothership)
const APP_STORE = "https://apps.apple.com/app/id561212119";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.insomniac.mothership";

interface Props {
  it: Item;
  on: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** 창이 커져 나올 시작 자리(누른 블록·행). 없으면 아래에서 올라온다 */
  from?: DOMRect | null;
  /** 닫을 때 시작 자리로 다시 줄어들지(타임테이블 블록) 아니면 아래로 내려갈지 */
  back?: boolean;
  /** 튜토리얼 시연으로 열린 창이면 뒤로가기는 튜토리얼이 처리한다 */
  inTutorial?: boolean;
  /** 페이지 주소 — 드랍 구간(public/drops.json)을 찾을 때 쓴다 */
  slug?: string;
}

const EASE_OUT = "cubic-bezier(.2,.8,.2,1)";
const EASE_IN = "cubic-bezier(.4,0,.9,.4)";
const DIM = "rgba(5,2,15,.72)";
const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** 시작 자리(from) → 창 위치로 가는 변형. 둥근 모서리는 비율이 달라도 10px로 보이게 보정 */
function fromFrame(from: DOMRect, r: DOMRect, color: string): Keyframe {
  const sx = from.width / r.width, sy = from.height / r.height;
  return {
    transformOrigin: "0 0",
    transform: `translate(${from.left - r.left}px, ${from.top - r.top}px) scale(${sx}, ${sy})`,
    backgroundColor: color,
    borderRadius: `${10 / sx}px / ${10 / sy}px`,
  };
}

export function ArtistSheet({ it, on, onToggle, onClose, from, back = true, inTutorial = false, slug = "edc-korea-2026" }: Props) {
  const st = STAGES[it.si];
  const { t, genre, dayLabel } = useI18n();
  const g = genre(it);
  // 꾹 눌러서 창을 열면 손가락이 아직 화면에 있어서, 그 아래 버튼(링크)을 길게 누른 걸로 처리돼
  // 브라우저 링크 메뉴가 뜬다. 손가락을 뗄 때까지(최대 1.5초) 창이 터치를 받지 않게 한다.
  const sheetRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  // 열기: 누른 자리에서 무대 색 네모가 커지면서 창이 되고, 내용은 뒤따라 나타난다
  useLayoutEffect(() => {
    const sheet = sheetRef.current, card = cardRef.current;
    if (!sheet || !card || reduceMotion()) return;
    sheet.animate([{ backgroundColor: "rgba(5,2,15,0)" }, { backgroundColor: DIM }], { duration: 280, easing: "ease-out" });
    if (from) {
      const r = card.getBoundingClientRect(), cs = getComputedStyle(card);
      card.animate([fromFrame(from, r, st.color), { transformOrigin: "0 0", transform: "none", backgroundColor: cs.backgroundColor, borderRadius: cs.borderRadius }], {
        duration: 380,
        easing: EASE_OUT,
      });
      for (const k of Array.from(card.children)) k.animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], { duration: 380, easing: "ease-out" });
    } else {
      card.animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 320, easing: EASE_OUT });
    }
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 닫기: 열 때의 반대로 (블록으로 다시 줄어들거나 아래로 내려감)
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const sheet = sheetRef.current, card = cardRef.current;
    if (!sheet || !card || reduceMotion()) return onClose();
    const opts: KeyframeAnimationOptions = { duration: 260, easing: EASE_IN, fill: "forwards" };
    sheet.animate([{ backgroundColor: DIM }, { backgroundColor: "rgba(5,2,15,0)" }], opts);
    let a: Animation;
    if (from && back) {
      const r = card.getBoundingClientRect(), cs = getComputedStyle(card);
      a = card.animate([{ transformOrigin: "0 0", transform: "none", backgroundColor: cs.backgroundColor, borderRadius: cs.borderRadius }, fromFrame(from, r, st.color)], opts);
      for (const k of Array.from(card.children)) k.animate([{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], opts);
    } else {
      a = card.animate([{ transform: "none" }, { transform: "translateY(100%)" }], opts);
    }
    a.onfinish = () => onClose();
    a.oncancel = () => onClose();
  }, [from, back, onClose, st.color]);

  useBackClose(!inTutorial, close);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  const [live, setLive] = useState(false);
  useEffect(() => {
    const on = () => setLive(true);
    const evs = ["pointerup", "pointercancel", "touchend", "touchcancel"] as const;
    evs.forEach((e) => window.addEventListener(e, on, { once: true }));
    const t = window.setTimeout(on, 1500);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, on));
      clearTimeout(t);
    };
  }, []);
  return (
    <div
      className={"sheet" + (live ? "" : " hold")}
      role="dialog"
      aria-modal="true"
      aria-label={it.name}
      ref={sheetRef}
      onClick={(e) => e.target === e.currentTarget && close()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="card" ref={cardRef}>
        <div className="row">
          <strong>{t("art.title")}</strong>
          <button className="x" type="button" aria-label={t("close")} onClick={close}>
            ✕
          </button>
        </div>
        <div className="art" style={{ "--c": st.color } as CSSProperties}>
          <Face key={it.id} it={it} imgClass="art-ph" initClass="art-init" size={160} />
          <h2>{it.name}</h2>
          <p className={"g " + g.c}>{g.t}</p>
          <p className="meta">
            <span className="dot" />
            {st.line1} {st.line2} · {dayLabel(it.day)} · {fmt(it.s)}–{fmt(it.e)}
          </p>
        </div>
        <DropPlayer slug={slug} artistId={it.id} autoPlay={!inTutorial} />
        {/* 듣기 버튼 3개: 한 줄에 3개(짧은 이름) */}
        <div className="links g3">
          <a className="link sp" href={spotifyUrl(it)} target="_blank" rel="noopener noreferrer" aria-label={t("link.sp")}>
            Spotify
          </a>
          <a className="link yt" href={youtubeUrl(it)} target="_blank" rel="noopener noreferrer" aria-label={t("link.yt")}>
            YouTube
          </a>
          <a className="link am" href={appleMusicUrl(it)} target="_blank" rel="noopener noreferrer" aria-label={t("link.am")}>
            Apple Music
          </a>
        </div>
        <p className="hint search-note">
          <Rich text={t("search.note")} />
        </p>
        <button type="button" className="btn ghost toggle" onClick={onToggle}>
          {on ? t("tt.remove") : t("tt.add")}
        </button>
        <div className="app-box">
          <p>
            <Rich text={t("app.note")} />
          </p>
          <div className="app-links">
            <a className="btn ghost" href={APP_STORE} target="_blank" rel="noopener noreferrer">
              App Store
            </a>
            <a className="btn ghost" href={PLAY_STORE} target="_blank" rel="noopener noreferrer">
              Google Play
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
