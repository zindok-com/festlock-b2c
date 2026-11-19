// 팔찌 3D 진열 (시안 docs/band-collection/sample.html 과 같은 4종: 🎀 걸기 · ⭕ 손목 · 🎠 모빌 · 🖼 액자)
// 3D 코드(three + src/band/three/engine.ts)는 이 화면에서만 따로 불러온다 → 페스티벌 페이지 용량에는 영향 없음.
// WebGL 을 못 쓰는 기기·불러오기 실패 → 사진 격자로 대신 보여 준다.
//
// full: 화면 전체를 채우는 컬렉션 화면 (/collection, /c/{id}). 무대 위에 버튼들이 떠 있다:
//   왼쪽 위 topLeft · 오른쪽 위 topRight · 가운데 위 ‹ 진열 이름 n/4 › · 그 아래 caption · 왼쪽 아래 확대/축소 · 아래 가운데 bottom
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";
import type { BandDesign } from "./api";
import { festName, useBandLabel } from "./common";
import "./band3d.css";
import "./bandScan.css";

export type ThemeId = "scan" | "wrist" | "mobile" | "frame";
export const THEME_IDS: ThemeId[] = ["scan", "wrist", "mobile", "frame"];
const THEME_KEY = "fl:band:theme";

interface Nav {
  label: string;
  canPrev: boolean;
  canNext: boolean;
}
export interface Engine {
  load(designs: unknown[], theme?: string): Promise<void>;
  /** 팔찌 만들기(스캔) 화면 열기 */
  openScan(): void;
  /** 지금 진열을 w×h 그림으로 (공유용) */
  snapshot(w: number, h: number): HTMLCanvasElement;
  count(): number;
  setTheme(id: string): void;
  replay(): void;
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  prev(): void;
  next(): void;
  dispose(): void;
}

// 시안이 팔찌 글자에 쓰는 글꼴 (한글은 Noto Sans KR 로 이어진다). 한 번만 붙인다
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Space+Mono:wght@700&display=swap";
function ensureFont() {
  if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = FONT_HREF;
  document.head.appendChild(l);
}

function savedTheme(): ThemeId {
  try {
    const v = localStorage.getItem(THEME_KEY) as ThemeId | null;
    if (v && THEME_IDS.includes(v)) return v;
  } catch {
    /* 저장소 없음 */
  }
  return "scan";
}

