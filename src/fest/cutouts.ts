// 배경을 지운 DJ 사진("누끼", 투명 WebP). 카드 모양 "듀오톤 블록"에서만 쓴다.
// 만드는 법: scripts/make-cutouts.mjs → 모아보기(contact.png)를 눈으로 보고 쓸 만한 것만 scripts/upload-cutouts.mjs 로 Blob(artists/<fest>/cut/<id>.webp)에 올린 뒤 아래 목록에 넣는다.
// 목록에 없는 아티스트는 같은 카드 모양에서 이중톤 사진으로 대신 나온다 (원본에 글자·로고가 섞였거나 해상도가 낮아 누끼가 깨끗하지 않은 경우).
import { faceSrc } from "../config";

// ZONNAFE·VAC 누끼도 만들어 Blob(artists/zon/cut, artists/vac/cut)에 올려 두었지만, 요청에 따라 아직 쓰지 않는다 (필요하면 여기에 목록을 넣으면 된다).
const CUT: Record<string, Set<string>> = {
  // ULTRA TAIWAN: 15명 중 13명. 제외: omara-212(홍보 이미지에 날짜·장소 글자가 섞임), halo(320px 저해상도 실루엣)
  utw: new Set(["alyshia", "alan-walker", "ashleybaby", "bunt", "camelphat", "chris-avantgarde", "korolova", "levity", "lynne", "mykris", "sebastian-ingrosso", "veena", "yousuke-yukimatsu"]),
  // TOMORROWLAND THAILAND: 129명 (2026-11-15 사진 일괄 추가). 제외 10: firaga, jelle-dk, j-nana, makasi, nakadia, swedish-house-mafia, x-club, luna-and-lenthe, linska, artbat-b2b-r3hab (누끼가 깨짐/흐림). B2B 칸은 두 사람 합성(b2b.ts)을 쓴다
  tml: new Set(["22-bullets", "adamk", "afrojack", "agents-of-time", "alok", "aly-and-fila", "amy-wiles", "andromedik", "angemi", "anika", "apashe", "artbat", "arten", "bassjackers", "bibi-seck", "blazy", "botcash", "brennan-heart", "camelphat", "camila-jun", "capoon", "carly-wilford", "claudine", "coco-bevan", "cosmic-gate", "da-tweekaz", "dadoo", "dennis-gold", "dimitri-vegas-and-like-mike", "dino-lenny", "dj-boring", "dj-licious", "dj-sally", "dj-tennis", "dubvision", "dvbbs", "elfigo", "ferry-corsten", "funk-tribu", "ghost-rider", "goldfish", "halo-2", "hannah-laing", "henri-bergmann", "henri-pfr", "honey-gee", "hyalyte", "ian-asher", "infected-mushroom", "jan-v", "jerrooo", "jijie", "john-newman", "jonnie-b", "joulie", "jowaves", "karty", "kevin-de-vries", "kolsch", "kryder", "laidback-luke", "lennert-wolfs", "lilly-palmer", "lonskii", "lora-matia", "lost-frequencies", "lucas-and-steve", "luuk-van-dijk", "mandy", "manuals", "marsh", "martin-garrix", "matisse-and-sadko", "mattn", "maxi-meraki", "maysaa", "meaghan", "meguru", "meltmode", "merow", "mike-bond", "mind-against", "miss-monique", "neon", "nervo", "netsky", "nico-moreno", "nome", "novah", "nuttrix", "onfaya", "oppidan", "palmera", "pegassi", "petra", "pixzy", "puffer-p", "quintino", "r3hab", "raiden", "rave-republic", "rayray", "rebeca-ark", "riviere", "romeo-blanco", "row1", "sabai", "saint-ludo", "semsei", "sm1le", "solardo", "somnia", "steve-aoki", "sub-zero-project", "ta-rek", "third-party", "tiger-drama", "tripical-note", "vegas", "vicky-kroon", "vini-vici", "whisnu-santika", "wukong", "xenia-dia", "xy", "yellow-claw", "youna", "yukio", "yves-v"]),
};

/** 같은 아티스트가 여러 날 나오면 id 에 -fri/-sat/-sun 이 붙으므로 떼고 찾는다 (사진과 같은 규칙) */
export function cutSrc(fest: string, id: string): string | null {
  const base = id.replace(/-(fri|sat|sun)$/, "");
  return CUT[fest]?.has(base) ? faceSrc(fest + "/cut/" + base) : null;
}
