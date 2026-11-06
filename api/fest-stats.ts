/// <reference types="node" />
// GET /api/fest-stats?fest=gmf|nol|orl → { downloads: { 날짜: 수 }, all: [{ id, count }] (많은 순) }
import { Redis } from "@upstash/redis";

function db(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

/** 페스티벌별 집계 날짜 (api/fest-download.ts와 같게) */
const DAYS: Record<string, string[]> = { gmf: ["sat", "sun"], nol: ["sat", "sun"], orl: ["fri", "sat", "sun"] };

export async function GET(request: Request): Promise<Response> {
  const fest = new URL(request.url).searchParams.get("fest") ?? "";
  if (!DAYS[fest]) return new Response(JSON.stringify({ error: "bad-fest" }), { status: 400, headers: { "content-type": "application/json" } });
  const r = db();
  if (!r) return new Response(JSON.stringify({ error: "no-db" }), { status: 503, headers: { "content-type": "application/json" } });

  const P = "fl:" + fest;
  const days = DAYS[fest];
  const [counts, raw] = await Promise.all([
    Promise.all(days.map((d) => r.scard(`${P}:dl:${d}`))),
    r.zrange<(string | number)[]>(`${P}:top`, 0, -1, { rev: true, withScores: true }),
  ]);
  const downloads = Object.fromEntries(days.map((d, k) => [d, counts[k]]));
  const all: { id: string; count: number }[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) all.push({ id: String(raw[i]), count: Number(raw[i + 1]) });

  return new Response(JSON.stringify({ downloads, all }), {
    headers: {
      "content-type": "application/json",
      // 30초 동안은 캐시된 값을 보여줘서 DB 호출을 줄인다
      "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
