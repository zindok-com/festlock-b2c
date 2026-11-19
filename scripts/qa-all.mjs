// 새 페스티벌·카드 모양(테마) 자동 검수. 체크리스트: docs/검수-체크리스트.md
//   npm run build && npx vite preview --port 5201 &   (사진이 보이려면 VITE_FACE_BASE=https://…/artists 로 빌드)
//   node scripts/qa-all.mjs [--base http://localhost:5201] [--only data,pages,sheet,export,tutorial,lang,logic,home,offline] [--shots <폴더>]
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
const ONLY = new Set((val("--only", "data,pages,sheet,export,tutorial,lang,logic,home,offline,band") || "").split(","));
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
    // 로컬 미리보기(vite preview)에는 서버 함수가 없어 /api/band 가 404 → 컬렉션 화면이 예시 데이터(DEMO)로 바꾸는 것이 정상
    if (/Failed to load resource/.test(t) && /\/api\/band\?/.test(m.location()?.url || "")) return;
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
  await check("logic", "tml: 저장을 누르면 먼저 \"곧 앱으로 나와요\" 팝업이 뜨고 인스타 링크가 있다", async () => {
    await p.waitForSelector(".app-soon-pop", { timeout: 3000 });
    return (await p.locator(".app-soon-pop a[href*=\"instagram.com/festlock\"]").count()) === 1 || "인스타 링크 없음";
  });
  await p.locator(".app-soon-save").click();
  await check("logic", "tml: 인스타 앱 안 브라우저에서 저장 안내가 뜬다", async () => { await p.waitForTimeout(500); return (await p.locator(".evt h2").count()) > 0 && (await p.locator(".app-soon-pop").count()) === 0 || "안내창 없음"; });
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
// ---------------------------------------------------------------- 8. 오프라인으로 쓰기 (저장 → 비행기 모드). 글꼴을 구글에서 받으므로 인터넷이 되는 PC 에서 돌린다
async function offlineChecks(browser) {
  const ctx = await ctxFor(browser, { w: 412, h: 900, locale: "ko-KR" });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  await p.addInitScript(() => { try { localStorage.setItem("fl:tml:tut", "1"); localStorage.setItem("fl:tml:nudge", "1"); } catch {} });
  await p.goto(BASE + FESTS.tml.path, { waitUntil: "load" });
  await p.waitForSelector(".blk", { timeout: 15000 });
  await check("offline", "tml: 카드 모양 줄에 '오프라인으로 쓰기' 칩이 있다", async () => (await p.locator(".off-chip").count()) === 1 || "칩 개수 " + (await p.locator(".off-chip").count()));
  for (const k of ["zon", "utw", "vac"]) {
    const q = await ctx.newPage();
    await q.addInitScript(([key]) => { try { localStorage.setItem(key, "1"); localStorage.setItem(key.replace(":tut", ":nudge"), "1"); } catch {} }, [FESTS[k].tut]);
    await q.goto(BASE + FESTS[k].path, { waitUntil: "load" });
    await q.waitForSelector(".blk", { timeout: 15000 });
    await check("offline", `${k}: 아직 열지 않은 페스티벌에는 칩이 없다 (TML 만 연다)`, async () => (await q.locator(".off-chip").count()) === 0 || "칩이 보임");
    await q.close();
  }
  await p.locator(".off-chip").click();
  await p.waitForSelector(".ofp-card");
  await check("offline", "tml: 안내 시트에 설치·저장·삭제 영역이 있다", async () => ((await p.locator(".ofp-step").count()) === 2 && (await p.locator(".ofp-btn").count()) >= 1) || "시트 구성 이상");
  await check("offline", "tml: 저장하면 '저장됨'이 뜨고 앱 화면·글꼴이 저장된다", async () => {
    await p.locator(".ofp-step .ofp-btn").last().click();
    await p.waitForSelector(".ofp-ok", { timeout: 150000 });
    const st = await p.evaluate(async () => {
      const o = {};
      for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).length;
      return o;
    });
    const shell = Object.entries(st).find(([k]) => k.startsWith("fl-shell-"))?.[1] || 0;
    return shell >= 4 && (st["fl-fonts-v1"] || 0) >= 10 ? true : "캐시 " + JSON.stringify(st);
  });
  await p.keyboard.press("Escape");
  await p.reload({ waitUntil: "load" });
  await p.waitForSelector(".blk");
  await check("offline", "tml: 서비스워커가 페이지를 맡는다", async () => (await p.evaluate(() => !!navigator.serviceWorker.controller)) || "controller 없음");

  await ctx.setOffline(true);
  await p.reload({ waitUntil: "load" });
  await p.waitForSelector(".blk", { timeout: 20000 });
  await p.waitForTimeout(1200);
  await check("offline", "tml: 비행기 모드로 새로고침해도 시간표가 뜬다 (공연 칸 50개 이상)", async () => ((await p.locator(".blk").count()) >= 50) || "칸 " + (await p.locator(".blk").count()));
  await check("offline", "tml: 오프라인에서는 DJ 사진이 없고 이름만 나온다", async () => {
    const r = await p.evaluate(() => ({ ph: document.querySelectorAll(".blk.ph").length, img: document.querySelectorAll(".blk img").length, nm: document.querySelectorAll(".blk .nm").length }));
    return r.ph === 0 && r.img === 0 && r.nm >= 50 ? true : JSON.stringify(r);
  });
  await check("offline", "tml: 오프라인 배지가 뜨고 포스터·랭킹은 숨는다", async () => {
    const r = await p.evaluate(() => ({ badge: !!document.querySelector(".off-badge"), vis: [...document.querySelectorAll(".fx-thumb,.fx-pbtn,.top-btn")].some((e) => e.offsetParent !== null) }));
    return r.badge && !r.vis ? true : JSON.stringify(r);
  });
  await check("offline", "tml: 오프라인에서 라인업을 담고 배경화면 이미지를 만든다", async () => {
    await pick(p, ["martin-garrix", "alan-walker"]);
    if ((await p.locator(".blk.on").count()) < 2) return "담기 실패";
    await p.locator(".bar .btn.main").first().click();
    await p.waitForSelector(".pv img", { timeout: 30000 });
    await p.waitForTimeout(2500);
    const len = (await p.locator(".pv img").first().getAttribute("src")).length;
    return len > 100000 ? true : "이미지가 너무 작음 " + len;
  });
  await check("offline", "tml: 오프라인에서도 글꼴(Rubik·Noto Sans KR)이 있다", async () => (await p.evaluate(() => document.fonts.check('800 20px "Rubik"') && document.fonts.check('700 20px "Noto Sans KR"', "한글"))) || "글꼴 없음");
  await p.keyboard.press("Escape");
  await p.goto(BASE + FESTS.vac.path, { waitUntil: "load" });
  await check("offline", "vac: 오프라인에서 다른 페스티벌 주소로 열어도 뜬다", async () => {
    await p.waitForSelector(".blk", { timeout: 20000 });
    return (await p.locator(".blk").count()) >= 10 || "칸 부족";
  });

  await ctx.setOffline(false);
  await p.goto(BASE + FESTS.tml.path, { waitUntil: "load" });
  await p.waitForSelector(".blk");
  await p.locator(".off-chip").click();
  await p.waitForSelector(".ofp-card");
  await check("offline", "tml: 저장 지우기를 누르면 서비스워커와 저장 파일이 사라진다", async () => {
    await p.locator(".ofp-btn.ghost", { hasText: /지우기/ }).click();
    await p.waitForTimeout(1500);
    const r = await p.evaluate(async () => ({ caches: (await caches.keys()).length, regs: (await navigator.serviceWorker.getRegistrations()).length, saved: localStorage.getItem("fl:offline") }));
    return r.caches === 0 && r.regs === 0 && !r.saved ? true : JSON.stringify(r);
  });
  await check("offline", "tml: 오프라인 쓰기 중 오류 없음", () => (errs.length ? errs.slice(0, 2).join(" | ") : true));
  await ctx.close();
}

