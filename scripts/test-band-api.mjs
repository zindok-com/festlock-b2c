// "나만의 컬렉션" 서버(api/band.ts)를 가짜 Redis·Blob 서버에 붙여서 시험한다. 실제 저장소·키는 쓰지 않는다.
//   node scripts/test-band-api.mjs
import http from "node:http";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { build } from "esbuild";
import sharp from "sharp";

// ---------------------------------------------------------------- 가짜 Upstash Redis (REST)
const store = { str: new Map(), hash: new Map(), set: new Map(), zset: new Map(), list: new Map() };
function exec(cmd) {
  const [name0, key, ...rest0] = cmd.map((x, i) => (i === 0 ? String(x).toUpperCase() : x));
  const name = name0;
  const rest = rest0;
  const S = (x) => String(x);
  switch (name) {
    case "SET": {
      const opts = rest.slice(1).map((x) => S(x).toUpperCase());
      if (opts.includes("NX") && store.str.has(key)) return null;
      store.str.set(key, S(rest[0]));
      return "OK";
    }
    case "GET": return store.str.has(key) ? store.str.get(key) : null;
    case "DEL": { let n = 0; for (const k of [key, ...rest]) { for (const m of Object.values(store)) if (m.delete(S(k))) n++; } return n; }
    case "INCR": { const v = (Number(store.str.get(key)) || 0) + 1; store.str.set(key, S(v)); return v; }
    case "EXPIRE": return 1;
    case "HSET": {
      const h = store.hash.get(key) ?? new Map(); let n = 0;
      for (let i = 0; i < rest.length; i += 2) { if (!h.has(S(rest[i]))) n++; h.set(S(rest[i]), S(rest[i + 1])); }
      store.hash.set(key, h); return n;
    }
    case "HGETALL": { const h = store.hash.get(key); return h ? [...h].flat() : []; }
    case "SADD": { const s = store.set.get(key) ?? new Set(); let n = 0; for (const m of rest) if (!s.has(S(m))) { s.add(S(m)); n++; } store.set.set(key, s); return n; }
    case "SREM": { const s = store.set.get(key); let n = 0; for (const m of rest) if (s?.delete(S(m))) n++; return n; }
    case "SMEMBERS": return [...(store.set.get(key) ?? [])];
    case "SCARD": return store.set.get(key)?.size ?? 0;
    case "ZADD": {
      const o = []; let i = 0; while (["NX", "XX", "GT", "LT", "CH"].includes(S(rest[i]).toUpperCase())) o.push(S(rest[i++]).toUpperCase());
      const z = store.zset.get(key) ?? new Map(); let n = 0;
      for (; i < rest.length; i += 2) {
        const m = S(rest[i + 1]);
        if (o.includes("NX") && z.has(m)) continue;
        if (!z.has(m)) n++;
        z.set(m, Number(rest[i]));
      }
      store.zset.set(key, z); return n;
    }
    case "ZRANGE": {
      const z = store.zset.get(key); if (!z) return [];
      const opts = rest.slice(2).map((x) => S(x).toUpperCase());
      let arr = [...z].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).map((x) => x[0]);
      if (opts.includes("REV")) arr.reverse();
      let a = Number(rest[0]), b = Number(rest[1]);
      if (b < 0) b = arr.length + b;
      return arr.slice(a, b + 1);
    }
    case "ZCARD": return store.zset.get(key)?.size ?? 0;
    case "ZREM": { const z = store.zset.get(key); let n = 0; for (const m of rest) if (z?.delete(S(m))) n++; return n; }
    case "ZSCORE": { const z = store.zset.get(key); return z?.has(S(rest[0])) ? S(z.get(S(rest[0]))) : null; }
    case "LPUSH": { const l = store.list.get(key) ?? []; for (const m of rest) l.unshift(S(m)); store.list.set(key, l); return l.length; }
    case "LTRIM": { const l = store.list.get(key) ?? []; store.list.set(key, l.slice(Number(rest[0]), Number(rest[1]) + 1)); return "OK"; }
    default: throw new Error("지원 안 하는 명령: " + name);
  }
}
const b64 = (v) => (typeof v === "string" ? Buffer.from(v).toString("base64") : Array.isArray(v) ? v.map(b64) : v);
const redisSrv = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const enc = req.headers["upstash-encoding"] === "base64";
    const one = (c) => { try { const r = exec(c); return { result: enc ? b64(r) : r }; } catch (e) { return { error: String(e.message) }; } };
    const data = JSON.parse(body || "[]");
    const out = req.url.startsWith("/pipeline") ? data.map(one) : one(data);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
  });
});

