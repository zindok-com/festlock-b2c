// 새 페스티벌·카드 모양(테마) 자동 검수. 체크리스트: docs/검수-체크리스트.md
//   npm run build && npx vite preview --port 5201 &   (사진이 보이려면 VITE_FACE_BASE=https://…/artists 로 빌드)
//   node scripts/qa-all.mjs [--base http://localhost:5201] [--only data,pages,sheet,export,tutorial,lang,logic,home] [--shots <폴더>]
// 결과: 콘솔 표 + _inbox/qa-report.md
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";
import esbuild from "esbuild";

const args = process.argv.slice(2);
const val = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const BASE = val("--base", "http://localhost:5201");
const ONLY = new Set((val("--only", "data,pages,sheet,export,tutorial,lang,logic,home") || "").split(","));
const SHOTS = val("--shots", "");
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const THEMES = ["poster", "glass", "minimal", "duo", "lock", "polaroid", "term", "mono"];
const FESTS = {
  zon: { path: "/zonnafe-2026", tut: "fl:zon:tut", picks: ["fiore", "kei", "hao"], sheet: "flash-finger", day: "sat", file: "zon" },
  utw: { path: "/ultra-taiwan-2026", tut: "fl:utw:tut", picks: ["alyshia", "mykris", "veena"], sheet: "levity", file: "utw" },
  tml: { path: "/tomorrowland-thailand-2026", tut: "fl:tml:tut", picks: ["alan-walker", "vini-vici", "halo"], sheet: "martin-garrix", file: "tml", multi: true },
  vac: { path: "/vac-2026", tut: "fl:vac:tut", picks: ["above-and-beyond", "chris-lorenzo", "cid"], sheet: "dj-snake", file: "vac", multi: true },
};
const LOCALES = { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN", zht: "zh-TW", es: "es-ES", vi: "vi-VN", th: "th-TH", id: "id-ID" };

const results = [];
const rec = (area, name, ok, detail = "") => {
  results.push({ area, name, ok, detail });
  if (!ok) console.log("  ✖", area, name, detail);
};
async function check(area, name, fn) {
  try {
    const r = await fn();
    if (r === false) rec(area, name, false);
    else if (typeof r === "string") rec(area, name, false, r);
    else rec(area, name, true);
  } catch (e) {
    rec(area, name, false, String(e.message || e).split("\n")[0].slice(0, 160));
  }
}

// ---------------------------------------------------------------- 1. 데이터
async function dataChecks() {
  const dir = path.resolve(".cache-qa");
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ["zon", "utw", "tml", "vac"]) {
    const out = path.join(dir, f + ".mjs");
    esbuild.buildSync({ entryPoints: [`src/fest/${f}.ts`], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent", define: { "import.meta.env": "{}" } });
    const m = await import(pathToFileURL(out).href + "?" + Date.now());
    const P = f.toUpperCase();
    const items = m[P + "_ITEMS"], stages = m[P + "_STAGES"], days = m[P + "_DAYS"];
    const dayIds = new Set(days.map((d) => d.id)), stageKeys = new Set(stages.map((s) => s.key));
    // B2B(두 사람) 사진 목록(b2b.ts)이 실제 B2B 칸과 맞고, 올라간 사진 3장(-a -b -cut)이 저장소에 있다
    await check("data", `${f}: B2B_READY 에 적은 칸이 실제 B2B 칸이고 사진 3장이 저장소에 있다`, async () => {
      const src = fs.readFileSync("src/fest/b2b.ts", "utf8");
      const mm = src.match(new RegExp("  " + f + ": new Set<string>\\(\\[([^\\]]*)\\]\\)"));
      const ready = mm ? [...mm[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      const bad = ready.filter((id) => !byId[id] || !/\bB[23]B\b/i.test(byId[id].en));
      if (bad.length) return "B2B 칸이 아님: " + bad.join(",");
      const base = (process.env.FACE_BASE || "https://kecmccxmmkdee3ng.public.blob.vercel-storage.com/artists").replace(/\/+$/, "");
      for (const id of ready)
        for (const k of ["a", "b", "cut"]) {
          const r = await fetch(`${base}/${f}/b2b/${id}-${k}.webp`, { method: "HEAD" }).catch(() => null);
          if (!r || !r.ok) return `${id}-${k}.webp 가 저장소에 없음`;
        }
      return true;
    });
    // 자체 사진 목록(ownPhotos.ts)의 칸이 실제 라인업에 있고, 사진이 저장소에 올라가 있다
    await check("data", `${f}: OWN_PHOTOS 의 칸이 라인업에 있고 사진이 저장소에 있다`, async () => {
      const src = fs.readFileSync("src/fest/ownPhotos.ts", "utf8");
      const mm = src.match(new RegExp("  " + f + ": new Set<string>\\(\\[([^\\]]*)\\]\\)"));
      const own = mm ? [...mm[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
      const baseIds = new Set(items.map((i) => i.id.replace(/-(fri|sat|sun)$/, "")));
      const bad = own.filter((id) => !baseIds.has(id));
      if (bad.length) return "라인업에 없는 id: " + bad.join(",");
      const base = (process.env.FACE_BASE || "https://kecmccxmmkdee3ng.public.blob.vercel-storage.com/artists").replace(/\/+$/, "");
      const missing = [];
      for (let i = 0; i < own.length; i += 12)
        await Promise.all(own.slice(i, i + 12).map(async (id) => {
          const r = await fetch(`${base}/${f}/${id}.webp`, { method: "HEAD" }).catch(() => null);
          if (!r || !r.ok) missing.push(id);
        }));
      return missing.length ? "저장소에 없음: " + missing.slice(0, 8).join(",") : true;
    });
    await check("data", `${f}: 아이디가 겹치지 않는다`, () => {
      const seen = new Set(), dup = [];
      for (const i of items) (seen.has(i.id) ? dup.push(i.id) : seen.add(i.id));
      return dup.length ? "겹침: " + dup.slice(0, 5).join(",") : true;
    });
    await check("data", `${f}: 무대·날짜 키가 모두 정의돼 있다`, () => items.every((i) => stageKeys.has(i.stage) && dayIds.has(i.day)) || "정의되지 않은 키");
    await check("data", `${f}: 시작 < 끝, 시각 범위(0~36시)`, () => items.every((i) => i.s < i.e && i.s >= 0 && i.e <= 36 * 60) || "시각 이상");
    await check("data", `${f}: 같은 날·같은 무대에서 공연이 겹치지 않는다`, () => {
      const bad = [];
      for (const d of dayIds) for (const s of stageKeys) {
        const l = items.filter((i) => i.day === d && i.stage === s).sort((a, b) => a.s - b.s);
        for (let k = 0; k < l.length - 1; k++) if (l[k].e > l[k + 1].s) bad.push(`${d}/${s}/${l[k].id}`);
      }
      return bad.length ? "겹침: " + bad.slice(0, 4).join(",") : true;
    });
    await check("data", `${f}: 이름이 비어 있지 않고 id 가 소문자-하이픈`, () => items.every((i) => i.en && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(i.id)) || "이름/ID 형식");
    await check("data", `${f}: 날짜 라벨이 5개 언어 모두 있다`, () => days.every((d) => ["ko", "en", "ja", "zh", "zht"].every((l) => d.label[l])) || "라벨 누락");
    rec("data", `${f}: 공연 ${items.length}개 · 무대 ${stages.length} · ${days.length}일 · 장르 ${items.filter((i) => i.genre).length}개`, true);
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------- 브라우저 도우미
async function ctxFor(browser, { w = 412, h = 900, locale = "ko-KR", ua } = {}) {
  return browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale, userAgent: ua });
}
function watch(p) {
  const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/Failed to load resource/.test(t) && /(favicon|fonts\.g|googleapis|gstatic|youtube|ytimg|vercel-storage|_vercel)/.test(t + m.location()?.url)) return;
    if (/pagead|Permissions policy|compute-pressure|youtube|doubleclick/i.test(t + (m.location()?.url || ""))) return; // 유튜브 플레이어·구글 광고 추적 픽셀(외부)이 내는 메시지
    errs.push("console: " + t.slice(0, 140));
  });
  return errs;
}
async function open(browser, f, { theme, locale = "ko-KR", w = 412, h = 900, tut = true, day, ua } = {}) {
  const ctx = await ctxFor(browser, { w, h, locale, ua });
  const p = await ctx.newPage();
  const errs = watch(p);
  // 열린 직후 "옆으로 살짝 밀어 보여 주기" 안내 동작(nudge)이 길게 누르기를 취소시키므로 미리 끈다
  await p.addInitScript(([k, th, on]) => { try { if (on) localStorage.setItem(k, "1"); else localStorage.removeItem(k); localStorage.setItem(k.replace(":tut", ":nudge"), "1"); if (th) localStorage.setItem("fl:cardtheme", th); } catch {} }, [f.tut, theme, tut]);
  await p.goto(BASE + f.path, { waitUntil: "load" });
  await p.waitForSelector(".blk", { timeout: 15000 });
  if (day) await p.locator(".ft-days button").nth(day).click();
  return { ctx, p, errs };
}
async function pick(p, ids) {
  let n = 0;
  for (const id of ids) {
    const loc = p.locator(`.blk[data-id="${id}"] button`).first();
    if (!(await loc.count())) continue;
    await loc.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await p.waitForTimeout(80);
    await loc.click({ position: { x: 8, y: 8 } }).catch(() => {});
    n++;
  }
  await p.waitForTimeout(200);
  return n;
}

// ---------------------------------------------------------------- 2. 화면 (페스티벌 × 모양)
async function pageChecks(browser) {
  for (const [fk, f] of Object.entries(FESTS)) {
    for (const th of THEMES) {
      const { ctx, p, errs } = await open(browser, f, { theme: th });
      const name = `${fk}/${th}`;
      await check("pages", `${name}: 모양이 적용됐다 (data-ct)`, async () => (await p.evaluate(() => document.querySelector(".wrap.zon")?.dataset.ct)) === th || "data-ct 불일치");
      await check("pages", `${name}: 카드를 고르면 켜진다`, async () => {
        await pick(p, f.picks);
        const on = await p.locator(".blk.on").count();
        return on >= f.picks.length - 0 ? true : `켜진 칸 ${on}/${f.picks.length}`;
      });
      await check("pages", `${name}: 화면이 옆으로 넘치지 않는다`, async () => (await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)) || "가로 넘침");
      await check("pages", `${name}: 이름 글자가 칸 안에 보인다`, async () => {
        const bad = await p.evaluate(() => [...document.querySelectorAll(".blk .nm")].filter((n) => { const b = n.closest(".blk").getBoundingClientRect(), r = n.getBoundingClientRect(); return b.height > 0 && r.width > 0 && (r.right > b.right + 2 || r.bottom > b.bottom + 4); }).length);
        return bad === 0 ? true : `칸 밖으로 나간 이름 ${bad}개`;
      });
      await check("pages", `${name}: 오류 없음`, () => (errs.length ? errs.slice(0, 2).join(" | ") : true));
      if (SHOTS && ["zon", "tml"].includes(fk)) {
        await p.locator(".zon-wrap").scrollIntoViewIfNeeded();
        await p.screenshot({ path: path.join(SHOTS, `page-${fk}-${th}.png`) });
      }
      await ctx.close();
    }
  }
}

// ---------------------------------------------------------------- 3. 아티스트 창 (모양마다, 듣기 버튼은 원래 색)
async function sheetChecks(browser) {
  for (const [fk, f] of Object.entries(FESTS)) {
    for (const th of THEMES) {
      const { ctx, p, errs } = await open(browser, f, { theme: th });
      const name = `${fk}/${th}`;
      const loc = p.locator(`.blk[data-id="${f.sheet}"] button`).first();
      await loc.evaluate((e) => e.scrollIntoView({ block: "center" }));
      await p.waitForTimeout(600); // 스크롤이 끝난 뒤의 좌표를 쓴다
      const bb = await loc.boundingBox();
      await p.mouse.move(bb.x + 10, bb.y + 10);
      await p.mouse.down();
      await p.waitForTimeout(900);
      await p.mouse.up();
      await check("sheet", `${name}: 길게 누르면 아티스트 창이 열리고 모양을 따른다`, async () => {
        await p.waitForSelector(".sheet", { timeout: 6000 });
        const ct = await p.evaluate(() => document.querySelector(".sheet")?.dataset.ct);
        return ct === th ? true : `sheet data-ct=${ct}`;
      });
      await p.waitForTimeout(1600);
      await check("sheet", `${name}: 스포티파이·유튜브·애플뮤직 버튼 색이 그대로다`, async () => {
        const c = await p.evaluate(() => ({ sp: getComputedStyle(document.querySelector(".link.sp")).backgroundColor, yt: getComputedStyle(document.querySelector(".link.yt")).backgroundColor }));
        return c.sp === "rgb(29, 185, 84)" && c.yt === "rgb(255, 0, 51)" ? true : JSON.stringify(c);
      });
      await check("sheet", `${name}: 창이 화면 안에 있고 담기 버튼이 보인다`, async () => {
        const r = await p.evaluate(() => { const c = document.querySelector(".sheet .card").getBoundingClientRect(); const t = document.querySelector(".sheet .toggle"); return { top: c.top, bottom: c.bottom, vh: innerHeight, tog: !!t }; });
        return r.top >= -1 && r.bottom <= r.vh + 1 && r.tog ? true : JSON.stringify(r);
      });
      await check("sheet", `${name}: ✕로 닫힌다`, async () => { await p.locator(".sheet .x").click(); await p.waitForTimeout(400); return (await p.locator(".sheet").count()) === 0 || "창이 안 닫힘"; });
      await check("sheet", `${name}: 오류 없음`, () => (errs.length ? errs.slice(0, 2).join(" | ") : true));
      if (SHOTS && fk === "utw") { /* 필요하면 열린 채 캡처 */ }
      await ctx.close();
    }
  }
}

/** 카드 모양 고르기: 버튼을 눌러 팝업을 열고 모양을 고른다 (팝업은 고르면 닫힌다) */
async function pickTheme(p, scope, re) {
  await p.locator(scope + " .ct-open").first().click();
  await p.waitForSelector(".ctp-grid");
  await p.locator(".ctp-item", { hasText: re }).first().click();
  await p.locator(".ctp-apply").click();
  await p.waitForSelector(".ctp", { state: "detached", timeout: 3000 });
}

// ---------------------------------------------------------------- 4. 내보내기 이미지 (페스티벌 × 모양)
async function exportChecks(browser) {
  const names = { poster: /포스터/, glass: /포토 글라스/, minimal: /미니멀/, duo: /듀오톤/, lock: /글라스 잠금/, polaroid: /폴라로이드/, term: /터미널/, mono: /모노 포토/ };
  for (const [fk, f] of Object.entries(FESTS)) {
    const { ctx, p, errs } = await open(browser, f, { theme: "glass" });
    await pick(p, f.picks);
    await p.locator(".bar .btn.main").first().click();
    await p.waitForSelector(".pv img", { timeout: 20000 });
    for (const th of THEMES) {
      await pickTheme(p, ".fx-card", names[th]);
      await p.waitForTimeout(2300);
      await check("export", `${fk}/${th}: 이미지가 만들어지고 비어 있지 않다`, async () => {
        const src = await p.locator(".pv img").first().getAttribute("src");
        const buf = Buffer.from(src.split(",")[1], "base64");
        const m = await sharp(buf).metadata();
        const st = await sharp(buf).stats();
        const sd = st.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3;
        if (SHOTS) fs.writeFileSync(path.join(SHOTS, `export-${fk}-${th}.png`), buf);
        if (m.width !== 1080 || ![1920, 2280].includes(m.height)) return `크기 ${m.width}x${m.height}`;
        return sd > 14 ? true : `거의 단색 (stdev ${sd.toFixed(1)})`;
      });
    }
    await check("export", `${fk}: 오류 없음`, () => (errs.length ? errs.slice(0, 2).join(" | ") : true));
    await ctx.close();
  }
}

// ---------------------------------------------------------------- 5. 튜토리얼
async function tutorialChecks(browser) {
  for (const [fk, f] of Object.entries(FESTS)) {
    for (const size of [{ w: 412, h: 860 }, { w: 360, h: 640 }]) {
      const { ctx, p, errs } = await open(browser, f, { tut: false, ...size });
      const tag = `${fk} ${size.w}x${size.h}`;
      await p.waitForSelector(".tut-card", { timeout: 15000 });
      const steps = [];
      let first = true;
      for (let i = 0; i < 9; i++) {
        await p.waitForTimeout(first ? 1100 : 1300);
        first = false;
        const info = await p.evaluate(() => { const c = document.querySelector(".tut-card").getBoundingClientRect(); return { step: document.querySelector(".tut-step")?.textContent.trim(), title: document.querySelector(".tut-card strong")?.textContent, top: c.top, bottom: c.bottom, vh: innerHeight }; });
        steps.push(info);
        const [a, z] = info.step.split("/").map((x) => parseInt(x));
        if (i === 0 && size.w === 412) await pickTheme(p, ".tut-card", /폴라로이드/).catch(() => {});
        if (a === z) break;
        await p.locator(".tut-acts .btn.main").click();
      }
      await check("tutorial", `${tag}: 단계 수·카드 모양 단계 포함`, () => (steps.length >= 5 && /카드 모양/.test(steps[0].title) ? true : `단계 ${steps.length} / ${steps[0]?.title}`));
      await check("tutorial", `${tag}: 모든 단계에서 설명 카드가 화면 안에 있다`, () => { const bad = steps.filter((s) => s.top < -1 || s.bottom > s.vh + 1); return bad.length ? `밖으로 나간 단계: ${bad.map((b) => b.step).join(",")}` : true; });
      if (size.w === 412) await check("tutorial", `${tag}: 1단계에서 고른 모양이 이후 단계에 적용된다`, async () => (await p.evaluate(() => document.querySelector(".wrap.zon").dataset.ct)) === "polaroid" || "적용 안 됨");
      await check("tutorial", `${tag}: 오류 없음`, () => (errs.length ? errs.slice(0, 2).join(" | ") : true));
      await ctx.close();
    }
  }
}

// ---------------------------------------------------------------- 6. 언어 (9개)
async function langChecks(browser) {
  const want = { ko: "ko", en: "en", ja: "ja", zh: "zh-Hans", zht: "zh-Hant", es: "es", vi: "vi", th: "th", id: "id" };
  for (const [fk, f] of Object.entries(FESTS)) {
    for (const [lk, loc] of Object.entries(LOCALES)) {
      const { ctx, p, errs } = await open(browser, f, { locale: loc, theme: "glass" });
      await check("lang", `${fk}/${lk}: html lang=${want[lk]}, 문구 키가 그대로 보이지 않는다`, async () => {
        const r = await p.evaluate(() => ({ lang: document.documentElement.lang, raw: (document.body.innerText.match(/\b(f|tut|exp|blk|art|sum|home)\.[a-z0-9]+(\.[a-z0-9]+)*\b/g) || []).filter((x) => !/\.(com|io|app)$/.test(x)).slice(0, 4), title: document.title }));
        if (r.lang !== want[lk]) return `lang=${r.lang}`;
        return r.raw.length ? "키 노출: " + r.raw.join(",") : true;
      });
      await check("lang", `${fk}/${lk}: 오류 없음`, () => (errs.length ? errs.slice(0, 1).join(" | ") : true));
      await ctx.close();
    }
  }
}

// ---------------------------------------------------------------- 7. 동작 (다일·겹침·저장)
async function logicChecks(browser) {
  for (const fk of ["tml", "vac"]) {
    const f = FESTS[fk];
    const { ctx, p, errs } = await open(browser, f, { theme: "glass" });
    const tabs = await p.locator(".ft-days button").count();
    await check("logic", `${fk}: 날짜 탭 ${tabs}개`, () => tabs === (fk === "tml" ? 3 : 2) || `탭 ${tabs}`);
    const c0 = await p.locator(".blk").count();
    await p.locator(".ft-days button").nth(1).click();
    await p.waitForTimeout(300);
    const c1 = await p.locator(".blk").count();
    await check("logic", `${fk}: 날짜를 바꾸면 다른 공연이 보인다`, () => (c0 !== c1 || fk === "vac" ? true : `칸 수 ${c0}→${c1}`));
    // 다른 날 같은 시각 공연을 골라도 "시간 겹침"이 뜨지 않는다
    const a = fk === "tml" ? ["fri", "martin-garrix", "sat", "steve-aoki"] : ["sat", "dj-snake-b2b-knock2", "sun", "alesso"];
    await p.locator(".ft-days button").nth(0).click();
    await pick(p, [a[1]]);
    await p.locator(".ft-days button").nth(1).click();
    await pick(p, [a[3]]);
    await check("logic", `${fk}: 다른 날 공연끼리는 시간이 겹쳐도 경고하지 않는다`, async () => {
      const sum = (await p.locator(".sum").textContent()) || "";
      return /겹침/.test(sum) ? "다른 날인데 겹침 경고: " + sum.trim() : true;
    });
    await check("logic", `${fk}: 날짜 탭에 고른 개수가 보인다`, async () => (await p.locator(".ft-days button i").count()) >= 2 || "개수 배지 없음");
    await p.reload({ waitUntil: "load" });
    await p.waitForSelector(".blk");
    await check("logic", `${fk}: 새로고침해도 고른 공연이 남는다`, async () => {
      const t = (await p.locator(".sum").textContent()) || "";
      return /2팀/.test(t) ? true : "선택 유실: " + t.trim();
    });
    // 인스타 앱 안 브라우저: 저장 누르면 안내
    await p.locator(".bar .btn.main").first().click();
    await p.waitForSelector(".pv img", { timeout: 20000 });
    await check("logic", `${fk}: 내보내기 창에 날짜 탭(${fk === "tml" ? 3 : 2})과 카드 모양 버튼·팝업 8개`, async () => {
      const segs = await p.locator(".fx-card .seg").first().locator("button").count();
      await p.locator(".fx-card .ct-open").first().click();
      await p.waitForSelector(".ctp-grid");
      const chips = await p.locator(".ctp-item").count();
      const tiles = await p.locator(".ctp-tile .blk").count();
      await p.locator(".ctp-item").nth(3).click();
      const anim = await p.evaluate(async () => { const el = document.querySelector('.ctp-item:nth-child(4) .blk'); const a = el.classList.contains("on"); const seen = new Set([a]); for (let i = 0; i < 12; i++) { await new Promise((r) => setTimeout(r, 300)); seen.add(el.classList.contains("on")); } const other = document.querySelector('.ctp-item:nth-child(2) .blk'); return seen.size === 2 && !other.classList.contains("on"); });
      await p.keyboard.press("Escape");
      await p.waitForSelector(".ctp", { state: "detached", timeout: 3000 });
      return segs === (fk === "tml" ? 3 : 2) && chips === 8 && tiles === 8 && anim ? true : `탭 ${segs} 팝업 ${chips} 미리보기 ${tiles} 고른 것만 움직임 ${anim}`;
    });
    await check("logic", `${fk}: 오류 없음`, () => (errs.length ? errs.slice(0, 2).join(" | ") : true));
    await ctx.close();
  }
  // 거꾸로 보기: 늦은 시간이 위로 온다
  for (const [fk, f] of Object.entries(FESTS)) {
    const { ctx, p, errs } = await open(browser, f, { theme: "glass" });
    const hourTops = () => p.evaluate(() => [...document.querySelectorAll(".axis span")].map((s) => ({ t: s.textContent.trim(), top: parseFloat(s.style.top) })));
    const order = () => p.evaluate(() => { const l = [...document.querySelectorAll(".col")][0]; return [...l.querySelectorAll(".blk")].map((b) => ({ id: b.dataset.id, top: b.getBoundingClientRect().top + scrollY })).sort((a, b) => a.top - b.top).map((x) => x.id); });
    const before = await hourTops();
    const orderBefore = await order();
    await p.locator(".ct-menu .chip.rev").click();
    await p.waitForTimeout(300);
    const after = await hourTops();
    const orderAfter = await order();
    await check("logic", fk + ": 거꾸로 보기를 누르면 시간 눈금이 뒤집힌다 (늦은 시각이 맨 위)", () => {
      const firstB = [...before].sort((a, b) => a.top - b.top)[0].t, firstA = [...after].sort((a, b) => a.top - b.top)[0].t;
      const lastB = [...before].sort((a, b) => b.top - a.top)[0].t;
      return firstA === lastB && firstA !== firstB ? true : "위쪽 눈금 " + firstB + " → " + firstA;
    });
    await check("logic", fk + ": 거꾸로 보기에서 공연 순서가 정확히 반대가 된다", () => (orderBefore.length > 2 && orderBefore.slice().reverse().join(",") === orderAfter.join(",") ? true : "순서 불일치: " + orderBefore.slice(0, 3) + " / " + orderAfter.slice(0, 3)));
    await p.reload({ waitUntil: "load" });
    await p.waitForSelector(".blk");
    await check("logic", fk + ": 거꾸로 보기 설정이 새로고침 후에도 남는다", async () => (await p.locator(".ct-menu .chip.rev").getAttribute("aria-pressed")) === "true" || "설정 유실");
    await check("logic", fk + ": 오류 없음 (거꾸로 보기)", () => (errs.length ? errs.slice(0, 2).join(" | ") : true));
    await ctx.close();
  }
  // 인스타 앱 안 브라우저 UA 에서 저장 안내
  const IG = "Mozilla/5.0 (Linux; Android 13; SM-S918N Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 320.0.0.0.0 Android";
  const { ctx, p } = await open(browser, FESTS.tml, { ua: IG });
  await pick(p, ["alan-walker"]);
  await p.locator(".bar .btn.main").first().click();
  await p.waitForSelector(".pv img", { timeout: 20000 });
  await p.locator(".acts .btn.main").first().click();
  await check("logic", "tml: 인스타 앱 안 브라우저에서 저장 안내가 뜬다", async () => { await p.waitForTimeout(500); return (await p.locator(".evt h2").count()) > 0 || "안내창 없음"; });
  await ctx.close();
}

// ---------------------------------------------------------------- 8. 홈·주소
async function homeChecks(browser) {
  const ctx = await ctxFor(browser);
  const p = await ctx.newPage();
  const errs = watch(p);
  await p.goto(BASE + "/", { waitUntil: "load" });
  await p.waitForTimeout(1200);
  const text = await p.evaluate(() => document.body.innerText);
  await check("home", "홈 목록에 Tomorrowland Thailand 가 보인다", () => /Tomorrowland|투모로우랜드/i.test(text) || "카드 없음");
  await check("home", "홈 목록에 VAC 가 보인다", () => /VAC/.test(text) || "카드 없음");
  for (const alias of ["/tml", "/vac", "/tomorrowland", "/ultra-taiwan-2026", "/zonnafe-2026", "/edc-korea-2026", "/grand-mint-festival", "/nol-festival", "/edc-orlando-2026"]) {
    await check("home", `${alias} 가 열린다`, async () => {
      const r = await p.goto(BASE + alias, { waitUntil: "load" });
      await p.waitForTimeout(900);
      const n = await p.locator(".blk, .gb, .nr, [data-id]").count();
      return r && r.ok() && n > 0 ? true : `status ${r?.status()} 칸 ${n}`;
    });
  }
  await check("home", "홈·주소 이동 중 오류 없음", () => (errs.length ? errs.slice(0, 2).join(" | ") : true));
  await ctx.close();
}

// ---------------------------------------------------------------- 실행
const t0 = Date.now();
if (ONLY.has("data")) await dataChecks();
const browser = await chromium.launch();
if (ONLY.has("pages")) await pageChecks(browser);
if (ONLY.has("sheet")) await sheetChecks(browser);
if (ONLY.has("export")) await exportChecks(browser);
if (ONLY.has("tutorial")) await tutorialChecks(browser);
if (ONLY.has("lang")) await langChecks(browser);
if (ONLY.has("logic")) await logicChecks(browser);
if (ONLY.has("home")) await homeChecks(browser);
await browser.close();

const fail = results.filter((r) => !r.ok);
const byArea = {};
for (const r of results) (byArea[r.area] ??= { ok: 0, fail: 0 })[r.ok ? "ok" : "fail"]++;
console.log("\n영역별 결과");
for (const [a, v] of Object.entries(byArea)) console.log(`  ${a.padEnd(9)} 통과 ${String(v.ok).padStart(3)}  실패 ${v.fail}`);
console.log(`\n총 ${results.length}건 · 실패 ${fail.length}건 · ${Math.round((Date.now() - t0) / 1000)}초`);
fs.mkdirSync("_inbox", { recursive: true });
const md = ["# 자동 검수 결과", "", `실행: ${new Date().toISOString()} · 주소: ${BASE}`, "", "| 영역 | 통과 | 실패 |", "|---|---|---|", ...Object.entries(byArea).map(([a, v]) => `| ${a} | ${v.ok} | ${v.fail} |`), "", fail.length ? "## 실패" : "## 실패 없음", ...fail.map((r) => `- **${r.area}** ${r.name} — ${r.detail}`), ""].join("\n");
fs.writeFileSync("_inbox/qa-report.md", md);
process.exit(fail.length ? 1 : 0);
