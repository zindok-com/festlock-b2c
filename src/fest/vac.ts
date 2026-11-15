// VAC · Vision & Colour Music Festival 2026 · 중국 광둥 헝친 (长隆横琴湾酒店 5号停车场) · 11/28(토) – 11/29(일) (중국 현지 시각, UTC+8)
// 출처: 주최측 공식 헤드라이너 라인업 포스터 + SET TIMES 이미지 (2026-11-15 기준). 시각은 표에 적힌 그대로다 (TBD = 아직 미발표).
// 사진은 아직 없다 (이니셜 아이콘으로 나온다). 영상은 없다. 장르는 vacGenres.ts (추정, 모르는 아티스트는 비워 둔다).
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

/** 무대 이름 줄 아래 작은 글씨 (공식 표기: 중국어 무대 이름) */
export const VAC_GENRE: Record<string, string> = { main: "主舞台", s2: "第二舞台", s3: "第三舞台" };

const VAC_BASE: FItem[] = [
  ...rows("sat", "main", [
    ["16:15", "17:15", "tbd-main-sat", "TBD", "TBD"],
    ["17:15", "18:15", "joa", "JOA", "JOA"],
    ["18:15", "19:30", "above-and-beyond", "ABOVE & BEYOND", "ABOVE & BEYOND"],
    ["19:30", "20:30", "isoxo-b2b-boys-noize", "ISOXO B2B BOYS NOIZE", "ISOXO B2B BOYS NOIZE"],
    ["20:30", "21:30", "dj-snake-b2b-knock2", "DJ SNAKE B2B KNOCK2", "DJ SNAKE B2B KNOCK2"],
    ["21:30", "22:00", "dj-snake", "DJ SNAKE", "DJ SNAKE"],
    ["22:00", "22:30", "pardon-my-french-finale", "PARDON MY FRENCH FINALE", "PARDON MY FRENCH FINALE"],
  ]),
  ...rows("sat", "s2", [
    ["16:00", "17:00", "tbd-s2-sat", "TBD", "TBD"],
    ["17:00", "18:00", "gudfella", "GUDFELLA", "GUDFELLA"],
    ["18:00", "19:00", "cid", "CID", "CID"],
    ["19:00", "20:00", "chris-lorenzo", "CHRIS LORENZO", "CHRIS LORENZO"],
    ["20:00", "21:15", "beltran", "BELTRAN", "BELTRAN"],
  ]),
  ...rows("sat", "s3", [
    ["17:00", "18:00", "conrad-taylor", "CONRAD TAYLOR", "CONRAD TAYLOR"],
    ["18:00", "19:00", "tbd-s3-sat", "TBD", "TBD"],
    ["19:00", "20:00", "charlie-sparks", "CHARLIE SPARKS", "CHARLIE SPARKS"],
    ["20:00", "21:15", "reinier-zonneveld", "REINIER ZONNEVELD", "REINIER ZONNEVELD"],
  ]),
  ...rows("sun", "main", [
    ["15:45", "16:45", "olly-james", "OLLY JAMES", "OLLY JAMES"],
    ["16:45", "17:45", "meguru", "MEGURU", "MEGURU"],
    ["17:45", "18:45", "cash-cash", "CASH CASH", "CASH CASH"],
    ["18:45", "19:45", "worship", "WORSHIP", "WORSHIP"],
    ["19:45", "21:00", "alesso", "ALESSO", "ALESSO"],
    ["21:15", "22:45", "dom-dolla", "DOM DOLLA", "DOM DOLLA"],
  ]),
  ...rows("sun", "s2", [
    ["16:00", "17:00", "skybreak", "SKYBREAK", "SKYBREAK"],
    ["17:00", "18:00", "hol", "HOL!", "HOL!"],
    ["18:00", "19:00", "ydg", "YDG", "YDG"],
    ["19:00", "20:00", "nghtmre", "NGHTMRE", "NGHTMRE"],
    ["20:00", "21:15", "levity", "LEVITY", "LEVITY"],
  ]),
  ...rows("sun", "s3", [
    ["17:00", "18:00", "embrz", "EMBRZ", "EMBRZ"],
    ["18:00", "19:00", "shallou", "SHALLOU", "SHALLOU"],
    ["19:00", "20:00", "yotto", "YOTTO", "YOTTO"],
    ["20:00", "21:15", "kasablanca", "KASABLANCA", "KASABLANCA"],
  ]),
];

export const VAC_ITEMS: FItem[] = withB2bDuo("vac", VAC_BASE.map((i) => {
  const g = VAC_GENRES[i.id.replace(/-(sat|sun)$/, "")];
  return g ? { ...i, genre: g.g, ...(g.conf === "inferred" ? { genreConf: "inferred" as const } : {}) } : i;
}));
