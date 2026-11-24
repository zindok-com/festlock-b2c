// VAC · Vision & Colour Music Festival 2026 · 중국 광둥 헝친 (长隆横琴湾酒店 5号停车场) · 11/28(토) – 11/29(일) (중국 현지 시각, UTC+8)
// 출처: 주최측 공식 타임테이블 이미지 (2026-11-24 대표 전달 — MAIN·STAGE 2·STAGE 3, 날마다 무대 이름이 다름). 시각은 표에 적힌 그대로다.
// 사진: faces-src/vac → Blob artists/vac/<id>.webp (ownPhotos.ts). DJ SALLY 는 TML 사진, LEVITY 는 다른 페스티벌 사진(faceAlias). ACTING·BETO·X X X 는 인터넷에 사진이 없어 이니셜 (2026-11-24 대표 확인). 영상은 drops.json. 장르는 vacGenres.ts (추정, 모르는 아티스트는 비워 둔다).
import { withB2bDuo } from "./b2b";
import { rows, type FDay, type FItem, type FStage } from "./types";
import { VAC_GENRES } from "./vacGenres";

export const VAC_DAYS: FDay[] = [
  { id: "sat", date: "2026-11-28", short: "11/28 SAT", utc: 8, label: { ko: "11.28 토", en: "Sat 11/28", ja: "11/28 土", zh: "11/28 周六", zht: "11/28 週六", es: "sáb 28 nov", vi: "T7 28/11", th: "ส. 28 พ.ย.", id: "Sab 28 Nov" } },
  { id: "sun", date: "2026-11-29", short: "11/29 SUN", utc: 8, label: { ko: "11.29 일", en: "Sun 11/29", ja: "11/29 日", zh: "11/29 周日", zht: "11/29 週日", es: "dom 29 nov", vi: "CN 29/11", th: "อา. 29 พ.ย.", id: "Min 29 Nov" } },
];

/** 무대 순서는 공식 SET TIMES 이미지 순서. 색은 FestLock이 정한 구분용 색(공식 색 아님) */
export const VAC_STAGES: FStage[] = [
  { key: "main", name: "MAIN STAGE", color: "#ffcf5a", ink: "#2a1c00" },
  { key: "s2", name: "STAGE 2", color: "#6ff0c0", ink: "#032016" },
  { key: "s3", name: "STAGE 3", color: "#9fb7ff", ink: "#0a1233" },
];

/** 무대 이름 줄 아래 작은 글씨: 날마다 다른 공식 무대 이름 (2026-11-24 공식 타임테이블) */
export const VAC_GENRE: Record<string, Record<string, string>> = {
  sat: { main: "VAC STAGE", s2: "HOUSE STAGE", s3: "HARD DANCE STAGE" },
  sun: { main: "VAC STAGE", s2: "BASS STAGE", s3: "DEEP STAGE" },
};

