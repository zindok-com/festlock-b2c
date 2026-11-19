// 내 컬렉션 화면 조각: 프로필 만들기 · 관리 코드 안내 · 공유(9:16 인스타 스토리 이미지 저장 · 스토리 공유 · 링크 복사)
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { IN_APP } from "../inApp";
import { BandDialog } from "./common";
import type { Engine } from "./BandStage";
import { createProfile, type Me, type SaveError } from "./mine";
import "./bandMine.css";

/** 저장 오류 → 사용자 문구 */
export function useSaveErrText() {
  const { t } = useI18n();
  return (e: SaveError | "bad-name" | "bad-ig") =>
    e === "full" ? t("band.err.full")
    : e === "rate" ? t("band.err.rate")
    : e === "bad-image" ? t("band.err.image")
    : e === "offline" ? t("band.err.offline")
    : e === "storage" ? t("band.err.storage")
    : e === "busy" ? t("band.err.busy")
    : e === "no-auth" || e === "locked" ? t("band.err.auth")
    : e === "bad-name" ? t("band.p.badName")
    : e === "bad-ig" ? t("band.p.badIg")
    : t("band.err.generic");
}

/* ---------- 프로필 만들기 (처음 팔찌를 걸 때 한 번) ---------- */
export function ProfileSheet({ onDone }: { onDone: (me: Me | null) => void }) {
  const { t } = useI18n();
  const errText = useSaveErrText();
  const [name, setName] = useState("");
  const [ig, setIg] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const submit = async () => {
    if (busy) return;
    if (!agree) return setMsg(t("band.p.needAgree"));
    setBusy(true);
    setMsg(null);
    const r = await createProfile(name, ig);
    setBusy(false);
    if (r.ok) onDone(r.me);
    else setMsg(errText(r.error));
  };
  return (
    <BandDialog label={t("band.p.title")} onClose={() => onDone(null)}>
      <form
        className="band-profile band-over-card"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2>{t("band.p.title")}</h2>
        <p className="evt-lead">{t("band.p.lead")}</p>
        <label className="band-field">
          <span>{t("band.p.name")}</span>
          <input value={name} maxLength={20} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="band-field">
          <span>{t("band.p.ig")}</span>
          <input value={ig} maxLength={200} inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="@festlock" onChange={(e) => setIg(e.target.value)} />
        </label>
        <label className="band-check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>{t("band.p.c1")}</span>
        </label>
        {msg && (
          <p className="band-report-msg bad" role="alert">
            {msg}
          </p>
        )}
        <button type="submit" className="btn main evt-go band-profile-go" disabled={busy}>
          {busy ? t("band.loading") : t("band.p.go")}
        </button>
      </form>
    </BandDialog>
  );
}

/* ---------- 관리 코드 (프로필을 만든 직후 한 번) ---------- */
export function CodeDialog({ code, onClose }: { code: string; onClose: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <BandDialog label={t("band.code.title")} onClose={onClose}>
      <div className="band-code">
        <h2>{t("band.code.title")}</h2>
        <p className="evt-lead">{t("band.code.body")}</p>
        <p className="band-code-v">{code}</p>
        <button
          type="button"
          className="btn main evt-go band-close"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
            } catch {
              /* 복사가 막힌 곳: 화면 캡처 안내만 */
            }
          }}
        >
          {copied ? t("band.code.copied") : t("band.code.copy")}
        </button>
        <button type="button" className="btn ghost evt-go band-close" onClick={onClose}>
          {t("band.close")}
        </button>
      </div>
    </BandDialog>
  );
}

/* ---------- 공유: 9:16 인스타 스토리 이미지 + 링크 ---------- */
const W = 1080;
const H = 1920;

function fitText(g: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: number) {
  g.font = `${weight} ${size}px "Noto Sans KR","Rubik",sans-serif`;
  const w = g.measureText(text).width;
  if (w > maxW) g.font = `${weight} ${Math.floor((size * maxW) / w)}px "Noto Sans KR","Rubik",sans-serif`;
}

