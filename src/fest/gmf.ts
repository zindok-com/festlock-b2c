// 그랜드 민트 페스티벌 2026 · 올림픽공원 · 공식 타임테이블(10/17, 10/18) 기준
import { rows, t2m, type FDay, type FItem, type FStage, type Kind } from "./types";

export const GMF_DAYS: FDay[] = [
  { id: "sat", date: "2026-10-17", short: "10/17 SAT", label: { ko: "10.17 토", en: "Sat 10/17", ja: "10/17 土", zh: "10/17 周六", zht: "10/17 週六" } },
  { id: "sun", date: "2026-10-18", short: "10/18 SUN", label: { ko: "10.18 일", en: "Sun 10/18", ja: "10/18 日", zh: "10/18 周日", zht: "10/18 週日" } },
];

export const GMF_STAGES: FStage[] = [
  { key: "mint", name: "MINT BREEZE STAGE", place: "88잔디마당", color: "#2e9c87", ink: "#fffaf0" },
  { key: "club", name: "CLUB MIDNIGHT SUNSET", place: "KSPO DOME", color: "#ee6a55", ink: "#fffaf0" },
  { key: "forest", name: "LOVING FOREST GARDEN", place: "88호수 수변무대", color: "#f38db1", ink: "#3a2533" },
  { key: "radar", name: "RADAR", place: "KSPO DOME–수영장 사이", color: "#a9cdea", ink: "#2c2a3d" },
];

/** 무대별 문 여는 시간 */
export const GMF_DOORS: Record<string, Record<string, string>> = {
  sat: { mint: "11:40", club: "12:20", forest: "12:20" },
  sun: { mint: "11:40", club: "12:00", forest: "12:20" },
};

/** RADAR(토크·이벤트) 칸 색 */
export const KIND_COLOR: Record<Kind, string> = { act: "#a9cdea", talk: "#a9cdea", event: "#e6e4a4", perf: "#cdb1ec" };

function radar(day: string, list: [string, string, Kind, string, string, string[], string?][]): FItem[] {
  return list.map(([a, b, kind, ko, en, w, desc], i) => ({
    id: `radar-${day}-${i + 1}`,
    day,
    stage: "radar",
    ko,
    en,
    s: t2m(a),
    e: t2m(b),
    kind,
    with: w,
    desc,
  }));
}

