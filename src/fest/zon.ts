// ZONNAFE(존나페) 2026 · 이태원 JACKS BAR 일대 · 11/14(토) 15:00 – 다음 날 05:00
// 출처: 주최측이 준 타임테이블 엑셀(시각) + 공식 타임테이블 이미지(무대 순서, 한 칸에 두 팀인 곳). 2026-11-11 기준.
// 자정을 넘는 시각은 "24:15", "28:30"처럼 24를 넘겨 쓴다 (화면에는 00:15, 04:30으로 나온다).
// 한 칸에 두 팀(JOODY & RVNBAEK, MINIMONSTER & CCHEKOZ)은 공식 이미지 표기를 따랐다 (엑셀에는 앞 팀만 있음). id·사진·영상은 앞 팀 것.
import { rows, type FDay, type FItem, type FStage } from "./types";
import { ZON_DESIGNATED } from "./zonGenres";

export const ZON_DAYS: FDay[] = [{ id: "sat", date: "2026-11-14", short: "11/14 SAT", label: { ko: "11.14 토", en: "Sat 11/14", ja: "11/14 土", zh: "11/14 周六" } }];

/** 무대 순서는 공식 타임테이블 이미지 순서. 색은 FestLock이 정한 구분용 색(공식 색 아님) */
export const ZON_STAGES: FStage[] = [
  { key: "edc", name: "EDC마트", color: "#ffcf33", ink: "#2a1c00" },
  { key: "cream", name: "크림빵", color: "#5ad1ff", ink: "#04202e" },
  { key: "tml", name: "투머치랜드", color: "#ff5a45", ink: "#2a0500" },
  { key: "coch", name: "코칠라", color: "#ff8fc7", ink: "#33051c" },
  { key: "dfq", name: "돼프콘", color: "#b891ff", ink: "#170433" },
  { key: "awk", name: "오~웨이크닝스", color: "#3ee0a1", ink: "#032417" },
  { key: "kd", name: "경동나비앤", color: "#ff9a3d", ink: "#2e1300" },
];

/** 무대별 장르 (주최측 엑셀의 메모) */
export const ZON_GENRE: Record<string, string> = { edc: "HOUSE", cream: "TRANCE", tml: "EDM", coch: "LIVE", dfq: "BASS", awk: "TECHNO", kd: "DEEP" };

