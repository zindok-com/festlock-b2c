// 페스티벌별 얼굴 사진 주소 (Vercel Blob). VITE_FACE_BASE가 비어 있으면 null → 이니셜 아이콘
import { faceSrc } from "../config";
import { b2bFaceSrc } from "./b2b";
import { FACE_ALIAS } from "./faceAlias";
import { OWN_PHOTOS } from "./ownPhotos";

/** 아직 사진이 전혀 없는 페스티벌 (없는 사진을 요청하지 않게) */
const NO_PHOTOS = new Set<string>([]);

/**
 * 자기 폴더에는 사진이 아직 없고, 다른 페스티벌에 이미 올라간 같은 아티스트 사진만 다시 쓰는 페스티벌 (faceAlias.ts).
 * 자기 폴더(faces-src/<fest> → scripts/upload-faces.mjs)에 사진을 올리면 여기서 해당 페스티벌을 빼면 된다.
 */
const ALIAS_ONLY = new Set<string>(["tml", "vac"]);

/**
 * 사진을 바꿔서 같은 이름으로 다시 올렸을 때 올리는 번호. 주소 뒤에 ?v=번호가 붙어서
 * 브라우저·CDN이 30일 캐시한 옛 사진 대신 새 사진을 받는다 (페스티벌별, 없으면 안 붙음)
 */
const PHOTO_VERSION: Record<string, string> = { zon: "9" };

export function festFace(fest: string, id: string | undefined): string | null {
  if (!id || NO_PHOTOS.has(fest)) return null;
  const bb = b2bFaceSrc(fest, id); // B2B 두 사람 사진(아티스트 창)
  if (bb) return bb;
  if (ALIAS_ONLY.has(fest)) {
    // 같은 아티스트가 여러 날 나오면 id 에 -fri/-sat/-sun 이 붙으므로 떼고 찾는다
    const base = id.replace(/-(fri|sat|sun)$/, "");
    // 자기 폴더에 올려 둔 사진(ownPhotos.ts)이 있으면 그걸 먼저, 없으면 다른 페스티벌 사진을 빌려 쓴다
    if (OWN_PHOTOS[fest]?.has(base)) return faceSrc(fest + "/" + base);
    const a = FACE_ALIAS[fest]?.[base];
    return a ? faceSrc(a) : null;
  }
  const src = faceSrc(fest + "/" + id);
  const v = PHOTO_VERSION[fest];
  return src && v ? src + "?v=" + v : src;
}