export const GMF_ITEMS: FItem[] = [
  // ---------- 10/17 SAT ----------
  ...rows("sat", "mint", [
    ["12:20", "13:00", "yeonjeong", "연정", "YEONJEONG"],
    ["13:20", "14:00", "hi-fi-unicorn", "하이파이유니콘", "Hi-Fi Un!corn"],
    ["14:20", "15:10", "jisokuryclub", "지소쿠리클럽", "jisokuryClub"],
    ["15:30", "16:20", "jung-joonil", "정준일", "Jung Joonil"],
    ["16:40", "17:30", "jukjae", "적재", "JUKJAE"],
    ["17:50", "18:40", "peppertones", "페퍼톤스", "PEPPERTONES"],
    ["19:10", "20:10", "chang-kiha", "장기하", "Chang Kiha"],
    ["20:40", "~21:40", "lee-sora", "이소라", "LEE SORA"],
  ]),
  ...rows("sat", "club", [
    ["12:50", "13:20", "futurepeerclub", "퓨처피어클럽", "FuturePeerClub", "bright #15"],
    ["13:40", "14:20", "leaveourtears", "리브아워티어스", "Leaveourtears"],
    ["14:40", "15:30", "owalloil", "오월오일", "OWALLOIL"],
    ["15:50", "16:40", "lacuna", "라쿠나", "Lacuna"],
    ["17:10", "18:00", "car-the-garden", "카더가든", "Car, the garden"],
    ["18:30", "19:30", "redoor", "리도어", "Redoor"],
    ["20:00", "21:00", "touched", "터치드", "TOUCHED"],
    ["21:30", "~22:30", "lee-seung-yoon", "이승윤", "LEE SEUNG YOON"],
  ]),
  ...rows("sat", "forest", [
    ["12:40", "13:20", "confined-white", "컨파인드 화이트", "Confined White"],
    ["13:40", "14:10", "love-is-cycle", "러브이즈사이클", "love is cycle", "bright #15"],
    ["14:30", "15:10", "gonny", "거니", "g0nny"],
    ["15:30", "16:20", "sumin", "수민", "SUMIN"],
    ["16:40", "17:30", "youra", "유라", "youra"],
    ["17:50", "18:40", "aleph", "알레프", "ALEPH"],
    ["19:00", "19:50", "bye-bye-badman", "바이 바이 배드맨", "Bye Bye Badman"],
    ["20:20", "~21:20", "isaac-hong", "홍이삭", "ISAAC HONG"],
  ]),
  ...radar("sat", [
    ["13:40", "14:10", "event", "근접 신호 감지: 사인회", "Signing session", ["yeonjeong"]],
    ["14:40", "15:10", "event", "근접 신호 감지: 사인회", "Signing session", ["hi-fi-unicorn"]],
    ["15:20", "16:10", "talk", "지금이 저점매수", "Talk: bright #15", ["futurepeerclub", "love-is-cycle"], "bright #15 신예 아티스트들을 만나보는 시간"],
    ["16:20", "16:50", "event", "근접 신호 감지: 하이터치&사인회", "Hi-touch & signing", ["owalloil"]],
    ["17:10", "17:40", "event", "근접 신호 감지: 사인회", "Signing session", ["sumin"]],
    ["19:00", "20:00", "talk", "십란 공개방송 특별 생중계", "Live radio show: 10CM x SORAN", ["10cm-x-soran"], "현장에서 직접 만나는 십란 공개방송"],
  ]),

  // ---------- 10/18 SUN ----------
  ...rows("sun", "mint", [
    ["12:20", "12:50", "sanbo", "산보", "Sanbo", "bright #15"],
    ["13:10", "13:50", "shin-in-ryu", "신인류", "Shin In Ryu"],
    ["14:10", "15:00", "dragon-pony", "드래곤포니", "Dragon Pony"],
    ["15:20", "16:10", "bol4", "볼빨간사춘기", "BOL4"],
    ["16:30", "17:20", "jung-seung-hwan", "정승환", "Jung Seung Hwan"],
    ["17:40", "18:30", "roy-kim", "로이킴", "Roy Kim"],
    ["19:00", "20:00", "cnblue", "씨엔블루", "CNBLUE"],
    ["20:30", "~21:30", "younha", "윤하", "YOUNHA"],
  ]),
  ...rows("sun", "club", [
    ["12:40", "13:10", "kwacamolee", "과카몰리", "kwacamolee", "bright #15"],
    ["13:30", "14:10", "lee-oh-wook", "이오욱(LOW)", "Lee Oh Wook (LOW)"],
    ["14:30", "15:20", "onewe", "원위", "ONEWE"],
    ["15:40", "16:30", "far-east-asian-tigers", "극동아시아타이거즈", "Far East Asian Tigers"],
    ["16:50", "17:40", "the-solutions", "솔루션스", "THE SOLUTIONS"],
    ["18:00", "18:50", "n-flying", "엔플라잉", "N.Flying"],
    ["19:20", "20:20", "thornapple", "쏜애플", "THORNAPPLE"],
    ["20:50", "~22:30", "10cm-x-soran", "십란(십센치X소란)", "10CM x SORAN"],
  ]),
  ...rows("sun", "forest", [
    ["12:40", "13:10", "gugu", "구구", "GuGu", "원콩쿨"],
    ["13:30", "14:10", "tokai", "토카이", "Tokai"],
    ["14:30", "15:10", "rothy", "로시", "Rothy"],
    ["15:30", "16:10", "nib-archive", "닙아카이브", "nib.archive"],
    ["16:30", "17:20", "shin-ji-hoon", "신지훈", "Shin Ji Hoon"],
    ["17:40", "18:30", "kachisan", "까치산", "KACHISAN"],
    ["18:50", "19:40", "sunwoojunga", "선우정아", "sunwoojunga"],
    ["20:20", "~21:20", "lee-souk-won", "이석원", "LEE SOUK WON"],
  ]),
  ...radar("sun", [
    ["13:30", "14:20", "talk", "지금이 저점매수", "Talk: bright #15", ["sanbo", "kwacamolee"], "bright #15 신예 아티스트들을 만나보는 시간"],
    ["14:30", "15:00", "event", "근접 신호 감지: 사인회", "Signing session", ["shin-in-ryu"]],
    ["15:10", "16:00", "perf", "삐의 등장! 지엠에삐-쇼", "Balloon art show", [], "진짜 삐에로와 함께하는 풍선아트쇼"],
    ["16:10", "16:40", "event", "근접 신호 감지: 하이터치회", "Hi-touch", ["onewe"]],
    ["17:10", "17:40", "event", "근접 신호 감지: 사인회", "Signing session", ["far-east-asian-tigers"]],
    ["18:00", "18:50", "talk", "라쿠나 복귀 신고합니다", "Live radio show: Lacuna", ["lacuna"], "현장에서 직접 만나는 라쿠나 공개방송"],
  ]),
];
