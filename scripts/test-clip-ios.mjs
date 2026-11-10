// 미리보기 영상(mp4)을 아이폰 엔진(WebKit)에서 확인한다. 사파리가 자동 재생을 막는 상황을 흉내 낸다.
//   npm install --no-save playwright && npx playwright install webkit      (처음 한 번)
//   npm run build && npx vite preview --port 5200                           (다른 터미널)
//   node scripts/test-clip-ios.mjs http://localhost:5200 sound-blocked      소리 있는 코드 재생 거절 (아이폰 사파리)
//   node scripts/test-clip-ios.mjs http://localhost:5200 all-blocked        소리 없이도 거절 (저전력 모드·앱 안 브라우저)
// 기대 결과: sound-blocked → 소리 없이 재생 + "소리 켜기" 버튼, 탭하면 muted=false / all-blocked → ▶ 표지, 탭하면 소리와 함께 재생
// 자세한 내용: docs/영상-미리보기-플레이어-지침.md 5장. ZONNAFE 페이지의 ak 아티스트로 시험한다 (다른 페스티벌이면 주소·id를 바꾼다)
import { webkit, devices } from "playwright";
const BASE = process.argv[2] || "http://localhost:5200";
const policy = process.argv[3] || "sound-blocked";
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
await ctx.addInitScript((policy) => {
  try { localStorage.setItem("fl:zon:tut", "1"); localStorage.setItem("fl:zon:nudge", "1"); } catch {}
  window.__ev = [];
  const orig = HTMLMediaElement.prototype.play;
  window.__hasUA = !!navigator.userActivation;
  HTMLMediaElement.prototype.play = function () {
    // 이 테스트에서 "사용자가 누른 것"은 오직 tapped 플래그가 켜진 동안 (실제 탭 이벤트 핸들러 안)
    const gesture = !!window.__tapping;
    const blocked = !gesture && (policy === "all-blocked" || !this.muted);
    window.__ev.push(`play() muted=${this.muted} gesture=${gesture} -> ${blocked ? "REJECT" : "allow"}`);
    if (blocked) return Promise.reject(new DOMException("blocked by test policy", "NotAllowedError"));
    return orig.call(this);
  };
  // 실제 터치/클릭이 시작되면 그 이벤트 처리 동안만 "사용자 동작"으로 본다
  for (const n of ["pointerdown", "pointerup", "click", "touchend"]) document.addEventListener(n, (e) => { if (e.isTrusted) { window.__tapping = true; setTimeout(() => (window.__tapping = false), 0); } }, true);
}, policy);
const page = await ctx.newPage();
await page.goto(BASE + "/zonnafe-2026", { waitUntil: "networkidle" });
const state = () => page.evaluate(() => { const v = document.querySelector(".clip-video"); return v ? { paused: v.paused, muted: v.muted, t: +v.currentTime.toFixed(2), cover: !!document.querySelector(".clip-cover"), soundBtn: !!document.querySelector(".clip-sound") } : { video: false }; });
await page.evaluate(() => document.querySelector('.blk[data-id="ak"] .blk-hit').dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })));
await page.waitForTimeout(3500);
console.log(`[${policy}] hasUserActivation=${await page.evaluate(() => window.__hasUA)}`);
console.log("calls:", (await page.evaluate(() => window.__ev)).join(" | "));
console.log("① after auto:", JSON.stringify(await state()));
if (await page.$(".clip-sound")) { await page.tap(".clip-sound"); await page.waitForTimeout(400); console.log("② after tapping sound:", JSON.stringify(await state())); }
if (await page.$(".clip-cover")) { await page.tap(".clip-cover"); await page.waitForTimeout(1500); console.log("② after tapping cover:", JSON.stringify(await state()), "| calls:", (await page.evaluate(() => window.__ev)).slice(-2).join(" | ")); }
await browser.close();
