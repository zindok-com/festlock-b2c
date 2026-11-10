// 아티스트 창 안의 "미리보기 영상": 아티스트·주최측이 준 mp4(Blob)를 창 맨 위에서 재생한다.
// - 유튜브 드랍 플레이어(DropPlayer)와 같은 자리·같은 움직임: 창이 열리고 0.7초 뒤 내용이 아래로 밀리며 위에 영상 칸이 열리고, 열리자마자 자동 재생
// - 창이 열리면 영상을 접힌 칸 안에서 미리 받기 시작해서, 칸이 열릴 때 바로 재생된다
// - 소리와 함께 재생을 먼저 시도하고, 브라우저가 막으면(아이폰 사파리 등) 소리 없이 재생한 뒤 "소리 켜기" 버튼을 띄운다
//   (소리 없는 자동 재생은 거의 모든 브라우저가 허용한다. 소리는 사용자가 눌러야만 켤 수 있다)
// - 소리 없이도 막히면(저전력 모드, 일부 앱 안 브라우저) 영상 위 ▶ 표지가 남는다. 표지를 누르면 재생된다
//   (유튜브 플레이어와 달리 이 ▶는 우리 버튼이라, 앱 안 브라우저에서도 누르면 소리와 함께 재생된다)
// - 사파리는 "누르는 순간 안에서" 부른 재생만 소리를 허용한다 → 눌렀을 때는 영상 칸을 즉시(flushSync) 만들고 바로 play() 한다
// - 자동 재생은 영상을 받는 양이 많다: 창을 열 때마다 영상 1편(약 1.7MB)을 받는다. Blob 무료 요금제는 한 달 전송량이 10GB.
//   전송량이 부족하면 AUTOPLAY 를 false 로 바꾸면 "▶를 눌렀을 때만" 받는다 (docs/ADD-FESTIVAL.md 4단계)
// 지침: docs/유튜브-드랍-플레이어-지침.md (유튜브) · docs/ADD-FESTIVAL.md 4단계 "iOS" (mp4)
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal, flushSync } from "react-dom";
import { useI18n } from "../i18n";
import type { Clip } from "../clips";
import { DROP_DEMO } from "./DropPlayer";

/** true 면 창이 열릴 때 영상을 바로 받아 자동 재생한다. false 면 ▶를 눌렀을 때만 받아서 재생한다 */
const AUTOPLAY = true;
const HOLD_MS = 700;
const OPEN_MS = 520;
/** 칸이 열리기 시작한 뒤 재생을 시도하기까지 (영상이 화면에 보이는 크기가 된 뒤. 사파리는 안 보이는 영상의 코드 재생을 막을 수 있다) */
const SHOW_MS = 150;
const EASE = "cubic-bezier(.22,.8,.24,1)";

