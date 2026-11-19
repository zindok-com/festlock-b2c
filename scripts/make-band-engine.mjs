// 시안(docs/band-collection/sample-source.html)의 3D 진열 코드를 앱용 모듈(src/band/three/engine.ts)로 옮긴다.
// 시안의 모양·움직임을 그대로 살리려고, 다시 짜지 않고 줄 범위로 잘라 함수 하나(createEngine)로 감싼다.
//   node scripts/make-band-engine.mjs
// 빼는 것: 스캔(사진 편집) 화면, AI, 시안의 버튼·탭 연결(앱의 React 화면이 대신 한다), 예시 사진.
import fs from "node:fs";
import { THEME_FIXES } from "./band-engine-theme-fixes.mjs";

const SRC = "docs/band-collection/sample-source.html";
const OUT = "src/band/three/engine.ts";
const lines = fs.readFileSync(SRC, "utf8").split(/\r?\n/);
const L = (a, b) => lines.slice(a - 1, b).join("\n"); // 1부터 세는 줄 번호, 양끝 포함

// 줄 번호가 시안과 맞는지 확인 (시안이 바뀌면 여기서 멈춘다)
const expect = {
  203: "const RM = matchMedia",
  290: "const stage = document.getElementById('stage');",
  300: "const scene = new THREE.Scene();",
  1375: "const SAMPLE_SRC",
  1386: "function photoFrom(img){",
  1550: "",
  1551: "/* ---------- 스캔 시트 ---------- */",
  1805: "/* ======",
  2284: "const THEMES = [",
  2295: "const tabsEl = document.getElementById('tabs');",
};
for (const [n, s] of Object.entries(expect)) {
  if (!lines[+n - 1].startsWith(s)) throw new Error(`시안 ${n}번째 줄이 예상과 달라요: ${lines[+n - 1].slice(0, 60)}`);
}

const header = `// @ts-nocheck
// 자동 생성 파일 — 손으로 고치지 말고 scripts/make-band-engine.mjs 를 고쳐서 다시 만든다.
// 원본: docs/band-collection/sample-source.html (FestLock 컬렉션 3D 시안). 진열 4종: 🎀 걸기 · ⭕ 손목 · 🎠 모빌 · 🖼 액자
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * stage: 캔버스를 넣을 상자. hooks.onState({count, theme, nav}) · hooks.onPick(i)
 * WebGL 을 못 쓰면 예외를 던진다 (부르는 쪽이 사진 격자로 대신 보여 준다).
 */
export function createEngine(stage, hooks = {}) {
const TX = (k, d) => (hooks.text && hooks.text[k]) || d;   // 문구 9개 언어 (없으면 시안의 한국어)
`;

const renderer = `/* ================= 장면 ================= */
let renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
renderer.domElement.setAttribute('aria-hidden','true');
stage.prepend(renderer.domElement);
`;

const control = fs.readFileSync("scripts/band-engine-control.js", "utf8").replace("/*@@SCAN_CONTROL@@*/", fs.readFileSync("scripts/band-engine-scan-control.js", "utf8"));
const scanMarkup = fs.readFileSync("scripts/band-engine-scan.js", "utf8");
if (!control.includes("function openScanApp")) throw new Error("스캔 연결부를 끼우지 못했어요");

let body = [
  L(203, 288), // 공통 도구 (예시 데이터 FESTS 포함: 디자인 함수가 씀)
  renderer,
  L(300, 1374), // 장면·조명·팔찌 디자인·진열 테마들
  "const SCANS = [];",
  L(1376, 1383), // 예시 사진 프리셋 (예시 사진은 public/band/sample-bands.jpg)
  L(1386, 1549), // 띠 이미지 도구 (리본 텍스처·사진 펴기·가리기·자동 보정·색 뽑기)
  scanMarkup, // 팔찌 만들기 화면 틀 (티켓 정보 + 시안 스캔 화면)
  L(1551, 1792), // 시안 스캔 화면 코드 (네 점·돋보기·가리기·뒤집기·보정·금사 디자인·AI 버튼=출시 안내). 리본으로 걸기는 앱 연결부에서
  L(1805, 2293), // 띠 텍스처 캐시·손목·액자·모빌 등 + 테마 목록·카메라 상태
  control,
].join("\n");