/** 3D 를 못 그릴 때 대신 보여 주는 사진 격자 (2열) */
export function BandGrid({ items }: { items: BandDesign[] }) {
  const label = useBandLabel();
  return (
    <ul className="band-grid">
      {items.map((d) => {
        const l = label(d);
        return (
          <li key={d.key} className="band-item">
            <img className="band-strip" src={d.img} alt={l.alt} loading="lazy" decoding="async" />
            <span className="band-item-t">
              <b>{l.fest}</b>
              <span>
                {l.year} · {l.grade} · {l.day}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

interface Props {
  items: BandDesign[];
  /** 화면 전체를 채우는 컬렉션 화면 */
  full?: boolean;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  /** 진열 바꾸기 아래 줄 (예: "○○님의 컬렉션") */
  caption?: ReactNode;
  /** 아래 가운데 버튼들 (예: 공유 · 추가) */
  bottom?: ReactNode;
  /** 팔찌가 없을 때 무대 가운데 문구 */
  emptyText?: string;
  /** 무대 위에 잠깐 띄울 안내 (공유 결과 등) */
  toast?: string | null;
  /** 이 값이 바뀔 때만 3D 를 새로 만든다 (없으면 팔찌 목록이 바뀔 때) */
  /** 전체 화면 위 가운데 (연도 칩). 있으면 진열 바꾸기는 이름 아래로 내려간다 */
  topCenter?: ReactNode;
  stageKey?: string;
  /** 엔진이 준비되면 받는다 (스캔 열기·공유 그림) */
  onEngine?: (e: Engine | null) => void;
  /** 팔찌 만들기(스캔) 연결: 문구·페스티벌 목록·첫 디자인 찾기·저장 */
  scan?: Record<string, unknown>;
  /** 진열에 걸린 팔찌 수가 바뀌면 */
  onCount?: (n: number) => void;
}

export function BandStage({ items, full = false, topLeft, topRight, topCenter, caption, bottom, emptyText, toast, stageKey, onEngine, scan, onCount }: Props) {
  const { t } = useI18n();
  const label = useBandLabel();
  const box = useRef<HTMLDivElement>(null);
  const eng = useRef<Engine | null>(null);
  const [theme, setTheme] = useState<ThemeId>(savedTheme);
  const [nav, setNav] = useState<Nav | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading");
  const [picked, setPicked] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const pickTimer = useRef(0);

  // 전체 화면일 때는 뒤쪽 페이지가 스크롤되지 않게
  useEffect(() => {
    if (!full) return;
    const el = document.documentElement;
    el.classList.add("band-full-on");
    return () => el.classList.remove("band-full-on");
  }, [full]);

  // 팔찌가 바뀔 때만 다시 그린다 (같은 목록이면 그대로)
  const sig = useMemo(() => stageKey ?? items.map((d) => d.key).join("|"), [items, stageKey]);
  const hooksRef = useRef({ scan, onEngine, onCount });
  hooksRef.current = { scan, onEngine, onCount };

  useEffect(() => {
    let live = true;
    let e: Engine | null = null;
    const el = box.current;
    // 팔찌가 0개여도 엔진은 만든다 (스캔 화면을 열 수 있게). 스캔 연결이 없고 팔찌도 없으면 만들지 않음
    if (!el || (!items.length && !hooksRef.current.scan)) {
      setState("ready");
      return;
    }
    setState("loading");
    ensureFont();
    import("./three/engine")
      .then((m) => {
        if (!live) return;
        try {
          e = m.createEngine(el, {
            ...(hooksRef.current.scan || {}),
            full,
            onState: (s: { nav: Nav | null; count: number }) => {
              if (!live) return;
              setNav(s.nav);
              hooksRef.current.onCount?.(s.count);
            },
            onPick: (i: number) => {
              const d = itemsRef.current[i];
              if (!d || !live) return;
              const l = label(d);
              setPicked(`${l.fest} ${l.year} · ${l.grade} · ${l.day}`);
              clearTimeout(pickTimer.current);
              pickTimer.current = window.setTimeout(() => setPicked(null), 2600);
            },
            // 엔진 안내(예: "○○ · 리본으로 걸었어요", "60개까지 걸 수 있어요")를 무대 위 말풍선으로
            onToast: (m: string) => {
              if (!live) return;
              setPicked(m);
              clearTimeout(pickTimer.current);
              pickTimer.current = window.setTimeout(() => setPicked(null), 2600);
            },
          }) as Engine;
        } catch {
          setState("fallback"); // WebGL 없음
          return;
        }
        eng.current = e;
        hooksRef.current.onEngine?.(e);
        const designs = itemsRef.current.map((d) => ({
          style: d.style,
          img: d.img,
          pal: d.pal,
          name: festName(d.fest, "en").toUpperCase(),
          sub: "",
          year: d.year,
        }));
        return e.load(designs, theme).then(() => live && setState("ready"));
      })
      .catch(() => live && setState("fallback"));
    return () => {
      live = false;
      clearTimeout(pickTimer.current);
      if (e) hooksRef.current.onEngine?.(null);
      e?.dispose();
      eng.current = null;
    };
    // theme·full 은 처음 그릴 때만 쓴다 (진열을 바꾸면 엔진에 바로 알림)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const choose = (id: ThemeId) => {
    setTheme(id);
    setPicked(null);
    eng.current?.setTheme(id);
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {
      /* 저장소 없음 */
    }
  };
  const step = (d: number) => choose(THEME_IDS[(THEME_IDS.indexOf(theme) + d + THEME_IDS.length) % THEME_IDS.length]);
  const bubble = picked || toast || null;
  const switcher = (
      <div className="band-switch" role="group" aria-label={t("band.theme.label")}>
        <button type="button" className="band-switch-btn" aria-label={t("band.theme.prev")} onClick={() => step(-1)}>
          ‹
        </button>
        <span className="band-switch-name" aria-live="polite" data-theme={theme}>
          {t("band.theme." + theme)}
          <small>
            {THEME_IDS.indexOf(theme) + 1}/{THEME_IDS.length}
          </small>
        </span>
        <button type="button" className="band-switch-btn" aria-label={t("band.theme.next")} onClick={() => step(1)}>
          ›
        </button>
      </div>
  );

  if (state === "fallback") {
    return (
      <div className={"band-3d-fallback" + (full ? " full" : "")}>
        {full && (
          <div className="band-full-top">
            <div className="band-full-tl">{topLeft}</div>
            <div className="band-full-tr">{topRight}</div>
          </div>
        )}
        {caption && <div className="band-full-caption">{caption}</div>}
        <p className="band-note">{t("band.nogl")}</p>
        <BandGrid items={items} />
        {bottom && <div className="band-full-bottom static">{bottom}</div>}
      </div>
    );
  }

  return (
    <section className={"band-3d" + (full ? " full" : "")} aria-label={t("band.stage")}>
      <div className="band-stage" ref={box} data-state={state}>
        {state === "loading" && <p className="band-stage-msg">{t("band.loading")}</p>}
        {!items.length && emptyText && <p className="band-stage-msg">{emptyText}</p>}
      </div>

      {full ? (
        <>
          <div className="band-full-top">
            <div className="band-full-tl">{topLeft}</div>
            {/* 연도 칩이 있으면 위 가운데는 연도, 진열 바꾸기(‹ 걸기 1/4 ›)는 이름 아래로 */}
            {topCenter ? <div className="band-full-tc">{topCenter}</div> : switcher}
            <div className="band-full-tr">{topRight}</div>
          </div>
          {(caption || topCenter) && (
            <div className="band-full-caption">
              {caption}
              {topCenter && switcher}
            </div>
          )}
          {/* 진열 이름 탭 (화면 읽기·키보드용으로도 남겨 둔다) */}
          <div className="band-sr" role="tablist" aria-label={t("band.theme.label")}>
            {THEME_IDS.map((id) => (
              <button key={id} type="button" role="tab" className="band-tab" data-theme={id} aria-selected={theme === id} onClick={() => choose(id)}>
                {t("band.theme." + id)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="band-tabs" role="tablist" aria-label={t("band.theme.label")}>
          {THEME_IDS.map((id) => (
            <button key={id} type="button" role="tab" className="band-tab" data-theme={id} aria-selected={theme === id} onClick={() => choose(id)}>
              {t("band.theme." + id)}
            </button>
          ))}
        </div>
      )}

      {nav && (
        <div className="band-nav">
          <button type="button" aria-label={t("band.prev")} disabled={!nav.canPrev} onClick={() => eng.current?.prev()}>
            ‹
          </button>
          <span>{nav.label}</span>
          <button type="button" aria-label={t("band.next")} disabled={!nav.canNext} onClick={() => eng.current?.next()}>
            ›
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="band-zoom">
          <button type="button" aria-label={t("band.z.in")} onClick={() => eng.current?.zoomIn()}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M15.5 15.5 20 20M10.5 7.5v6M7.5 10.5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" aria-label={t("band.z.out")} onClick={() => eng.current?.zoomOut()}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M15.5 15.5 20 20M7.5 10.5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" aria-label={t("band.z.fit")} onClick={() => eng.current?.fit()}>
            ⤢
          </button>
          <button type="button" className="band-replay" aria-label={t("band.replay")} onClick={() => eng.current?.replay()}>
            ↻
          </button>
        </div>
      )}

      <p className={"band-pick" + (bubble ? " show" : "")} role="status" aria-live="polite">
        {bubble}
      </p>
      {full ? bottom && <div className="band-full-bottom">{bottom}</div> : <p className="band-3d-hint">{t("band.drag")}</p>}
    </section>
  );
}
