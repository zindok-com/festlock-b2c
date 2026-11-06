// 아티스트 창 안의 "드랍 미리듣기": 공식 YouTube 플레이어로 고른 구간만 재생한다 (Studio에서 "0초부터 전체"로 저장한 영상은 처음부터 끝까지).
// - 영상·음원은 내려받지 않는다. 플레이어는 YouTube 규정대로 200×200px 이상
// - 창이 열리면 플레이어를 창 맨 위(아티스트 사진 위)의 접힌 칸 안에 미리 만들어 둔다
// - 0.7초 뒤 사진·이름 등 기존 내용이 부드럽게 아래로 밀려 내려가고, 위에 생긴 공간에 플레이어가 나타나 바로 재생된다
//   (자동 재생이 막히는 브라우저면 플레이어의 ▶를 누르면 된다. 튜토리얼 시연으로 열린 창은 자동 재생하지 않는다)
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n";
import { useDrop } from "../drops";
import { IN_APP } from "../inApp";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytLoading: Promise<any> | null = null;
function loadYT(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytLoading) {
    ytLoading = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        ytLoading = null;
        reject(new Error("yt"));
      };
      document.head.appendChild(s);
    });
  }
  return ytLoading;
}

/** 튜토리얼이 "플레이어가 열리는 모습"을 보여 달라고 보내는 신호 (소리 없이 자리만 연다) */
export const DROP_DEMO = "fl:drop-demo";

/** 사진만 보이는 시간, 내용이 내려가며 자리가 열리는 시간 */
const HOLD_MS = 700;
const OPEN_MS = 520;
const EASE = "cubic-bezier(.22,.8,.24,1)";

