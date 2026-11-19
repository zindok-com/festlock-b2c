// 나만의 컬렉션 화면 공통 조각: 위 머리줄 · DEMO 배지 · 팔찌 이름 붙이기 · 안내 창
import { type ReactNode } from "react";
import { LangMenu, addDict, useI18n, type Lang } from "../i18n";
import { useBackClose } from "../backClose";
import { FESTIVALS } from "../festivals";
import { BAND_T } from "./strings";
import type { BandDesign } from "./api";
import "./band.css";

// 이 파일을 읽는 순간(화면을 그리기 전) 컬렉션 문구를 사전에 더한다
addDict(BAND_T);

export const FESTLOCK_INSTA = "https://www.instagram.com/festlock/";

/** 홈과 같은 위 머리줄 (가운데 FestLock 로고 → 홈, 오른쪽 언어) */
export function BandTop() {
  return (
    <header className="home-top">
      <a className="brand" href="/" aria-label="FestLock">
        <img src="/event/festlock.webp" alt="" width={22} height={22} />
        <span>
          Fest<b>Lock</b>
        </span>
      </a>
      <LangMenu />
    </header>
  );
}

export function DemoBadge() {
  const { t } = useI18n();
  return (
    <p className="band-demo-row">
      <span className="band-demo">{t("band.demo")}</span>
    </p>
  );
}

/** 페스티벌 이름 (목록에 없으면 주소 이름을 보기 좋게). 이름 끝의 연도는 뺀다 — 연도는 따로 붙인다 */
export function festName(slug: string, lang: Lang): string {
  const f = FESTIVALS.find((x) => x.slug === slug);
  const n = f ? f.name[lang] || f.name.en : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return n.replace(/\s*\b20\d\d\b\s*$/, "") || n;
}

const etc = (s: string) => s.replace(/^etc-/, "").replace(/-/g, " ");
export function gradeLabel(g: string): string {
  return g.startsWith("etc-") ? etc(g) : g.toUpperCase();
}
export function dayLabel(d: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  let m = /^day(\d)$/.exec(d);
  if (m) return t("band.day.n", { n: m[1] });
  m = /^full(\d)$/.exec(d);
  if (m) return t("band.day.full", { n: m[1] });
  return etc(d);
}
/** 화면에 쓰는 이름 한 벌 (이미지 alt 포함) */
export function useBandLabel() {
  const { t, lang } = useI18n();
  return (d: BandDesign) => {
    const fest = festName(d.fest, lang);
    const grade = gradeLabel(d.grade);
    const day = dayLabel(d.day, t);
    return { fest, year: d.year, grade, day, alt: t("band.alt", { fest, year: d.year, grade, day }) };
  };
}

/** 가운데 뜨는 안내 창 (✕·바깥 누르기·뒤로가기로 닫힘) */
export function BandDialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const { t } = useI18n();
  useBackClose(true, onClose);
  return (
    <div className="evt band-dialog" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.target === e.currentTarget && onClose()} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="evt-card band-dialog-card">
        <button type="button" className="band-x" aria-label={t("band.close")} onClick={onClose} autoFocus>
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- 전체 화면 컬렉션(/collection, /c/{id}) 위에 뜨는 버튼들 ---------- */

/** 왼쪽 위: 다른 사람들의 컬렉션 구경하기(/collection/browse) */
export function BrowseButton() {
  const { t } = useI18n();
  return (
    <a className="band-full-btn band-browse-btn" href="/collection/browse" aria-label={t("band.browse.aria")}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16.8" cy="9" r="2.6" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M16.5 14.2c2.2.1 3.7 1.6 4.1 4.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {t("band.browse")}
    </a>
  );
}

/** 왼쪽 위: 동그란 ‹ 버튼 → 홈 */
export function HomeBack() {
  const { t } = useI18n();
  return (
    <a className="band-back-btn" href="/" aria-label={t("band.toHome")}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

/** FestLock 로고 → 홈 */
export function FullLogo() {
  return (
    <a className="band-full-logo" href="/" aria-label="FestLock">
      <img src="/event/festlock.webp" alt="" width={22} height={22} />
      <span>
        Fest<b>Lock</b>
      </span>
    </a>
  );
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** 이 화면 주소 공유: 휴대폰 공유 창 → 안 되면 링크 복사. 결과: shared(공유함) · copied(복사함) · cancel · fail */
export async function shareLink(title: string): Promise<"shared" | "copied" | "cancel" | "fail"> {
  const url = location.origin + location.pathname;
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return "shared";
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "cancel";
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "fail";
  }
}
