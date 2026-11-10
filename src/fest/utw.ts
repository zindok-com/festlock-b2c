// ULTRA TAIWAN 2026 · 台北 大佳河濱公園 · 11/14(토) 12:00 – 22:00 (현지 시각, UTC+8)
// 출처: 주최측 공식 "SET TIMES" 이미지(시작 시각) + 공식 라인업 포스터. 2026-11-11 기준.
// 공식 표에는 시작 시각만 있다. 끝나는 시각은 같은 무대의 다음 공연 시작(마지막은 22:00 폐장)으로 추정해서 "~"로 적었다 (화면에는 "12:00 –"로 나온다).
// 사진: 사용자가 모은 홍보 사진 15장 (faces-src/utw → Blob artists/utw/). 영상은 없다.
import { rows, type FDay, type FItem, type FStage } from "./types";
import { UTW_GENRES } from "./utwGenres";

export const UTW_DAYS: FDay[] = [{ id: "sat", date: "2026-11-14", short: "11/14 SAT", utc: 8, label: { ko: "11.14 토", en: "Sat 11/14", ja: "11/14 土", zh: "11/14 周六" } }];

/** 무대 순서는 공식 SET TIMES 이미지 순서. 색은 FestLock이 정한 구분용 색(공식 색 아님) */
export const UTW_STAGES: FStage[] = [
  { key: "main", name: "MAIN STAGE", color: "#3fd6ff", ink: "#021824" },
  { key: "res", name: "RESISTANCE", color: "#ff9a2e", ink: "#2a1300" },
];

/** 무대 이름 줄 아래 작은 글씨 (RESISTANCE = Ultra의 하우스·테크노 브랜드) */
export const UTW_GENRE: Record<string, string> = { main: "EDM", res: "HOUSE · TECHNO" };

const UTW_BASE: FItem[] = [
  ...rows("sat", "main", [
    ["12:00", "~12:45", "ashleybaby", "ASHLEYBABY", "ASHLEYBABY"],
    ["12:45", "~13:30", "alyshia", "ALYSHIA", "ALYSHIA"],
    ["13:30", "~14:35", "mykris", "MYKRIS", "MYKRIS"],
    ["14:35", "~15:40", "halo", "HALŌ", "HALŌ"],
    ["15:40", "~16:45", "levity", "LEVITY", "LEVITY"],
    ["16:45", "~18:05", "yousuke-yukimatsu", "YOUSUKE YUKIMATSU", "YOUSUKE YUKIMATSU"],
    ["18:05", "~19:25", "bunt", "BUNT.", "BUNT."],
    ["19:25", "~20:45", "sebastian-ingrosso", "SEBASTIAN INGROSSO", "SEBASTIAN INGROSSO"],
    ["20:45", "~22:00", "alan-walker", "ALAN WALKER", "ALAN WALKER"],
  ]),
  ...rows("sat", "res", [
    ["12:00", "~13:15", "veena", "VEENA", "VEENA"],
    ["13:15", "~14:30", "omara-212", "212 OMARA", "212 OMARA"],
    ["14:30", "~16:00", "lynne", "LYNNE", "LYNNE"],
    ["16:00", "~18:00", "chris-avantgarde", "CHRIS AVANTGARDE", "CHRIS AVANTGARDE"],
    ["18:00", "~20:00", "korolova", "KOROLOVA", "KOROLOVA"],
    ["20:00", "~22:00", "camelphat", "CAMELPHAT", "CAMELPHAT"],
  ]),
];

// 검색으로 찾은 장르(utwGenres.ts)를 붙인다: 시간표 칸에는 이름 아래 한 줄(길면 …), 아티스트 창에는 전체
export const UTW_ITEMS: FItem[] = UTW_BASE.map((i) => {
  const g = UTW_GENRES[i.id];
  return g ? { ...i, genre: g.g, ...(g.conf === "inferred" ? { genreConf: "inferred" as const } : {}) } : i;
});
