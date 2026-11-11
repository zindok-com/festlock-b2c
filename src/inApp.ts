/** 인스타그램·카카오톡 등 앱 안에서 열린 브라우저 (이미지 공유·저장이 막혀 있고, 영상 자동 재생도 막힌다) */
export function inAppBrowser(): "kakao" | "instagram" | "other" | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|Line\/|NAVER\(inapp|DaumApps|everytimeApp|Twitter/i.test(ua)) return "other";
  return null;
}
export const IN_APP = inAppBrowser();

/** 같은 주소를 휴대폰 기본 브라우저로 여는 링크 (가능한 경우만) */
export function externalUrl(): string | null {
  const url = location.href;
  if (IN_APP === "kakao") return "kakaotalk://web/openExternal?url=" + encodeURIComponent(url);
  if (/Android/i.test(navigator.userAgent)) return "intent://" + url.replace(/^https?:\/\//, "") + "#Intent;scheme=https;package=com.android.chrome;end";
  return null; // 아이폰 인스타 안 브라우저는 오른쪽 위 ⋯ 메뉴로만 열 수 있다
}
