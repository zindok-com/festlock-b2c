// NOL FESTIVAL 2026 · KINTEX 제2전시장 · 스테이지별 공식 타임테이블 기준
// 스테이지마다 티켓이 따로라서, 화면은 스테이지 탭 → 날짜 탭 → 한 줄 타임라인으로 보여준다.
import { rows, type FDay, type FItem, type FStage } from "./types";

export const NOL_DAYS: FDay[] = [
  { id: "sat", date: "2026-10-17", short: "DAY 1 · 10.17 SAT", label: { ko: "DAY 1 · 10.17 토", en: "DAY 1 · Sat 10/17", ja: "DAY 1 · 10/17 土", zh: "DAY 1 · 10/17 周六", zht: "DAY 1 · 10/17 週六" } },
  { id: "sun", date: "2026-10-18", short: "DAY 2 · 10.18 SUN", label: { ko: "DAY 2 · 10.18 일", en: "DAY 2 · Sun 10/18", ja: "DAY 2 · 10/18 日", zh: "DAY 2 · 10/18 周日", zht: "DAY 2 · 10/18 週日" } },
  // 애프터 파티는 17일 밤(22:00~05:00)
  { id: "after", date: "2026-10-17", short: "AFTER PARTY", label: { ko: "AFTER PARTY", en: "AFTER PARTY", ja: "AFTER PARTY", zh: "AFTER PARTY", zht: "AFTER PARTY" } },
];

export interface NolStage extends FStage {
  /** 탭 이름 */
  tab: string;
  /** 페이지 배경 · 포인트 색 */
  bg: string;
  hi: string;
  /** 이 스테이지의 날짜 탭 */
  days: string[];
}

export const NOL_STAGES: NolStage[] = [
  { key: "super", tab: "SUPER LIVE", name: "SUPER LIVE STAGE", place: "HALL 9", color: "#d6f43c", ink: "#14183d", bg: "#3443ee", hi: "#d6f43c", gap: "SET CHANGE", days: ["sat", "sun"] },
  { key: "kpop", tab: "K-POP", name: "K-POP STAGE", place: "HALL 7", color: "#fff3a6", ink: "#3a1606", bg: "#e8562b", hi: "#fff3a6", gap: "BREAK TIME", days: ["sat", "sun"] },
  { key: "edm", tab: "EDM", name: "EDM STAGE", place: "HALL 10", color: "#8cf0f7", ink: "#1d0b45", bg: "#8526ee", hi: "#8cf0f7", gap: "INTERMISSION", days: ["sat", "after"] },
];

