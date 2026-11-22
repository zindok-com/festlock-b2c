// 아티스트 본인(또는 소속사)이 알려 준 바로 가기 링크. 여기 있으면 아티스트 창의 듣기 버튼이 검색 대신 이 주소로 간다.
// 인스타그램이 있으면 아티스트 창에 인스타그램 버튼이 하나 더 생긴다. 추적용 꼬리(?si=, ?igsh= 등)는 빼고 적는다.
export interface ArtistLinks {
  spotify?: string;
  youtube?: string;
  instagram?: string;
}

export const ARTIST_LINKS: Record<string, Record<string, ArtistLinks>> = {
  utw: {
    // 2026-11-22 LYNNE 본인이 보낸 링크 (대표 전달)
    lynne: {
      spotify: "https://open.spotify.com/artist/5UNK2vr946QjecDLrCP63S",
      youtube: "https://www.youtube.com/watch?v=dqkmKV1yi4I",
      instagram: "https://www.instagram.com/lynnemusicke/",
    },
  },
};

export function artistLinks(fest: string, id: string): ArtistLinks | null {
  return ARTIST_LINKS[fest]?.[id.replace(/-(fri|sat|sun)$/, "")] ?? null;
}
