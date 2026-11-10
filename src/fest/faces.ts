// 페스티벌별 얼굴 사진 주소 (Vercel Blob). VITE_FACE_BASE가 비어 있으면 null → 이니셜 아이콘
import { faceSrc } from "../config";

/** 아직 사진이 없는 페스티벌 (없는 사진을 요청하지 않게) */
const NO_PHOTOS = new Set<string>([]);

/**
 * 사진을 바꿔서 같은 이름으로 다시 올렸을 때 올리는 번호. 주소 뒤에 ?v=번호가 붙어서
 * 브라우저·CDN이 30일 캐시한 옛 사진 대신 새 사진을 받는다 (페스티벌별, 없으면 안 붙음)
 */
const PHOTO_VERSION: Record<string, string> = { zon: "5" };

export function festFace(fest: string, id: string | undefined): string | null {
  if (!id || NO_PHOTOS.has(fest)) return null;
  const src = faceSrc(fest + "/" + id);
  const v = PHOTO_VERSION[fest];
  return src && v ? src + "?v=" + v : src;
}