// ---------------------------------------------------------------- 가짜 Vercel Blob
const puts = [];
const blobSrv = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const u = new URL(req.url, "http://x");
    const pathname = u.searchParams.get("pathname");
    puts.push({ pathname, size: Buffer.concat(chunks).length, method: req.method });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ url: `https://mock.public.blob.vercel-storage.com/${pathname}`, downloadUrl: `https://mock.public.blob.vercel-storage.com/${pathname}?download=1`, pathname, contentType: "image/webp", contentDisposition: "inline", etag: "x" }));
  });
});
await new Promise((r) => redisSrv.listen(0, "127.0.0.1", r));
await new Promise((r) => blobSrv.listen(0, "127.0.0.1", r));
process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${redisSrv.address().port}`;
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_teststore_abcdefghijklmnop";
process.env.VERCEL_BLOB_API_URL = `http://127.0.0.1:${blobSrv.address().port}`;

// ---------------------------------------------------------------- 서버 코드를 묶어서 불러온다
// 패키지(node_modules)를 찾을 수 있게 저장소 안(.cache)에 둔다. 서버 코드만 묶고 패키지는 그대로 불러온다
const tmp = fs.mkdtempSync(path.join("node_modules", ".cache-band-test-"));
const outfile = path.join(tmp, "band.mjs");
await build({ entryPoints: ["api/band.ts"], bundle: true, platform: "node", format: "esm", outfile, logLevel: "error", packages: "external" });
const { GET, POST } = await import(pathToFileURL(path.resolve(outfile)).href);

// ---------------------------------------------------------------- 시험 도구
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { if (cond) { pass++; console.log("  통과", name); } else { fail++; console.log("  실패", name, extra); } };
let ipN = 0;
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const hdr = (extra = {}) => ({ host: "festlock.test", origin: "https://festlock.test", "user-agent": UA, "accept-language": "ko-KR", "sec-fetch-site": "same-origin", "sec-fetch-mode": "cors", "content-type": "application/json", "x-real-ip": "10.0.0." + (++ipN % 250) + "." + Math.floor(ipN / 250), ...extra });
const get = async (q, h = {}) => { const r = await GET(new Request("https://festlock.test/api/band?" + q, { headers: hdr(h) })); return { status: r.status, body: await r.json() }; };
const post = async (a, body, h = {}) => { const r = await POST(new Request("https://festlock.test/api/band?a=" + a, { method: "POST", headers: hdr(h), body: JSON.stringify(body) })); return { status: r.status, body: await r.json() }; };
const rnd = (n = 40) => [...Array(n)].map(() => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
const webp = async (w = 128, h = 128, lossless = false) => (await sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 120, b: 40 } } }).webp({ lossless }).toBuffer()).toString("base64");
const ticket = (key, over = {}) => ({ key, fest: "테스트 페스티벌", year: 2026, grade: "GA", day: "Day1", style: "photo", pal: ["#c87828", "#fff0d0"], ...over });
const mk = async (name = "하나", ig = "@hana_fest") => { const cred = rnd(40); const r = await post("profile", { name, ig, cred }); return { ...r.body, cred, status: r.status }; };

// ---------------------------------------------------------------- 시험
console.log("\n[낱말·형식]");
const src = fs.readFileSync("api/band.ts", "utf8");
const wordsBlock = src.slice(src.indexOf("const WORDS = ("), src.indexOf(").split(\" \")"));
const words = [...wordsBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]).join("").split(" ").filter(Boolean); // 소스는 줄 끝 공백으로 이어 붙이므로 "" 로 합친다
check("관리 코드 낱말 256개, 중복 없음", words.length === 256 && new Set(words).size === 256, `n=${words.length} unique=${new Set(words).size}`);

console.log("\n[요청 방어]");
check("Origin 없는 쓰기는 거절", (await post("profile", { name: "a", ig: "a", cred: rnd() }, { origin: "", referer: "" })).status === 403);
check("curl 같은 요청은 거절", (await post("profile", { name: "a", ig: "a", cred: rnd() }, { "user-agent": "curl/8.0.1 something long enough" })).status === 403);
check("모르는 동작은 400", (await post("nope", {})).status === 400);
check("다른 사이트에서 부른 읽기는 거절", (await get("a=collectors", { "sec-fetch-site": "cross-site" })).status === 403);

