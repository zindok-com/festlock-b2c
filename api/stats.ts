/// <reference types="node" />
// GET /api/stats → { downloads: { sat, sun }, top: [{ id, count }] (상위 10), all: 전체 DJ 카운트 }
import { Redis } from "@upstash/redis";

function db(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

export async function GET(): Promise<Response> {
  const r = db();
  if (!r) return new Response(JSON.stringify({ error: "no-db" }), { status: 503, headers: { "content-type": "application/json" } });

  const [sat, sun, raw] = await Promise.all([
    r.scard("edc26:dl:sat"),
    r.scard("edc26:dl:sun"),
    // DJ는 100명이 안 되므로 전부 받아도 가볍다
    r.zrange<(string | number)[]>("edc26:top", 0, -1, { rev: true, withScores: true }),
  ]);
  const all: { id: string; count: number }[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) all.push({ id: String(raw[i]), count: Number(raw[i + 1]) });
  const top = all.slice(0, 10);

  return new Response(JSON.stringify({ downloads: { sat, sun }, top, all }), {
    headers: {
      "content-type": "application/json",
      // 30초 동안은 캐시된 값을 보여줘서 DB 호출을 줄인다
      "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