export function DropPlayer({ slug, artistId, autoPlay = true }: { slug: string; artistId: string; autoPlay?: boolean }) {
  const { t } = useI18n();
  const drop = useDrop(slug, artistId);
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const ready = useRef(false);
  const pending = useRef(false);
  const timer = useRef<number>();
  /** 위쪽 아티스트 칸(.art) 맨 앞에 끼워 넣은 자리 — 처음엔 높이 0, 열리면 플레이어 높이만큼 내용을 밀어 낸다 */
  const [top, setTop] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const opened = useRef(false);
  /** false = 문제없음, 숫자 = YouTube 오류 번호(-1 = 플레이어를 못 불러옴) */
  const [err, setErrState] = useState<false | number>(false);
  const errRef = useRef<false | number>(false);
  const setErr = (e: false | number) => {
    errRef.current = e;
    setErrState(e);
  };

  useLayoutEffect(() => {
    if (!drop) return;
    const art = root.current?.closest(".card")?.querySelector<HTMLElement>(".art");
    if (!art) return;
    const box = document.createElement("div");
    box.className = "drop-top";
    art.insertBefore(box, art.firstChild);
    setTop(box);
    return () => {
      box.remove();
      setTop(null);
    };
  }, [drop]);

  // 창이 열리자마자 플레이어를 접힌 칸 안에 미리 만들어 두고, 0.7초 뒤 자리를 열어 재생한다
  useEffect(() => {
    if (!drop || !top) return;
    let dead = false;
    loadYT()
      .then((YT) => {
        if (dead || !host.current) return;
        const el = document.createElement("div");
        host.current.appendChild(el);
        player.current = new YT.Player(el, {
          width: "100%",
          height: "100%",
          videoId: drop.videoId,
          playerVars: { playsinline: 1, rel: 0, origin: window.location.origin, ...(drop.full ? {} : { start: Math.floor(drop.start), end: Math.ceil(drop.end) }) },
          events: {
            onReady: () => {
              ready.current = true;
              if (pending.current) play();
            },
            onError: (e: any) => {
              // 재생할 수 없으면(150 등: 영상 주인이 일부 지역에서 퍼가기 재생을 막았거나 영상이 없어짐) 자리는 그대로 두고
              // 플레이어 대신 썸네일 + "YouTube에서 듣기" 카드를 보인다 (사라지지 않게)
              setErr(Number(e?.data) || 0);
            },
          },
        });
      })
      .catch(() => !dead && setErr(-1));
    if (autoPlay) timer.current = window.setTimeout(start, HOLD_MS);
    // 튜토리얼 시연: 재생 없이 자리만 연다
    const demo = () => start(false);
    if (!autoPlay) window.addEventListener(DROP_DEMO, demo);
    return () => {
      dead = true;
      window.removeEventListener(DROP_DEMO, demo);
      clearTimeout(timer.current);
      try {
        player.current?.destroy?.();
      } catch {
        /* 이미 닫힘 */
      }
      player.current = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drop?.videoId, drop?.start, drop?.end, drop?.full, top]);

  if (!drop) return null;
  const len = Math.round(drop.end - drop.start);
  const watch = drop.full ? `https://youtu.be/${drop.videoId}` : `https://youtu.be/${drop.videoId}?t=${Math.floor(drop.start)}`;

  /** 고른 구간 처음부터(전체 재생이면 0초부터 끝까지) 재생 (플레이어가 아직 준비 중이면 준비되는 대로) */
  function play() {
    if (!player.current || !ready.current) {
      pending.current = true;
      return;
    }
    pending.current = false;
    try {
      player.current.loadVideoById(drop!.full ? { videoId: drop!.videoId, startSeconds: 0 } : { videoId: drop!.videoId, startSeconds: drop!.start, endSeconds: drop!.end });
    } catch {
      setErr(-2);
    }
  }

  /** 내용을 아래로 밀어 위에 자리를 열고, 플레이어를 보이며 재생 (withSound=false면 자리만 연다)
   *  인스타·카톡 등 앱 안 브라우저는 코드로 재생하면 막히므로 자리만 열고 "▶를 눌러 주세요"를 띄운다 */
  function start(withSound = true) {
    clearTimeout(timer.current);
    if (withSound && !IN_APP && errRef.current === false) play();
    if (opened.current || !top) return;
    opened.current = true;
    setOpen(true);
    const full = top.scrollHeight;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      top.style.height = "auto";
      return;
    }
    top.style.height = full + "px";
    top.animate([{ height: "0px" }, { height: full + "px" }], { duration: OPEN_MS, easing: EASE }).onfinish = () => (top.style.height = "auto");
  }

  return (
    <div className={"drop" + (open ? " is-open" : "")} ref={root}>
      {top &&
        createPortal(
          <div className={"drop-stage" + (open ? " on" : "")} aria-hidden={!open}>
            <div className="drop-player" ref={host} hidden={err !== false} />
            {err !== false ? (
              <a className="drop-fallback" href={watch} target="_blank" rel="noopener noreferrer">
                <img src={`https://i.ytimg.com/vi/${drop.videoId}/hqdefault.jpg`} alt="" loading="lazy" />
                <span className="drop-fb-play" aria-hidden="true">▶</span>
                <span className="drop-fb-msg">
                  {t(err === 150 || err === 101 ? "f.drop.blocked" : "f.drop.err")} <span className="drop-code">({err})</span>
                </span>
              </a>
            ) : (
              IN_APP && <p className="drop-tap">{t("f.drop.tap")}</p>
            )}
          </div>,
          top,
        )}
      <div className="drop-head">
        <strong>{t("f.drop.title")}</strong>
        {drop.trackTitle && <span className="drop-track">♪ {drop.trackTitle}</span>}
      </div>
      {err !== false && !top && (
        <p className="drop-err">
          {t("f.drop.err")} <span className="drop-code">({err})</span>
        </p>
      )}
      <div className="drop-acts">
        {err === false && !(IN_APP && open) && (
          <button type="button" className="btn drop-play" onClick={() => start()}>
            {open ? t("f.drop.again") : drop.full ? t("f.drop.playFull") : t("f.drop.play", { n: String(len) })}
          </button>
        )}
        <a className="drop-yt" href={watch} target="_blank" rel="noopener noreferrer">
          {t("f.drop.yt")}
        </a>
      </div>
    </div>
  );
}
