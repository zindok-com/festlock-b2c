// VAC 2026 아티스트 장르 — FestLock이 알고 있는 범위의 추정이다 (화면에 "~"가 앞에 붙는다). 모르는 아티스트는 비워 둔다.
export interface VacGenre {
  g: string;
  conf?: "inferred";
}

export const VAC_GENRES: Record<string, VacGenre> = {
  "dj-snake": { g: "TRAP · HOUSE", conf: "inferred" },
  "dj-snake-b2b-knock2": { g: "BASS HOUSE · TRAP", conf: "inferred" },
  "above-and-beyond": { g: "TRANCE · PROGRESSIVE", conf: "inferred" },
  "isoxo-b2b-boys-noize": { g: "BASS HOUSE · ELECTRO", conf: "inferred" },
  "chris-lorenzo": { g: "TECH HOUSE · BASS HOUSE", conf: "inferred" },
  "cid": { g: "TECH HOUSE", conf: "inferred" },
  "reinier-zonneveld": { g: "TECHNO", conf: "inferred" },
  "olly-james": { g: "HARD DANCE · HARDSTYLE", conf: "inferred" },
  "cash-cash": { g: "BIG ROOM · POP", conf: "inferred" },
  "worship": { g: "DRUM & BASS", conf: "inferred" },
  "alesso": { g: "PROGRESSIVE HOUSE · BIG ROOM", conf: "inferred" },
  "dom-dolla": { g: "HOUSE · TECH HOUSE", conf: "inferred" },
  "levity": { g: "DUBSTEP · BASS", conf: "inferred" },
  "nghtmre": { g: "BASS · TRAP", conf: "inferred" },
  "ydg": { g: "TRAP · BASS", conf: "inferred" },
  "yotto": { g: "MELODIC HOUSE", conf: "inferred" },
  "shallou": { g: "MELODIC HOUSE", conf: "inferred" },
  "embrz": { g: "FUTURE BASS · MELODIC", conf: "inferred" },
};