export function ClipPlayer({ clip, urls, poster, autoPlay = true }: { clip: Clip; urls: string[]; poster: string | null; autoPlay?: boolean }) {
  const { t } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const timer = useRef<number>();
  const showTimer = useRef<number>();
  const [top, setTop] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const opened = useRef(false);
  /** 영상 파일을 받기 시작했는지 (false인 동안은 <video>를 만들지 않는다). 타이머 안에서도 최신 값을 읽도록 ref를 같이 둔다 */
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  /** 영상이 만들어지면(또는 다음 주소로 바뀌면) 재생해야 하는 상태 */
  const pending = useRef(false);
  const [playing, setPlaying] = useState(false);
  /** 한 번이라도 재생됐는지 (버튼 글자용) */
  const [played, setPlayed] = useState(false);
  /** 소리 없이 재생 중이라 "소리 켜기"를 보여야 하는지 */
  const [needSound, setNeedSound] = useState(false);
  /** 지금 쓰는 주소 번호 (실패하면 다음 주소) */
  const [srcIdx, setSrcIdx] = useState(0);
  const [err, setErr] = useState(false);

  useLayoutEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!top) return;
    if (autoPlay) {
      // 접힌 칸 안에서 미리 받아 두고, 칸이 열릴 때 재생
      if (AUTOPLAY) begin(false);
      timer.current = window.setTimeout(() => reveal(AUTOPLAY), HOLD_MS);
    }
    // 튜토리얼 시연: 재생 없이 자리만 연다
    const demo = () => reveal(false);
    if (!autoPlay) window.addEventListener(DROP_DEMO, demo);
    return () => {
      window.removeEventListener(DROP_DEMO, demo);
      clearTimeout(timer.current);
      clearTimeout(showTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top]);

  /** 영상 파일을 받기 시작한다 (flush = 지금 바로 <video>를 만든다: 누르는 순간 안에서 play()를 부르려면 필요) */
  function begin(flush: boolean) {
    if (startedRef.current) return;
    startedRef.current = true;
    if (flush) flushSync(() => setStarted(true));
    else setStarted(true);
  }

  /** 소리와 함께 재생을 시도하고, 막히면 소리 없이 재생한다 */
  function attempt() {
    const v = video.current;
    if (!v) return;
    v.muted = false;
    setNeedSound(false);
    v.play().catch(() => {
      v.muted = true;
      v.play().then(
        () => setNeedSound(true),
        () => setPlaying(false), // 소리 없이도 막힌 곳(저전력 모드, 일부 앱 안 브라우저): ▶ 표지를 눌러 재생
      );
    });
  }

  /** 내용을 아래로 밀어 위에 영상 칸을 연다 */
  function reveal(andPlay: boolean) {
    clearTimeout(timer.current);
    // 타이머로 부르는 재생은 사용자가 누른 게 아니라서, 칸이 열리기 시작해 높이가 생긴 뒤(0.15초)에 시도해도 손해가 없다
    if (andPlay) showTimer.current = window.setTimeout(play, SHOW_MS);
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

  /** 처음부터 재생. 누른 경우에도 이 함수 안에서 바로 play()까지 가야 사파리가 소리를 허용한다 */
  function play() {
    setErr(false);
    begin(true);
    const v = video.current;
    if (!v) {
      pending.current = true; // 칸이 아직 없다: 만들어지면 재생
      return;
    }
    try {
      v.currentTime = 0;
    } catch {
      /* 아직 준비 전 */
    }
    attempt();
  }

  function unmute() {
    const v = video.current;
    if (!v) return;
    v.muted = false;
    setNeedSound(false);
  }

  function onError() {
    if (srcIdx + 1 < urls.length) {
      pending.current = true; // 다음 주소의 영상이 만들어지면 이어서 재생
      setSrcIdx(srcIdx + 1);
    } else {
      setErr(true);
      setPlaying(false);
    }
  }

  // 세로 영상은 너무 길어지지 않게 4:5까지만 (위아래를 조금 잘라 보여 준다)
  const ratio = Math.max(clip.w / clip.h, 4 / 5);
  const secs = String(Math.round(clip.dur));
  return (
    <div className={"drop clip" + (open ? " is-open" : "")} ref={root}>
      {top &&
        createPortal(
          <div className={"drop-stage" + (open ? " on" : "")} aria-hidden={!open}>
            <div className="clip-box" style={{ aspectRatio: String(ratio) } as CSSProperties}>
              {started && (
                <video
                  ref={video}
                  key={srcIdx}
                  className="clip-video"
                  src={urls[srcIdx]}
                  playsInline
                  controls
                  preload="auto"
                  onLoadedMetadata={() => {
                    if (pending.current) {
                      pending.current = false;
                      attempt();
                    }
                  }}
                  onPlaying={() => {
                    setPlaying(true);
                    setPlayed(true);
                  }}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  onVolumeChange={(e) => !e.currentTarget.muted && setNeedSound(false)}
                  onError={onError}
                />
              )}
              {!playing && (
                <button type="button" className={"clip-cover" + (played ? " again" : "")} onClick={play} aria-label={t("f.clip.play", { n: secs })}>
                  {poster && !played && <img className="clip-bg" src={poster} alt="" draggable={false} />}
                  <span className="clip-play" aria-hidden="true">
                    {played ? "↺" : "▶"}
                  </span>
                  {!played && <span className="clip-len">{t("f.clip.len", { n: secs })}</span>}
                </button>
              )}
              {playing && needSound && (
                <button type="button" className="clip-sound" onClick={unmute}>
                  <span aria-hidden="true">🔇</span> {t("f.clip.sound")}
                </button>
              )}
            </div>
            {err && <p className="drop-tap">{t("f.clip.err")}</p>}
          </div>,
          top,
        )}
      <div className="drop-head">
        <strong>{t("f.clip.title")}</strong>
        <span className="drop-track">{t("f.clip.src")}</span>
      </div>
      <div className="drop-acts">
        <button type="button" className="btn drop-play" onClick={() => reveal(true)}>
          {played ? t("f.clip.again") : t("f.clip.play", { n: secs })}
        </button>
      </div>
    </div>
  );
}
