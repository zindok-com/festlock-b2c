// 다른 페스티벌 폴더에 이미 올라가 있는 사진을 같은 아티스트에게 다시 쓴다 (Tomorrowland Thailand · VAC 는 자기 폴더에 사진이 아직 없다).
// 값은 사진 저장소(Blob, VITE_FACE_BASE) 아래 경로다: "orl/martin-garrix" → …/artists/orl/martin-garrix.webp, 폴더 없이 "id" 는 EDC Korea 사진.
// B2B 칸은 사진이 한 장뿐이라 첫 번째 멤버의 사진을 쓴다. 자기 폴더(faces-src/<fest>)에 사진을 올리면 그쪽이 우선한다.
// 만드는 법: 저장소에 HEAD 요청으로 찾아서 생성한 표 (2026-11-15). 새 사진이 올라오면 다시 만들면 된다.
export const FACE_ALIAS: Record<string, Record<string, string>> = {
  tml: {
    "youna": "youna",
    "lilly-palmer": "lilly-palmer",
    "halo": "utw/halo",
    "vini-vici": "vini-vici",
    "alan-walker": "orl/alan-walker",
    "martin-garrix": "orl/martin-garrix",
    "pegassi": "orl/pegassi",
    "cosmic-gate": "cosmic-gate",
    "aly-and-fila": "aly-and-fila",
    "camelphat": "utw/camelphat",
    "ian-asher": "orl/ian-asher",
    "afrojack": "orl/afrojack",
    "steve-aoki": "orl/steve-aoki",
    "nico-moreno": "orl/nico-moreno",
    "r3hab": "r3hab",
    "alok": "orl/alok",
    "artbat-b2b-r3hab": "r3hab",
    "lucas-and-steve": "nol/lucas-and-steve",
    "brennan-heart": "brennan-heart",
    "merow": "nol/merow",
  },
  vac: {
    "joa": "orl/joa",
    "dj-snake-b2b-knock2": "dj-snake",
    "dj-snake": "dj-snake",
    "chris-lorenzo": "orl/chris-lorenzo",
    "charlie-sparks": "charlie-sparks",
    "alesso": "orl/alesso",
    "levity": "orl/levity",
  },
};