/** 지금 3D 진열 + 이름·팔찌 수를 얹은 1080×1920 그림 (주소는 스토리 링크 스티커로) */
/** yr 가 있으면 "○○님의 2026 페스티벌 · 페스티벌 N곳 · 팔찌 M개" (연말 자랑하기) */
type YearInfo = { y: number; fests: number };
async function storyImage(engine: Engine, name: string, count: number, t: (k: string, v?: Record<string, string | number>) => string, yr?: YearInfo): Promise<Blob | null> {
  try {
    await document.fonts.ready;
  } catch {
    /* 글꼴 없이도 그린다 */
  }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  // 무대와 같은 배경 (어두운 보라 + 빛 번짐)
  g.fillStyle = "#0B0620";
  g.fillRect(0, 0, W, H);
  const glow = (x: number, y: number, r: number, col: string) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col);
    gr.addColorStop(1, "rgba(11,6,32,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  };
  glow(90, 120, 900, "rgba(123,75,255,.55)");
  glow(W, 920, 760, "rgba(255,79,160,.36)");
  glow(0, H - 60, 900, "rgba(91,59,208,.5)");
  // 3D 진열
  // 3D 진열: 위 글자 아래부터 맨 아래까지 크게 (주소는 스토리에 링크 스티커로 붙이면 되므로 그림에 넣지 않음)
  const snap = engine.snapshot(W, H - 300);
  g.drawImage(snap, 0, 300);
  // 위: FestLock · 이름 · 팔찌 수
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.fillStyle = "#FF4FA0";
  g.font = '800 40px "Rubik","Noto Sans KR",sans-serif';
  g.fillText("FestLock", W / 2, 128);
  g.fillStyle = "#F6F1FF";
  const title = yr ? t("band.s.img.year", { name, y: yr.y }) : t("band.s.img.title", { name });
  fitText(g, title, W - 120, 72, 900);
  g.fillText(title, W / 2, 222);
  g.fillStyle = "#B7AED6";
  g.font = '700 38px "Noto Sans KR","Rubik",sans-serif';
  g.fillText(yr ? t("band.s.img.yearCount", { f: yr.fests, n: count }) : t("band.s.img.count", { n: count }), W / 2, 282);
  return new Promise((res) => c.toBlob(res, "image/png"));
}

export function ShareSheet({ engine, name, count, link, year, bornAt, onClose, onToast }: { engine: Engine | null; name: string; count: number; link: string; year?: YearInfo; /** 3D 를 새로 만든 시각 (막 만들었으면 팔찌가 내려올 때까지 기다림) */ bornAt?: number; onClose: () => void; onToast: (m: string) => void }) {
  const { t } = useI18n();
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  const [failed, setFailed] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!engine) return setFailed(true);
      try {
        // 팔찌가 다 걸린 뒤에 찍는다 (화면을 열자마자 공유를 눌러도 빈 레일만 찍히지 않게). 막 걸렸으면 내려오는 모션도 잠깐 기다림
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        // 3D 는 한 장면에 최대 1/30초씩만 움직인다 → 느린 기기에서도 팔찌가 다 내려온 뒤 찍도록 장면 단위로 같은 방식으로 센다
        const settle = (sec: number) =>
          new Promise<void>((res) => {
            let acc = 0;
            let last = performance.now();
            const f = (now: number) => {
              acc += Math.min((now - last) / 1000, 1 / 30);
              last = now;
              if (acc >= sec || !live) res();
              else requestAnimationFrame(f);
            };
            requestAnimationFrame(f);
          });
        const want = Math.min(Math.max(count, 1), 60);
        let waited = false;
        for (let i = 0; i < 100 && live && engine.count() < want; i++) {
          waited = true;
          await sleep(100);
        }
        if (waited || (bornAt && performance.now() - bornAt < 6000)) await settle(2.4);
        if (!live) return;
        const b = await storyImage(engine, name, count, t, year);
        if (!live) return;
        if (!b) return setFailed(true);
        const url = URL.createObjectURL(b);
        urlRef.current = url;
        setImg({ url, blob: b });
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fileName = year ? `festlock-${year.y}.png` : "festlock-collection.png";
  const head = year ? t("band.s.yearTitle", { y: year.y }) : t("band.s.title");
  const file = () => (img ? new File([img.blob], fileName, { type: "image/png" }) : null);
  const canShareFile = (() => {
    const f = file();
    try {
      return !!f && !!navigator.canShare && navigator.canShare({ files: [f] });
    } catch {
      return false;
    }
  })();

  const save = () => {
    if (!img) return;
    const a = document.createElement("a");
    a.href = img.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    onToast(t("band.s.saved"));
  };
  const story = async () => {
    const f = file();
    if (!f) return;
    try {
      await navigator.share({ files: [f] });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") onToast(t("band.share.fail"));
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      onToast(t("band.shared"));
    } catch {
      try {
        await navigator.share({ url: link });
      } catch {
        onToast(t("band.share.fail"));
      }
    }
  };

  return (
    <BandDialog label={head} onClose={onClose}>
      <div className="band-share-sheet">
        <h2>{head}</h2>
        <div className="band-share-pv">
          {img ? <img src={img.url} alt={t("band.s.img.title", { name })} /> : <p className="band-share-wait">{failed ? t("band.share.fail") : t("band.s.making")}</p>}
        </div>
        {(IN_APP || !img) && img && <p className="band-share-hint">{t("band.s.hint")}</p>}
        <div className="band-share-acts">
          <button type="button" className="btn main band-s-save" disabled={!img} onClick={save}>
            {t("band.s.save")}
          </button>
          {canShareFile && (
            <button type="button" className="btn ghost band-s-story" onClick={story}>
              {t("band.s.story")}
            </button>
          )}
          <button type="button" className="btn ghost band-s-copy" onClick={copy}>
            {t("band.s.copy")}
          </button>
        </div>
        <p className="band-share-link">{link.replace(/^https?:\/\//, "")}</p>
      </div>
    </BandDialog>
  );
}