const VAC_BASE: FItem[] = [
  ...rows("sat", "main", [
    ["14:00", "14:45", "acting", "ACTING", "ACTING"],
    ["14:45", "15:45", "sarah-de-warren", "SARAH DE WARREN", "SARAH DE WARREN"],
    ["15:45", "16:45", "dj-sally", "DJ SALLY", "DJ SALLY"],
    ["16:45", "17:45", "joa", "JOA", "JOA"],
    ["17:50", "19:05", "above-and-beyond", "ABOVE & BEYOND", "ABOVE & BEYOND"],
    ["19:05", "19:15", "heineken-moment-sat", "HEINEKEN® MOMENT", "HEINEKEN® MOMENT"],
    ["19:15", "20:15", "isoxo-b2b-boys-noize", "ISOXO B2B BOYS NOIZE", "ISOXO B2B BOYS NOIZE"],
    ["20:30", "21:30", "dj-snake-b2b-knock2", "DJ SNAKE B2B KNOCK2", "DJ SNAKE B2B KNOCK2"],
    ["21:30", "22:30", "dj-snake", "DJ SNAKE", "DJ SNAKE"],
  ]),
  ...rows("sat", "s2", [
    ["14:00", "14:55", "ezhk-sat", "EZHK", "EZHK"],
    ["14:55", "15:55", "dj-nela", "DJ NELA", "DJ NELA"],
    ["15:55", "16:55", "dreya-v", "DREYA V", "DREYA V"],
    ["16:55", "17:55", "gudfella", "GUDFELLA", "GUDFELLA"],
    ["17:55", "18:55", "cid", "CID", "CID"],
    ["18:55", "19:55", "kream", "KREAM", "KREAM"],
    ["20:00", "21:15", "chris-lorenzo", "CHRIS LORENZO", "CHRIS LORENZO"],
  ]),
  ...rows("sat", "s3", [
    ["14:00", "14:30", "imnotduke", "IMNOTDUKE", "IMNOTDUKE"],
    ["14:30", "15:10", "beto", "BETO", "BETO"],
    ["15:10", "15:50", "aryue", "ARYUE", "ARYUE"],
    ["15:50", "16:50", "showhands", "SHØWHANDS", "SHØWHANDS"],
    ["16:50", "17:50", "conrad-taylor", "CONRAD TAYLOR", "CONRAD TAYLOR"],
    ["17:50", "18:50", "junkie-kid", "JUNKIE KID", "JUNKIE KID"],
    ["18:55", "19:55", "charlie-sparks", "CHARLIE SPARKS", "CHARLIE SPARKS"],
    ["20:00", "21:15", "reinier-zonneveld", "REINIER ZONNEVELD", "REINIER ZONNEVELD"],
  ]),
  ...rows("sun", "main", [
    ["14:00", "14:30", "eddie", "EDDIE", "EDDIE"],
    ["14:30", "15:25", "martin-jensen", "MARTIN JENSEN", "MARTIN JENSEN"],
    ["15:25", "16:20", "olly-james", "OLLY JAMES", "OLLY JAMES"],
    ["16:20", "17:20", "meguru", "MEGURU", "MEGURU"],
    ["17:20", "18:20", "cash-cash", "CASH CASH", "CASH CASH"],
    ["18:25", "19:25", "worship", "WORSHIP", "WORSHIP"],
    ["19:25", "19:35", "heineken-moment-sun", "HEINEKEN® MOMENT", "HEINEKEN® MOMENT"],
    ["19:35", "20:50", "alesso", "ALESSO", "ALESSO"],
    ["20:55", "22:25", "dom-dolla", "DOM DOLLA", "DOM DOLLA"],
    ["22:25", "22:30", "ending-show", "ENDING SHOW", "ENDING SHOW"],
  ]),
  ...rows("sun", "s2", [
    ["14:00", "14:30", "alltika", "ALLTIKA", "ALLTIKA"],
    ["14:30", "15:15", "tiya", "TIYA", "TIYA"],
    ["15:15", "16:15", "roy-knox", "ROY KNOX", "ROY KNOX"],
    ["16:15", "17:15", "skybreak", "SKYBREAK", "SKYBREAK"],
    ["17:15", "18:15", "last-heroes", "LAST HEROES", "LAST HEROES"],
    ["18:15", "19:15", "ydg", "YDG", "YDG"],
    ["19:15", "20:15", "nghtmre", "NGHTMRE", "NGHTMRE"],
    ["20:15", "21:15", "levity", "LEVITY", "LEVITY"],
  ]),
  ...rows("sun", "s3", [
    ["14:00", "14:30", "guoguo-b2b-shadows", "GUOGUO B2B SHADOWS", "GUOGUO B2B SHADOWS"],
    ["14:30", "15:00", "ezhk-sun", "EZHK", "EZHK"],
    ["15:00", "16:00", "x-x-x", "X X X", "X X X"],
    ["16:00", "17:00", "whybeatz", "WHYBEATZ", "WHYBEATZ"],
    ["17:00", "18:00", "embrz", "EMBRZ", "EMBRZ"],
    ["18:00", "19:00", "shallou", "SHALLOU", "SHALLOU"],
    ["19:05", "20:05", "yotto", "YOTTO", "YOTTO"],
    ["20:15", "21:15", "kasablanca", "KASABLANCA", "KASABLANCA"],
  ]),
];

/** 공연이 아니라 행사 순서인 칸 (사진·장르 없이 EVENT 로 보여 준다) */
const VAC_EVENTS = new Set(["heineken-moment-sat", "heineken-moment-sun", "ending-show"]);

export const VAC_ITEMS: FItem[] = withB2bDuo("vac", VAC_BASE.map((i) => {
  if (VAC_EVENTS.has(i.id)) return { ...i, kind: "event" as const };
  const g = VAC_GENRES[i.id.replace(/-(sat|sun)$/, "")];
  return g ? { ...i, genre: g.g, ...(g.conf === "inferred" ? { genreConf: "inferred" as const } : {}) } : i;
}));
