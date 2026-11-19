// 나만의 컬렉션 화면 스크린샷 (412×900, 2배) → docs/band-collection/screens/
//   미리보기 서버가 떠 있어야 한다: npx vite preview --port 5201
//   node scripts/band-shots.mjs [--base http://localhost:5201]
import fs from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const BASE = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5201";
const OUT = "docs/band-collection/screens";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
async function shot(name, url, { scheme = "light", lang = "ko", full = false, act } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: scheme, locale: lang === "en" ? "en-US" : "ko-KR" });
  const p = await ctx.newPage();
  await p.addInitScript((l) => { try { localStorage.setItem("edc26:lang", l); } catch {} }, lang);
  await p.goto(BASE + url, { waitUntil: "load" });
  await p.waitForTimeout(900);
  if (act) await act(p);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("saved", name);
  await ctx.close();
}

await shot("01-home-button", "/");
await shot("02-hub-light", "/collection", { full: true });
await shot("03-hub-dark", "/collection", { scheme: "dark", full: true });
await shot("04-hub-fest-filter", "/collection?fest=zonnafe-2026");
await shot("05-collector", "/c/cdemo00001", { full: true });
await shot("06-collector-dark", "/c/cdemo00001", { scheme: "dark" });
await shot("07-add-soon-sheet", "/collection", { act: (p) => p.locator(".band-add").click() });
await shot("08-report-sheet", "/c/cdemo00001", { act: async (p) => { await p.locator(".band-report-btn").click(); await p.locator(".band-reasons label").nth(2).click(); } });
await shot("09-not-found", "/c/czzzzzzzzz");
await shot("10-hub-english", "/collection", { lang: "en" });
await shot("11-collector-english", "/c/cdemo00003", { lang: "en", scheme: "dark" });
await browser.close();
