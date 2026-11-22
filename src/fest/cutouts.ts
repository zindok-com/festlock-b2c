// 배경을 지운 DJ 사진("누끼", 투명 WebP). 카드 모양 "듀오톤 블록"에서만 쓴다.
// 만드는 법: scripts/make-cutouts.mjs → 모아보기(contact.png)를 눈으로 보고 쓸 만한 것만 scripts/upload-cutouts.mjs 로 Blob(artists/<fest>/cut/<id>.webp)에 올린 뒤 아래 목록에 넣는다.
// 목록에 없는 아티스트는 같은 카드 모양에서 이중톤 사진으로 대신 나온다 (원본에 글자·로고가 섞였거나 해상도가 낮아 누끼가 깨끗하지 않은 경우).
import { faceSrc } from "../config";

// ZONNAFE 누끼는 만들어 Blob(artists/zon/cut)에 올려 두었지만, 요청에 따라 아직 쓰지 않는다 (누끼가 없는 칸은 듀오톤에서 카드 전체 사진으로 나온다)
const CUT: Record<string, Set<string>> = {
  // ULTRA TAIWAN: 15명 중 14명. 제외: omara-212(홍보 이미지에 날짜·장소 글자가 섞임). 2026-11-23 halo 를 원본으로 다시 만들고 lynne 은 새 사진으로 다시 만듦
  utw: new Set(["alyshia", "alan-walker", "ashleybaby", "bunt", "camelphat", "chris-avantgarde", "korolova", "levity", "mykris", "sebastian-ingrosso", "veena", "yousuke-yukimatsu", "halo", "lynne"]),
  // TOMORROWLAND THAILAND: 138명. 2026-11-23 원본으로 9명 추가(누끼 없는 칸이 듀오톤에서 이상하게 보인다는 대표 제보). 제외 3: jelle-dk·j-nana(사진에 이름 로고), nakadia(배경이 남음)
  tml: new Set(["22-bullets", "adamk", "afrojack", "agents-of-time", "alok", "aly-and-fila", "amy-wiles", "andromedik", "angemi", "anika", "apashe", "artbat", "arten", "bassjackers", "bibi-seck", "blazy", "botcash", "brennan-heart", "camelphat", "camila-jun", "capoon", "carly-wilford", "claudine", "coco-bevan", "cosmic-gate", "da-tweekaz", "dadoo", "dennis-gold", "dimitri-vegas-and-like-mike", "dino-lenny", "dj-boring", "dj-licious", "dj-sally", "dj-tennis", "dubvision", "dvbbs", "elfigo", "ferry-corsten", "funk-tribu", "ghost-rider", "goldfish", "halo-2", "hannah-laing", "henri-bergmann", "henri-pfr", "honey-gee", "hyalyte", "ian-asher", "infected-mushroom", "jan-v", "jerrooo", "jijie", "john-newman", "jonnie-b", "joulie", "jowaves", "karty", "kevin-de-vries", "kolsch", "kryder", "laidback-luke", "lennert-wolfs", "lilly-palmer", "lonskii", "lora-matia", "lost-frequencies", "lucas-and-steve", "luuk-van-dijk", "mandy", "manuals", "marsh", "martin-garrix", "matisse-and-sadko", "mattn", "maxi-meraki", "maysaa", "meaghan", "meguru", "meltmode", "merow", "mike-bond", "mind-against", "miss-monique", "neon", "nervo", "netsky", "nico-moreno", "nome", "novah", "nuttrix", "onfaya", "oppidan", "palmera", "pegassi", "petra", "pixzy", "puffer-p", "quintino", "r3hab", "raiden", "rave-republic", "rayray", "rebeca-ark", "riviere", "romeo-blanco", "row1", "sabai", "saint-ludo", "semsei", "sm1le", "solardo", "somnia", "steve-aoki", "sub-zero-project", "ta-rek", "third-party", "tiger-drama", "tripical-note", "vegas", "vicky-kroon", "vini-vici", "whisnu-santika", "wukong", "xenia-dia", "xy", "yellow-claw", "youna", "yukio", "yves-v", "alan-walker", "firaga", "flosstradamus-b2b-yellow-claw", "halo", "linska", "luna-and-lenthe", "makasi", "swedish-house-mafia", "x-club"]),
  // VAC: 2026-11-23 대표가 준 사진으로 만든 누끼 25칸 (B2B 두 칸은 두 사람 누끼를 나란히 붙인 한 장). 사진 없는 BELTRAN·TBD 는 없음
  vac: new Set(["above-and-beyond", "alesso", "cash-cash", "charlie-sparks", "chris-lorenzo", "cid", "conrad-taylor", "dj-snake", "dom-dolla", "embrz", "gudfella", "hol", "joa", "kasablanca", "meguru", "nghtmre", "olly-james", "reinier-zonneveld", "shallou", "skybreak", "worship", "ydg", "yotto", "isoxo-b2b-boys-noize", "dj-snake-b2b-knock2"]),
};

/** 같은 아티스트가 여러 날 나오면 id 에 -fri/-sat/-sun 이 붙으므로 떼고 찾는다 (사진과 같은 규칙) */
/** 같은 이름으로 누끼를 다시 올렸을 때 올리는 번호 (페스티벌별). 브라우저·CDN 이 30일 캐시한 옛 누끼 대신 새것을 받게 */
const CUT_VERSION: Record<string, string> = { utw: "2", vac: "2" };

export function cutSrc(fest: string, id: string): string | null {
  const base = id.replace(/-(fri|sat|sun)$/, "");
  if (!CUT[fest]?.has(base)) return null;
  const src = faceSrc(fest + "/cut/" + base);
  const v = CUT_VERSION[fest];
  return src && v ? src + "?v=" + v : src;
}
