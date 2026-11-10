// 안드로이드 뒤로가기(·iOS 스와이프 뒤로)로 열린 창을 닫는다.
// 창이 열릴 때 history에 한 칸을 넣고, 뒤로가기(popstate)가 오면 가장 위의 창 하나만 닫는다.
// 창을 버튼으로 닫으면 넣어 둔 한 칸을 history.back()으로 빼되, 그 popstate는 무시한다.
//
// 넣어 둔 history 칸 수(pushed)와 열려 있는 창 수(stack.length)를 항상 같게 맞춘다.
// 닫을 때 바로 back() 하지 않고 한 틱 뒤에 맞춘다(reconcile). 그래서
//  - React 개발 모드(StrictMode)가 "열기 → 닫기 → 다시 열기"를 한 번에 실행해도 칸이 어긋나지 않고
//  - 한 창을 닫는 순간 다른 창이 열려도(튜토리얼 → 아티스트 창) 불필요하게 뒤로 가지 않는다.
// (예전에는 어긋난 칸 때문에 ✕를 누르면 홈페이지로 넘어갔다.)
import { useEffect, useRef } from "react";

interface Entry {
  id: string;
  close: () => void;
}
const stack: Entry[] = [];
/** 우리가 history에 넣어 둔 칸 수 */
let pushed = 0;
/** 우리가 건 back()이 일으키는 popstate 수 (무시할 것) */
let ignore = 0;
let listening = false;
let timer: number | undefined;

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("popstate", () => {
    if (ignore > 0) {
      ignore--;
      return;
    }
    // 사용자가 뒤로가기를 눌렀다: 그 칸은 이미 빠졌으니 가장 위의 창만 닫는다
    if (!stack.length) return;
    if (pushed > 0) pushed--;
    stack.pop()?.close();
  });
}

/** 열려 있는 창 수보다 많이 넣어 둔 칸을 한 번에 뺀다 */
function reconcile() {
  timer = undefined;
  const extra = pushed - stack.length;
  if (extra <= 0) return;
  pushed -= extra;
  ignore++;
  try {
    history.go(-extra);
  } catch {
    ignore--;
  }
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
    if (pushed < stack.length) {
      try {
        history.pushState({ ...(history.state ?? {}), overlay: id }, "");
        pushed++;
      } catch {
        /* history 사용 불가 */
      }
    }
    return () => {
      const i = stack.findIndex((e) => e.id === id);
      if (i < 0) return; // 뒤로가기로 이미 닫힘
      stack.splice(i, 1);
      // 같은 틱에 다시 열리면(StrictMode, 창 교체) 넣어 둔 칸을 그대로 쓴다
      if (timer === undefined) timer = window.setTimeout(reconcile, 0);
    };
  }, [open]);
}