console.log("\n[프로필]");
check("이름 없음 거절", (await post("profile", { name: "  ", ig: "hana", cred: rnd() })).status === 400);
check("인스타 형식 틀림 거절", (await post("profile", { name: "하나", ig: "not valid!!", cred: rnd() })).status === 400);
check("인스타 글 주소(/p/…)는 거절", (await post("profile", { name: "하나", ig: "https://www.instagram.com/p/ABC123/", cred: rnd() })).status === 400);
check("열쇠가 짧으면 거절", (await post("profile", { name: "하나", ig: "hana", cred: "short" })).status === 400);
const A = await mk("하나", "https://www.instagram.com/Hana_Fest/?igsh=abc123");
check("프로필 만들기: id(c+9)와 관리 코드(낱말 4개)를 돌려줌", A.status === 200 && /^c[a-z0-9]{9}$/.test(A.id) && A.code.split("-").length === 4 && A.code.split("-").every((w) => words.includes(w)), JSON.stringify(A));
const det0 = await get("a=collector&id=" + A.id);
check("긴 인스타 주소가 handle 하나로 정리됨(소문자)", det0.body.ig === "https://www.instagram.com/hana_fest/", det0.body.ig);
check("글자 정리: 꺾쇠·줄바꿈 제거, 20자 제한", (await (async () => { const x = await mk("<b>이름\n이름</b>".padEnd(40, "가")); return (await get("a=collector&id=" + x.id)).body.name; })()).length <= 20);

console.log("\n[첫 디자인 — 사진 검증]");
const K1 = "test-fest-2026:2026:ga:day1";
check("디자인이 없으면 404", (await get("a=design&key=" + encodeURIComponent(K1))).status === 404);
check("티켓 키 형식이 틀리면 400", (await get("a=design&key=Bad Key")).status === 400);
const okImg = await webp();
const png = (await sharp({ create: { width: 128, height: 128, channels: 3, background: "#fff" } }).png().toBuffer()).toString("base64");
const jpg = (await sharp({ create: { width: 400, height: 80, channels: 3, background: "#c87828" } }).jpeg({ quality: 80 }).toBuffer()).toString("base64");
const KJ = "jpeg-fest-2026:2026:ga:day1";
const before0 = puts.length;
const upj = await post("design", { id: A.id, cred: A.cred, ...ticket(KJ), img: jpg });
check("JPEG 도 받는다(아이폰 Safari 는 WebP 로 못 내보냄) · 크기를 읽고 .jpg 로 올린다", upj.body.ok === true && upj.body.design?.w === 400 && upj.body.design?.h === 80 && puts.length === before0 + 1 && puts[puts.length - 1].pathname.endsWith(".jpg"), JSON.stringify(upj.body).slice(0, 160));
await post("uncollect", { id: A.id, cred: A.cred, key: KJ });
puts.length = 0; // 아래 검사들은 올린 횟수를 0부터 센다
check("png 는 거절", (await post("design", { id: A.id, cred: A.cred, ...ticket(K1), img: png })).body.error === "bad-image");
check("너무 작은 이미지(32px)는 거절", (await post("design", { id: A.id, cred: A.cred, ...ticket(K1), img: await webp(32, 32) })).body.error === "bad-image");
check("너무 큰 이미지(2000px)는 거절", (await post("design", { id: A.id, cred: A.cred, ...ticket(K1), img: await webp(2000, 2000) })).body.error === "bad-image");
check("base64 가 아니면 거절", (await post("design", { id: A.id, cred: A.cred, ...ticket(K1), img: "###not base64###" })).body.error === "bad-image");
check("틀린 열쇠는 거절(403)", (await post("design", { id: A.id, cred: rnd(40), ...ticket(K1), img: okImg })).status === 403);
check("연도가 키와 다르면 거절", (await post("design", { id: A.id, cred: A.cred, ...ticket(K1, { year: 2025 }), img: okImg })).body.error === "bad-ticket");
check("금사 디자인인데 색이 없으면 거절", (await post("design", { id: A.id, cred: A.cred, ...ticket(K1, { style: "design", pal: [] }), img: okImg })).body.error === "bad-ticket");
check("거절된 시도로는 Blob 에 아무것도 올라가지 않음", puts.length === 0, JSON.stringify(puts));

