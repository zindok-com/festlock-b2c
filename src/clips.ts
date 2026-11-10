// 아티스트 미리보기 영상(mp4) 목록. 영상 파일은 저장소에 없고 Vercel Blob에 있다 (얼굴 사진과 같은 스토어의 clips/ 폴더).
// public/clips.json 은 scripts/make-clips.mjs · upload-clips.mjs 가 만든다 (docs/ADD-FESTIVAL.md 4단계). 손으로 고치지 않는다.
// 영상이 있는 아티스트는 아티스트 창에서 유튜브 드랍 대신 이 영상을 보여 준다.
import { useEffect, useState } from "react";

export interface Clip {
  /** base 뒤에 붙는 경로 (예: zon/ak.mp4) */
  file: string;
  w: number;
  h: number;
  /** 길이(초) */
  dur: number;
  /** 내용이 바뀌면 달라지는 값 — 주소 뒤에 붙여 예전 영상이 캐시에서 나오지 않게 한다 */
  v: string;
}

export interface ClipsFile {
  version: 1;
  /** Blob 주소 앞부분 (…/clips). 아직 올리지 않았으면 "" */
  base: string;
  updatedAt: string | null;
  /** 페이지 주소(slug) → 아티스트 id → 영상 */
  festivals: Record<string, Record<string, Clip>>;
}

let loading: Promise<ClipsFile | null> | null = null;

export function loadClips(): Promise<ClipsFile | null> {
  if (!loading) {
    loading = fetch("/clips.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && j.version === 1 && j.festivals ? (j as ClipsFile) : null))
      .catch(() => null);
  }
  return loading;
}

export function findClip(d: ClipsFile | null, slug: string, artistId: string): Clip | null {
  return d?.festivals[slug]?.[artistId] ?? null;
}

/**
 * 재생할 주소들 (앞에서부터 시도).
 * 개발 서버(npm run dev)에서는 내 PC의 clips-src/ 를 먼저 쓰고(아직 안 올린 영상도 보이게), 없으면 Blob 주소.
 */
export function clipUrls(d: ClipsFile, c: Clip): string[] {
  const out: string[] = [];
  if (import.meta.env.DEV) out.push("/__clips/" + c.file + "?v=" + c.v);
  if (d.base) out.push(d.base.replace(/\/+$/, "") + "/" + c.file + "?v=" + c.v);
  return out;
}

/** undefined = 아직 찾는 중, null = 영상 없음 */
export function useClip(slug: string, artistId: string): { clip: Clip; urls: string[] } | null | undefined {
  const [state, setState] = useState<{ clip: Clip; urls: string[] } | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setState(undefined);
    loadClips().then((d) => {
      if (!alive) return;
      const clip = findClip(d, slug, artistId);
      const urls = d && clip ? clipUrls(d, clip) : [];
      setState(clip && urls.length ? { clip, urls } : null);
    });
    return () => {
      alive = false;
    };
  }, [slug, artistId]);
  return state;
}