export const NOL_ITEMS: FItem[] = [
  // ---------- SUPER LIVE STAGE ----------
  ...rows("sat", "super", [
    ["13:00", "13:30", "daybreak", "데이브레이크", "Daybreak"],
    ["13:50", "14:30", "lee-mujin", "이무진", "Lee Mujin"],
    ["14:50", "15:30", "dynamicduo", "다이나믹 듀오", "Dynamicduo"],
    ["15:50", "16:30", "guckkasten", "국카스텐", "GUCKKASTEN"],
    ["16:40", "17:10", "gummy", "거미", "GUMMY"],
    ["17:30", "18:10", "nell", "넬", "NELL"],
    ["18:30", "19:10", "jaurim", "자우림", "JAURIM"],
    ["19:40", "20:30", "yb", "와이비", "YB"],
    ["21:00", "22:00", "god", "지오디", "god"],
  ]),
  ...rows("sun", "super", [
    ["13:00", "13:15", "choco1-x-choco2", "초코원 X 초코투", "ChoCo1 X ChoCo2"],
    ["13:25", "13:55", "hrtz-wav", "하츠웨이브", "hrtz.wav"],
    ["14:15", "14:55", "ha-sung-woon", "하성운", "HA SUNG WOON"],
    ["15:05", "15:25", "nowimyoung", "나우아임영", "NOWIMYOUNG"],
    ["15:25", "15:45", "haon", "김하온", "HAON"],
    ["16:05", "16:45", "sandara-park", "산다라박", "Sandara Park"],
    ["16:55", "17:15", "street-world-fighter", "스트릿 월드 파이터 : 디렉터스 워", "STREET WORLD FIGHTER : Directors' War"],
    ["17:35", "18:15", "kyuhyun", "규현", "KYUHYUN"],
    ["18:40", "19:30", "woodz", "우즈", "WOODZ"],
    ["19:40", "20:30", "beenzino", "빈지노", "Beenzino"],
    ["21:00", "22:00", "xia", "김준수", "XIA"],
  ]),

  // ---------- K-POP STAGE ----------
  ...rows("sat", "kpop", [
    ["16:00", "16:10", "hype-princess", "하입프린세스", "H//PE Princess"],
    ["16:10", "16:20", "daily-direction", "데일리:디렉션", "DAILY:DIRECTION"],
    ["16:20", "16:30", "close-your-eyes", "클로즈 유어 아이즈", "CLOSE YOUR EYES"],
    ["16:30", "16:40", "lun8", "루네이트", "LUN8"],
    ["16:40", "17:00", "billlie", "빌리", "Billlie"],
    ["17:35", "17:55", "rescene", "리센느", "RESCENE"],
    ["17:55", "18:15", "hearts2hearts", "하츠투하츠", "Hearts2Hearts"],
    ["18:15", "18:30", "82major", "82메이저", "82MAJOR"],
    ["18:30", "18:55", "kiss-of-life", "키스오브라이프", "KISS OF LIFE"],
    ["18:55", "19:20", "kep1er", "케플러", "Kep1er"],
    ["19:20", "19:45", "cravity", "크래비티", "CRAVITY"],
    ["20:20", "20:55", "cortis", "코르티스", "CORTIS"],
    ["21:00", "21:30", "nct-wish", "엔시티 위시", "NCT WISH"],
  ]),
  ...rows("sun", "kpop", [
    ["16:00", "16:10", "keyveatz", "키비츠", "Keyveatz"],
    ["16:10", "16:20", "modyssey", "모디세이", "MODYSSEY"],
    ["16:20", "16:30", "ahof", "아홉", "AHOF"],
    ["16:30", "16:50", "kiiikiii", "키키", "KiiiKiii"],
    ["17:20", "17:40", "izna", "이즈나", "izna"],
    ["17:40", "18:00", "kickflip", "킥플립", "KickFlip"],
    ["18:00", "18:20", "allday-project", "올데이 프로젝트", "ALLDAY PROJECT"],
    ["18:20", "18:40", "alpha-drive-one", "알파드라이브원", "ALPHA DRIVE ONE"],
    ["18:40", "19:00", "meovv", "미야오", "MEOVV"],
    ["19:25", "19:50", "nmixx", "엔믹스", "NMIXX"],
    ["19:50", "20:10", "evan", "에반", "EVAN"],
    ["20:10", "20:35", "ive", "아이브", "IVE"],
    ["20:35", "21:15", "treasure", "트레저", "TREASURE"],
  ]),

  // ---------- EDM STAGE (with WDJF) ----------
  ...rows("sat", "edm", [
    ["14:30", "15:10", "juntaro", "JUNTARO", "JUNTARO"],
    ["15:10", "15:55", "4ura", "4URA", "4URA"],
    ["16:05", "17:05", "retrovision", "RetroVision", "RetroVision"],
    ["17:05", "18:05", "merow", "Merow", "Merow"],
    ["18:10", "19:10", "andy-c", "Andy C", "Andy C"],
    ["19:15", "20:40", "don-diablo", "Don Diablo", "Don Diablo"],
    ["20:45", "22:00", "alan-walker", "Alan Walker", "Alan Walker"],
  ]),
  ...rows("after", "edm", [
    ["22:00", "23:00", "vandal-rock", "Vandal Rock", "Vandal Rock"],
    ["23:00", "24:00", "lucas-and-steve", "Lucas & Steve", "Lucas & Steve"],
    ["24:00", "25:00", "pure-100", "PURE 100%", "PURE 100%"],
    ["25:00", "26:00", "hills", "Hills", "Hills"],
    ["26:00", "27:00", "loozbone", "LOOZBONE", "LOOZBONE"],
    ["27:00", "28:00", "sick-individuals", "Sick Individuals", "Sick Individuals"],
    ["28:00", "29:00", "advanced", "ADVANCED", "ADVANCED"],
  ]),
];