console.log("\n[첫 디자인 — 등록]");
const up1 = await post("design", { id: A.id, cred: A.cred, ...ticket(K1), img: okImg });
check("처음 올리면 디자인이 만들어지고 exists=false", up1.status === 200 && up1.body.exists === false && up1.body.count === 1, JSON.stringify(up1.body).slice(0, 200));
check("Blob 에 bands/…webp 한 번 올라감(키의 : 는 _)", puts.length === 1 && puts[0].pathname === "bands/test-fest-2026_2026_ga_day1.webp" && puts[0].size > 100, JSON.stringify(puts));
const g1 = await get("a=design&key=" + encodeURIComponent(K1));
check("조회하면 이미지 주소·크기·처음 올린 사람이 나옴", g1.status === 200 && g1.body.design.img.endsWith("bands/test-fest-2026_2026_ga_day1.webp") && g1.body.design.w === 128 && g1.body.design.by?.name === "하나", JSON.stringify(g1.body));
const B = await mk("두리", "duri");
const up2 = await post("design", { id: B.id, cred: B.cred, ...ticket(K1, { fest: "다른 이름" }), img: await webp(200, 200) });
check("같은 티켓을 두 번째 사람이 올리면 새로 만들지 않고 첫 디자인을 돌려줌", up2.body.exists === true && up2.body.design.by.name === "하나" && up2.body.design.w === 128, JSON.stringify(up2.body).slice(0, 200));
check("두 번째 사람 때는 Blob 에 또 올라가지 않음", puts.length === 1, "puts=" + puts.length);
const col = await post("collect", { id: B.id, cred: B.cred, key: K1 });
check("두 번째 사람이 '담기'로 기록에 추가", col.body.ok === true && col.body.count === 1, JSON.stringify(col.body));
check("같은 걸 또 담아도 늘지 않음", (await post("collect", { id: B.id, cred: B.cred, key: K1 })).body.count === 1);
check("없는 디자인은 담을 수 없음(404)", (await post("collect", { id: B.id, cred: B.cred, key: "none-fest-2026:2026:ga:day2" })).status === 404);

console.log("\n[동시에 처음 등록]");
const K2 = "race-fest-2026:2026:vip:full3";
const C = await mk("씨", "cc_cc"), D = await mk("디", "dd_dd");
const before = puts.length;
const [r1, r2] = await Promise.all([post("design", { id: C.id, cred: C.cred, ...ticket(K2), img: await webp(130, 130) }), post("design", { id: D.id, cred: D.cred, ...ticket(K2), img: await webp(140, 140) })]);
const firsts = [r1, r2].filter((r) => r.body.exists === false);
check("동시에 올려도 디자인은 정확히 한 사람 것만 만들어짐", firsts.length === 1, JSON.stringify([r1.body, r2.body]).slice(0, 300));
check("Blob 에는 한 번만 올라감", puts.length - before === 1, "puts=" + (puts.length - before));
const lateOne = [r1, r2].find((r) => r.body.exists !== false);
check("늦은 사람은 exists=true 또는 busy(409)", lateOne.body.exists === true || lateOne.body.error === "busy", JSON.stringify(lateOne.body));
const finalD = (await get("a=design&key=" + encodeURIComponent(K2))).body.design;
check("저장된 디자인은 이긴 사람의 것", finalD && (finalD.w === 130 || finalD.w === 140) && finalD.by.name === (finalD.w === 130 ? "씨" : "디"));

console.log("\n[인증·관리 코드]");
check("관리 코드를 열쇠 대신 쓸 수 있음", (await post("profile", { id: A.id, cred: A.code, name: "하나2", ig: "hana2" })).body.ok === true);
check("이름·인스타가 바뀜", (await get("a=collector&id=" + A.id)).body.name === "하나2");
const rec = await post("recover", { code: A.code });
check("다른 기기: 관리 코드로 프로필을 찾음", rec.body.ok === true && rec.body.id === A.id && rec.body.ig.includes("hana2"), JSON.stringify(rec.body));
check("틀린 관리 코드는 404", (await post("recover", { code: "사과-사과-사과-사과" })).status === 404);
check("형식이 틀린 관리 코드는 400", (await post("recover", { code: "아무말" })).status === 400);
const X = await mk("엑스", "xx_xx");
const sameIp = { "x-real-ip": "192.168.9.9" };
let locked = false;
for (let i = 0; i < 12; i++) { const r = await post("profile", { id: X.id, cred: rnd(40), name: "n", ig: "n" }, { "x-real-ip": "172.16.0." + (i + 1) }); if (r.status === 429 && r.body.error === "locked") locked = true; }
check("열쇠를 계속 틀리면 그 프로필은 잠김(429)", locked);
check("잠긴 뒤에는 맞는 열쇠도 잠시 막힘(추측 방지)", (await post("profile", { id: X.id, cred: X.cred, name: "n", ig: "n" })).status === 429);
let recLocked = false;
for (let i = 0; i < 12; i++) { const r = await post("recover", { code: "바다-바다-바다-" + words[i + 3] }, sameIp); if (r.status === 429) recLocked = true; }
check("관리 코드를 같은 IP 에서 계속 틀리면 잠김", recLocked);

