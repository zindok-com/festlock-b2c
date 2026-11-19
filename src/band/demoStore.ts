// 로컬 시연용 "가짜 서버" — 이 컴퓨터(localhost)에서 서버(api/band.ts)가 없을 때만 쓴다.
// 내가 만든 프로필·팔찌를 이 기기 저장소(localStorage)에 넣어 두고, 구경하기·컬렉터 화면에서 예시 데이터와 함께 보여 준다.
// 운영 주소에서는 api.ts·mine.ts 가 LOCAL 일 때만 부르므로 쓰이지 않는다.

export interface StoreDesign {
  key: string;
  fest: string;
  year: number;
  grade: string;
  day: string;
  style: string;
  pal: string[];
  img: string;
  w: number;
  h: number;
  at: number;
  by: string;
}
interface StoreProfile {
  name: string;
  ig: string;
  code: string;
  at: number;
  items: { key: string; at: number }[];
}
interface Store {
  profiles: Record<string, StoreProfile>;
  designs: Record<string, StoreDesign>;
}

const KEY = "fl:band:demo:v1";
export function readStore(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null") as Store | null;
    if (s && s.profiles && s.designs) return s;
  } catch {
    /* 비었거나 깨짐 */
  }
  return { profiles: {}, designs: {} };
}
export function writeStore(s: Store): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false; // 저장 공간이 꽉 참 등
  }
}

/** api/band.ts 의 GET ?a=collector 와 같은 모양. 없으면 null */
export function storeCollector(id: string) {
  const s = readStore();
  const p = s.profiles[id];
  if (!p) return null;
  const items = [...p.items].sort((a, b) => b.at - a.at).flatMap((it) => (s.designs[it.key] ? [{ key: it.key, design: s.designs[it.key] }] : []));
  return { id, name: p.name, ig: p.ig, count: items.length, items };
}

/** api/band.ts 의 GET ?a=collectors 목록 앞에 붙일 카드 (팔찌가 있는 사람만, 최근순) */
export function storeCards(fest: string) {
  const s = readStore();
  return Object.entries(s.profiles)
    .filter(([, p]) => p.items.length && (!fest || p.items.some((it) => it.key.startsWith(fest + ":"))))
    .sort((a, b) => b[1].at - a[1].at)
    .map(([id, p]) => {
      const recent = [...p.items].sort((a, b) => b.at - a.at);
      return { id, name: p.name, count: p.items.length, thumbs: recent.slice(0, 3).flatMap((it) => (s.designs[it.key] ? [s.designs[it.key].img] : [])) };
    });
}
