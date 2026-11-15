// 시간표 보기 설정. 기기에 저장한다 (페스티벌이 달라도 같은 설정을 쓴다).
import { useCallback, useState } from "react";

const REV_KEY = "fl:reverse";

/** 거꾸로 보기: true 면 늦은 시간(헤드라이너)이 위, 이른 시간이 아래 */
export function useReverse(): [boolean, () => void] {
  const [rev, setRev] = useState<boolean>(() => {
    try {
      return localStorage.getItem(REV_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggle = useCallback(() => {
    setRev((v) => {
      const n = !v;
      try {
        localStorage.setItem(REV_KEY, n ? "1" : "0");
      } catch {
        /* 무시 */
      }
      return n;
    });
  }, []);
  return [rev, toggle];
}
