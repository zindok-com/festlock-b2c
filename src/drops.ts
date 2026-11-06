// 드랍 구간 데이터: Drop Studio(내 노트북)의 "festlock으로 보내기"가 public/drops.json 을 만든다.
// 페이지가 열린 뒤 창을 처음 열 때 한 번만 받아 온다. 파일이 없거나 비어 있으면 플레이어를 안 보여 준다.
import { useEffect, useState } from "react";

export interface Drop {
  videoId: string;
  /** 초 (소수 첫째 자리까지) */
  start: number;
  end: number;
  /** true면 구간 대신 0초부터 영상 끝까지 재생 (start·end는 쓰지 않음) */
  full?: boolean;
  kind: "topic" | "mv" | "mixset" | "live" | "other";
  label: "drop" | "highlight" | "intro" | "chorus";
  trackTitle?: string;
  /** artist: 본인 클립 / member: B2B 유닛인데 구성원 클립 / festival-override: 이 페스티벌만 따로 고른 클립 */
  source?: "artist" | "member" | "festival-override";
  sourceArtistId?: string;
}

export interface DropsFile {
  version: 1;
  exportedAt: string | null;
  /** 페이지 주소(slug) → 아티스트 id → 구간 */
  festivals: Record<string, Record<string, Drop>>;
  /** 아티스트 id → 대표 구간 (라인업에 없는 페이지에서도 쓰도록) */
  artists: Record<string, Drop>;
}

let loading: Promise<DropsFile | null> | null = null;

export function loadDrops(): Promise<DropsFile | null> {
  if (!loading) {
    // 브라우저(특히 인스타·카톡 앱 안 브라우저)가 예전 파일을 쓰지 않게 매번 최신인지 확인한다 (바뀌지 않았으면 304로 가볍게)
    loading = fetch("/drops.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && j.version === 1 && j.festivals ? (j as DropsFile) : null))
      .catch(() => null);
  }
  return loading;
}

export function findDrop(d: DropsFile | null, slug: string, artistId: string): Drop | null {
  if (!d) return null;
  // 같은 아티스트의 두 번째 세트(id 끝 -casa, 예: aat-casa)는 그 아티스트 구간을 같이 쓴다
  const base = artistId.replace(/-casa$/, "");
  return d.festivals[slug]?.[artistId] ?? d.festivals[slug]?.[base] ?? d.artists?.[artistId] ?? d.artists?.[base] ?? null;
}

export function useDrop(slug: string, artistId: string): Drop | null {
  const [drop, setDrop] = useState<Drop | null>(null);
  useEffect(() => {
    let alive = true;
    loadDrops().then((d) => alive && setDrop(findDrop(d, slug, artistId)));
    return () => {
      alive = false;
    };
  }, [slug, artistId]);
  return drop;
}
