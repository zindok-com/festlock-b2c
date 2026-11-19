// 로컬 시연용 예시 데이터 (이 컴퓨터에서 서버가 없을 때만 api.ts 가 불러온다. 운영 주소에서는 받지도 않는다)
// 사진 파일 대신 코드로 그린 색 띠(SVG)를 쓴다. 인스타 링크는 실제 사람 계정이 되지 않도록 모두 @festlock 으로 둔다.
import { FESTIVALS } from "../festivals";

/** 매번 같은 값이 나오는 난수 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;");

/** 가로 띠 모양 팔찌 그림 (600×100). 등급마다 무늬가 다르다 */
function bandSvg(c1: string, c2: string, label: string, grade: string, day: string): string {
  const ink = lum(c1) > 0.6 ? "#140a2e" : "#ffffff";
  const pat =
    grade === "vip"
      ? `<pattern id='p' width='28' height='28' patternUnits='userSpaceOnUse'><path d='M14 2 L26 14 L14 26 L2 14 Z' fill='${c2}' opacity='.45'/></pattern>`
      : grade === "pga"
        ? `<pattern id='p' width='36' height='100' patternUnits='userSpaceOnUse'><path d='M0 30 L18 50 L36 30 M0 70 L18 90 L36 70' stroke='${c2}' stroke-width='7' fill='none' opacity='.5'/></pattern>`
        : `<pattern id='p' width='26' height='100' patternUnits='userSpaceOnUse' patternTransform='skewX(-24)'><rect width='11' height='100' fill='${c2}' opacity='.4'/></pattern>`;
  const fit = label.length > 20 ? ` textLength='470' lengthAdjust='spacingAndGlyphs'` : "";
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 100' width='600' height='100'><defs>${pat}</defs>` +
    `<rect width='600' height='100' fill='${c1}'/><rect width='600' height='100' fill='url(#p)'/>` +
    `<rect y='7' width='600' height='4' fill='${ink}' opacity='.55'/><rect y='89' width='600' height='4' fill='${ink}' opacity='.55'/>` +
    `<text x='265' y='62' text-anchor='middle' font-family='Arial Black,Arial,sans-serif' font-weight='900' font-size='30' letter-spacing='2' fill='${ink}'${fit}>${escXml(label)}</text>` +
    `<rect x='526' y='26' width='58' height='48' rx='8' fill='${ink}' opacity='.9'/>` +
    `<text x='555' y='58' text-anchor='middle' font-family='Arial,sans-serif' font-weight='700' font-size='20' fill='${c1}'>${escXml(day)}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

const GRADES = ["ga", "ga", "ga", "pga", "vip"];
const DAYS = ["day1", "day2", "day3", "full3"];
// 마지막 사람은 60개(최대)를 꽉 채워서 많을 때의 3D 진열 모양을 확인한다
const NAMES = ["민지", "Hana", "준호", "Sora", "Leo", "유나", "Mai", "Daniel", "서연", "Kai", "Festa"];

interface DemoDesign {
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
  by: null;
}
interface DemoCollector {
  id: string;
  name: string;
  ig: string;
  at: number;
  items: DemoDesign[];
}

let cache: DemoCollector[] | null = null;
function build(): DemoCollector[] {
  if (cache) return cache;
  const designs = new Map<string, DemoDesign>();
  const design = (fest: (typeof FESTIVALS)[number], year: number, grade: string, day: string): DemoDesign => {
    const key = `${fest.slug}:${year}:${grade}:${day}`;
    let d = designs.get(key);
    if (!d) {
      const short = fest.name.en.replace(/\s*\b20\d\d\b\s*$/, "").replace(/\s*·.*$/, "").toUpperCase();
      const dayMark = day === "full3" ? "ALL" : "D" + day.slice(3);
      // VIP·전일권은 "팔찌로 디자인"(금사 무늬), 나머지는 "사진 그대로" — 두 방식이 3D 에서 어떻게 보이는지 같이 확인
      const style = grade === "vip" || day === "full3" ? "design" : "photo";
      d = { key, fest: fest.slug, year, grade, day, style, pal: [fest.color, fest.color2], img: bandSvg(fest.color, fest.color2, `${short} · ${grade.toUpperCase()}`, grade, dayMark), w: 600, h: 100, at: 0, by: null };
      designs.set(key, d);
    }
    return d;
  };
  const now = Date.now();
  const sizes = [12, 5, 9, 3, 7, 11, 4, 8, 6, 10, 60];
  cache = NAMES.map((name, i) => {
    const r = rng(1000 + i * 77);
    const keys = new Set<string>();
    const items: DemoDesign[] = [];
    while (items.length < sizes[i]) {
      const f = FESTIVALS[Math.floor(r() * FESTIVALS.length)];
      const year = r() < 0.75 ? 2026 : 2025;
      const d = design(f, year, GRADES[Math.floor(r() * GRADES.length)], DAYS[Math.floor(r() * DAYS.length)]);
      if (keys.has(d.key)) continue;
      keys.add(d.key);
      items.push(d);
    }
    return { id: "cdemo" + String(i + 1).padStart(5, "0"), name, ig: "https://www.instagram.com/festlock/", at: now - (i * 7 + 2) * 3600_000, items };
  });
  return cache;
}

/** api/band.ts 의 GET ?a=collectors 와 같은 모양 */
export function demoCollectors(q: { fest: string; sort: "recent" | "most"; cursor: number }) {
  let all = build();
  if (q.fest) all = all.filter((c) => c.items.some((d) => d.fest === q.fest));
  all = [...all].sort((a, b) => (!q.fest && q.sort === "most" ? b.items.length - a.items.length : 0) || b.at - a.at);
  const page = all.slice(q.cursor, q.cursor + 24);
  return {
    list: page.map((c) => ({ id: c.id, name: c.name, count: c.items.length, thumbs: c.items.slice(0, 3).map((d) => d.img) })),
    next: q.cursor + 24 < all.length ? q.cursor + 24 : null,
  };
}

/** api/band.ts 의 GET ?a=design&key= 와 같은 것 (예시 데이터 안의 디자인). 없으면 null */
export function demoDesign(key: string) {
  for (const c of build()) {
    const d = c.items.find((x) => x.key === key);
    if (d) return d;
  }
  return null;
}

/** api/band.ts 의 GET ?a=collector&id= 와 같은 모양. 없으면 null */
export function demoCollector(id: string) {
  const c = build().find((x) => x.id === id);
  if (!c) return null;
  return { id: c.id, name: c.name, ig: c.ig, count: c.items.length, items: c.items.map((d) => ({ key: d.key, design: d })) };
}
