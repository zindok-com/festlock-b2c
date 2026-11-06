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
