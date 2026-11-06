// 얼굴 사진은 저장소에 없고 Vercel Blob(공개 스토어)에 있다.
// VITE_FACE_BASE 예: https://<스토어id>.public.blob.vercel-storage.com/artists  (비우면 사진 없이 이니셜 아이콘)
const BASE = ((import.meta.env.VITE_FACE_BASE as string | undefined) || "").replace(/\/+$/, "");

export const SHOW_FACES = BASE !== "";

/** 사진 주소. 사진이 없는 배포(VITE_FACE_BASE 비어 있음)에서는 null */
export function faceSrc(id: string): string | null {
  return BASE ? BASE + "/" + id + ".webp" : null;
}

export const NOTICE =
  "비공식 정보 정리 페이지예요. EDC·Insomniac·주최측과 무관하며, 시간표는 공식 포스터 기준이라 변경될 수 있어요.";
