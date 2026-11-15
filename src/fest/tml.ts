// TOMORROWLAND THAILAND 2026 "CONSCIENCIA" · Wisdom Valley, Thailand · 12/11(금) – 12/13(일) (태국 현지 시각, UTC+7)
// 출처: 주최측 공식 라인업 포스터 + 3일치 타임테이블 이미지 (2026-11-15 기준).
// 타임테이블 이미지에는 시각 눈금(30분)과 공연 칸만 있어서, 칸의 위·아래 경계 위치를 시각으로 환산하고 5분 단위로 반올림했다.
// 그래서 정확한 시작·끝 시각은 공식 발표와 5~10분 다를 수 있다. 각 공연은 같은 무대의 다음 공연이 시작할 때까지로 적었다.
// 같은 아티스트가 여러 날 나오면 첫 번째는 기본 id, 이후는 -sat / -sun 을 붙인다 (사진·장르는 기본 id 것을 같이 쓴다).
// 사진은 아직 없다 (이니셜 아이콘으로 나온다). 영상은 없다. 장르는 tmlGenres.ts (추정, 모르는 아티스트는 비워 둔다).
import { withB2bDuo } from "./b2b";
import { rows, type FDay, type FItem, type FStage } from "./types";
import { TML_GENRES } from "./tmlGenres";

export const TML_DAYS: FDay[] = [
  { id: "fri", date: "2026-12-11", short: "12/11 FRI", utc: 7, label: { ko: "12.11 금", en: "Fri 12/11", ja: "12/11 金", zh: "12/11 周五", zht: "12/11 週五", es: "vie 11 dic", vi: "T6 11/12", th: "ศ. 11 ธ.ค.", id: "Jum 11 Des" } },
  { id: "sat", date: "2026-12-12", short: "12/12 SAT", utc: 7, label: { ko: "12.12 토", en: "Sat 12/12", ja: "12/12 土", zh: "12/12 周六", zht: "12/12 週六", es: "sáb 12 dic", vi: "T7 12/12", th: "ส. 12 ธ.ค.", id: "Sab 12 Des" } },
  { id: "sun", date: "2026-12-13", short: "12/13 SUN", utc: 7, label: { ko: "12.13 일", en: "Sun 12/13", ja: "12/13 日", zh: "12/13 周日", zht: "12/13 週日", es: "dom 13 dic", vi: "CN 13/12", th: "อา. 13 ธ.ค.", id: "Min 13 Des" } },
];

/** 무대 순서는 공식 타임테이블 이미지 순서. 색은 FestLock이 정한 구분용 색(공식 색 아님) */
export const TML_STAGES: FStage[] = [
  { key: "main", name: "MAINSTAGE", color: "#ffd98a", ink: "#2a1c00" },
  { key: "freedom", name: "FREEDOM BY BUD", color: "#ff8f70", ink: "#2a0d05" },
  { key: "core", name: "CORE", color: "#7fe0c9", ink: "#04221c" },
  { key: "crystal", name: "CRYSTAL GARDEN", color: "#9bb8ff", ink: "#0a1233" },
  { key: "codex", name: "CODEX", color: "#d8a7ff", ink: "#1c0a2e" },
  { key: "papillon", name: "PAPILLON", color: "#ff9ecb", ink: "#2e0a1b" },
  { key: "moose", name: "MOOSEBAR", color: "#c4d96b", ink: "#1a2204" },
];

/** 무대 이름 줄 아래 작은 글씨 (공식 표기) */
export const TML_GENRE: Record<string, string> = { main: "", freedom: "BY BUD", core: "", crystal: "BY ANKER", codex: "", papillon: "", moose: "" };

