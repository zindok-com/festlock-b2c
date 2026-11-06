import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { SHOW_FACES, faceSrc } from "../config";
import { ITEMS, PPM, STAGES, TOTAL, fmt, type Day, type Item, type Stage } from "../data";
import { useI18n } from "../i18n";

interface Props {
  day: Day;
  sel: Set<string>;
  warn: Set<string>;
  showGenre: boolean;
  onToggle: (id: string) => void;
  onInfo: (id: string, from?: DOMRect) => void;
}

const hours: number[] = [];
for (let m = 0; m <= TOTAL; m += 60) hours.push(m);

export function StageHeads({ day }: { day: Day }) {
  return (
    <div className="heads" style={{ "--n": STAGES.length } as CSSProperties}>
      <div />
      {STAGES.map((st) => (
        <div key={st.key} className="head" style={{ "--c": st.color } as CSSProperties}>
          <div className="a">{st.line1}</div>
          <div className="b">{st.line2}</div>
          <div className="h">{day.hosts[st.key] || ""}</div>
        </div>
      ))}
    </div>
  );
}

/** 꾹 누르기(롱프레스). 움직이면 스크롤로 보고 취소한다. */
function useLongPress(cb: () => void, ms = 450) {
  const timer = useRef<number>();
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const clear = () => {
    clearTimeout(timer.current);
    start.current = null;
  };
  return {
    /** 방금 롱프레스가 발동했으면 true (뒤따르는 click을 무시하기 위함) */
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

function Block({ it, st, on, warn, onToggle, onInfo }: { it: Item; st: Stage; on: boolean; warn: boolean; onToggle: (id: string) => void; onInfo: (id: string, from?: DOMRect) => void }) {
  const src = SHOW_FACES ? faceSrc(it.id) : null;
  const [failed, setFailed] = useState(false);
  const photo = !!src && !failed;
  const boxRef = useRef<HTMLDivElement>(null);
  const lp = useLongPress(() => onInfo(it.id, boxRef.current?.getBoundingClientRect()));
  const { t, genre } = useI18n();
  const g = genre(it);
  const time = fmt(it.s) + "–" + fmt(it.e);
  return (
    <div
      ref={boxRef}
      data-id={it.id}
      className={"blk" + (on ? " on" : "") + (photo ? " ph" : "")}
      style={{ "--c": st.color, top: it.s * PPM + 1 + "px", height: (it.e - it.s) * PPM - 2 + "px" } as CSSProperties}
    >
      <button
        type="button"
        className="blk-hit"
        aria-pressed={on}
        aria-label={`${it.name}, ${st.line1} ${st.line2}, ${time}. ${t("blk.hold")}`}
        onClick={() => {
          if (lp.consumed()) return;
          onToggle(it.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onInfo(it.id, boxRef.current?.getBoundingClientRect());
        }}
        {...lp.handlers}
      >
        {photo ? (
          <>
            <img className="ph-img" src={src!} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />
            <span className="tm tm-top">{time}</span>
            <span className="cap">
              <span className="nm">{it.name}</span>
              <span className={"gn " + g.c}>{g.t}</span>
            </span>
          </>
        ) : (
          <>
            <span className="nm">{it.name}</span>
            <span className={"gn " + g.c}>{g.t}</span>
            <span className="tm">{time}</span>
          </>
        )}
      </button>
      {warn && (
        <span className="warn" role="img" aria-label={t("overlap")}>
          ⚠
        </span>
      )}
    </div>
  );
}

export function Timetable({ day, sel, warn, showGenre, onToggle, onInfo }: Props) {
  const colH = TOTAL * PPM + "px";
  return (
    <div className={"grid" + (showGenre ? "" : " nogenre")} style={{ "--ppm": PPM + "px", "--n": STAGES.length } as CSSProperties}>
      <div className="axis" style={{ height: colH }}>
        {hours.map((m) => (
          <span key={m} style={{ top: m * PPM + "px" }}>
            {fmt(m)}
          </span>
        ))}
      </div>
      {STAGES.map((st, si) => (
        <div key={st.key} className="col" style={{ height: colH }}>
          {ITEMS.filter((it) => it.day === day.id && it.si === si).map((it) => {
            const on = sel.has(it.id);
            return <Block key={it.id} it={it} st={st} on={on} warn={on && warn.has(it.id)} onToggle={onToggle} onInfo={onInfo} />;
          })}
        </div>
      ))}
    </div>
  );
}