console.log("\n[기록 60개 제한 · 빼기]");
const M = await mk("많이", "many_one");
let lastErr = null, made = 0;
for (let i = 0; i < 61; i++) {
  const r = await post("design", { id: M.id, cred: M.cred, ...ticket(`many-fest-${i}:2026:ga:day1`), img: okImg });
  if (r.body.ok) made++; else lastErr = r.body;
}
check("60개까지 담기고 61번째는 가득 참(409)", made === 60 && lastErr?.error === "full", `made=${made} ${JSON.stringify(lastErr)}`);
const un = await post("uncollect", { id: M.id, cred: M.cred, key: "many-fest-0:2026:ga:day1" });
check("기록에서 빼면 개수가 줄어듦", un.body.count === 59);
check("빼도 디자인은 남아 있음", (await get("a=design&key=" + encodeURIComponent("many-fest-0:2026:ga:day1"))).status === 200);

console.log("\n[구경하기]");
const list = await get("a=collectors");
check("목록에 사람들이 나오고 개수·썸네일이 있음", list.body.list.length >= 3 && list.body.list.every((x) => x.name && typeof x.count === "number") && list.body.list.some((x) => x.thumbs.length >= 1), JSON.stringify(list.body).slice(0, 200));
check("한 번에 24명까지, 다음 쪽 표시", list.body.list.length <= 24);
const most = await get("a=collectors&sort=most");
check("많이 다닌 순: 60개 가까이 담은 사람이 맨 앞", most.body.list[0]?.name === "많이", most.body.list[0]?.name);
const byF = await get("a=collectors&fest=test-fest-2026");
check("페스티벌별 목록: 그 페스티벌 기록이 있는 사람만", byF.body.list.length === 2 && byF.body.list.every((x) => ["하나2", "두리"].includes(x.name)), JSON.stringify(byF.body.list.map((x) => x.name)));
const dm = await get("a=collector&id=" + M.id);
check("한 사람 상세: 인스타 주소와 팔찌 목록", dm.body.ig === "https://www.instagram.com/many_one/" && dm.body.items.length === 59 && dm.body.items[0].design.img.startsWith("https://"), String(dm.body.count));
check("없는 사람은 404", (await get("a=collector&id=cnotexist0")).status === 404);

console.log("\n[신고]");
const dev = "device-" + rnd(20);
check("신고가 접수됨", (await post("report", { type: "design", target: K1, device: dev, reason: "번호가 보여요" })).body.changed === true);
check("같은 기기가 같은 대상을 또 신고해도 한 번만 셈", (await post("report", { type: "design", target: K1, device: dev })).body.changed === false);
check("없는 대상 신고는 404", (await post("report", { type: "collector", target: "cnotexist0", device: dev })).status === 404);
check("신고 대상 형식이 틀리면 400", (await post("report", { type: "design", target: "x", device: dev })).status === 400);

console.log("\n[프로필 지우기]");
const del = await post("delete-profile", { id: B.id, cred: B.cred });
check("프로필 삭제", del.body.ok === true);
check("지운 프로필은 조회 404", (await get("a=collector&id=" + B.id)).status === 404);
check("지운 사람의 관리 코드는 더 못 씀", (await post("recover", { code: B.code }, { "x-real-ip": "10.99.1.1" })).status === 404);
check("디자인은 남고 처음 올린 사람 표시만 사라짐(두리가 올린 건 없으니 하나 것은 그대로)", (await get("a=design&key=" + encodeURIComponent(K1))).body.design?.by?.name === "하나2");
const delA = await post("delete-profile", { id: A.id, cred: A.cred });
const afterDel = await get("a=design&key=" + encodeURIComponent(K1));
check("만든 사람이 지워도 디자인은 남음(이름은 숨김)", delA.body.ok === true && afterDel.status === 200 && afterDel.body.design.by === null);
check("목록에서도 사라짐", !(await get("a=collectors")).body.list.some((x) => x.id === A.id));

console.log(`\n결과: 통과 ${pass} · 실패 ${fail}`);
redisSrv.close(); blobSrv.close();
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
