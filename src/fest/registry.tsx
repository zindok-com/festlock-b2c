// festivals.json의 "page" 값 → 실제 화면. 새 화면(레이아웃)을 만들 때만 여기에 한 줄 추가한다.
// 기존 화면을 쓰는 페스티벌은 festivals.json에 항목만 넣으면 된다.
import type { ComponentType } from "react";
import App from "../App";
import { GmfPage } from "./GmfPage";
import { NolPage } from "./NolPage";
import { OrlPage } from "./OrlPage";

export const PAGES: Record<string, ComponentType> = {
  edc: App,
  nol: NolPage,
  gmf: GmfPage,
  orl: OrlPage,
};
