import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { LangProvider } from "./i18n";
import { findFestival } from "./festivals";
import { PAGES } from "./fest/registry";
import { Home } from "./pages/Home";
import { Soon } from "./pages/Soon";
import { watchBlobHealth } from "./blobHealth";
import "./styles.css";

// 사진·영상(Blob)이 계속 안 불러와지면 서버가 확인하고 운영자 이메일로 알린다 (api/blob-alert.ts)
watchBlobHealth();

// 주소별 화면: / → FestLock 메인, /{slug} → festivals.json의 "page"가 가리키는 화면.
// 라인업이 아직 없거나(ready: false) 화면이 등록되지 않은 페스티벌 → 준비 중 페이지
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const fest = path === "/" ? undefined : findFestival(path);

let page = <Home />;
let titleKey = "home.docTitle";
if (fest) {
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
    <LangProvider titleKey={titleKey}>{page}</LangProvider>
    {/* 방문자 수·페이지뷰 집계 (Vercel Web Analytics, 쿠키 없음) */}
    <Analytics />
  </StrictMode>,
);