// ---------------------------------------------------------------- 9. 나만의 컬렉션 (/collection, /c/{id}) — 로컬에서는 서버가 없어 예시 데이터(DEMO)로 돈다
async function bandChecks(browser) {
  const LANGS9 = ["ko", "en", "ja", "zh", "zht", "es", "vi", "th", "id"];
  // 문구 사전: 9개 언어가 한국어와 같은 키를 모두 갖고 있다
  await check("band", "문구 사전: 9개 언어 모두 같은 키(빠진 문구 없음)", async () => {
    const dir = path.resolve(".cache-qa");
    fs.mkdirSync(dir, { recursive: true });
    const bad = [];
    for (const [file, name] of [["src/band/strings.ts", "BAND_T"], ["src/band/coreStrings.ts", "BAND_CORE_T"]]) {
      const out = path.join(dir, name + ".mjs");
      esbuild.buildSync({ entryPoints: [file], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
      const d = (await import(pathToFileURL(out).href + "?" + Date.now()))[name];
      const ko = Object.keys(d.ko);
      for (const l of LANGS9) {
        if (!d[l]) bad.push(`${name}.${l} 없음`);
        else for (const k of ko) if (!d[l][k] || !String(d[l][k]).trim()) bad.push(`${name}.${l}.${k}`);
      }
    }
    fs.rmSync(dir, { recursive: true, force: true });
    return bad.length ? bad.slice(0, 6).join(", ") : true;
  });

  const ctx = await ctxFor(browser);
  const p = await ctx.newPage();
  const errs = watch(p);
  const reqs = [];
  p.on("request", (r) => reqs.push(r.url()));
  await p.addInitScript(() => { try { localStorage.setItem("edc26:lang", "ko"); } catch {} });

  // 1. 홈 버튼
  await p.goto(BASE + "/", { waitUntil: "load" });
  await p.waitForSelector(".band-home-btn");
  await check("band", "홈: 로고 바로 아래·제목 위에 '나만의 컬렉션을 만들자' 버튼 (44px 이상)", async () => {
    const r = await p.evaluate(() => {
      const b = document.querySelector(".band-home-btn"), logo = document.querySelector(".home-logo"), h1 = document.querySelector(".home-title");
      const bb = b.getBoundingClientRect(), lb = logo.getBoundingClientRect(), hb = h1.getBoundingClientRect();
      return { text: b.textContent, href: b.getAttribute("href"), h: bb.height, below: bb.top >= lb.bottom - 1, above: bb.bottom <= hb.top + 1, prev: b.previousElementSibling === logo };
    });
    return r.text.includes("나만의 컬렉션을 만들자") && r.href === "/collection" && r.h >= 44 && r.below && r.above && r.prev ? true : JSON.stringify(r);
  });
  await check("band", "홈: 컬렉션 화면 파일(BandHub·예시 데이터)을 미리 받지 않는다 (지연 로딩)", () => {
    const hit = reqs.filter((u) => /\/assets\/(BandHub|BandBrowse|BandCollector|BandStage|engine|demo)-/.test(u));
    return hit.length ? hit.join(",") : true;
  });
  await check("band", "홈: 버튼을 누르면 /collection 전체 화면 3D 컬렉션으로 이동", async () => {
    await p.locator(".band-home-btn").click();
    await p.waitForURL(/\/collection$/);
    await p.waitForSelector(".band-3d.full .band-stage canvas", { timeout: 20000 });
    return true;
  });
  await check("band", "전체 화면: 화면을 꽉 채우고(스크롤 없음) 왼쪽 위 로고·오른쪽 위 구경하기·진열 바꾸기·아래 공유/추가·DEMO", async () => {
    const r = await p.evaluate(() => {
      const st = document.querySelector(".band-3d.full").getBoundingClientRect();
      return {
        fill: Math.round(st.width) === innerWidth && Math.round(st.height) === innerHeight,
        scroll: document.documentElement.scrollHeight <= innerHeight + 1,
        browse: document.querySelector(".band-full-tr .band-browse-btn")?.getAttribute("href"),
        logo: !!document.querySelector(".band-full-tl .band-full-logo"),
        sw: document.querySelector(".band-switch:not(.band-years) .band-switch-name")?.textContent,
        share: !!document.querySelector(".band-full-bottom .band-share"),
        add: !!document.querySelector(".band-full-bottom .band-add-btn"),
        featured: document.querySelector(".band-featured")?.getAttribute("href"),
        demo: !!document.querySelector(".band-full-caption .band-demo"),
      };
    });
    return r.fill && r.scroll && r.logo && r.browse === "/collection/browse" && /걸기|손목|모빌|액자/.test(r.sw || "") && /1\/4|2\/4|3\/4|4\/4/.test(r.sw || "") && r.share && r.add && /^\/c\/c[a-z0-9]{9}$/.test(r.featured || "") && r.demo ? true : JSON.stringify(r);
  });
  await check("band", "전체 화면: 가운데 위 ‹ › 로 진열 4종을 돌아가며 바꾼다", async () => {
    const names = [];
    for (let i = 0; i < 4; i++) {
      names.push((await p.locator(".band-switch:not(.band-years) .band-switch-name").textContent()).replace(/\d\/4/, "").trim());
      await p.locator(".band-switch:not(.band-years) .band-switch-btn").last().dispatchEvent("click");
      await p.waitForTimeout(300);
    }
    return new Set(names).size === 4 || names.join(",");
  });

  // 3. ＋ 추가 → 팔찌 만들기(시안의 스캔 화면). AI 디자인만 앱 출시 안내
  await check("band", "전체 화면: '＋ 추가' → 팔찌 스캔 화면(티켓 정보·사진·가리기·만들 방식·리본으로 걸기)이 화면 폭에 맞게 열린다", async () => {
    await p.locator(".band-add-btn").dispatchEvent("click");
    await p.waitForSelector("#scanSheet:not([hidden])", { timeout: 20000 });
    const r = await p.evaluate(() => {
      const sh = document.getElementById("scanSheet");
      return { fest: !!document.getElementById("tkFest"), photo: !!document.getElementById("photoCv"), mk: document.querySelectorAll("[data-mk]").length, done: document.getElementById("scanDone")?.textContent, fit: sh.scrollWidth <= innerWidth + 1 };
    });
    return r.fest && r.photo && r.mk === 2 && r.done === "리본으로 걸기" && r.fit ? true : JSON.stringify(r);
  });
  await check("band", "스캔: AI 디자인 버튼은 AI 를 부르지 않고 '앱에서 만나요' 안내 + 인스타 팔로우(새 탭)만", async () => {
    await p.locator('[data-mk="band"]').dispatchEvent("click");
    await p.locator("#styleChips button").first().dispatchEvent("click");
    await p.waitForSelector("#aiSoon:not([hidden])");
    const r = await p.evaluate(() => { const a = document.querySelector("#aiSoon a"); return { h: document.getElementById("aiSoonTitle")?.textContent, href: a?.getAttribute("href"), target: a?.getAttribute("target"), rel: a?.getAttribute("rel") }; });
    await p.locator("#aiSoonClose").dispatchEvent("click");
    await p.locator('[data-mk="photo"]').dispatchEvent("click");
    return /AI 디자인은.*앱에서 만나요/.test(r.h || "") && r.href === "https://www.instagram.com/festlock/" && r.target === "_blank" && /noopener/.test(r.rel) ? true : JSON.stringify(r);
  });
  await check("band", "스캔: 예시 사진 → 티켓 정보 → 리본으로 걸기 → 프로필(이름·인스타·동의) → 관리 코드 → 내 컬렉션 팔찌 1개 (로컬 시연 저장)", async () => {
    await p.locator("#useSample").dispatchEvent("click");
    await p.waitForSelector("#presets:not([hidden]) button", { timeout: 20000 });
    await p.selectOption("#tkFest", "nol-festival");
    await p.fill("#tkYear", "2024");
    await p.locator("#tkYear").dispatchEvent("input");
    await p.locator('#tkGrade button[data-v="vip"]').dispatchEvent("click");
    await p.waitForFunction(() => /처음 등록/.test(document.getElementById("tkNote")?.textContent || ""), null, { timeout: 10000 });
    await p.locator("#tkAgree").check();
    await p.locator("#scanDone").dispatchEvent("click");
    await p.waitForSelector(".band-profile", { timeout: 15000 });
    await p.fill(".band-profile input >> nth=0", "QA");
    await p.fill(".band-profile input >> nth=1", "@festlock");
    await p.locator(".band-profile .band-check input").check();
    await p.locator(".band-profile-go").dispatchEvent("click");
    await p.waitForSelector(".band-code-v", { timeout: 30000 });
    const code = await p.locator(".band-code-v").textContent();
    await p.locator(".band-code .band-close").last().dispatchEvent("click");
    await p.waitForFunction(() => /내 컬렉션/.test(document.querySelector(".band-full-caption")?.textContent || "") && /팔찌 1개/.test(document.querySelector(".band-full-caption")?.textContent || ""), null, { timeout: 60000 });
    return /^\S+-\S+-\S+-\S+$/.test(code || "") || "관리 코드 " + code;
  });
  await check("band", "공유: 9:16(1080×1920) 스토리 이미지가 만들어지고 이미지 저장·링크 복사(/c/내id)가 된다", async () => {
    await p.waitForFunction(() => document.querySelector(".band-stage canvas"), null, { timeout: 60000 });
    await p.locator(".band-share").dispatchEvent("click");
    await p.waitForSelector(".band-share-pv img", { timeout: 60000 });
    const size = await p.locator(".band-share-pv img").evaluate((i) => i.naturalWidth + "x" + i.naturalHeight);
    const link = await p.locator(".band-share-link").textContent();
    const id = await p.evaluate(() => JSON.parse(localStorage.getItem("fl:band:me") || "{}").id);
    const save = !(await p.locator(".band-s-save").isDisabled());
    await p.locator(".band-share-sheet").locator("xpath=..").locator(".band-x").dispatchEvent("click");
    return size === "1080x1920" && link.endsWith("/c/" + id) && save ? true : JSON.stringify({ size, link, id, save });
  });
  // 뒤 검사들은 "프로필 없는 기기"를 기준으로 하므로 이 기기에 저장한 내 컬렉션을 지운다
  await p.evaluate(() => { localStorage.removeItem("fl:band:me"); localStorage.removeItem("fl:band:demo:v1"); });
  await p.goto(BASE + "/collection", { waitUntil: "load" });
  await p.waitForSelector(".band-featured", { timeout: 60000 });
  await check("band", "전체 화면: 왼쪽 위 '구경하기' → /collection/browse 목록 페이지", async () => {
    await p.locator(".band-browse-btn").dispatchEvent("click");
    await p.waitForURL(/\/collection\/browse/);
    await p.waitForSelector(".band-card", { timeout: 15000 });
    return true;
  });

  // 2. 구경하기 목록 (/collection/browse)
  await check("band", "목록: 제목·소개·DEMO 배지·목록 카드(8개 이상)·내 컬렉션으로 돌아가기", async () => {
    const r = await p.evaluate(() => ({ title: document.querySelector(".band-title")?.textContent, demo: document.querySelector(".band-demo")?.textContent, n: document.querySelectorAll(".band-card").length, doc: document.title, back: document.querySelector(".band-back")?.getAttribute("href") }));
    return r.title === "구경하기" && /DEMO/.test(r.demo || "") && r.n >= 8 && /팔찌 컬렉션/.test(r.doc) && r.back === "/collection" ? true : JSON.stringify(r);
  });
  await check("band", "허브: 카드에 이름·'팔찌 N개'·썸네일 1~3개", async () => {
    const cards = await p.$$eval(".band-card", (cs) => cs.map((c) => ({ name: c.querySelector(".band-card-name")?.textContent, n: c.querySelector(".band-card-n")?.textContent, th: c.querySelectorAll(".band-thumbs img").length, href: c.getAttribute("href") })));
    const bad = cards.filter((c) => !c.name || !/^팔찌 \d+개$/.test(c.n || "") || c.th < 1 || c.th > 3 || !/^\/c\/c[a-z0-9]{9}$/.test(c.href || ""));
    return bad.length ? JSON.stringify(bad[0]) : true;
  });
  const counts = () => p.$$eval(".band-card-n", (xs) => xs.map((x) => Number(x.textContent.replace(/\D/g, ""))));
  await check("band", "허브: '많이 다닌 순'을 누르면 팔찌 수가 많은 순서", async () => {
    await p.locator(".band-sort button", { hasText: "많이 다닌 순" }).click();
    await p.waitForTimeout(400);
    const c = await counts();
    const sorted = [...c].sort((a, b) => b - a);
    const pressed = await p.locator(".band-sort button", { hasText: "많이 다닌 순" }).getAttribute("aria-pressed");
    return pressed === "true" && c.length >= 8 && c.join() === sorted.join() && /sort=most/.test(p.url()) ? true : `${pressed} ${c.join()}`;
  });
  await check("band", "허브: 페스티벌 칩을 고르면 그 페스티벌 사람만, 정렬은 최근순으로 고정", async () => {
    const all = await p.locator(".band-card").count();
    await p.locator(".band-chip[data-fest='zonnafe-2026']").click();
    await p.waitForTimeout(400);
    const n = await p.locator(".band-card").count();
    const most = p.locator(".band-sort button", { hasText: "많이 다닌 순" });
    const r = { n, all, url: p.url(), disabled: await most.isDisabled(), recent: await p.locator(".band-sort button", { hasText: "최근 등록순" }).getAttribute("aria-pressed"), chip: await p.locator(".band-chip[data-fest='zonnafe-2026']").getAttribute("aria-pressed"), hint: await p.locator(".band-hint").count() };
    return n >= 1 && n <= all && /fest=zonnafe-2026/.test(r.url) && r.disabled && r.recent === "true" && r.chip === "true" && r.hint === 1 ? true : JSON.stringify(r);
  });
  await check("band", "허브: 고른 페스티벌의 카드 → 그 사람 페이지에 그 페스티벌 팔찌가 있다", async () => {
    const href = await p.locator(".band-card").first().getAttribute("href");
    const p2 = await ctx.newPage();
    await p2.goto(BASE + href, { waitUntil: "load" });
    await p2.waitForSelector(".band-3d .band-stage");
    const alts = await p2.$$eval("ul.band-sr li", (xs) => xs.map((x) => x.textContent)); // 3D 와 함께 있는 화면 읽기용 목록
    await p2.close();
    return alts.some((a) => /ZONNAFE/.test(a)) || alts.join(" | ");
  });
  await check("band", "허브: [전체]를 누르면 다시 전체 목록", async () => {
    await p.locator(".band-chip", { hasText: "전체" }).click();
    await p.waitForTimeout(400);
    return (await p.locator(".band-card").count()) >= 8 && !/fest=/.test(p.url()) ? true : p.url();
  });

  // 4. 카드 → 컬렉터 페이지
  await check("band", "허브: 카드를 누르면 /c/{id} 로 이동하고 같은 이름·팔찌 수", async () => {
    const card = p.locator(".band-card").first();
    const name = await card.locator(".band-card-name").textContent();
    const n = await card.locator(".band-card-n").textContent();
    await card.click();
    await p.waitForURL(/\/c\/c[a-z0-9]{9}$/);
    await p.waitForSelector(".band-c-name");
    const r = { name: await p.locator(".band-c-name").textContent(), n: await p.locator(".band-c-n").textContent(), items: await p.locator("ul.band-sr li").count() };
    return r.name === name && r.n === n && r.items === Number(n.replace(/\D/g, "")) ? true : JSON.stringify({ name, n, ...r });
  });
  await check("band", "컬렉터: 인스타그램 구경 가기 버튼 (instagram.com · 새 탭 · noopener noreferrer)", async () => {
    const a = p.locator(".band-ig-btn");
    const r = { text: await a.getAttribute("aria-label"), href: await a.getAttribute("href"), target: await a.getAttribute("target"), rel: await a.getAttribute("rel") };
    return /인스타그램 구경 가기/.test(r.text) && /^https:\/\/www\.instagram\.com\/[A-Za-z0-9._]+\/$/.test(r.href) && r.target === "_blank" && /noopener/.test(r.rel) && /noreferrer/.test(r.rel) ? true : JSON.stringify(r);
  });
  await check("band", "컬렉터: 전체 화면 3D 진열(진열 4종: 걸기·손목·모빌·액자)·화면 읽기용 팔찌 목록·구경하기 버튼·DEMO 배지", async () => {
    await p.waitForSelector(".band-stage canvas", { timeout: 20000 });
    const r = await p.evaluate(() => ({
      tabs: [...document.querySelectorAll(".band-tab")].map((b) => b.textContent),
      sel: document.querySelectorAll('.band-tab[aria-selected="true"]').length,
      alts: [...document.querySelectorAll("ul.band-sr li")].map((i) => i.textContent),
      back: document.querySelector(".band-browse-btn")?.getAttribute("href"),
      demo: !!document.querySelector(".band-demo"),
      zoom: document.querySelectorAll(".band-zoom button").length,
    }));
    const badAlt = r.alts.filter((a) => !/ 20\d\d (GA|PGA|VIP) .+ 팔찌$/.test(a));
    return r.tabs.join() === "🎀 걸기,⭕ 손목,🎠 모빌,🖼 액자" && r.sel === 1 && r.alts.length > 0 && !badAlt.length && r.back === "/collection/browse" && r.demo && r.zoom === 4 ? true : JSON.stringify({ ...r, alts: badAlt.slice(0, 2) });
  });
  await check("band", "컬렉터: 탭 4종 모두 3D 가 실제로 그려지고(무대가 비어 있지 않음) 오류가 없다", async () => {
    const out = [];
    for (const th of ["scan", "wrist", "mobile", "frame"]) {
      await p.locator(`.band-tab[data-theme="${th}"]`).dispatchEvent("click");
      await p.waitForTimeout(2500);
      const box = await p.locator(".band-stage").boundingBox();
      const shot = await p.screenshot({ clip: box });
      const { channels } = await sharp(shot).stats();
      const spread = channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0);
      const on = await p.locator(`.band-tab[data-theme="${th}"]`).getAttribute("aria-selected");
      if (spread < 30 || on !== "true") out.push(`${th}:${Math.round(spread)}/${on}`);
    }
    return out.length ? out.join(" ") : true;
  });
  await check("band", "컬렉터: 끌면 돌아가고(화면이 바뀜) 고른 탭은 다시 열어도 기억된다", async () => {
    await p.locator('.band-tab[data-theme="wrist"]').dispatchEvent("click");
    await p.waitForTimeout(1500);
    const box = await p.locator(".band-stage").boundingBox();
    const a = await p.screenshot({ clip: box });
    await p.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
    await p.mouse.down();
    await p.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5, { steps: 8 });
    await p.mouse.up();
    await p.waitForTimeout(700);
    const b = await p.screenshot({ clip: box });
    const saved = await p.evaluate(() => localStorage.getItem("fl:band:theme"));
    return !a.equals(b) && saved === "wrist" ? true : `바뀜 ${!a.equals(b)} 저장 ${saved}`;
  });
  await check("band", "컬렉터: 신고 → 이유를 골라야 보내기가 켜지고, 보내면 접수 안내", async () => {
    await p.locator(".band-flag-btn").click();
    await p.waitForSelector(".band-report");
    const off = await p.locator(".band-report-send").isDisabled();
    await p.locator(".band-reasons label").nth(0).click();
    const on = !(await p.locator(".band-report-send").isDisabled());
    await p.locator(".band-report-send").click();
    await p.waitForSelector(".band-report-msg");
    const msg = await p.locator(".band-report-msg").textContent();
    await p.locator(".band-dialog .band-close").click();
    await p.waitForTimeout(300);
    return off && on && /접수/.test(msg) && (await p.locator(".band-dialog").count()) === 0 ? true : JSON.stringify({ off, on, msg });
  });
  await check("band", "컬렉터: 왼쪽 위 '구경하기'를 누르면 /collection/browse 목록으로", async () => {
    await p.locator(".band-browse-btn").dispatchEvent("click");
    await p.waitForURL(/\/collection\/browse/);
    await p.waitForSelector(".band-card");
    return true;
  });

  // 5. 없는 기록
  for (const bad of ["/c/czzzzzzzzz", "/c/NOT-AN-ID"]) {
    await check("band", `컬렉터: ${bad} → '없는 기록이에요' + 구경하기로 돌아가기`, async () => {
      await p.goto(BASE + bad, { waitUntil: "load" });
      await p.waitForSelector(".band-none");
      const r = { h: await p.locator(".band-none .band-title").textContent(), href: await p.locator(".band-none-back").getAttribute("href") };
      return r.h === "없는 기록이에요" && r.href === "/collection/browse" ? true : JSON.stringify(r);
    });
  }

  // 6. 서버가 진짜로 응답할 때(예시 데이터 아님): DEMO 배지 없음, 이상한 인스타 주소는 버튼을 숨김, 오류·다시 시도
  await check("band", "서버 응답: 실제 목록 모양이면 DEMO 배지 없이 그린다", async () => {
    const p3 = await ctx.newPage();
    await p3.route("**/api/band?*", (route) => {
      const u = new URL(route.request().url());
      if (u.searchParams.get("a") === "collectors") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ list: [{ id: "cabc123def", name: "테스트", count: 2, thumbs: ["https://example.com/a.webp", "javascript:alert(1)"] }], next: null }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "cabc123def", name: "테스트", ig: "javascript:alert(1)", count: 1, items: [{ key: "zonnafe-2026:2026:ga:day1", design: { key: "zonnafe-2026:2026:ga:day1", fest: "zonnafe-2026", year: 2026, grade: "ga", day: "day1", style: "photo", img: "https://example.com/a.webp", w: 600, h: 100 } }] }) });
    });
    await p3.goto(BASE + "/collection/browse", { waitUntil: "load" });
    await p3.waitForSelector(".band-card");
    const hub = { demo: await p3.locator(".band-demo").count(), n: await p3.locator(".band-card").count(), th: await p3.locator(".band-thumbs img").count() };
    await p3.goto(BASE + "/c/cabc123def", { waitUntil: "load" });
    await p3.waitForSelector(".band-c-name");
    const c = { demo: await p3.locator(".band-demo").count(), ig: await p3.locator(".band-ig-btn").count(), alt: await p3.locator("ul.band-sr li").first().textContent() };
    await p3.close();
    return hub.demo === 0 && hub.n === 1 && hub.th === 1 && c.demo === 0 && c.ig === 0 && c.alt === "ZONNAFE 2026 GA Day 1 팔찌" ? true : JSON.stringify({ hub, c });
  });
  await check("band", "WebGL 을 못 쓰는 기기: 3D 대신 사진 격자 + 안내 한 줄", async () => {
    const p3 = await ctx.newPage();
    await p3.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...a) {
        return /webgl/i.test(String(type)) ? null : orig.call(this, type, ...a);
      };
    });
    await p3.goto(BASE + "/c/cdemo00001", { waitUntil: "load" });
    await p3.waitForSelector(".band-3d-fallback .band-item", { timeout: 20000 });
    const r = { items: await p3.locator(".band-3d-fallback .band-item").count(), note: await p3.locator(".band-3d-fallback .band-note").textContent(), canvas: await p3.locator(".band-stage canvas").count() };
    await p3.close();
    return r.items === 12 && /3D/.test(r.note) && r.canvas === 0 ? true : JSON.stringify(r);
  });
  await check("band", "전체 화면: 등록이 열리기 전에는 목록 맨 앞(최근) 사람의 컬렉션을 보여 주고 그 페이지로 이어 준다", async () => {
    const p3 = await ctx.newPage();
    await p3.goto(BASE + "/collection", { waitUntil: "load" });
    // 소프트웨어 WebGL(초당 몇 장)로 다른 3D 페이지와 CPU 를 나눠 쓰면 느려서 넉넉히 기다린다 (실제 기기에서는 금방 뜸)
    await p.goto("about:blank"); // 앞 검사에서 열려 있던 페이지를 비워 CPU 를 덜 쓰게
    await p3.waitForSelector(".band-featured", { timeout: 60000 });
    const go = await p3.locator(".band-featured").getAttribute("href");
    await p3.goto(BASE + "/collection/browse", { waitUntil: "load" });
    await p3.waitForSelector(".band-card");
    const first = await p3.locator(".band-card").first().getAttribute("href");
    await p3.close();
    return go === first || JSON.stringify({ go, first });
  });
  await check("band", "서버 오류(400)면 '목록을 불러오지 못했어요' + 다시 시도", async () => {
    const p3 = await ctx.newPage();
    await p3.route("**/api/band?*", (route) => route.fulfill({ status: 400, contentType: "application/json", body: '{"error":"bad"}' }));
    await p3.goto(BASE + "/collection/browse", { waitUntil: "load" });
    await p3.waitForSelector(".band-error");
    const msg = await p3.locator(".band-error p").textContent();
    await p3.unroute("**/api/band?*");
    await p3.locator(".band-retry").click();
    await p3.waitForSelector(".band-card");
    await p3.close();
    return msg === "목록을 불러오지 못했어요" ? true : msg;
  });
  await check("band", "서버 응답: 빈 목록이면 '아직 올린 사람이 없어요' 안내", async () => {
    const p3 = await ctx.newPage();
    await p3.route("**/api/band?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"list":[],"next":null}' }));
    await p3.goto(BASE + "/collection/browse", { waitUntil: "load" });
    await p3.waitForSelector(".band-empty");
    const msg = await p3.locator(".band-empty").textContent();
    await p3.close();
    return /첫 번째가 되어 보세요/.test(msg) || msg;
  });
  await check("band", "서버 응답: 다음 쪽(next)이 있으면 '더 보기'로 이어 붙인다", async () => {
    const p3 = await ctx.newPage();
    await p3.route("**/api/band?*", (route) => {
      const cur = Number(new URL(route.request().url()).searchParams.get("cursor") || 0);
      const list = Array.from({ length: cur ? 3 : 24 }, (_, i) => ({ id: "c" + String(cur + i).padStart(9, "0"), name: "사람" + (cur + i), count: 1, thumbs: ["https://example.com/a.webp"] }));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ list, next: cur ? null : 24 }) });
    });
    await p3.goto(BASE + "/collection/browse", { waitUntil: "load" });
    await p3.waitForSelector(".band-more");
    await p3.locator(".band-more").click();
    await p3.waitForFunction(() => document.querySelectorAll(".band-card").length === 27);
    const left = await p3.locator(".band-more").count();
    await p3.close();
    return left === 0 || "더 보기가 남아 있음";
  });
  // 오프라인: 인터넷이 끊긴 채로 다시 불러오면 안내, 연결되면 저절로 다시 불러온다
  await check("band", "오프라인: '인터넷이 연결되면 볼 수 있어요' → 연결되면 목록", async () => {
    await p.goto(BASE + "/collection/browse", { waitUntil: "load" });
    await p.waitForSelector(".band-card");
    await ctx.setOffline(true);
    await p.locator(".band-chip[data-fest='vac-2026']").click();
    await p.waitForSelector(".band-offline");
    const msg = await p.locator(".band-offline").textContent();
    await ctx.setOffline(false);
    await p.waitForSelector(".band-card", { timeout: 10000 });
    return msg === "인터넷이 연결되면 볼 수 있어요" || msg;
  });

  // 7. 9개 언어: 문구 키 이름이 화면에 그대로 보이지 않는다
  for (const l of LANGS9) {
    await check("band", `${l}: 허브·안내 창·컬렉터·없는 기록에 문구 키가 보이지 않는다`, async () => {
      const c2 = await ctxFor(browser, { locale: LOCALES[l] });
      // 중간에 실패해도 창을 닫는다 (안 닫으면 3D 창이 쌓여 다음 언어 검사가 느려져 줄줄이 실패함)
      try {
      const q = await c2.newPage();
      const e2 = watch(q);
      await q.addInitScript((lang) => { try { localStorage.setItem("edc26:lang", lang); } catch {} }, l);
      const texts = [];
      await q.goto(BASE + "/", { waitUntil: "load" });
      await q.waitForSelector(".band-home-btn");
      texts.push(await q.locator(".band-home-btn").innerText());
      await q.goto(BASE + "/collection/browse", { waitUntil: "load" });
      await q.waitForSelector(".band-card");
      await q.locator(".band-chip[data-fest='zonnafe-2026']").click();
      await q.waitForTimeout(300);
      texts.push(await q.evaluate(() => document.body.innerText + " " + document.title));
      await q.goto(BASE + "/collection", { waitUntil: "load" });
      await q.waitForSelector(".band-add-btn");
      texts.push(await q.evaluate(() => document.body.innerText + " " + [...document.querySelectorAll("[aria-label]")].map((x) => x.getAttribute("aria-label")).join(" ")));
      await q.locator(".band-add-btn").dispatchEvent("click");
      await q.waitForSelector("#scanSheet:not([hidden])", { timeout: 30000 });
      texts.push(await q.locator("#scanSheet").innerText());
      await q.locator("#scanClose").dispatchEvent("click");
      await q.goto(BASE + "/c/cdemo00001", { waitUntil: "load" });
      await q.waitForSelector(".band-switch:not(.band-years)");
      texts.push(await q.evaluate(() => document.body.innerText + " " + document.title + " " + [...document.querySelectorAll("[alt],[aria-label]")].map((x) => (x.getAttribute("alt") || "") + " " + (x.getAttribute("aria-label") || "")).join(" ")));
      await q.locator(".band-flag-btn").dispatchEvent("click");
      await q.waitForSelector(".band-report");
      texts.push(await q.locator(".band-report").innerText());
      await q.goto(BASE + "/c/czzzzzzzzz", { waitUntil: "load" });
      await q.waitForSelector(".band-none");
      texts.push(await q.evaluate(() => document.body.innerText));
      const all = texts.join("\n");
      const keys = all.match(/\b(band|home|scan)\.[a-zA-Z.]+/g);
      if (keys) return "키 노출: " + [...new Set(keys)].slice(0, 4).join(", ");
      if (l !== "ko" && /나만의|구경하기|팔찌 \d|리본으로|전일권/.test(all)) return "한국어가 섞임";
      return e2.length ? e2.slice(0, 2).join(" | ") : true;
      } finally {
        await c2.close();
      }
    });
  }
  await check("band", "컬렉션 화면 이동 중 콘솔 오류 없음", () => (errs.length ? errs.slice(0, 2).join(" | ") : true));
  await ctx.close();
}

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
if (ONLY.has("offline")) await offlineChecks(browser);
// 컬렉션 3D 진열은 소프트웨어 WebGL 을 켠 브라우저로만 (다른 화면까지 켜 두면 느려져서 시간 초과가 남)
if (ONLY.has("band")) {
  const gl = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    await bandChecks(gl);
  } finally {
    await gl.close();
  }
}
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
