// ULTRA TAIWAN 2026 아티스트 장르 — 사용자 요청으로 웹 검색해서 정리 (2026-11-11). 주최측이 정해 준 장르가 아니다.
// conf "inferred" = 한두 곳에서만 확인되었거나 같은 이름의 다른 아티스트일 수 있어 추정 (화면에 "~"가 앞에 붙는다).
// 장르가 없는 아티스트는 칸에 장르를 표시하지 않는다 (지어내지 않는다).
//
//  alan-walker         progressive house / electro house        Wikipedia, Goout, DJ Mag
//  sebastian-ingrosso  progressive house / electro house        Wikipedia
//  bunt                stutter house (사용자 정정, 2026-11-11. 검색에서는 folk house / electronic folk 로 나왔음)
//  yousuke-yukimatsu   genre-fluid: techno·gabber·trance·house  Mixmag, DJ Mag, Exit Festival
//  levity              dubstep / bass (trap·future bass 영향)    EDM 매체·음원 사이트 프로필
//  halo                progressive house (Third Party·Dubvision·Matisse & Sadko)   ArtistRack
//  mykris              EDM (Ultra 레지던트)                       Frontstage Festivals, EDM Nomad
//  alyshia             electronic / dance (타이완)               Viberate, Amsterdam Dance Event
//  ashleybaby          house / tech house (타이완)               Viberate 한 곳만 → 추정
//  omara-212           (검색 결과 없음 → 표시 안 함)
//  lynne               techno / experimental (Tokyo의 Lynne 프로필과 일치 여부 미확인) → 추정
//  veena               big room / progressive house (타이완)      EDM House Network 한 곳만 → 추정
//  chris-avantgarde    melodic techno                           When We Dip, 다수 프로필
//  camelphat           tech house / melodic house & techno      EDM Encyclopedia 등
//  korolova            melodic techno / progressive house       Wikipedia, DJ Mag
export interface UtwGenre {
  g: string;
  conf?: "inferred";
}

export const UTW_GENRES: Record<string, UtwGenre> = {
  "alan-walker": { g: "PROGRESSIVE HOUSE · ELECTRO HOUSE" },
  "sebastian-ingrosso": { g: "PROGRESSIVE HOUSE · ELECTRO HOUSE" },
  bunt: { g: "STUTTER HOUSE" },
  "yousuke-yukimatsu": { g: "TECHNO · GABBER · GENRE-FLUID" },
  levity: { g: "DUBSTEP · BASS" },
  halo: { g: "PROGRESSIVE HOUSE" },
  mykris: { g: "EDM" },
  alyshia: { g: "ELECTRONIC · DANCE" },
  ashleybaby: { g: "HOUSE · TECH HOUSE", conf: "inferred" },
  lynne: { g: "TECHNO · EXPERIMENTAL", conf: "inferred" },
  veena: { g: "BIG ROOM · PROGRESSIVE HOUSE", conf: "inferred" },
  "chris-avantgarde": { g: "MELODIC TECHNO" },
  camelphat: { g: "TECH HOUSE · MELODIC HOUSE & TECHNO" },
  korolova: { g: "MELODIC TECHNO · PROGRESSIVE HOUSE" },
};
