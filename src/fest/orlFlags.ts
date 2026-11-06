// 이 브라우저에만 기억하는 켜기/끄기 (장르 보기 등)
import { useCallback, useState } from "react";

export function useLocalFlag(key: string, init: boolean): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(() => {
    try {
      const r = localStorage.getItem(key);
      return r == null ? init : r === "1";
    } catch {
      return init;
    }
  });
  const set = useCallback(
    (nv: boolean) => {
      setV(nv);
      try {
        localStorage.setItem(key, nv ? "1" : "0");
      } catch {
        /* 저장 안 돼도 동작 */
      }
    },
    [key],
  );
  return [v, set];
}