const TML_BASE: FItem[] = [
  ...rows("fri", "main", [
    ["13:00", "14:25", "goldfish", "GOLDFISH", "GOLDFISH"],
    ["14:25", "15:25", "rave-republic", "RAVE REPUBLIC", "RAVE REPUBLIC"],
    ["15:25", "16:30", "youna", "YOUNA", "YOUNA"],
    ["16:30", "17:35", "henri-pfr", "HENRI PFR", "HENRI PFR"],
    ["17:35", "18:35", "lilly-palmer", "LILLY PALMER", "LILLY PALMER"],
    ["18:35", "19:40", "john-newman", "JOHN NEWMAN", "JOHN NEWMAN"],
    ["19:40", "20:40", "kevin-de-vries", "KEVIN DE VRIES", "KEVIN DE VRIES"],
    ["20:40", "21:45", "halo", "HALŌ", "HALŌ"],
    ["21:45", "22:50", "vini-vici", "VINI VICI", "VINI VICI"],
    ["22:50", "23:50", "alan-walker", "ALAN WALKER", "ALAN WALKER"],
    ["23:50", "25:00", "martin-garrix", "MARTIN GARRIX", "MARTIN GARRIX"],
  ]),
  ...rows("fri", "freedom", [
    ["13:00", "14:30", "mike-bond", "MIKE BOND", "MIKE BOND"],
    ["14:30", "16:00", "sm1le", "SM1LE", "SM1LE"],
    ["16:00", "17:30", "kryder", "KRYDER", "KRYDER"],
    ["17:30", "19:00", "raiden", "RAIDEN", "RAIDEN"],
    ["19:00", "20:00", "honey-gee", "HONEY GEE", "HONEY GEE"],
    ["20:00", "21:00", "wukong", "WUKONG", "WUKONG"],
    ["21:00", "22:00", "bassjackers", "BASSJACKERS", "BASSJACKERS"],
    ["22:00", "23:00", "mandy", "MANDY", "MANDY"],
    ["23:00", "24:00", "da-tweekaz", "DA TWEEKAZ", "DA TWEEKAZ"],
    ["24:00", "25:00", "flosstradamus-b2b-yellow-claw", "FLOSSTRADAMUS B2B YELLOW CLAW", "FLOSSTRADAMUS B2B YELLOW CLAW"],
  ]),
  ...rows("fri", "core", [
    ["13:00", "14:30", "claudine", "CLAUDINE", "CLAUDINE"],
    ["14:30", "16:00", "hyalyte", "HYALYTE", "HYALYTE"],
    ["16:00", "17:30", "saint-ludo", "SAINT LUDO", "SAINT LUDO"],
    ["17:30", "19:00", "oppidan", "OPPIDAN", "OPPIDAN"],
    ["19:00", "21:00", "pegassi", "PEGASSI", "PEGASSI"],
    ["21:00", "23:00", "x-club", "X CLUB.", "X CLUB."],
    ["23:00", "25:00", "funk-tribu", "FUNK TRIBU", "FUNK TRIBU"],
  ]),
  ...rows("fri", "crystal", [
    ["13:00", "15:00", "jonnie-b", "JONNIE B", "JONNIE B"],
    ["15:00", "16:30", "lonskii", "LONSKII", "LONSKII"],
    ["16:30", "18:00", "amy-wiles", "AMY WILES", "AMY WILES"],
    ["18:00", "19:30", "marsh", "MARSH", "MARSH"],
    ["19:30", "21:00", "eli-and-fur-b2b-yotto", "ELI & FUR B2B YOTTO", "ELI & FUR B2B YOTTO"],
    ["21:00", "22:00", "cosmic-gate", "COSMIC GATE", "COSMIC GATE"],
    ["22:00", "23:30", "aly-and-fila", "ALY & FILA", "ALY & FILA"],
    ["23:30", "24:00", "ferry-corsten-b2b-marsh", "FERRY CORSTEN B2B MARSH", "FERRY CORSTEN B2B MARSH"],
    ["24:00", "25:00", "ferry-corsten", "FERRY CORSTEN", "FERRY CORSTEN"],
  ]),
  ...rows("fri", "codex", [
    ["13:00", "15:00", "dadoo", "DADOO", "DADOO"],
    ["15:00", "16:30", "dj-licious", "DJ LICIOUS", "DJ LICIOUS"],
    ["16:30", "18:00", "camila-jun", "CAMILA JUN", "CAMILA JUN"],
    ["18:00", "19:30", "elfigo", "ELFIGO", "ELFIGO"],
    ["19:30", "21:00", "linska", "LINSKA", "LINSKA"],
    ["21:00", "22:30", "solardo", "SOLARDO", "SOLARDO"],
    ["22:30", "24:00", "camelphat", "CAMELPHAT", "CAMELPHAT"],
  ]),
  ...rows("fri", "papillon", [
    ["13:00", "15:00", "jijie", "JIJIE", "JIJIE"],
    ["15:00", "17:00", "vicky-kroon", "VICKY KROON", "VICKY KROON"],
    ["17:00", "19:00", "makasi", "MAKASI", "MAKASI"],
    ["19:00", "20:30", "palmera", "PALMERA", "PALMERA"],
    ["20:30", "22:00", "lennert-wolfs", "LENNERT WOLFS", "LENNERT WOLFS"],
    ["22:00", "24:00", "ta-rek", "TA:REK", "TA:REK"],
  ]),
  ...rows("fri", "moose", [
    ["13:00", "17:00", "jelle-dk", "JELLE DK", "JELLE DK"],
    ["17:00", "21:00", "jan-v", "JAN V", "JAN V"],
    ["21:00", "25:00", "jerrooo", "JERROOO", "JERROOO"],
  ]),
  ...rows("sat", "main", [
    ["13:00", "14:25", "riviere", "RIVIERE", "RIVIERE"],
    ["14:25", "15:25", "karty", "KARTY", "KARTY"],
    ["15:25", "16:30", "meaghan", "MEAGHAN", "MEAGHAN"],
    ["16:30", "17:35", "ian-asher", "IAN ASHER", "IAN ASHER"],
    ["17:35", "18:35", "miss-monique", "MISS MONIQUE", "MISS MONIQUE"],
    ["18:35", "19:40", "nervo", "NERVO", "NERVO"],
    ["19:40", "20:40", "sub-zero-project", "SUB ZERO PROJECT", "SUB ZERO PROJECT"],
    ["20:40", "21:45", "artbat", "ARTBAT", "ARTBAT"],
    ["21:45", "22:50", "afrojack", "AFROJACK", "AFROJACK"],
    ["22:50", "23:50", "dimitri-vegas-and-like-mike", "DIMITRI VEGAS & LIKE MIKE", "DIMITRI VEGAS & LIKE MIKE"],
    ["23:50", "25:00", "steve-aoki", "STEVE AOKI", "STEVE AOKI"],
  ]),
  ...rows("sat", "freedom", [
    ["13:00", "14:30", "row1", "ROW1", "ROW1"],
    ["14:30", "16:00", "xy", "XY", "XY"],
    ["16:00", "18:00", "meguru", "MEGURU", "MEGURU"],
    ["18:00", "19:30", "nakadia", "NAKADIA", "NAKADIA"],
    ["19:30", "21:00", "amber-broos-b2b-space-92", "AMBER BROOS B2B SPACE 92", "AMBER BROOS B2B SPACE 92"],
    ["21:00", "22:30", "hannah-laing", "HANNAH LAING", "HANNAH LAING"],
    ["22:30", "24:00", "nico-moreno", "NICO MORENO", "NICO MORENO"],
  ]),
  ...rows("sat", "core", [
    ["13:00", "15:00", "anika", "ANIKA", "ANIKA"],
    ["15:00", "17:00", "meltmode", "MELTMODE", "MELTMODE"],
    ["17:00", "19:00", "bibi-seck", "BIBI SECK", "BIBI SECK"],
    ["19:00", "20:30", "luuk-van-dijk", "LUUK VAN DIJK", "LUUK VAN DIJK"],
    ["20:30", "21:30", "dj-boring-b2b-luuk-van-dijk", "DJ BORING B2B LUUK VAN DIJK", "DJ BORING B2B LUUK VAN DIJK"],
    ["21:30", "23:00", "dj-boring", "DJ BORING", "DJ BORING"],
    ["23:00", "25:00", "mind-against", "MIND AGAINST", "MIND AGAINST"],
  ]),
  ...rows("sat", "crystal", [
    ["13:00", "14:30", "puffer-p", "PUFFER P", "PUFFER P"],
    ["14:30", "16:00", "tripical-note", "TRIPICAL NOTE", "TRIPICAL NOTE"],
    ["16:00", "17:30", "firaga", "FIRAGA", "FIRAGA"],
    ["17:30", "19:00", "ghost-rider", "GHOST RIDER", "GHOST RIDER"],
    ["19:00", "20:00", "somnia", "SOMNIA", "SOMNIA"],
    ["20:00", "21:00", "blazy", "BLAZY", "BLAZY"],
    ["21:00", "22:00", "blastoyz-b2b-whiteno1se", "BLASTOYZ B2B WHITENO1SE", "BLASTOYZ B2B WHITENO1SE"],
    ["22:00", "23:00", "vegas", "VEGAS", "VEGAS"],
    ["23:00", "24:00", "mad-maxx-b2b-stryker", "MAD MAXX B2B STRYKER", "MAD MAXX B2B STRYKER"],
    ["24:00", "25:00", "infected-mushroom", "INFECTED MUSHROOM", "INFECTED MUSHROOM"],
  ]),
  ...rows("sat", "codex", [
    ["13:00", "14:30", "petra", "PETRA", "PETRA"],
    ["14:30", "16:00", "romeo-blanco", "ROMEO BLANCO", "ROMEO BLANCO"],
    ["16:00", "17:30", "manuals", "MANUALS", "MANUALS"],
    ["17:30", "19:00", "nome", "NOME.", "NOME."],
    ["19:00", "20:00", "dj-sally", "DJ SALLY", "DJ SALLY"],
    ["20:00", "21:00", "22-bullets", "22 BULLETS", "22 BULLETS"],
    ["21:00", "22:00", "dubvision", "DUBVISION", "DUBVISION"],
    ["22:00", "23:00", "yves-v", "YVES V", "YVES V"],
    ["23:00", "24:00", "third-party", "THIRD PARTY", "THIRD PARTY"],
    ["24:00", "25:00", "dvbbs", "DVBBS", "DVBBS"],
  ]),
  ...rows("sat", "papillon", [
    ["13:00", "15:00", "arten", "ARTEN", "ARTEN"],
    ["15:00", "17:00", "semsei", "SEMSEI", "SEMSEI"],
    ["17:00", "19:00", "rebeca-ark", "REBECA ARK", "REBECA ARK"],
    ["19:00", "21:00", "dj-licious-sat", "DJ LICIOUS", "DJ LICIOUS"],
    ["21:00", "22:30", "carly-wilford", "CARLY WILFORD", "CARLY WILFORD"],
    ["22:30", "24:00", "coco-bevan", "COCO BEVAN", "COCO BEVAN"],
  ]),
  ...rows("sat", "moose", [
    ["13:00", "17:00", "jan-v-sat", "JAN V", "JAN V"],
    ["17:00", "21:00", "jerrooo-sat", "JERROOO", "JERROOO"],
    ["21:00", "25:00", "jelle-dk-sat", "JELLE DK", "JELLE DK"],
  ]),
  ...rows("sun", "main", [
    ["13:00", "14:25", "nuttrix", "NUTTRIX", "NUTTRIX"],
    ["14:25", "15:25", "halo-2", "HALO", "HALO"], // 금요일 HALŌ(id halo, 마크론 있음)와 다른 아티스트라서 id·사진·장르를 따로 쓴다
    ["15:25", "16:30", "botcash", "BOTCASH", "BOTCASH"],
    ["16:30", "17:35", "mattn", "MATTN", "MATTN"],
    ["17:35", "18:35", "kolsch", "KÖLSCH", "KÖLSCH"],
    ["18:35", "19:40", "novah", "NOVAH", "NOVAH"],
    ["19:40", "20:40", "r3hab", "R3HAB", "R3HAB"],
    ["20:40", "21:45", "alok", "ALOK", "ALOK"],
    ["21:45", "22:50", "lost-frequencies", "LOST FREQUENCIES", "LOST FREQUENCIES"],
    ["22:50", "24:00", "swedish-house-mafia", "SWEDISH HOUSE MAFIA", "SWEDISH HOUSE MAFIA"],
  ]),
  ...rows("sun", "freedom", [
    ["13:00", "15:00", "yukio", "YUKIO", "YUKIO"],
    ["15:00", "16:30", "xenia-dia", "XENIA DIA", "XENIA DIA"],
    ["16:30", "18:00", "luna-and-lenthe", "LUNA & LENTHE", "LUNA & LENTHE"],
    ["18:00", "19:30", "henri-bergmann", "HENRI BERGMANN", "HENRI BERGMANN"],
    ["19:30", "21:00", "agents-of-time", "AGENTS OF TIME", "AGENTS OF TIME"],
    ["21:00", "22:30", "kevin-de-vries-b2b-morten", "KEVIN DE VRIES B2B MORTEN", "KEVIN DE VRIES B2B MORTEN"],
    ["22:30", "24:00", "artbat-b2b-r3hab", "ARTBAT B2B R3HAB", "ARTBAT B2B R3HAB"],
  ]),
  ...rows("sun", "core", [
    ["13:00", "15:00", "dennis-gold", "DENNIS GOLD", "DENNIS GOLD"],
    ["15:00", "16:30", "capoon", "CAPOON", "CAPOON"],
    ["16:30", "18:00", "dino-lenny", "DINO LENNY", "DINO LENNY"],
    ["18:00", "19:30", "maxi-meraki", "MAXI MERAKI", "MAXI MERAKI"],
    ["19:30", "21:00", "ameme-b2b-honeyluv", "AMÉMÉ B2B HONEYLUV", "AMÉMÉ B2B HONEYLUV"],
    ["21:00", "22:30", "dj-tennis", "DJ TENNIS", "DJ TENNIS"],
    ["22:30", "24:00", "joris-voorn-b2b-krystal-klear", "JORIS VOORN B2B KRYSTAL KLEAR", "JORIS VOORN B2B KRYSTAL KLEAR"],
  ]),
  ...rows("sun", "crystal", [
    ["13:00", "14:30", "lora-matia", "LORA MATIA", "LORA MATIA"],
    ["14:30", "16:00", "angemi", "ANGEMI", "ANGEMI"],
    ["16:00", "17:30", "tiger-drama", "TIGER DRAMA", "TIGER DRAMA"],
    ["17:30", "18:30", "whisnu-santika", "WHISNU SANTIKA", "WHISNU SANTIKA"],
    ["18:30", "19:30", "matisse-and-sadko", "MATISSE & SADKO", "MATISSE & SADKO"],
    ["19:30", "20:30", "lucas-and-steve", "LUCAS & STEVE", "LUCAS & STEVE"],
    ["20:30", "22:00", "laidback-luke", "LAIDBACK LUKE", "LAIDBACK LUKE"],
    ["22:00", "23:00", "quintino", "QUINTINO", "QUINTINO"],
    ["23:00", "24:00", "brennan-heart", "BRENNAN HEART", "BRENNAN HEART"],
  ]),
  ...rows("sun", "codex", [
    ["13:00", "14:30", "j-nana", "J-NANA", "J-NANA"],
    ["14:30", "16:00", "maysaa", "MAYSAA", "MAYSAA"],
    ["16:00", "17:00", "pixzy", "PIXZY", "PIXZY"],
    ["17:00", "18:00", "merow", "MEROW", "MEROW"],
    ["18:00", "19:00", "rayray", "RAYRAY", "RAYRAY"],
    ["19:00", "20:00", "sabai", "SABAI", "SABAI"],
    ["20:00", "21:00", "andromedik", "ANDROMEDIK", "ANDROMEDIK"],
    ["21:00", "22:00", "apashe", "APASHE", "APASHE"],
    ["22:00", "23:00", "netsky", "NETSKY", "NETSKY"],
    ["23:00", "24:00", "yellow-claw", "YELLOW CLAW", "YELLOW CLAW"],
  ]),
  ...rows("sun", "papillon", [
    ["13:00", "15:00", "joulie", "JOULIE", "JOULIE"],
    ["15:00", "17:00", "neon", "NEON", "NEON"],
    ["17:00", "18:30", "to-be-discovered", "TO BE DISCOVERED", "TO BE DISCOVERED"],
    ["18:30", "20:00", "onfaya", "ONFAYA", "ONFAYA"],
    ["20:00", "21:30", "adamk", "ADAMK", "ADAMK"],
    ["21:30", "23:00", "jowaves", "JOWAVES", "JOWAVES"],
  ]),
  ...rows("sun", "moose", [
    ["13:00", "17:00", "jerrooo-sun", "JERROOO", "JERROOO"],
    ["17:00", "21:00", "jelle-dk-sun", "JELLE DK", "JELLE DK"],
    ["21:00", "24:00", "jan-v-sun", "JAN V", "JAN V"],
  ]),
];

export const TML_ITEMS: FItem[] = withB2bDuo("tml", TML_BASE.map((i) => {
  const g = TML_GENRES[i.id.replace(/-(fri|sat|sun)$/, "")];
  return g ? { ...i, genre: g.g, ...(g.conf === "inferred" ? { genreConf: "inferred" as const } : {}) } : i;
}));
