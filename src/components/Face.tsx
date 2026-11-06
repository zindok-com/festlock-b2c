import { useState } from "react";
import { SHOW_FACES, faceSrc } from "../config";
import { initials, type Item } from "../data";

/** 얼굴 사진(private만). 없거나 로딩 실패하면 이니셜 아이콘. public에서는 <img>를 아예 렌더하지 않는다. */
export function Face({ it, imgClass, initClass, size }: { it: Item; imgClass: string; initClass: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const src = SHOW_FACES ? faceSrc(it.id) : null;
  if (src && !failed) {
    return (
      <img
        className={imgClass}
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={initClass} aria-hidden="true">
      {initials(it.name)}
    </span>
  );
}
