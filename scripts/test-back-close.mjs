// ✕ / 건너뛰기 / 뒤로가기를 눌렀을 때 홈페이지로 넘어가지 않고 그 페스티벌 화면에 머무는지 시험한다
// (docs/새-페스티벌-표준-지침.md 필수 7번, src/backClose.ts)
//
//   npm install --no-save playwright && npx playwright install webkit      (처음 한 번)
//   npm run dev                                       (다른 터미널. 개발 서버는 React StrictMode 라서 이 문제가 가장 잘 드러난다)
//   node scripts/test-back-close.mjs http://localhost:5173 <페스티벌 주소> <튜토리얼 저장 키> [칸 선택자]
//   예) node scripts/test-back-close.mjs http://localhost:5173 zonnafe-2026 fl:zon:tut
//       node scripts/test-back-close.mjs http://localhost:5173 nol-festival fl:nol:tut ".nr-hit"
// 배포용 빌드(npm run build && npx vite preview)로도 한 번 더 돌린다.
//
// 확인 순서: 홈에서 페스티벌 카드를 눌러 들어간다(뒤에 홈이 있는 상태) →
//   ① 아티스트 창을 열고 ✕  ② 창을 열고 뒤로가기  ③ 튜토리얼을 3단계까지 넘기고(시연 창이 열린 상태) 건너뛰기  ④ 튜토리얼 끝까지 넘겨서 마치기
//   → 매번 주소가 /<페스티벌 주소>로 그대로이고, 창·튜토리얼만 닫혀야 한다.
import { webkit, devices } from "playwright";

const [base = "http://localhost:5173", slug = "zonnafe-2026", tutKey = "fl:zon:tut", block = ".blk[data-id] .blk-hit"] = process.argv.slice(2);
const PATH = "/" + slug;
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
let bad = 0;
const check = (name, ok, extra = "") => {
  console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  " + extra : ""));
  if (!ok) bad++;
};
const where = () => page.evaluate(() => ({ path: location.pathname, sheet: !!document.querySelector(".sheet"), tut: !!document.querySelector(".tut") }));

/** 홈에서 카드를 눌러 들어온다 (뒤로 가면 홈이 나오는 상태를 만든다) */
async function enter(tutorial) {
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.evaluate(([k, on]) => (on ? localStorage.removeItem(k) : localStorage.setItem(k, "1")), [tutKey, tutorial]);
  await Promise.all([page.waitForURL("**" + PATH, { timeout: 15000 }), page.click(`a[href*="${slug}"]`)]);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector(block, { timeout: 15000 });
}
const openSheet = () => page.evaluate((sel) => document.querySelector(sel).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })), block);

let w;
try {
  // ① 아티스트 창 ✕
  await enter(false);
  await openSheet();
  await page.waitForSelector(".sheet .x");
  await page.waitForTimeout(600);
  await page.click(".sheet .x");
  await page.waitForTimeout(900);
  w = await where();
  check("① 아티스트 창 ✕ → 같은 화면에 머묾, 창만 닫힘", w.path === PATH && !w.sheet, JSON.stringify(w));
} catch (e) {
  check("① 아티스트 창 ✕", false, "시험 중 오류: " + String(e).split("\n")[0].slice(0, 140));
}

try {
  // ② 창을 열고 뒤로가기 (휴대폰 뒤로가기)
  await enter(false);
  await openSheet();
  await page.waitForSelector(".sheet .x");
  await page.waitForTimeout(600);
  await page.evaluate(() => history.back());
  await page.waitForTimeout(900);
  w = await where();
  check("② 창을 열고 뒤로가기 → 창만 닫히고 머묾", w.path === PATH && !w.sheet, JSON.stringify(w));
} catch (e) {
  check("② 창을 열고 뒤로가기 (휴대폰 뒤로가기)", false, "시험 중 오류: " + String(e).split("\n")[0].slice(0, 140));
}

try {
  // ③ 튜토리얼 3단계(시연 창이 열린 상태)에서 건너뛰기
  await enter(true);
  await page.waitForSelector(".tut-skip", { timeout: 15000 });
  for (let i = 0; i < 2; i++) {
    await page.waitForTimeout(500);
    await page.click(".tut-card .btn.main");
  }
  await page.waitForTimeout(1200);
  const mid = await where();
  await page.click(".tut-skip");
  await page.waitForTimeout(900);
  w = await where();
  check("③ 튜토리얼 3단계(창 열림)에서 건너뛰기 → 머묾, 튜토리얼·창 닫힘", mid.sheet && w.path === PATH && !w.tut && !w.sheet, "단계 중 창=" + mid.sheet + " " + JSON.stringify(w));
} catch (e) {
  check("③ 튜토리얼 3단계(시연 창이 열린 상태)에서 건너뛰기", false, "시험 중 오류: " + String(e).split("\n")[0].slice(0, 140));
}

try {
  // ④ 튜토리얼 끝까지
  await enter(true);
  await page.waitForSelector(".tut-skip", { timeout: 15000 });
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(600);
    if (!(await page.$(".tut"))) break;
    const last = await page.evaluate(() => {
      const [a, b] = document.querySelector(".tut-step").textContent.split("/").map((x) => Number(x.trim()));
      return a === b;
    });
    await page.click(".tut-card .btn.main");
    if (last) break;
  }
  await page.waitForTimeout(900);
  w = await where();
  check("④ 튜토리얼을 끝까지 → 머묾, 튜토리얼·창 닫힘", w.path === PATH && !w.tut && !w.sheet, JSON.stringify(w));
} catch (e) {
  check("④ 튜토리얼 끝까지", false, "시험 중 오류: " + String(e).split("\n")[0].slice(0, 140));
}

check("페이지 오류 없음", errors.length === 0, errors[0] ?? "");
await browser.close();
console.log(bad ? `\n실패 ${bad}건 — src/backClose.ts 와 docs/새-페스티벌-표준-지침.md 7번 참고` : "\n모두 통과");
process.exit(bad ? 1 : 0);
