// 사진·영상(Vercel Blob)을 못 불러오는지 지켜보고, 계속 실패하면 서버(api/blob-alert.ts)에 알린다.
// 서버가 사진 하나를 직접 확인해서 정말 막혀 있으면(예: Hobby 요금제 전송량 10GB 초과) 운영자 이메일로 한 통 보낸다.
// - 이 브라우저에서 Blob 파일이 3번 실패하면 한 번만 알린다 (같은 브라우저는 30분에 한 번까지)
// - 알리는 내용은 없다 (빈 요청). 사용자 정보·주소를 보내지 않는다
// - 개발 서버(npm run dev)와 내 PC(localhost)에서는 동작하지 않는다
const BLOB = /\.public\.blob\.vercel-storage\.com\//;
const KEY = "fl:blobfail";
const GAP_MS = 30 * 60 * 1000;

export function watchBlobHealth(): void {
  if (typeof window === "undefined" || import.meta.env.DEV) return;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
  let fails = 0;
  let sent = false;
  // 사진·영상 태그의 오류는 위로 전달되지 않아서, 맨 위에서 잡는다 (capture)
  window.addEventListener(
    "error",
    (e) => {
      const t = e.target;
      if (!(t instanceof HTMLImageElement || t instanceof HTMLVideoElement)) return;
      if (!BLOB.test(t.currentSrc || t.src || "")) return;
      if (++fails < 3 || sent) return;
      try {
        if (Date.now() - Number(localStorage.getItem(KEY) || 0) < GAP_MS) return;
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* 저장소 없음: 이 페이지에서 한 번만 */
      }
      sent = true;
      fetch("/api/blob-alert", { method: "POST", headers: { "content-type": "application/json" }, body: "{}", keepalive: true }).catch(() => undefined);
    },
    true,
  );
}