const ZON_BASE: FItem[] = [
  ...rows("sat", "edc", [
    ["16:45", "17:30", "fiore", "FIORE", "FIORE"],
    ["17:30", "18:15", "kei", "KEI", "KEI"],
    ["18:15", "19:00", "hao", "HAO", "HAO"],
    ["19:00", "19:45", "moeuv", "MOEUV", "MOEUV"],
    ["19:45", "20:30", "vincan", "VINCAN", "VINCAN"],
    ["20:30", "21:15", "ginjo", "GINJO", "GINJO"],
    ["21:15", "22:00", "grace-kim", "GRACE KIM", "GRACE KIM"],
    ["22:00", "22:45", "mushxxx", "MUSHXXX", "MUSHXXX"],
    ["22:45", "23:30", "better", "BETTER", "BETTER"],
    ["23:30", "24:15", "juntaro", "JUNTARO", "JUNTARO"],
    ["24:15", "25:00", "sielo", "SIELO", "SIELO"],
    ["25:00", "25:45", "minji", "MINJI", "MINJI"],
    ["25:45", "26:30", "taesco", "TAESCO", "TAESCO"],
    ["26:30", "27:15", "pierre-blanche", "PIERRE BLANCHE", "PIERRE BLANCHE"],
    ["27:15", "28:00", "ybt", "Y.B.T", "Y.B.T"],
  ]),
  ...rows("sat", "cream", [
    ["18:40", "19:30", "loco-soound", "LOCO SOOUND", "LOCO SOOUND"],
    ["19:30", "20:20", "dpole", "DPOLE", "DPOLE"],
    ["20:20", "21:10", "rubato", "RUBATO", "RUBATO"],
    ["21:10", "22:00", "lilygarden", "LILYGARDEN", "LILYGARDEN"],
    ["22:00", "22:50", "casepeat", "CASEPEAT", "CASEPEAT"],
    ["22:50", "23:40", "izreal", "IZREAL", "IZREAL"],
    ["23:40", "24:30", "kataploks", "KATAPLOKS", "KATAPLOKS"],
    ["24:30", "25:20", "onseal", "ONSEAL", "ONSEAL"],
    ["25:20", "26:10", "half-step", "HALF STEP", "HALF STEP"],
    ["26:10", "27:00", "jamjari", "JAMJARI", "JAMJARI"],
    ["27:00", "27:50", "miniverse", "MINIVERSE", "MINIVERSE"],
    ["27:50", "28:30", "weback", "WEBACK", "WEBACK"],
  ]),
  ...rows("sat", "tml", [
    ["15:00", "15:45", "flash-finger", "FLASH FINGER", "FLASH FINGER"],
    ["15:45", "16:30", "ceejay", "CEEJAY", "CEEJAY"],
    ["16:30", "17:15", "8train", "8TRAIN", "8TRAIN"],
    ["17:15", "18:00", "zb", "ZB", "ZB"],
    ["18:00", "18:45", "beom", "BEOM", "BEOM"],
    ["18:45", "19:30", "ak", "AK", "AK"],
    ["19:30", "20:15", "ari", "ARI", "ARI"],
    ["20:15", "21:00", "joody", "JOODY & RVNBAEK", "JOODY & RVNBAEK"],
    ["21:00", "21:45", "vandal-rock", "VANDAL ROCK", "VANDAL ROCK"],
    ["21:45", "22:30", "jeb", "J.E.B", "J.E.B"],
    ["22:30", "23:15", "oing", "OING", "OING"],
    ["23:15", "24:00", "pure-100", "PURE 100%", "PURE 100%"],
    ["24:00", "24:45", "juncoco", "JUNCOCO", "JUNCOCO"],
    ["24:45", "25:30", "inside-core", "INSIDE CORE", "INSIDE CORE"],
    ["25:30", "26:15", "yuka", "YUKA", "YUKA"],
    ["26:15", "27:00", "kindergarten", "KINDERGARTEN", "KINDERGARTEN"],
    ["27:00", "27:45", "zuin", "ZUIN", "ZUIN"],
    ["27:45", "28:30", "hb", "HB", "HB"],
    ["28:30", "29:00", "bagagee-viphex13", "BAGAGEE VIPHEX13", "BAGAGEE VIPHEX13"],
  ]),
  ...rows("sat", "coch", [
    ["16:45", "17:15", "strange1", "STRANGE1", "STRANGE1"],
    ["17:15", "18:15", "wish", "WISH", "WISH"],
    ["18:15", "18:45", "valssa", "VALSSA", "VALSSA"],
    ["18:45", "19:45", "narsis", "NARSIS", "NARSIS"],
    ["19:45", "20:45", "san-ha", "SAN HA", "SAN HA"],
    ["20:45", "21:30", "caleb", "CALEB", "CALEB"],
    ["21:30", "22:15", "dj-ap", "DJ AP", "DJ AP"],
    ["22:15", "23:00", "dj-tezz", "DJ TEZZ", "DJ TEZZ"],
    ["23:00", "23:30", "chun-haeun", "천하은", "CHUN HAEUN"],
    ["23:30", "24:00", "18crew", "18CREW", "18CREW"],
    ["24:00", "24:30", "jakkeychan", "JAKKEYCHAN", "JAKKEYCHAN"],
    ["24:30", "25:00", "dj-it", "DJ IT", "DJ IT"],
    ["25:00", "25:45", "sky", "SKY", "SKY"],
    ["25:45", "26:30", "real-hyunsong", "REAL HYUNSONG", "REAL HYUNSONG"],
    ["26:30", "27:15", "aircon", "AIRCON", "AIRCON"],
  ]),
  ...rows("sat", "dfq", [
    ["16:15", "17:00", "hustlexhen", "HUSTLEXHEN", "HUSTLEXHEN"],
    ["17:00", "17:45", "dal-bong", "DAL BONG", "DAL BONG"],
    ["17:45", "18:30", "katapii", "KATAPII", "KATAPII"],
    ["18:30", "19:15", "xpider", "(X)PIDER", "(X)PIDER"],
    ["19:15", "20:00", "hardnendz", "HARDNENDZ", "HARDNENDZ"],
    ["20:00", "20:45", "minimonster", "MINIMONSTER & CCHEKOZ", "MINIMONSTER & CCHEKOZ"],
    ["20:45", "21:30", "hiyoh", "HIYOH", "HIYOH"],
    ["21:30", "22:15", "augments", "AUGMENTS", "AUGMENTS"],
    ["22:15", "23:00", "daizy", "DAIZY", "DAIZY"],
    ["23:00", "23:45", "hime-isnotdead", "HIME ISNOTDEAD", "HIME ISNOTDEAD"],
    ["23:45", "24:30", "roha", "ROHA", "ROHA"],
    ["24:30", "25:15", "cream", "CREAM", "CREAM"],
    ["25:15", "26:00", "riran", "RIRAN", "RIRAN"],
    ["26:00", "26:45", "zayda", "ZAYDA", "ZAYDA"],
    ["26:45", "27:30", "ssombo", "SSOMBO", "SSOMBO"],
    ["27:30", "28:15", "basskrap", "BASSKRAP", "BASSKRAP"],
  ]),
  ...rows("sat", "awk", [
    ["15:00", "16:00", "ping-pong", "PING PONG", "PING PONG"],
    ["16:00", "17:00", "greennavy", "GREENNAVY", "GREENNAVY"],
    ["17:00", "18:00", "king", "KING", "KING"],
    ["18:00", "19:00", "voidrover", "VOIDROVER", "VOIDROVER"],
    ["19:00", "20:00", "zi-zero", "ZI-ZERO", "ZI-ZERO"],
    ["20:00", "21:00", "kim-dongsun", "KIM DONGSUN", "KIM DONGSUN"],
    ["21:00", "21:45", "kim-qna", "KIM.QNA", "KIM.QNA"],
    ["21:45", "22:30", "zomdol", "ZOMDOL", "ZOMDOL"],
    ["22:30", "23:15", "g1kim", "G1KIM", "G1KIM"],
    ["23:15", "24:00", "songpancake", "SONGPANCAKE", "SONGPANCAKE"],
    ["24:00", "24:45", "soraere-brocken", "SORAERE BROCKEN", "SORAERE BROCKEN"],
    ["24:45", "25:30", "blancat", "BLANCAT", "BLANCAT"],
    ["25:30", "26:15", "stann-lumo", "STANN LUMO", "STANN LUMO"],
    ["26:15", "27:00", "jade", "JADE", "JADE"],
    ["27:00", "27:45", "sophi", "SOPHI", "SOPHI"],
    ["27:45", "28:30", "jvvn", "JVVN", "JVVN"],
  ]),
  ...rows("sat", "kd", [
    ["17:00", "18:00", "adroit-joe", "ADROIT JOE", "ADROIT JOE"],
    ["18:00", "19:00", "leesoongan", "LEESOONGAN", "LEESOONGAN"],
    ["19:00", "20:00", "superfly", "SUPERFLY", "SUPERFLY"],
    ["20:00", "21:00", "edgsnd", "EDGSND", "EDGSND"],
    ["21:00", "22:00", "puf", "PUF", "PUF"],
    ["22:00", "23:00", "yh", "YH", "YH"],
    ["23:00", "24:00", "honn", "HONN", "HONN"],
    ["24:00", "25:00", "funkin-cat", "FUNKIN CAT", "FUNKIN CAT"],
    ["25:00", "26:00", "dj-bowlcut", "DJ BOWLCUT", "DJ BOWLCUT"],
    ["26:00", "27:00", "coral-the-animal", "CORAL THE ANIMAL", "CORAL THE ANIMAL"],
  ]),
];

/**
 * 두 명이서 하는 공연: 시간표·배경화면에는 두 사람을 합친 사진({id}.webp)을, 아티스트 창에는 사진 두 장({id}-1, {id}-2)을 각각 보여 준다.
 * 사진 만드는 법: docs/ADD-FESTIVAL.md 3단계. 아래 id 는 라인업 표의 id 와 같다 (사진 파일 이름 = faces-src/zon/{id}-1.webp)
 */
const ZON_DUO = ["joody", "minimonster"];
// 지정장르(zonGenres.ts)도 여기서 붙인다: 시간표 칸에는 이름 아래 한 줄(길면 …), 아티스트 창에는 전체
export const ZON_ITEMS: FItem[] = ZON_BASE.map((i) => ({ ...i, genre: ZON_DESIGNATED[i.id], ...(ZON_DUO.includes(i.id) ? { duo: [i.id + "-1", i.id + "-2"] as [string, string] } : {}) }));
