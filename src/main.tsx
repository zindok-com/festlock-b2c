import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { LangProvider, useI18n } from "./i18n";
import { findFestival } from "./festivals";
import { PAGES } from "./fest/registry";
import { Home } from "./pages/Home";
import { Soon } from "./pages/Soon";
import { watchBlobHealth } from "./blobHealth";
import { bootOffline } from "./offline";
import { OfflineBadge } from "./components/OfflineBadge";
import "./styles.css";

// 사진·영상(Blob)이 계속 안 불러와지면 서버가 확인하고 운영자 이메일로 알린다 (api/blob-alert.ts)
watchBlobHealth();
// 오프라인으로 쓰기: 연결 상태 표시 · (저장한 적이 있으면) 서비스워커 갱신 (src/offline.ts)
bootOffline();

/** 지연 로딩한 화면 파일을 못 받았을 때(인터넷 끊김 등) */
function ChunkFail() {
  const { t } = useI18n();
  return (
    <div className="wrap band-boot">
      <p>{t("band.chunkFail")}</p>
      <button type="button" className="btn main" onClick={() => location.reload()}>
        {t("band.retry")}
      </button>
    </div>
  );
}
// 나만의 컬렉션 화면은 따로 불러온다(페스티벌 페이지 첫 로딩 용량에 넣지 않으려고)
const BandHub = lazy(() => import("./band/BandHub").catch(() => ({ default: ChunkFail })));
const BandBrowse = lazy(() => import("./band/BandBrowse").catch(() => ({ default: ChunkFail })));
const BandCollector = lazy(() => import("./band/BandCollector").catch(() => ({ default: ChunkFail })));

// 주소별 화면: / → FestLock 메인, /collection → 나만의 컬렉션(전체 화면 3D), /collection/browse → 다른 사람들의 컬렉션 목록,
// /c/{id} → 한 사람의 팔찌 컬렉션(전체 화면 3D),
// /{slug} → festivals.json의 "page"가 가리키는 화면.
// 라인업이 아직 없거나(ready: false) 화면이 등록되지 않은 페스티벌 → 준비 중 페이지
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const collectorId = /^\/c\/([^/]+)$/.exec(path)?.[1];
const band = path === "/collection" || path === "/collection/browse" || collectorId !== undefined;
const fest = path === "/" || band ? undefined : findFestival(path);

let page = <Home />;
let titleKey = "home.docTitle";
if (path === "/collection") {
  page = (
    <Suspense fallback={<div className="wrap band-boot" />}>
      <BandHub />
    </Suspense>
  );
  titleKey = "band.docTitle";
} else if (path === "/collection/browse") {
  page = (
    <Suspense fallback={<div className="wrap band-boot" />}>
      <BandBrowse />
    </Suspense>
  );
  titleKey = "band.docTitle";
} else if (collectorId !== undefined) {
  page = (
    <Suspense fallback={<div className="wrap band-boot" />}>
      <BandCollector id={collectorId} />
    </Suspense>
  );
  titleKey = "band.c.docTitle";
} else if (fest) {
  const Page = fest.ready && fest.page ? PAGES[fest.page] : undefined;
  if (Page) {
    page = <Page />;
    titleKey = fest.titleKey ?? "home.docTitle";
  } else {
    page = <Soon fest={fest} />;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LangProvider titleKey={titleKey}>
      {page}
      <OfflineBadge />
    </LangProvider>
    {/* 방문자 수·페이지뷰 집계 (Vercel Web Analytics, 쿠키 없음) */}
    <Analytics />
  </StrictMode>,
);
