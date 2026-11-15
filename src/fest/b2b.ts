// B2B(두 사람이 번갈아 트는 한 칸)의 사진 규칙.
//  1) 처음부터 두 사람이 함께 찍힌 사진이 있으면 그 사진을 그대로 쓴다 (아래 목록에 넣지 않는다).
//  2) 두 사람 사진이 따로 있으면(준비된 칸 = B2B_READY):
//     · 3 미니멀 · 5 글라스 잠금화면 · 7 터미널 레이브: 프로필 사진 두 장을 붙여서 보여 준다
//     · 나머지(1 포스터 · 2 포토 글라스 · 4 듀오톤 · 6 폴라로이드 · 8 모노 포토): 두 사람 누끼를 나란히 붙인 이미지를 쓴다
//  3) 사진이 한 사람 것뿐이거나 없으면 기존처럼 있는 사진 한 장(또는 이니셜)만 쓴다.
// 파일은 사진 저장소(Blob)의 artists/<fest>/b2b/<id>-a.webp · <id>-b.webp(프로필) · <id>-cut.webp(누끼 두 명 합성).
// 만드는 법: scripts/make-b2b.mjs 가 만들고 올린 뒤, 이 목록에 id 를 넣어 준다 (스크립트가 자동으로 넣는다).
import { faceSrc } from "../config";
import type { FItem } from "./types";

/** 두 사람 사진·누끼가 준비돼 저장소에 올라간 B2B 칸 (페스티벌별 id). make-b2b.mjs 가 이 줄들을 고친다. */
// B2B_READY:BEGIN
export const B2B_READY: Record<string, Set<string>> = {
  tml: new Set<string>(["eli-and-fur-b2b-yotto", "ferry-corsten-b2b-marsh", "amber-broos-b2b-space-92", "dj-boring-b2b-luuk-van-dijk", "blastoyz-b2b-whiteno1se", "mad-maxx-b2b-stryker", "kevin-de-vries-b2b-morten", "artbat-b2b-r3hab", "ameme-b2b-honeyluv", "joris-voorn-b2b-krystal-klear"]),
  vac: new Set<string>([]),
};
// B2B_READY:END

export interface B2bSrc {
  a: string;
  b: string;
  cut: string;
}

/** 이 칸이 "두 사람 사진 준비됨"이면 사진 주소들, 아니면 null */
export function b2bOf(fest: string, id: string): B2bSrc | null {
  if (!B2B_READY[fest]?.has(id)) return null;
  const a = faceSrc(`${fest}/b2b/${id}-a`), b = faceSrc(`${fest}/b2b/${id}-b`), cut = faceSrc(`${fest}/b2b/${id}-cut`);
  return a && b && cut ? { a, b, cut } : null;
}

/** 아티스트 창용 얼굴 id: "<id>-a" / "<id>-b" 가 준비된 B2B 칸의 것이면 사진 주소를 돌려준다 (faces.ts 가 쓴다) */
export function b2bFaceSrc(fest: string, id: string): string | null {
  const m = /^(.+)-([ab])$/.exec(id);
  return m && B2B_READY[fest]?.has(m[1]) ? faceSrc(`${fest}/b2b/${id}`) : null;
}

/** 준비된 B2B 칸에 아티스트 창용 사진 두 장(duo)을 달아 준다 */
export function withB2bDuo(fest: string, items: FItem[]): FItem[] {
  const ready = B2B_READY[fest];
  if (!ready || ready.size === 0) return items;
  return items.map((i) => (ready.has(i.id) && !i.duo ? { ...i, duo: [i.id + "-a", i.id + "-b"] as [string, string] } : i));
}