// 시안과 다르게 고친 곳 (앱에서 발견한 문제). 고칠 문장이 시안에 그대로 있어야 한다
const FIXES = [
  // AI 는 넣지 않는다 (시안 주석 정리 — 아래 금지어 검사가 실제 AI 호출 코드가 없음을 확인한다)
  ["/* AI 호출(claude.use('sample'))은 앱 출시 전까지 쓰지 않음 */", "/* AI 호출은 넣지 않음 (앱 출시 후 제공) */"],
  // 스캔: 티켓 정보와 이어 붙이기·예시 사진은 누를 때 불러오기·문구 9개 언어
  ["document.getElementById('scanName').value = p.name;", "ticketCustom(p.name);"],
  [" document.getElementById('scanName').value = ''; layoutPhoto();", " layoutPhoto();"],
  ["document.getElementById('useSample').addEventListener('click', () => { if (samplePhoto) setPhoto(samplePhoto, true); });", "document.getElementById('useSample').addEventListener('click', () => { loadSample().then(ph => setPhoto(ph, true)).catch(() => toast(TX('scan.badPhoto','이 사진은 열 수 없어요'))); });"],
  ["b.textContent = `예시 ${k+1} · ${p.name}`;", "b.textContent = `${TX('scan.ex','예시')} ${k+1} · ${p.name}`;"],
  ["fg2.fillText(enhanceOn ? '보정 후' : '보정 전', 14, 16.5);", "fg2.fillText(enhanceOn ? TX('scan.after','보정 후') : TX('scan.before','보정 전'), 14, 16.5);"],
  ["e.currentTarget.textContent = enhanceOn ? '✨ 자동 보정 켜짐' : '자동 보정 꺼짐';", "e.currentTarget.textContent = enhanceOn ? TX('scan.enhOn','✨ 자동 보정 켜짐') : TX('scan.enhOff','자동 보정 꺼짐');"],
  ["rb.textContent = '🎨 색 순서 바꾸기';", "rb.textContent = TX('scan.rot','🎨 색 순서 바꾸기');"],
  ["catch { toast('이 사진은 열 수 없어요'); }", "catch { toast(TX('scan.badPhoto','이 사진은 열 수 없어요')); }"],
  ["aiChip.textContent = '✨ AI 디자인';", "aiChip.textContent = TX('scan.ai','✨ AI 디자인');"],
  ["const name = document.getElementById('scanName').value.trim() || '내 팔찌';", "const name = document.getElementById('scanName').value.trim() || TX('scan.mine','내 팔찌');"],
  ["{ id:'gold', label:'금사' },", "{ id:'gold', label:TX('scan.st.gold','금사') },"],
  // 금사 디자인의 연도는 티켓 정보의 연도를 따른다 (시안은 이름 속 연도)
  ["year:yearOf(name), gold:{ bg:base.bg, ink },", "year:String(document.getElementById('tkYear')?.value || yearOf(name)), gold:{ bg:base.bg, ink },"],
  ["{ id:'pulse', label:'심박선' }, { id:'rings', label:'반복 원' }, { id:'spiral', label:'소용돌이' }, { id:'contour', label:'등고선' },", "{ id:'pulse', label:TX('scan.st.pulse','심박선') }, { id:'rings', label:TX('scan.st.rings','반복 원') }, { id:'spiral', label:TX('scan.st.spiral','소용돌이') }, { id:'contour', label:TX('scan.st.contour','등고선') },"],
  ["{ id:'wave', label:'물결' }, { id:'check', label:'체크' }, { id:'stars', label:'별자리' }, { id:'leaf', label:'잎사귀' },", "{ id:'wave', label:TX('scan.st.wave','물결') }, { id:'check', label:TX('scan.st.check','체크') }, { id:'stars', label:TX('scan.st.stars','별자리') }, { id:'leaf', label:TX('scan.st.leaf','잎사귀') },"],
  // 🖼 액자: 뒤판 앞면(-0.01)과 팔찌(0~0.04)가 너무 가까워, 깊이 정밀도가 낮은 그래픽(소프트웨어 렌더링·일부 폰)에서
  // 뒤판이 팔찌 위로 비쳐 검은 얼룩이 생겼다 → 뒤판만 조금 뒤로 민다 (보이는 모양은 같음)
  ["board.position.z = -.04; root.add(board);", "board.position.z = -.12; root.add(board);"],
  // 🖼 액자: 휴대폰 세로 화면에서 위아래가 비지 않게 "세로형 액자"로 (대표 요청 2026-11-19).
  // 한 줄 2개(양 끝이 액자 안쪽에서 잘림) → 1개 번갈아 놓는 벽돌 배열로 폭을 줄여 세로로 길게 만든다.
  // 팔찌가 많아 2·1 배열이 너무 길어지면 시안의 3·2 배열을 쓴다 — 둘 중 화면 비율에 더 가까운 쪽을 고른다.
  ["  const slotOf = k => { const r5 = k % 5, row = Math.floor(k/5)*2 + (r5 < 3 ? 0 : 1); return r5 < 3 ? { row, x:(r5 - 1)*(BL + GAP) } : { row, x:(r5 - 3.5)*(BL + GAP) }; };\n  const INNER_W = 2.5*BL + 2*GAP;",
   "  const slot3 = k => { const r5 = k % 5, row = Math.floor(k/5)*2 + (r5 < 3 ? 0 : 1); return r5 < 3 ? { row, x:(r5 - 1)*(BL + GAP) } : { row, x:(r5 - 3.5)*(BL + GAP) }; };\n" +
   "  const slot2 = k => { const r3 = k % 3, row = Math.floor(k/3)*2 + (r3 < 2 ? 0 : 1); return r3 < 2 ? { row, x:(r3 - .5)*(BL + GAP) } : { row, x:0 }; };\n" +
   "  let PAT = 2;\n" +
   "  const slotOf = k => PAT === 3 ? slot3(k) : slot2(k);\n" +
   "  const innerW = p => p === 3 ? 2.5*BL + 2*GAP : 1.5*BL + GAP;\n" +
   "  const rowsFor = (p, n) => Math.max(3, n ? (p === 3 ? slot3(n - 1) : slot2(n - 1)).row + 1 : 0);\n" +
   "  function pickPat(n){   // 화면(세로/가로) 비율에 더 가까운 배열\n" +
   "    const want = 1/Math.max(.2, camera.aspect), off = p => Math.abs(Math.log(((rowsFor(p, n)*ROWH + .6) + .9)/(innerW(p) + .9)/want));\n" +
   "    return off(2) <= off(3) ? 2 : 3;\n" +
   "  }\n" +
   "  let INNER_W = innerW(PAT);"],
  // 팔찌가 적어도(2·1 배열) 액자는 세로형을 지키고, 줄 간격을 조금 벌려(최대 1.8배) 액자 안을 채운 뒤 가운데에 놓는다
  ["    const L = live(), rows = Math.max(3, L.length ? slotOf(L.length - 1).row + 1 : 0);\n    WT = INNER_W; HT = rows*ROWH + .6;\n    L.forEach((it, k) => { const s = slotOf(k); it.px = s.x; it.sy.t = HT/2 - .5 - s.row*ROWH; });",
   "    const L = live(); PAT = pickPat(L.length); INNER_W = innerW(PAT);\n" +
   "    const rows = rowsFor(PAT, L.length), minH = PAT === 2 ? INNER_W*1.3 : 0;\n" +
   "    const gap = Math.min(ROWH*1.8, Math.max(ROWH, (minH - .6)/rows)), used = rows*gap + .6;\n" +
   "    WT = INNER_W; HT = Math.max(used, minH);\n" +
   "    const top = HT/2 - .5 - (HT - used)/2;\n" +
   "    L.forEach((it, k) => { const s = slotOf(k); it.px = s.x; it.sy.t = top - s.row*gap; });"],
];
for (const [a, b] of FIXES) {
  if (!body.includes(a)) throw new Error("고칠 문장을 시안에서 못 찾았어요: " + a);
  body = body.replace(a, b);
}
// 대표 요청으로 바꾼 진열 (걸기 압정 · 모빌 고리 크기) — 한 번만 나와야 하는 문장은 한 번인지 확인
for (const [a, b, all] of THEME_FIXES) {
  const n = body.split(a).length - 1;
  if (!n || (!all && n !== 1)) throw new Error("진열 고칠 문장 " + n + "번 나옴: " + a.slice(0, 80));
  body = all ? body.split(a).join(b) : body.replace(a, b);
}

// 남은 코드가 지운 화면 요소를 찾으면 안 된다
const banned = ["SAMPLE_SRC", "hintEl", "countEl", "tabsEl", "claude.use("];
const bad = banned.filter((w) => body.includes(w));
if (bad.length) throw new Error("지운 화면 요소를 아직 참조해요: " + bad.join(", "));

fs.mkdirSync("src/band/three", { recursive: true });
fs.writeFileSync(OUT, header + body + "\n}\n");
console.log(`${OUT} 만듦 (${(header + body).split("\n").length}줄)`);
