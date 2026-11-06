// 페스티벌별 얼굴 사진 주소 (Vercel Blob). VITE_FACE_BASE가 비어 있으면 null → 이니셜 아이콘
import { faceSrc } from "../config";

/** 아직 사진이 없는 페스티벌 (없는 사진을 요청하지 않게) */
const NO_PHOTOS = new Set<string>([]);

export function festFace(fest: string, id: string | undefined): string | null {
  if (!id || NO_PHOTOS.has(fest)) return null;
  return faceSrc(fest + "/" + id);
}
