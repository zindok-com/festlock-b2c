// 안드로이드 뒤로가기(·iOS 스와이프 뒤로)로 열린 창을 닫는다.
// 창이 열릴 때 history에 한 칸을 넣고, 뒤로가기(popstate)가 오면 가장 위의 창 하나만 닫는다.
// 창을 버튼으로 닫으면 넣어 둔 한 칸을 history.back()으로 빼되, 그 popstate는 무시한다.
import { useEffect, useRef } from "react";

interface Entry {
  id: string;
  close: () => void;
}
const stack: Entry[] = [];
let ignore = 0;
let listening = false;

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("popstate", () => {
    if (ignore > 0) {
      ignore--;
      return;
    }
    stack.pop()?.close();
  });
}

/** open인 동안 뒤로가기를 누르면 close가 불린다 */
export function useBackClose(open: boolean, close: () => void) {
  const ref = useRef(close);
  ref.current = close;
  useEffect(() => {
    if (!open) return;
    listen();
    const id = Math.random().toString(36).slice(2);
    stack.push({ id, close: () => ref.current() });
    try {
      history.pushState({ ...(history.state ?? {}), overlay: id }, "");
    } catch {
      /* history 사용 불가 */
    }
    return () => {
      const i = stack.findIndex((e) => e.id === id);
      if (i < 0) return; // 뒤로가기로 이미 닫힘
      stack.splice(i, 1);
      ignore++;
      try {
        history.back();
      } catch {
        ignore--;
      }
    };
  }, [open]);
}
