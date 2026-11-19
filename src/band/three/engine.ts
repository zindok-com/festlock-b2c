// @ts-nocheck
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
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX = 60;

/* ================= 샘플 데이터 (이름·도시·숫자는 시연용) ================= */
const PAL = [
  {color:'#E6D69A',ink:'#2B2410',accent:'#5FBF8F'}, {color:'#F4A3C8',ink:'#3A0E24',accent:'#FFD84D'},
  {color:'#7FC9E4',ink:'#08283A',accent:'#FF4FA0'}, {color:'#B9A0FF',ink:'#1E0F45',accent:'#3DD5F3'},
  {color:'#8BE86A',ink:'#123009',accent:'#A77BFF'}, {color:'#FFB894',ink:'#3A1708',accent:'#5B3BD0'},
  {color:'#FFE066',ink:'#2A2000',accent:'#FF5FA2'}, {color:'#FF7A6B',ink:'#2A0805',accent:'#FFE066'},
  {color:'#5BE0C2',ink:'#062A22',accent:'#FF4FA0'}, {color:'#C9C4FF',ink:'#16113A',accent:'#FF8A3D'},
  {color:'#FF9AD5',ink:'#2E0820',accent:'#3DD5F3'}, {color:'#A6E3FF',ink:'#0A2433',accent:'#7CE85A'},
];
const ICONS = ['leaf','star','flower','burst','circle','diamond','heart','bolt','moon','hex'];
const SERVED = [['GRAND MINT','SEOUL','OCT'],['ZONNAFE','ITAEWON','NOV'],['EDC KOREA','INCHEON','OCT'],
  ['EDC ORLANDO','ORLANDO','NOV'],['ULTRA TAIWAN','TAIPEI','NOV'],['NOL FESTIVAL','SEOUL','OCT'],['TOMORROWLAND','PATTAYA','DEC']];
const FICT = ['NEON TIDE','SOLAR BLOOM','DEEP HARBOR','MIDNIGHT MESA','VELVET DUNES','ECHO VALLEY','PRISM BAY','LUNAR DRIFT',
  'KINETIC SUN','SALT & SOUND','HYPER GARDEN','NORTH PULSE','CORAL RAVE','SKYLINE BASS','GOLDEN HOUR','WILD FREQ',
  'NIGHT ORCHARD','BLUE MIRAGE','AURORA YARD','TEMPO FOREST','STAR DOCKS','MONSOON BEAT','SUNDOWN CIRCUS','PIXEL BEACH',
  'ROSE SIGNAL','FROST FEVER','OCEAN ARCADE','CANYON BLOOM','ELECTRIC PIER','SILVER LAGOON','BASS SUMMIT','VAPOR GARDEN',
  'MOON MARKET','HIGHWAY HUM','TROPIC STATIC','RIVER RHYTHM','METRO MELT','SAND & SYNTH','GLOW HARBOR','ORBIT FIELDS',
  'LAVA LOUNGE','CHERRY WAVE','ALPINE ECHO','HALO CITY','CRYSTAL CAVE','JUNGLE CIRCUIT','MOSAIC NIGHTS','PAPER LANTERN',
  'SUNRISE SESSION','WAVEFORM ISLE','DESERT DISCO','POLAR BEAT','LOTUS LOOP'];
const CITIES = ['BERLIN','IBIZA','LISBON','TOKYO','OSAKA','BANGKOK','BALI','SYDNEY','MIAMI','CHICAGO','MEXICO CITY','SAO PAULO',
  'AMSTERDAM','LONDON','BARCELONA','BUDAPEST','PRAGUE','SINGAPORE','MANILA','BUSAN','JEJU','HONG KONG','LAS VEGAS','AUSTIN',
  'MONTREAL','CAPE TOWN','DUBAI','MELBOURNE','DA NANG'];
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const FESTS = [];
for (let i = 0; i < MAX; i++){
  let name, city, month;
  if (i < SERVED.length) [name, city, month] = SERVED[i];
  else { name = FICT[(i - SERVED.length) % FICT.length]; city = CITIES[(i*7) % CITIES.length]; month = MONTHS[(i*5) % 12]; }
  const picks = i < 7 ? [9,12,16,14,7,11,13][i] : 4 + ((i*37 + 11) % 19);
  FESTS.push({ i, name, city, month, sub:`${city} · ${month} 2026`, ...PAL[i % PAL.length], icon: ICONS[i % ICONS.length], picks });
}

/* ================= 공통 도구 ================= */
function rng(seed){ let a = seed*9301 + 49297; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const sp = x => ({ x, v:0, t:x });
function springStep(s, dt, k, z){
  const c = 2*Math.sqrt(k)*(RM ? 1 : z), n = 3, h = dt/n;
  for (let i = 0; i < n; i++){ const a = -k*(s.x - s.t) - c*s.v; s.v += a*h; s.x += s.v*h; }
}
const damp = (a, b, rate, dt) => a + (b - a)*(1 - Math.exp(-dt*rate));
const clamp = THREE.MathUtils.clamp;
function inkOf(hex){
  const c = new THREE.Color(hex), hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, Math.max(hsl.s, .6), Math.min(hsl.l, .38));
  return '#' + c.getHexString();
}
function canvasTex(c){ const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }
function fitFont(ctx, text, maxW, size, weight, family){
  ctx.font = `${weight} ${size}px ${family}`;
  const w = ctx.measureText(text).width;
  if (w > maxW){ size = size*maxW/w; ctx.font = `${weight} ${size}px ${family}`; }
  return size;
}
const MONT = "Montserrat, 'Noto Sans KR', sans-serif", MONO = "'Space Mono', monospace";
function drawIcon(ctx, type, cx, cy, r, color){
  ctx.save(); ctx.fillStyle = color; ctx.beginPath();
  const poly = pts => pts.forEach(([x,y],k) => k ? ctx.lineTo(cx+x*r, cy+y*r) : ctx.moveTo(cx+x*r, cy+y*r));
  if (type === 'circle') ctx.arc(cx,cy,r,0,Math.PI*2);
  else if (type === 'diamond') poly([[0,-1],[1,0],[0,1],[-1,0]]);
  else if (type === 'hex') poly([...Array(6)].map((_,k) => [Math.cos(k*Math.PI/3), Math.sin(k*Math.PI/3)]));
  else if (type === 'bolt') poly([[.15,-1],[-.55,.05],[-.05,.05],[-.2,1],[.55,-.1],[.05,-.1]]);
  else if (type === 'star' || type === 'burst'){
    const n = type === 'star' ? 4 : 10, inner = type === 'star' ? .32 : .62;
    for (let i = 0; i < n*2; i++){ const a = i*Math.PI/n - Math.PI/2, rr = i%2 ? inner : 1; ctx.lineTo(cx+Math.cos(a)*rr*r, cy+Math.sin(a)*rr*r); }
  } else if (type === 'flower'){
    for (let i = 0; i < 4; i++){ const a = i*Math.PI/2, px = cx+Math.cos(a)*r*.5, py = cy+Math.sin(a)*r*.5; ctx.moveTo(px+r*.5,py); ctx.arc(px,py,r*.5,0,Math.PI*2); }
  } else if (type === 'leaf') ctx.ellipse(cx,cy,r*.55,r,Math.PI/4,0,Math.PI*2);
  else if (type === 'moon'){ ctx.arc(cx,cy,r,Math.PI*.28,Math.PI*1.72,false); ctx.arc(cx+r*.5,cy,r*.78,Math.PI*1.56,Math.PI*.44,true); }
  else if (type === 'heart'){
    ctx.moveTo(cx,cy+r*.8);
    ctx.bezierCurveTo(cx-r*1.3,cy-r*.1,cx-r*.5,cy-r*1.1,cx,cy-r*.35);
    ctx.bezierCurveTo(cx+r*.5,cy-r*1.1,cx+r*1.3,cy-r*.1,cx,cy+r*.8);
  }
  ctx.fill(); ctx.restore();
}
function disposeTree(o){
  o.traverse(m => {
    if (m.geometry) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : (m.material ? [m.material] : []);
    mats.forEach(mt => { if (mt.map) mt.map.dispose(); mt.dispose(); });
  });
}

/* ================= 장면 ================= */
let renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
renderer.domElement.setAttribute('aria-hidden','true');
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .45;
const camera = new THREE.PerspectiveCamera(32, 1, .05, 200);
scene.add(new THREE.HemisphereLight(0xffffff, 0x2a1d5c, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(2.5, 4, 5); scene.add(key);
const rim = new THREE.PointLight(0xff4fa0, 5, 14, 1.5); rim.position.set(3, 0, -2); scene.add(rim);
const rim2 = new THREE.PointLight(0x7b4bff, 5, 14, 1.5); rim2.position.set(-3, -1.5, -1.5); scene.add(rim2);
const world = new THREE.Group(); scene.add(world);

/* =====================================================================
   1) 리본 — 레일에서 위→아래로 내려옴. 한 줄 10개, 넘치면 아래 줄에 레일 추가
   ===================================================================== */
/* =====================================================================
   팔찌 디자인 — FestLock 오리지널 패턴 8종 + 사각 태그(자물쇠 마크) + 고정 비즈
   글꼴은 Pretendard 하나로 통일
   ===================================================================== */
const PRET = "'Pretendard', 'Noto Sans KR', sans-serif";
const BAND_STYLES = [
  { id:'gold', label:TX('scan.st.gold','금사') },
  { id:'pulse', label:TX('scan.st.pulse','심박선') }, { id:'rings', label:TX('scan.st.rings','반복 원') }, { id:'spiral', label:TX('scan.st.spiral','소용돌이') }, { id:'contour', label:TX('scan.st.contour','등고선') },
  { id:'wave', label:TX('scan.st.wave','물결') }, { id:'check', label:TX('scan.st.check','체크') }, { id:'stars', label:TX('scan.st.stars','별자리') }, { id:'leaf', label:TX('scan.st.leaf','잎사귀') },
];
const P5 = a => ({ bg:a[0], fg:a[1], accent:a[2], tag:a[3], tagInk:a[4] });
const BAND_PALS = [
  ['#17122E','#F6F1FF','#FF4FA0','#F6F1FF','#17122E'], ['#5B3BD0','#D9D0FF','#3DD5F3','#C9C4FF','#1E0F45'],
  ['#1A1410','#FFC94A','#FF7A2F','#FF7A2F','#1A1410'], ['#14B36B','#0B2E1C','#E6FF7A','#0B2E1C','#7CE85A'],
  ['#1E9BD7','#9FE3FF','#FFFFFF','#FFFFFF','#0B4A6B'], ['#FF6B3D','#FFD9C7','#5B3BD0','#FF4FA0','#FFFFFF'],
  ['#24135E','#FFFFFF','#8C5BFF','#E0457B','#FFFFFF'], ['#0F8FA3','#F7B733','#C79BFF','#0B4A57','#FFFFFF'],
].map(P5);
function contrastInk(hex){ const c = new THREE.Color(hex); const l = .2126*c.r + .7152*c.g + .0722*c.b; return l > .35 ? '#141018' : '#FFFFFF'; }
function bandSpecFor(i){
  const f = FESTS[i], gp = GPALS[i % GPALS.length];
  return { kind:'band', style:'gold', name:f.name, sub:f.city, year:'2026', gold:gp,
    pal:{ bg:gp.bg, fg:gp.ink, accent:'#D9B45A', tag:gp.bg, tagInk:gp.ink }, seed:i+1, L:2.5 + (f.picks % 5)*.12 };
}
function drawPattern(g, style, W, H, p, R){
  g.fillStyle = p.bg; g.fillRect(0,0,W,H);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const ring = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.stroke(); };
  if (style === 'pulse'){
    const per = W*1.7; g.strokeStyle = p.fg; g.lineWidth = W*.05; g.beginPath(); g.moveTo(W/2, 0);
    for (let y = 0; y < H; y += per){
      g.lineTo(W/2, y+per*.34); g.lineTo(W*.36, y+per*.41); g.lineTo(W*.8, y+per*.49); g.lineTo(W*.2, y+per*.57); g.lineTo(W*.62, y+per*.63); g.lineTo(W/2, y+per*.69); g.lineTo(W/2, y+per);
    }
    g.stroke(); g.lineWidth = W*.04; g.strokeStyle = p.accent;
    for (let y = per*.9; y < H; y += per) ring(W/2, y, W*.12);
  } else if (style === 'rings'){
    g.strokeStyle = p.accent; g.globalAlpha = .22; g.lineWidth = W*.03;
    for (let y = -W; y < H; y += W*.28){ g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + W); g.stroke(); }
    g.globalAlpha = 1; const d = W*.5;
    for (let k = 0, y = d*.5; y < H + d; k++, y += d*.86){
      for (let c = -1; c < 3; c++){
        const x = (c + (k%2 ? 0 : .5))*d;
        g.strokeStyle = p.fg; g.lineWidth = W*.045; ring(x, y, d*.34);
        g.fillStyle = p.accent; g.beginPath(); g.arc(x, y, d*.11, 0, Math.PI*2); g.fill();
      }
    }
  } else if (style === 'spiral'){
    const per = W*1.02; g.strokeStyle = p.fg; g.lineWidth = W*.03;
    for (let y = per*.5; y < H + per; y += per){
      for (let r = W*.5; r > W*.05; r -= W*.085) ring(W/2 + (R()-.5)*W*.06, y, r);
      g.fillStyle = p.accent; g.beginPath(); g.arc(W/2, y, W*.05, 0, Math.PI*2); g.fill();
    }
  } else if (style === 'contour'){
    const n = 9; g.strokeStyle = p.fg; g.lineWidth = W*.032;
    for (let k = -2; k < n + 2; k++){
      g.beginPath();
      for (let y = 0; y <= H; y += 5){
        const x = W*(k+.5)/n + W*.2*Math.sin(y/(W*1.4) + k*.6) + W*.07*Math.sin(y/(W*.42) + k*1.9);
        y ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  } else if (style === 'wave'){
    const step = W*.26; g.lineWidth = W*.09;
    for (let k = 0, y0 = 0; y0 < H + step; k++, y0 += step){
      g.strokeStyle = k%3 === 2 ? p.accent : p.fg; g.globalAlpha = k%3 === 1 ? .55 : 1; g.beginPath();
      for (let x = -4; x <= W + 4; x += 3){ const y = y0 + W*.07*Math.sin(x/W*Math.PI*3 + k*.8); x > -4 ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  } else if (style === 'check'){
    const s = W/4;
    for (let yi = 0; yi*s < H; yi++) for (let xi = 0; xi < 4; xi++){ if ((xi + yi) % 2){ g.fillStyle = p.fg; g.fillRect(xi*s, yi*s, s, s); } }
    g.fillStyle = p.accent; for (let y = s*3; y < H; y += s*7) g.fillRect(0, y, W, s*.45);
  } else if (style === 'stars'){
    const gr = g.createLinearGradient(0, 0, 0, H);
    for (let k = 0; k <= 6; k++) gr.addColorStop(k/6, k%2 ? p.accent : p.bg);
    g.fillStyle = gr; g.fillRect(0,0,W,H);
    g.fillStyle = p.fg;
    for (let k = 0; k < H/W*28; k++){ g.globalAlpha = .35 + R()*.65; g.beginPath(); g.arc(R()*W, R()*H, .6 + R()*1.8, 0, Math.PI*2); g.fill(); }
    g.globalAlpha = .8; g.strokeStyle = p.fg; g.lineWidth = 1.6;
    for (let y = W*.8; y < H; y += W*2.3){
      const pts = [...Array(5)].map((_, k) => [W*(.18 + R()*.64), y + k*W*.32 + R()*W*.15]);
      g.beginPath(); pts.forEach(([x, yy], k) => k ? g.lineTo(x, yy) : g.moveTo(x, yy)); g.stroke();
      pts.forEach(([x, yy]) => drawIcon(g, 'star', x, yy, W*.06, p.fg));
    }
    g.globalAlpha = 1;
  } else if (style === 'leaf'){
    for (let k = 0; k < H/W*9; k++){
      g.save(); g.translate(R()*W, R()*H); g.rotate(R()*Math.PI*2);
      g.fillStyle = k%3 ? p.fg : p.accent; g.beginPath(); g.ellipse(0, 0, W*.1, W*.038, 0, 0, Math.PI*2); g.fill(); g.restore();
    }
  }
}
/* ---------- AI 설계도(JSON) → 팔찌 그림. AI는 기본 도형과 색만 고르고, 그리는 건 이 코드 ---------- */
const HEX = /^#[0-9a-fA-F]{6}$/;
const rcCol = (c, d) => HEX.test(c || '') ? c : d;
const rcNum = (v, d, lo, hi) => clamp(Number.isFinite(+v) ? +v : d, lo, hi);
function drawRecipe(g, W, H, rc, R){
  const u = W;
  const bgList = (Array.isArray(rc.bg) ? rc.bg : [rc.bg]).map(c => rcCol(c, null)).filter(Boolean);
  if (bgList.length > 1){
    const gr = g.createLinearGradient(0, 0, 0, H), rep = Math.max(1, Math.round(H/(u*4)));
    for (let k = 0; k <= rep*(bgList.length-1); k++) gr.addColorStop(k/(rep*(bgList.length-1)), bgList[k % bgList.length]);
    g.fillStyle = gr;
  } else g.fillStyle = bgList[0] || '#222222';
  g.fillRect(0, 0, W, H);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const shape = (type, x, y, s, rot) => {
    g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
    if (type === 'square') g.rect(-s/2, -s/2, s, s);
    else if (type === 'triangle'){ g.moveTo(0, -s*.58); g.lineTo(s*.5, s*.29); g.lineTo(-s*.5, s*.29); g.closePath(); }
    else if (type === 'diamond'){ g.moveTo(0, -s*.6); g.lineTo(s*.42, 0); g.lineTo(0, s*.6); g.lineTo(-s*.42, 0); g.closePath(); }
    else if (type === 'cross'){ g.rect(-s*.5, -s*.15, s, s*.3); g.rect(-s*.15, -s*.5, s*.3, s); }
    else if (type === 'star'){ for (let k = 0; k < 10; k++){ const a = -Math.PI/2 + k*Math.PI/5, r = k%2 ? s*.22 : s*.5; g.lineTo(Math.cos(a)*r, Math.sin(a)*r); } g.closePath(); }
    else if (type === 'flower'){ for (let k = 0; k < 5; k++){ const a = k*Math.PI*2/5; g.moveTo(Math.cos(a)*s*.25 + s*.2, Math.sin(a)*s*.25); g.arc(Math.cos(a)*s*.25, Math.sin(a)*s*.25, s*.2, 0, Math.PI*2); } }
    else if (type === 'leaf') g.ellipse(0, 0, s*.5, s*.2, 0, 0, Math.PI*2);
    else g.arc(0, 0, s/2, 0, Math.PI*2);
    g.fill(); g.restore();
  };
  (Array.isArray(rc.layers) ? rc.layers : []).slice(0, 6).forEach(l => {
    if (!l || typeof l !== 'object') return;
    g.save(); g.globalAlpha = rcNum(l.opacity, 1, .1, 1);
    const c = rcCol(l.color, '#FFFFFF'); g.fillStyle = c; g.strokeStyle = c;
    const t = String(l.type || '');
    if (t === 'stripes'){
      const w = rcNum(l.width, .12, .02, 1)*u, gap = rcNum(l.gap, .2, .02, 2)*u, a = rcNum(l.angle, 0, -90, 90)*Math.PI/180, D = Math.hypot(W, H);
      g.translate(W/2, H/2); g.rotate(a); for (let x = -D; x < D; x += w + gap) g.fillRect(x, -D, w, 2*D);
    } else if (t === 'dots'){
      const s = rcNum(l.spacing, .3, .08, 2)*u, r = rcNum(l.size, .08, .01, 1)*u/2, j = rcNum(l.jitter, 0, 0, 1);
      for (let y = s/2, k = 0; y < H; y += s*.87, k++) for (let x = (k%2 ? 0 : s/2); x < W + s; x += s){
        g.beginPath(); g.arc(x + (R()-.5)*s*j, y + (R()-.5)*s*j, r, 0, Math.PI*2); g.fill();
      }
    } else if (t === 'rings'){
      const sz = rcNum(l.size, .4, .05, .6)*u, sp = rcNum(l.spacing, 1, .2, 4)*u, n = Math.round(rcNum(l.count, 3, 1, 8));
      const th = rcNum(l.thickness, .035, .01, .2)*u, fill = rcCol(l.fill, null);
      g.lineWidth = th;
      const cols = sp < u*.7 ? Math.max(1, Math.round(u/sp)) : 1;
      for (let y = sp/2, k = 0; y < H + sp; y += sp, k++) for (let cI = 0; cI < cols; cI++){
        const x = cols === 1 ? W/2 : (cI + .5 + (k%2 ? .5 : 0))*W/cols;
        if (fill){ g.fillStyle = fill; g.beginPath(); g.arc(x, y, sz*.25, 0, Math.PI*2); g.fill(); }
        for (let m = 0; m < n; m++){ const r = sz*(1 - m/n); if (r > th) { g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.stroke(); } }
      }
    } else if (t === 'waves' || t === 'zigzag'){
      const amp = rcNum(l.amplitude, .08, .01, .5)*u, wl = rcNum(l.wavelength, .6, .1, 3)*u, sp = rcNum(l.spacing, .3, .06, 2)*u;
      g.lineWidth = rcNum(l.thickness, .05, .01, .3)*u;
      for (let y0 = 0; y0 < H + sp; y0 += sp){
        g.beginPath();
        for (let x = -4; x <= W + 4; x += 2){
          const ph = (x/wl) % 1, yy = t === 'waves' ? Math.sin(x/wl*Math.PI*2)*amp : (Math.abs(ph*2 - 1)*2 - 1)*amp;
          x > -4 ? g.lineTo(x, y0 + yy) : g.moveTo(x, y0 + yy);
        }
        g.stroke();
      }
    } else if (t === 'contour'){
      const n = Math.round(rcNum(l.count, 8, 2, 16)); g.lineWidth = rcNum(l.thickness, .03, .01, .15)*u; const ph = R()*6;
      for (let k = -2; k < n + 2; k++){
        g.beginPath();
        for (let y = 0; y <= H; y += 5){ const x = W*(k+.5)/n + W*.2*Math.sin(y/(W*1.4) + k*.6 + ph) + W*.07*Math.sin(y/(W*.42) + k*1.9); y ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
    } else if (t === 'pulse'){
      const per = rcNum(l.period, 1.6, .5, 4)*u; g.lineWidth = rcNum(l.thickness, .05, .01, .2)*u; g.beginPath(); g.moveTo(W/2, 0);
      for (let y = 0; y < H; y += per){ g.lineTo(W/2, y+per*.34); g.lineTo(W*.36, y+per*.41); g.lineTo(W*.8, y+per*.49); g.lineTo(W*.2, y+per*.57); g.lineTo(W*.62, y+per*.63); g.lineTo(W/2, y+per*.69); g.lineTo(W/2, y+per); }
      g.stroke();
    } else if (t === 'check'){
      const s = rcNum(l.size, .25, .05, 1)*u;
      for (let yi = 0; yi*s < H; yi++) for (let xi = 0; xi*s < W; xi++) if ((xi + yi) % 2) g.fillRect(xi*s, yi*s, s, s);
    } else if (t === 'blocks'){
      const len = rcNum(l.length, .25, .03, 3)*u;
      (Array.isArray(l.at) ? l.at : [l.at]).slice(0, 8).forEach(p => { const y = rcNum(p, .5, 0, 1)*H; g.fillRect(0, y - len/2, W, len); });
    } else if (t === 'shapes' || t === 'stars' || t === 'leaves'){
      const type = t === 'stars' ? 'star' : t === 'leaves' ? 'leaf' : String(l.shape || 'circle');
      const s = rcNum(l.size, .14, .03, .8)*u, dens = rcNum(l.density, 6, .5, 30), n = Math.round(dens*H/u), rot = l.rotate !== false;
      for (let k = 0; k < n; k++) shape(type, R()*W, R()*H, s*(.7 + R()*.6), rot ? R()*Math.PI*2 : 0);
    }
    g.restore();
  });
}
function recipeSpec(rc, name, seed){
  const bg0 = rcCol(Array.isArray(rc.bg) ? rc.bg[0] : rc.bg, '#222222');
  const tagBg = rcCol(rc.tag && rc.tag.bg, '#F6F1FF');
  const lab = rc.label || {};
  return {
    kind:'band', style:'ai', recipe:rc, name, sub:'', seed, L:2.7,
    pal:{ bg:bg0, fg:'#FFFFFF', accent:tagBg, tag:tagBg, tagInk:rcCol(rc.tag && rc.tag.ink, contrastInk(tagBg)) },
    labelBg:rcCol(lab.bg, tagBg), labelInk:rcCol(lab.ink, contrastInk(rcCol(lab.bg, tagBg))), labelPos:rcNum(lab.position, .42, .25, .7),
  };
}

function goldD(spec){
  const bg = spec.gold ? spec.gold.bg : spec.pal.bg;
  const ink = spec.gold ? spec.gold.ink : (contrastInk(bg) === '#FFFFFF' ? '#F6F1E6' : '#241C14');
  const year = spec.year || yearOf(spec.name);
  const name = (spec.name || 'MY FESTIVAL').replace(year, '').replace(/\s*·\s*$/, '').trim() || spec.name || 'MY FESTIVAL';
  return { bg, ink, name, sub:spec.sub || '', year, start:spec.start || .3 };
}
function bandStrap(spec, L, w){
  const W = 128, H = Math.round(W*L/w), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rng(spec.seed || 1), p = spec.pal;
  if (spec.style === 'gold'){
    paintGoldStrip(g, W, H, goldD(spec), 'color');
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 6) g.lineTo(x, H - R()*W*.08);
    g.lineTo(W, H); g.closePath(); g.fill();
    return c;
  }
  if (spec.style === 'ai' && spec.recipe) drawRecipe(g, W, H, spec.recipe, R);
  else drawPattern(g, spec.style, W, H, p, R);
  g.globalAlpha = .07; g.fillStyle = '#000'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1); g.globalAlpha = 1;   // 직조 결
  // 인쇄된 이름 칸 (세로로 읽힘)
  const size = W*.36; g.font = `800 ${size}px ${PRET}`;
  const name = spec.name || 'MY FESTIVAL';
  let tw = Math.min(g.measureText(name).width, H*.36);
  const y0 = H*(spec.labelPos || .42), pad = W*.22;
  g.fillStyle = spec.labelBg || p.tag; g.fillRect(0, y0, W, tw + pad*2);
  g.save(); g.translate(W/2, y0 + pad); g.rotate(Math.PI/2); g.fillStyle = spec.labelInk || p.tagInk; g.textBaseline = 'middle';
  fitFont(g, name, H*.36, size, 800, PRET); g.fillText(name, 0, 0); g.restore();
  if (spec.sub){
    g.save(); g.translate(W/2, H*.82); g.rotate(Math.PI/2); g.textBaseline = 'middle'; g.fillStyle = p.fg;
    fitFont(g, spec.sub, H*.14, W*.17, 600, PRET); g.fillText(spec.sub, 0, 0); g.restore();
  }
  // 끝단 올 풀림
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) g.lineTo(x, H - R()*W*.08);
  g.lineTo(W, H); g.closePath(); g.fill();
  return c;
}
function lockGlyph(g, cx, cy, s, color, hole){
  g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = s*.16;
  g.beginPath(); g.arc(cx, cy - s*.18, s*.32, Math.PI, 0); g.lineTo(cx + s*.32, cy + s*.05); g.moveTo(cx - s*.32, cy - s*.18); g.lineTo(cx - s*.32, cy + s*.05); g.stroke();
  g.beginPath(); g.roundRect(cx - s*.55, cy, s*1.1, s*.85, s*.16); g.fill();
  g.fillStyle = hole; g.beginPath(); g.arc(cx, cy + s*.36, s*.12, 0, Math.PI*2); g.fill(); g.fillRect(cx - s*.05, cy + s*.4, s*.1, s*.24);
  g.restore();
}
function tagCanvas(spec){
  if (spec.style === 'gold') return goldTag(spec);
  const c = document.createElement('canvas'); c.width = 220; c.height = 180; const g = c.getContext('2d'), p = spec.pal;
  g.fillStyle = p.tag; g.beginPath(); g.roundRect(0, 0, 220, 180, 26); g.fill();
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.roundRect(60, 12, 100, 9, 4.5); g.fill(); g.beginPath(); g.roundRect(60, 159, 100, 9, 4.5); g.fill();
  lockGlyph(g, 110, 62, 56, p.tagInk, p.tag);
  g.fillStyle = p.tagInk; g.textAlign = 'center'; g.textBaseline = 'middle';
  const word = (spec.name || 'FESTLOCK').split(/[\s·]+/)[0];
  fitFont(g, word, 184, 34, 800, PRET); g.fillText(word, 110, 134);
  return c;
}
function makeBandParts(){   // 테마 하나가 같이 쓰는 형상
  return {
    tagGeo: new RoundedBoxGeometry(.46, .38, .03, 3, .012),
    faceGeo: new THREE.PlaneGeometry(.46, .376),
    beadGeo: new THREE.CylinderGeometry(.052, .052, .13, 20),
    beadMat: new THREE.MeshStandardMaterial({ color:0x121014, roughness:.35, metalness:.1 }),
  };
}
function attachBand(mesh, spec, parts, plane){
  const clip = [plane];
  const tag = new THREE.Mesh(parts.tagGeo, new THREE.MeshStandardMaterial({ color:spec.pal.tag, roughness:.3, metalness:.05, clippingPlanes:clip }));
  const face = new THREE.Mesh(parts.faceGeo, new THREE.MeshStandardMaterial({ map:canvasTex(tagCanvas(spec)), roughness:.3, transparent:false, alphaTest:.5, clippingPlanes:clip }));
  tag.position.set(0, -.5, .03); face.position.set(0, -.5, .0455);
  const bead = new THREE.Mesh(parts.beadGeo, parts.beadMat.clone()); bead.material.clippingPlanes = clip;
  bead.position.set(0, -.14, .03);
  mesh.add(tag, face, bead);
}

/* =====================================================================
   금사(골드 스레드) 스타일 — 단색 천 + 금사 장식 + 큰 연도 + 작은 문구 (Pretendard)
   장식 배치는 FestLock이 새로 짠 것. 금사 부분은 마스크로 금속 반사를 줌
   ===================================================================== */
const GPALS = [
  { bg:'#C8551F', ink:'#FFF3E4' }, { bg:'#151A30', ink:'#F3EEE2' }, { bg:'#BCD0C9', ink:'#2F4743' }, { bg:'#7F9BC4', ink:'#F7F9FC' },
  { bg:'#6E1F2E', ink:'#F6E6D8' }, { bg:'#1F4A3A', ink:'#F1EAD6' }, { bg:'#C99A2E', ink:'#2A1E08' }, { bg:'#4A2A5E', ink:'#F3E9F7' },
  { bg:'#B4583F', ink:'#FFF1E6' }, { bg:'#1F5E66', ink:'#EAF6F4' }, { bg:'#D9C7A3', ink:'#3A2E18' }, { bg:'#2A2A2E', ink:'#EDE6D6' },
];
const gpal = i => GPALS[i % GPALS.length];
const yearOf = s => (String(s || '').match(/(?:19|20)\d{2}/) || [])[0] || '2026';
const GOLD_STOPS = ['#7A5A22','#D9B45A','#FFF1B8','#C9993E','#E9C46A','#8A6A2A'];
function goldPaint(g, x0, y0, x1, y1){ const gr = g.createLinearGradient(x0, y0, x1, y1); GOLD_STOPS.forEach((c, k, a) => gr.addColorStop(k/(a.length-1), c)); return gr; }
const orn = {
  diamond(g, x, y, s, p){ g.fillStyle = p; g.beginPath(); g.moveTo(x, y-s); g.lineTo(x+s*.7, y); g.lineTo(x, y+s); g.lineTo(x-s*.7, y); g.closePath(); g.fill(); },
  chainV(g, x, y0, y1, s, p, lw){   // 세로 사슬: 가는 선 + 타원 고리 + 작은 마름모
    if (y1 - y0 < s*2) return;
    g.strokeStyle = p; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke();
    for (let y = y0 + s; y < y1 - s*.6; y += s*2.4){ g.beginPath(); g.ellipse(x, y, s*.42, s*.8, 0, 0, Math.PI*2); g.stroke(); orn.diamond(g, x, y + s*1.2, s*.2, p); }
  },
  chainH(g, x0, x1, y, s, p, lw){
    if (x1 - x0 < s*2) return;
    g.strokeStyle = p; g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    for (let x = x0 + s; x < x1 - s*.6; x += s*2.4){ g.beginPath(); g.ellipse(x, y, s*.8, s*.42, 0, 0, Math.PI*2); g.stroke(); orn.diamond(g, x + s*1.2, y, s*.2, p); }
  },
  swirl(g, x, y, r, p, lw, dir = 1){
    g.strokeStyle = p; g.lineWidth = lw; g.beginPath();
    for (let t = 0; t <= Math.PI*3.6; t += .1){ const rr = r*(1 - t/(Math.PI*4)); g.lineTo(x + Math.cos(t*dir)*rr, y + Math.sin(t*dir)*rr); }
    g.stroke();
  },
  frame(g, x, y, w, h, p, lw){
    g.strokeStyle = p; g.lineWidth = lw; g.strokeRect(x, y, w, h);
    const s = lw*2.6;
    [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([a,b]) => orn.diamond(g, a, b, s, p));
  },
};
function weave(g, W, H){
  g.globalAlpha = .07; g.fillStyle = '#000'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  g.globalAlpha = .05; g.fillStyle = '#fff'; for (let x = 0; x < W; x += 3) g.fillRect(x, 0, 1, H);
  g.globalAlpha = 1;
}
// 세로 띠 (리본·팔찌 공통). mode 'color' = 전체, 'mask' = 금사 자리만 흰색
// d = { bg, ink, name, sub, year, start(글자 시작 위치 0~1) }
function paintGoldStrip(g, W, H, d, mode){
  const mask = mode === 'mask';
  const G = mask ? '#FFFFFF' : goldPaint(g, 0, 0, W, 0);
  if (mask){ g.fillStyle = '#000'; g.fillRect(0, 0, W, H); } else { g.fillStyle = d.bg; g.fillRect(0, 0, W, H); weave(g, W, H); }
  const lw = Math.max(1, W*.024);
  [W*.07, W*.115, W*.885, W*.93].forEach(x => { g.fillStyle = G; g.fillRect(x - lw/2, 0, lw, H); });   // 가장자리 금사 두 줄
  // 글자 길이 계산 (마스크도 같은 배치가 되도록 똑같이 잼)
  const hasLS = 'letterSpacing' in g;
  const measure = (txt, font, ls = 0) => { g.font = font; if (hasLS) g.letterSpacing = `${ls}px`; const w = g.measureText(txt).width + (hasLS ? 0 : ls*txt.length); if (hasLS) g.letterSpacing = '0px'; return w; };
  let nameS = W*.15, yearS = W*.52, subS = W*.12;
  // 이름·지역이 너무 길면 각자 먼저 줄이고, 전체가 안 들어가면 셋을 같은 비율로 줄임
  nameS *= Math.min(1, H*.28/Math.max(1, measure(d.name, `800 ${nameS}px ${PRET}`)));
  if (d.sub) subS *= Math.min(1, H*.22/Math.max(1, measure(d.sub, `600 ${subS}px ${PRET}`)));
  const y0 = H*(d.start || .2), gap = W*.32;
  const lens = () => [measure(d.name, `800 ${nameS}px ${PRET}`), d.sub ? measure(d.sub, `600 ${subS}px ${PRET}`) : 0, measure(d.year, `600 ${yearS}px ${PRET}`, yearS*.08)];
  const avail = H*.9 - y0 - gap*3 - W*.8;
  let [nameLen, subLen, yearLen] = lens();
  const need = nameLen + subLen + yearLen;
  if (need > avail){ const k = Math.max(.3, avail/need); nameS *= k; subS *= k; yearS *= k; [nameLen, subLen, yearLen] = lens(); }
  const nameY = y0, frameY = nameY + nameLen + gap, frameLen = yearLen + W*.8, subY = frameY + frameLen + gap;
  const endY = subY + subLen + gap;
  orn.chainV(g, W/2, W*.25, nameY - gap*.8, W*.12, G, lw*.8);
  orn.frame(g, W*.22, frameY, W*.56, frameLen, G, lw);
  orn.diamond(g, W/2, frameY, W*.07, G); orn.diamond(g, W/2, frameY + frameLen, W*.07, G);
  orn.chainV(g, W/2, endY, H*.9, W*.12, G, lw*.8);
  orn.swirl(g, W*.5, H*.965, W*.16, G, lw*.8, 1);
  if (mask) return;
  const vText = (txt, y, font, color, ls = 0) => {
    g.save(); g.translate(W/2, y); g.rotate(Math.PI/2); g.font = font; g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'left';
    if ('letterSpacing' in g) g.letterSpacing = `${ls}px`; g.fillText(txt, 0, 0); g.restore();
  };
  vText(d.name, nameY, `800 ${nameS}px ${PRET}`, d.ink);
  vText(d.year, frameY + W*.4, `600 ${yearS}px ${PRET}`, d.ink, yearS*.08);
  if (d.sub) vText(d.sub, subY, `600 ${subS}px ${PRET}`, d.ink);
}
// 금사 마스크 → 금속·거칠기 지도 (G = 거칠기, B = 금속성). 메모리를 아끼려 절반 해상도
function goldMaskTex(W, H, paint){
  const s = .5, c = document.createElement('canvas'); c.width = Math.max(8, Math.round(W*s)); c.height = Math.max(8, Math.round(H*s));
  const g = c.getContext('2d', { willReadFrequently:true }); g.scale(s, s); paint(g, 'mask');
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
  for (let i = 0; i < d.length; i += 4){ const m = d[i]/255; d[i] = 0; d[i+1] = 220 - m*135; d[i+2] = m*255; d[i+3] = 255; }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}
function goldTag(spec){   // 금사 스타일 태그: 천과 같은 색 + 금테 + 금 자물쇠
  const c = document.createElement('canvas'); c.width = 220; c.height = 180; const g = c.getContext('2d');
  g.fillStyle = spec.pal.tag; g.beginPath(); g.roundRect(0, 0, 220, 180, 26); g.fill();
  const G = goldPaint(g, 0, 0, 220, 180);
  g.strokeStyle = G; g.lineWidth = 5; g.beginPath(); g.roundRect(9, 9, 202, 162, 19); g.stroke();
  g.lineWidth = 1.6; g.beginPath(); g.roundRect(17, 17, 186, 146, 13); g.stroke();
  lockGlyph(g, 110, 60, 52, G, spec.pal.tag);
  g.fillStyle = spec.pal.tagInk; g.textAlign = 'center'; g.textBaseline = 'middle';
  const word = (spec.name || 'FESTLOCK').split(/[\s·]+/)[0];
  fitFont(g, word, 170, 30, 800, PRET); g.fillText(word, 110, 132);
  return c;
}

function makeRibbonTheme(mode = 'fest'){
  const isScan = mode === 'scan';
  const root = new THREE.Group(); world.add(root);
  const COLS = 10, RW = .62, GX = .08, SEG = 40;
  const railMat = new THREE.MeshStandardMaterial({ color:0x2a1f57, roughness:.55, metalness:.2 });
  const lineMat = new THREE.MeshStandardMaterial({ color:0xff4fa0, emissive:0xff4fa0, emissiveIntensity:.6, roughness:.4 });
  /* 코르크 띠 (양쪽 공 대신) — 결이 보이게 점을 흩뿌린 그림을 띠 길이만큼 반복 */
  const corkTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = '#b8895b'; g.fillRect(0, 0, 256, 64);
    for (let k = 0; k < 2600; k++){
      const r = Math.random()*1.7 + .3;
      g.fillStyle = Math.random() < .55 ? 'rgba(96,58,26,.5)' : 'rgba(236,204,156,.45)';
      g.fillRect(Math.random()*256, Math.random()*64, r, r);
    }
    const t = canvasTex(c); t.wrapS = THREE.RepeatWrapping; return t;
  })();
  const railGeo = new THREE.BoxGeometry(1, .3, .08);
  /* 검은 압정: 머리 · 손잡이 · 받침 · 바늘 (앞쪽을 보게 눕혀 둠) */
  const pinMat = new THREE.MeshStandardMaterial({ color:0x16131c, roughness:.28, metalness:.15 });
  const needleMat = new THREE.MeshStandardMaterial({ color:0xcfcfd6, roughness:.25, metalness:.9 });
  const pinParts = [
    [new THREE.CylinderGeometry(.05, .05, .03, 28), pinMat, .105],
    [new THREE.CylinderGeometry(.024, .03, .07, 20), pinMat, .055],
    [new THREE.CylinderGeometry(.042, .042, .018, 24), pinMat, .02],
    [new THREE.CylinderGeometry(.006, .006, .05, 8), needleMat, -.01],
  ];
  /* 압정 색: 팔찌 윗부분(압정이 꽂히는 곳) 색과 가장 멀리 떨어진 색 — 비슷한 색이면 압정이 묻혀서 이상해 보임 (대표 요청)
     검정·흰색을 조금 더 좋아함 (진짜 압정 느낌) */
  const PIN_COLS = [0x16131c, 0xf4f1ea, 0xe3262f, 0x2453e0, 0x14a05a, 0xf2c230];
  function pinColorFor(img){
    let r = 128, g = 128, b = 128;
    try {
      const W = img.width, H = img.height, h = Math.max(4, Math.round(H*.08));
      const c = document.createElement('canvas'); c.width = 16; c.height = 4;
      const x = c.getContext('2d'); x.drawImage(img, W*.2, 0, W*.6, h, 0, 0, 16, 4);
      const d = x.getImageData(0, 0, 16, 4).data; let n = 0, sr = 0, sg = 0, sb = 0;
      for (let k = 0; k < d.length; k += 4){ if (d[k+3] < 128) continue; sr += d[k]; sg += d[k+1]; sb += d[k+2]; n++; }
      if (n){ r = sr/n; g = sg/n; b = sb/n; }
    } catch { /* 그림을 읽을 수 없으면 회색으로 보고 고름 */ }
    let best = PIN_COLS[0], bd = -1;
    PIN_COLS.forEach((col, k) => {
      const cr = col >> 16 & 255, cg = col >> 8 & 255, cb = col & 255, rm = (r + cr)/2, dr = r - cr, dg = g - cg, db = b - cb;
      const dist = Math.sqrt((2 + rm/256)*dr*dr + 4*dg*dg + (2 + (255 - rm)/256)*db*db)*(k < 2 ? 1.12 : 1);   // 눈에 가까운 색 거리
      if (dist > bd){ bd = dist; best = col; }
    });
    return best;
  }
  function makePin(color){
    const g = new THREE.Group(), mat = pinMat.clone(); mat.color.setHex(color); g.userData.mat = mat;
    pinParts.forEach(([geo, m0, z]) => { const m = new THREE.Mesh(geo, m0 === pinMat ? mat : m0); m.rotation.x = Math.PI/2; m.position.z = z; g.add(m); });
    g.rotation.set(.2*(Math.random() - .5), .15 + .3*(Math.random() - .5), 0);
    g.scale.setScalar(.001); g.visible = false; root.add(g); return g;
  }
  const rows = [], items = [];
  const lenOf = f => 1.35 + f.picks*.085;

  function tex(f, L){
    const CW = 144, CH = Math.round(CW*L/RW), c = document.createElement('canvas'); c.width = CW; c.height = CH;
    const g = c.getContext('2d');
    g.fillStyle = f.color; g.fillRect(0,0,CW,CH);
    g.globalAlpha = .07; g.fillStyle = '#000'; for (let y=0;y<CH;y+=3) g.fillRect(0,y,CW,1);
    g.globalAlpha = .05; g.fillStyle = '#fff'; for (let x=0;x<CW;x+=3) g.fillRect(x,0,1,CH);
    g.globalAlpha = .35; g.strokeStyle = f.ink; g.lineWidth = 2; g.setLineDash([7,5]);
    g.beginPath(); g.moveTo(8,0); g.lineTo(8,CH); g.moveTo(CW-8,0); g.lineTo(CW-8,CH); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    const bY = CW*.28, bH = CW*.78;
    g.fillStyle = f.accent; g.fillRect(13,bY,CW-26,bH); drawIcon(g, f.icon, CW/2, bY+bH/2, CW*.22, f.color);
    const start = bY + bH + CW*.22, notch = CW*.5, avail = CH - start - notch - CW*.55;
    g.save(); g.translate(CW/2, start); g.rotate(Math.PI/2); g.fillStyle = f.ink; g.textBaseline = 'middle';
    fitFont(g, f.name, avail, CW*.4, 900, MONT); g.fillText(f.name, 0, -CW*.1);
    g.font = `700 ${CW*.13}px ${MONO}`; g.globalAlpha = .8; g.fillText(f.sub, 0, CW*.24); g.restore();
    g.fillStyle = f.ink; g.textAlign = 'center';
    g.font = `700 ${CW*.12}px ${MONO}`; g.fillText('LINEUP', CW/2, CH-notch-CW*.3);
    g.font = `900 ${CW*.24}px ${MONT}`; g.fillText(String(f.picks), CW/2, CH-notch-CW*.04);
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.moveTo(0,CH); g.lineTo(CW/2,CH-notch*.55); g.lineTo(CW,CH); g.closePath(); g.fill();
    return canvasTex(c);
  }
  function goldRibbon(f, L){
    const CW = 144, CH = Math.round(CW*L/RW), c = document.createElement('canvas'); c.width = CW; c.height = CH;
    const g = c.getContext('2d'), gp = gpal(f.i);
    const d = { bg:gp.bg, ink:gp.ink, name:f.name, sub:`LINEUP ${f.picks}`, year:'2026', start:.1 };
    paintGoldStrip(g, CW, CH, d, 'color');
    const notch = CW*.5;
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.moveTo(0, CH); g.lineTo(CW/2, CH - notch*.55); g.lineTo(CW, CH); g.closePath(); g.fill();
    return { map:canvasTex(c), mm:goldMaskTex(CW, CH, (gg, m) => paintGoldStrip(gg, CW, CH, d, m)) };
  }
  function ensureRow(r){
    while (rows.length <= r){
      const gr = new THREE.Group();
      const tx = corkTex.clone(); tx.needsUpdate = true;
      const body = new THREE.Mesh(railGeo, new THREE.MeshStandardMaterial({ map:tx, roughness:.95 }));
      body.position.set(0, -.07, -.06);   // 팔찌 윗부분 뒤에 띠가 오게 (압정이 팔찌를 뚫고 띠에 꽂힘)
      gr.add(body); gr.visible = false; root.add(gr);
      rows.push({ gr, body, tx, y:0, w:0, wT:0, plane:new THREE.Plane(new THREE.Vector3(0,-1,0), 0) });
    }
  }
  function relayout(){
    let y = 0;
    rows.forEach((row, r) => {
      const live = items.filter(it => it.row === r && !it.leaving);
      const total = live.reduce((s, it) => s + it.w, 0) + Math.max(0, live.length-1)*GX;
      let cx = -total/2;
      live.forEach(it => { it.tx = cx + it.w/2; cx += it.w + GX; });
      row.y = y; row.gr.position.y = y; row.plane.constant = y + .08;   // 레일 아래로만 보이게 자르는 면
      items.filter(it => it.row === r).forEach(it => { it.s.t = it.leaving ? y + it.L + .15 : y; });
      row.wT = live.length ? total + .34 : 0;
      y -= (live.length ? Math.max(...live.map(it => it.L)) : 0) + .75;
    });
  }
  function deform(it, t){
    const a = it.mesh.geometry.attributes.position.array, b = it.base;
    const amp = (RM ? .4 : 1)*(1 + it.flutter), fall = clamp(-it.s.v, -6, 6);
    for (let i = 0; i < a.length; i += 3){
      const bx = b[i], by = b[i+1], v = clamp(-by/it.L, 0, 1);
      a[i] = bx + .05*amp*v*v*Math.sin(t*.9 + it.phase);
      a[i+1] = by;
      a[i+2] = .16*amp*Math.pow(v,1.4)*Math.sin(t*1.7 + v*3.2 + it.phase) + bx*v*.32*amp*Math.sin(t*1.1 + it.phase*1.3) - fall*.035*v*v;
    }
    it.mesh.geometry.attributes.position.needsUpdate = true;
    it.mesh.geometry.computeVertexNormals();
  }
  function kill(it){
    if (it.pin){ root.remove(it.pin); it.pin.userData.mat.dispose(); }
    root.remove(it.mesh); it.mesh.geometry.dispose();
    it.mesh.traverse(o => { if (o.material){ if (o.material.map) o.material.map.dispose(); if (o.material.metalnessMap) o.material.metalnessMap.dispose(); o.material.dispose(); } });
    items.splice(items.indexOf(it), 1);
  }
  const parts = makeBandParts();
  const specOf = i => isScan ? SCANS[i] : mode === 'band' ? bandSpecFor(i) : { kind:'fest', f:FESTS[i] };
  const styleName = id => (BAND_STYLES.find(s => s.id === id) || {}).label || '';

  return {
    root, rotLimit:.75, free360:true,
    hint: isScan ? '내 팔찌 사진을 펴고 자동 보정해서 걸었어요 · 아래 버튼으로 추가'
        : mode === 'band' ? '금사 스타일 팔찌 · 단색 천 + 금사 장식 + 큰 연도 (Pretendard)'
        : '리본 길이 = 그 페스티벌에서 담은 아티스트 수 · 리본을 누르면 펄럭여요',
    label: mode === 'fest' ? null : i => {
      const s = specOf(i); if (!s) return '내 팔찌';
      return s.kind === 'band' ? `${s.name} · ${styleName(s.style)} 패턴` : `${s.name} · 사진 그대로`;
    },
    add(i, { delay = 0 } = {}){
      const r = Math.floor(i/COLS); ensureRow(r);
      const spec = specOf(i);
      let f, L, w, map;
      let mm = null;
      if (spec.kind === 'band'){
        f = { name:spec.name }; L = spec.L || 2.7; w = .34; map = canvasTex(bandStrap(spec, L, w));
        if (spec.style === 'gold'){ const H = Math.round(128*L/w), d = goldD(spec); mm = goldMaskTex(128, H, (gg, m) => paintGoldStrip(gg, 128, H, d, m)); }
      } else if (spec.kind === 'photo'){
        f = { name:spec.name }; L = clamp(spec.aspect*.42, 2.0, 4.2); w = clamp(L/spec.aspect, .3, .62); map = canvasTex(spec.canvas);
      } else { f = spec.f; L = lenOf(f); w = RW; const t = goldRibbon(f, L); map = t.map; mm = t.mm; }
      const geo = new THREE.PlaneGeometry(w, L, 6, SEG); geo.translate(0, -L/2, 0);
      const mat = new THREE.MeshStandardMaterial(mm
        ? { map, metalnessMap:mm, roughnessMap:mm, metalness:1, roughness:1, side:THREE.DoubleSide, alphaTest:.5, clippingPlanes:[rows[r].plane] }
        : { map, roughness:.82, side:THREE.DoubleSide, alphaTest:.5, clippingPlanes:[rows[r].plane] });
      const mesh = new THREE.Mesh(geo, mat); mesh.userData.fi = i; root.add(mesh);
      if (spec.kind === 'band'){ attachBand(mesh, spec, parts, rows[r].plane); w = .48; }   // 태그 폭만큼 자리 확보
      const it = { i, f, L, w, row:r, mesh, base:Float32Array.from(geo.attributes.position.array), s:sp(0), x:0, tx:0, phase:i*1.7, flutter:0, delay, leaving:false };
      it.pin = makePin(pinColorFor(map.image)); it.pinS = 0;
      items.push(it); relayout();
      it.x = it.tx; it.s.x = rows[r].y + L + .05; mesh.position.set(it.x, it.s.x, 0);
    },
    remove(instant){
      const live = items.filter(it => !it.leaving), it = live[live.length-1]; if (!it) return;
      if (instant) kill(it); else { it.leaving = true; it.delay = 0; }
      relayout();
    },
    replay(){
      const live = items.filter(it => !it.leaving), st = Math.min(.22, 2.5/Math.max(live.length,1));
      live.forEach((it, j) => { it.s.x = rows[it.row].y + it.L + .05; it.s.v = 0; it.delay = j*st; });
    },
    update(dt, t){
      for (let j = items.length-1; j >= 0; j--){
        const it = items[j];
        if (it.delay > 0) it.delay -= dt; else springStep(it.s, dt, 15, .62);
        it.x = damp(it.x, it.tx, 7, dt);
        it.flutter = Math.max(it.flutter*Math.exp(-dt*1.6), Math.min(1.6, Math.abs(it.s.v)*.25));
        it.mesh.position.set(it.x, it.s.x, 0);
        deform(it, t);
        // 내려와 멈추면 압정이 앞에서 날아와 꽂힘 · 떠날 때는 먼저 빠짐
        const pinned = !it.leaving && it.delay <= 0 && Math.abs(it.s.x - it.s.t) < .05 && Math.abs(it.s.v) < .8;
        it.pinS = damp(it.pinS, pinned ? 1 : 0, pinned ? 12 : 22, dt);
        it.pin.visible = it.pinS > .02; it.pin.scale.setScalar(Math.max(.001, .6 + .4*it.pinS));
        it.pin.position.set(it.x, rows[it.row].y - .065, (1 - it.pinS)*.45);
        if (it.leaving && it.s.x > it.s.t - .03) kill(it);
      }
      rows.forEach(row => {
        row.w = damp(row.w, row.wT, 7, dt); const w = Math.max(row.w, .001);
        row.body.scale.x = w; row.tx.repeat.x = Math.max(w, .1)/1.2; row.gr.visible = row.w > .05;
      });
    },
    view(){
      const live = items.filter(it => !it.leaving);
      if (!live.length) return { center:new THREE.Vector3(0,-1.4,0), w:3, h:3.6, elev:.1 };
      let minY = 0, w = 0;
      rows.forEach((row, r) => { const rl = live.filter(it => it.row === r); if (!rl.length) return; minY = Math.min(minY, row.y - Math.max(...rl.map(it => it.L))); w = Math.max(w, row.wT); });
      const top = .45, bot = minY - .3;
      return { center:new THREE.Vector3(0,(top+bot)/2,0), w:Math.max(w+.5, 2.6), h:top-bot, elev:.1 };
    },
    pick(ray){
      const live = items.filter(it => !it.leaving);
      const hit = ray.intersectObjects(live.map(it => it.mesh), true)[0];
      if (!hit) return -1;
      const it = live.find(x => { let o = hit.object; while (o){ if (o === x.mesh) return true; o = o.parent; } return false; });
      if (!it) return -1; it.flutter = RM ? .6 : 2.4; return it.i;
    },
  };
}

/* =====================================================================
   2) 자물쇠 펜스 — 위에서 떨어져 철망에 걸리고 진자처럼 흔들림. 한 줄 6개
   ===================================================================== */
function makeLockTheme(){
  const root = new THREE.Group(); world.add(root);
  const COLS = 6, SX = .62, SY = .78, TOP = .25, HALF = COLS*SX/2 + .31, TW = .31, TH = .39;
  const wc = document.createElement('canvas'); wc.width = wc.height = 128;
  const wg = wc.getContext('2d'); wg.strokeStyle = '#d6d0ee'; wg.lineWidth = 6; wg.lineCap = 'round';
  wg.beginPath(); wg.moveTo(0,0); wg.lineTo(128,128); wg.moveTo(128,0); wg.lineTo(0,128); wg.stroke();
  const wireTex = canvasTex(wc); wireTex.wrapS = wireTex.wrapT = THREE.RepeatWrapping;
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.MeshStandardMaterial({ map:wireTex, alphaTest:.5, side:THREE.DoubleSide, metalness:.6, roughness:.35 }));
  fence.scale.x = 2*HALF; root.add(fence);
  const metal = new THREE.MeshStandardMaterial({ color:0xb9b3d8, metalness:.8, roughness:.3 });
  const postGeo = new THREE.CylinderGeometry(.05,.05,1,16);
  const pl = new THREE.Mesh(postGeo, metal), pr = new THREE.Mesh(postGeo, metal);
  pl.position.x = -HALF - .03; pr.position.x = HALF + .03;
  const topRail = new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,2*HALF+.12,12), metal);
  topRail.rotation.z = Math.PI/2; topRail.position.y = TOP;
  root.add(pl, pr, topRail);

  const bodyGeo = new RoundedBoxGeometry(.38,.31,.12,3,.045), faceGeo = new THREE.PlaneGeometry(.32,.26);
  const torGeo = new THREE.TorusGeometry(.1,.021,10,28,Math.PI), legGeo = new THREE.CylinderGeometry(.021,.021,.08,10);
  const shackle = new THREE.MeshStandardMaterial({ color:0xD9B45A, metalness:.9, roughness:.28 });
  const items = []; let H = 2.6, HT = 2.6;

  function label(f){   // 금사 스타일 명판: 단색 + 금테 + 큰 연도
    const c = document.createElement('canvas'); c.width = 192; c.height = 156; const g = c.getContext('2d'), gp = gpal(f.i), G = goldPaint(g, 0, 0, 192, 156);
    g.fillStyle = gp.bg; g.fillRect(0,0,192,156); weave(g, 192, 156);
    g.strokeStyle = G; g.lineWidth = 3; g.strokeRect(7,7,178,142); g.lineWidth = 1.2; g.strokeRect(13,13,166,130);
    [[13,13],[179,13],[13,143],[179,143]].forEach(([x,y]) => orn.diamond(g, x, y, 4, G));
    g.fillStyle = gp.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitFont(g, f.name, 150, 15, 800, PRET); g.fillText(f.name, 96, 33);
    if ('letterSpacing' in g) g.letterSpacing = '3px';
    g.font = `600 46px ${PRET}`; g.fillText('2026', 98, 74);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    orn.diamond(g, 60, 104, 3, G); orn.diamond(g, 132, 104, 3, G);
    fitFont(g, f.city, 64, 12, 600, PRET); g.fillText(f.city, 96, 104);
    g.fillStyle = G; g.beginPath(); g.arc(96,124,6,0,Math.PI*2); g.fill(); g.fillRect(93.5,125,5,13);
    return canvasTex(c);
  }
  const node = i => ({ x:-HALF + .62 + (i%COLS)*SX, y:TOP - .78 - Math.floor(i/COLS)*SY });
  function relayout(){
    const n = items.filter(it => !it.leaving).length;
    const rows = Math.max(2, Math.ceil(n/COLS));
    HT = .78*rows + .6;
  }
  function kill(it){ root.remove(it.grp); it.face.material.map.dispose(); it.face.material.dispose(); it.body.material.dispose(); items.splice(items.indexOf(it),1); }

  return {
    root, rotLimit:.6,
    hint:'페스티벌마다 자물쇠가 펜스에 걸려요 · 누르면 흔들려요',
    add(i, { delay = 0 } = {}){
      const f = FESTS[i], p = node(i), r = rng(i+3);
      const grp = new THREE.Group();
      const sh = new THREE.Group();
      const tor = new THREE.Mesh(torGeo, shackle); tor.position.y = -.1;
      const l1 = new THREE.Mesh(legGeo, shackle), l2 = new THREE.Mesh(legGeo, shackle);
      l1.position.set(-.1,-.14,0); l2.position.set(.1,-.14,0); sh.add(tor, l1, l2); sh.rotation.x = -.35;
      const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color:gpal(i).bg, roughness:.55, metalness:.05 }));
      body.position.set(0,-.335,.06);
      const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map:label(f), roughness:.45 }));
      face.position.set(0,-.335,.1215);
      grp.add(sh, body, face); root.add(grp);
      grp.scale.setScalar(1.22);
      grp.rotation.y = (r()-.5)*.4;
      const start = p.y + 4.5 + r();
      grp.position.set(p.x, start, .02);
      const it = { i, f, grp, body, face, s:sp(start), th:0, thv:0, landed:false, delay, leaving:false, ph:r()*6 };
      it.s.t = p.y; items.push(it); relayout();
    },
    remove(instant){
      const live = items.filter(it => !it.leaving), it = live[live.length-1]; if (!it) return;
      if (instant) kill(it); else { it.leaving = true; it.delay = 0; it.s.t = node(it.i).y + 6; }
      relayout();
    },
    replay(){
      const live = items.filter(it => !it.leaving), st = Math.min(.16, 2.5/Math.max(live.length,1));
      live.forEach((it, j) => { it.s.x = node(it.i).y + 4.5; it.s.v = 0; it.landed = false; it.delay = j*st; });
    },
    update(dt, t){
      H = damp(H, HT, 5, dt);
      fence.scale.y = H; fence.position.y = TOP - H/2;
      const ry = H/TH; wireTex.repeat.set(2*HALF/TW, ry); wireTex.offset.y = Math.ceil(ry) - ry;  // 위쪽 기준으로 철망 맞춤
      pl.scale.y = pr.scale.y = H + .3; pl.position.y = pr.position.y = TOP - H/2 + .05;
      for (let j = items.length-1; j >= 0; j--){
        const it = items[j];
        if (it.delay > 0){ it.delay -= dt; continue; }
        const v0 = it.s.v; springStep(it.s, dt, 20, .72);
        if (!it.leaving && !it.landed && it.s.x <= it.s.t + .02){
          it.landed = true; it.thv += (it.i%2 ? 1 : -1)*Math.min(2.4, Math.abs(v0)*.4 + .6);
        }
        const a = -16*it.th - 1.3*it.thv; it.thv += a*dt; it.th += it.thv*dt;
        it.grp.position.y = it.s.x;
        it.grp.rotation.z = it.th + (RM ? 0 : .03*Math.sin(t*1.3 + it.ph));
        if (it.leaving && it.s.x > it.s.t - .1) kill(it);
      }
    },
    view(){ return { center:new THREE.Vector3(0, TOP - HT/2, 0), w:2*HALF + .6, h:HT + .7, elev:.12 }; },
    pick(ray){
      const live = items.filter(it => !it.leaving);
      const hit = ray.intersectObjects(live.map(it => it.grp), true)[0]; if (!hit) return -1;
      const it = live.find(x => { let o = hit.object; while (o){ if (o === x.grp) return true; o = o.parent; } return false; });
      if (!it) return -1; it.thv += RM ? 1 : 3.5; return it.i;
    },
  };
}

/* =====================================================================
   3) 여권 — 도장이 위에서 내려와 찍힘. 한 쪽 8개, 펼침면 4개 = 64칸
   ===================================================================== */
function makePassportTheme(){
  const root = new THREE.Group(); world.add(root);
  const PW = 1.5, PH = 2.1, PER = 8, PAGES = 8, CW = 512, CH = Math.round(512*PH/PW);
  const cover = new THREE.Mesh(new RoundedBoxGeometry(PW*2+.24,.06,PH+.2,3,.025), new THREE.MeshStandardMaterial({ color:0x151A30, roughness:.6 }));
  cover.position.y = -.05; root.add(cover);
  const blockMat = new THREE.MeshStandardMaterial({ color:0xece4d0, roughness:.9 });
  const bl = new THREE.Mesh(new THREE.BoxGeometry(PW,.05,PH), blockMat), br = bl.clone();
  bl.position.set(-PW/2-.01,-.005,0); br.position.set(PW/2+.01,-.005,0); root.add(bl, br);
  const pc = [], ptex = [];
  for (let p = 0; p < PAGES; p++){ const c = document.createElement('canvas'); c.width = CW; c.height = CH; pc.push(c); ptex.push(canvasTex(c)); }
  const pageMat = () => new THREE.MeshStandardMaterial({ roughness:.92 });
  const pageGeo = new THREE.PlaneGeometry(PW, PH);
  const leftMesh = new THREE.Mesh(pageGeo, pageMat()), rightMesh = new THREE.Mesh(pageGeo, pageMat());
  leftMesh.rotation.x = rightMesh.rotation.x = -Math.PI/2;
  leftMesh.position.set(-PW/2-.01,.022,0); rightMesh.position.set(PW/2+.01,.022,0);
  const spine = new THREE.Mesh(new THREE.PlaneGeometry(.08,PH), new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:.16 }));
  spine.rotation.x = -Math.PI/2; spine.position.y = .0235;
  root.add(leftMesh, rightMesh, spine);
  const leaf = new THREE.Group(); leaf.position.y = .03; leaf.visible = false; root.add(leaf);
  const lf = new THREE.Mesh(pageGeo, pageMat()); lf.rotation.x = -Math.PI/2; lf.position.x = PW/2+.01;
  const lb = new THREE.Mesh(pageGeo, pageMat());
  lb.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), Math.PI).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -Math.PI/2));
  lb.position.set(PW/2+.01,-.001,0); leaf.add(lf, lb);

  // 도장 도구
  const tool = new THREE.Group(); tool.visible = false; root.add(tool);
  const inkMat = new THREE.MeshStandardMaterial({ color:0xff4fa0, roughness:.5 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.08,40), inkMat); base.position.y = .04;
  const block = new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,.1,40), new THREE.MeshStandardMaterial({ color:0x2a1f57, roughness:.5 })); block.position.y = .13;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.06,.085,.32,24), new THREE.MeshStandardMaterial({ color:0x8a5a3c, roughness:.6 })); handle.position.y = .34;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.1,24,16), new THREE.MeshStandardMaterial({ color:0xff4fa0, roughness:.35 })); knob.position.y = .52;
  tool.add(base, block, handle, knob);

  let count = 0, spread = 0, job = null, flip = null; const queue = [];
  const stampCache = new Map();
  const cell = j => ({ cx: 128 + (j%2)*256, cy: 150 + Math.floor(j/2)*158 });
  const rotOf = i => (rng(i+11)() - .5)*.5;
  const pageOf = i => Math.floor(i/PER), spreadOf = i => Math.floor(pageOf(i)/2);

  function stamp(i){
    if (stampCache.has(i)) return stampCache.get(i);
    // 금사 스타일 도장: 페스티벌 색 잉크 + 금박 안쪽 테 + 큰 연도
    const f = FESTS[i], gp = gpal(i), c = document.createElement('canvas'); c.width = 236; c.height = 170;
    const g = c.getContext('2d'), R = rng(i+5), t = i % 5, cx = 118, cy = 85;
    const ink = new THREE.Color(gp.bg).getHSL({}).l < .45 ? gp.bg : inkOf(gp.bg), G = goldPaint(g, 0, 0, 236, 170);
    const shapes = [
      [() => g.arc(cx,cy,79,0,Math.PI*2), () => g.arc(cx,cy,69,0,Math.PI*2), 112],
      [() => g.rect(10,20,216,130), () => g.rect(19,29,198,112), 176],
      [() => { for (let k = 0; k < 8; k++){ const a = Math.PI/8 + k*Math.PI/4; g.lineTo(cx+Math.cos(a)*84, cy+Math.sin(a)*79); } g.closePath(); },
       () => { for (let k = 0; k < 8; k++){ const a = Math.PI/8 + k*Math.PI/4; g.lineTo(cx+Math.cos(a)*74, cy+Math.sin(a)*69); } g.closePath(); }, 124],
      [() => { g.moveTo(14,22); g.lineTo(222,22); g.arc(222,85,16,-Math.PI/2,Math.PI/2,true); g.lineTo(222,148); g.lineTo(14,148); g.arc(14,85,16,Math.PI/2,-Math.PI/2,true); g.closePath(); },
       () => g.rect(36,32,164,106), 156],
      [() => g.ellipse(cx,cy,108,75,0,0,Math.PI*2), () => g.ellipse(cx,cy,98,65,0,0,Math.PI*2), 150],
    ][t];
    g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); shapes[0](); g.stroke();
    g.strokeStyle = G; g.lineWidth = 2; g.beginPath(); shapes[1](); g.stroke();
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitFont(g, f.name, shapes[2], 15, 800, PRET); g.fillText(f.name, cx, cy - 34);
    if ('letterSpacing' in g) g.letterSpacing = '2px';
    g.font = `600 42px ${PRET}`; g.fillText('2026', cx + 1, cy + 3);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    orn.diamond(g, cx - shapes[2]*.42, cy + 3, 4, G); orn.diamond(g, cx + shapes[2]*.42, cy + 3, 4, G);
    fitFont(g, f.city, shapes[2]*.8, 12, 600, PRET); g.fillText(f.city, cx, cy + 36);
    g.globalCompositeOperation = 'destination-out';                       // 잉크가 덜 묻은 자국 (가볍게)
    for (let k = 0; k < 70; k++){ g.globalAlpha = .3 + R()*.4; g.beginPath(); g.arc(R()*236, R()*170, .5 + R()*1.8, 0, Math.PI*2); g.fill(); }
    stampCache.set(i, c); return c;
  }
  function drawPage(p){
    const g = pc[p].getContext('2d');
    g.fillStyle = '#F4EEDD'; g.fillRect(0,0,CW,CH);
    g.strokeStyle = 'rgba(120,90,200,.10)'; g.lineWidth = 1.2;
    for (let k = 0; k < 22; k++){ g.beginPath(); for (let x = 0; x <= CW; x += 8){ const y = 40 + k*31 + Math.sin(x/38 + k*.7)*9; x ? g.lineTo(x,y) : g.moveTo(x,y); } g.stroke(); }
    g.fillStyle = '#6b5fa0'; g.font = `700 15px ${MONO}`;
    g.textAlign = p%2 ? 'right' : 'left'; g.fillText('FESTLOCK · PASSPORT 2026', p%2 ? CW-26 : 26, 38);
    g.textAlign = 'center'; g.fillText(`— ${p+1} —`, CW/2, CH-18);
    for (let j = 0; j < PER; j++){
      const i = p*PER + j; if (i >= count) break;
      const { cx, cy } = cell(j), sc = stamp(i);
      g.save(); g.translate(cx, cy); g.rotate(rotOf(i)); g.globalAlpha = .9; g.drawImage(sc, -sc.width/2, -sc.height/2); g.restore();
    }
    ptex[p].needsUpdate = true;
  }
  for (let p = 0; p < PAGES; p++) drawPage(p);
  function setSpread(s){ spread = s; leftMesh.material.map = ptex[2*s]; rightMesh.material.map = ptex[2*s+1]; leftMesh.material.needsUpdate = rightMesh.material.needsUpdate = true; }
  setSpread(0);
  function setMap(m, t){ m.material.map = t; m.material.needsUpdate = true; }
  function startFlip(target){
    target = clamp(target, 0, PAGES/2 - 1); if (target === spread) return;
    const dir = Math.sign(target - spread);
    if (Math.abs(target - spread) > 1) setSpread(target - dir);
    const s = spread;
    if (dir > 0){ setMap(lf, ptex[2*s+1]); setMap(lb, ptex[2*s+2]); setMap(rightMesh, ptex[2*s+3]); leaf.rotation.z = 0; }
    else { setMap(lf, ptex[2*s-1]); setMap(lb, ptex[2*s]); setMap(leftMesh, ptex[2*s-2]); leaf.rotation.z = Math.PI; }
    leaf.visible = true; flip = { dir, t:0, to:s+dir };
  }
  function applyStamp(i){ count = Math.max(count, i+1); drawPage(pageOf(i)); }
  function slotWorld(i){
    const p = pageOf(i), { cx, cy } = cell(i%PER), px = p%2 === 0 ? -PW/2-.01 : PW/2+.01;
    return new THREE.Vector3(px + (cx/CW - .5)*PW, .03, (cy/CH - .5)*PH);
  }
  const ease = x => x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3)/2;

  const api = {
    root, rotLimit:.35,
    hint:'페스티벌마다 입국 도장이 찍혀요 · ‹ › 로 쪽 넘기기',
    add(i, { instant = false } = {}){
      if (instant){ applyStamp(i); if (spreadOf(i) !== spread) setSpread(spreadOf(i)); }
      else queue.push(i);
    },
    remove(instant){
      if (queue.length) queue.pop();
      else if (job){ job = null; tool.visible = false; }
      else if (count > 0){
        count--; drawPage(pageOf(count));
        const target = spreadOf(Math.max(count-1, 0));
        if (instant){ flip = null; leaf.visible = false; if (target !== spread) setSpread(target); }
        else if (!flip && target !== spread) startFlip(target);
      }
    },
    replay(){
      const n = count + queue.length + (job ? 1 : 0);
      count = 0; queue.length = 0; job = null; tool.visible = false; flip = null; leaf.visible = false;
      for (let p = 0; p < PAGES; p++) drawPage(p);
      setSpread(0); for (let i = 0; i < n; i++) queue.push(i);
    },
    update(dt){
      if (flip){
        flip.t += dt*1.4; const e = ease(Math.min(1, flip.t));
        leaf.rotation.z = flip.dir > 0 ? e*Math.PI : (1-e)*Math.PI;
        leaf.position.y = .03 + Math.sin(e*Math.PI)*.03;
        if (flip.t >= 1){
          const s = spread;
          if (flip.dir > 0) setMap(leftMesh, ptex[2*s+2]); else setMap(rightMesh, ptex[2*s-1]);
          spread = flip.to; leaf.visible = false; flip = null;
        }
        return;
      }
      if (!job && queue.length){
        if (queue.length > 3){                      // 많이 밀리면 앞쪽은 바로 찍고 마지막 몇 개만 보여줌
          const touched = new Set();
          while (queue.length > 2){ const q = queue.shift(); count = Math.max(count, q+1); touched.add(pageOf(q)); }
          touched.forEach(drawPage);
        }
        const q = queue[0];
        if (spreadOf(q) !== spread){ startFlip(spreadOf(q)); return; }
        queue.shift();
        inkMat.color.set(inkOf(FESTS[q].color));
        job = { i:q, t:0, at:slotWorld(q), done:false }; tool.visible = true;
      }
      if (job){
        job.t += dt*(1.1 + Math.min(queue.length, 3)*.5);
        const t = job.t, p = job.at;
        let y, sq = 1;
        if (t < .45){ const e = 1 - Math.pow(1 - t/.45, 3); y = 1.8 - e*1.77; }
        else if (t < .6){ y = .03; sq = .86; if (!job.done && t > .5){ job.done = true; applyStamp(job.i); } }
        else { const e = Math.min(1, (t - .6)/.4); y = .03 + e*e*2.2; }
        tool.position.set(p.x + (t > .6 ? (t-.6)*.8 : 0), y, p.z);
        tool.scale.set(1, sq, 1);
        if (t >= 1){ if (!job.done) applyStamp(job.i); job = null; tool.visible = false; }
      }
    },
    view(){ return { center:new THREE.Vector3(0,0,.1), w:PW*2 + .35, h:PH*.95 + .5, elev:1.0 }; },
    pick(ray){
      const hit = ray.intersectObjects([leftMesh, rightMesh])[0]; if (!hit || !hit.uv) return -1;
      const p = hit.object === leftMesh ? 2*spread : 2*spread + 1;
      const x = hit.uv.x*CW, y = (1 - hit.uv.y)*CH;
      let best = 0, bd = 1e9;
      for (let j = 0; j < PER; j++){ const c = cell(j), d = (c.cx-x)**2 + (c.cy-y)**2; if (d < bd){ bd = d; best = j; } }
      const i = p*PER + best; return i < count ? i : -1;
    },
    nav:{
      label:() => `${spread*2+1}–${spread*2+2}쪽`,
      prev:() => { if (!flip && !job) startFlip(spread-1); },
      next:() => { if (!flip && !job) startFlip(spread+1); },
      canPrev:() => spread > 0, canNext:() => spread < PAGES/2 - 1,
    },
  };
  return api;
}

/* =====================================================================
   4) 바이닐 크레이트 — 새 판이 위에서 떨어져 맨 앞에 꽂힘. 넘겨 보며 판이 올라옴
   ===================================================================== */
function makeVinylTheme(mode = 'fest'){
  const isScan = mode === 'scan';
  const root = new THREE.Group(); world.add(root);
  const SP = .07, SW = 1.25, IW = 1.48, FRONT = -.34;
  const crateMat = new THREE.MeshStandardMaterial({ color:0x3b2c7a, roughness:.75 });
  const rimMat = new THREE.MeshStandardMaterial({ color:0xff4fa0, roughness:.4, emissive:0xff4fa0, emissiveIntensity:.25 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(IW+.14,.06,1), crateMat); floor.position.y = -.03;
  const sideGeo = new THREE.BoxGeometry(.07,.6,1);
  const sideL = new THREE.Mesh(sideGeo, crateMat), sideR = new THREE.Mesh(sideGeo, crateMat);
  sideL.position.set(-(IW/2+.035),.3,0); sideR.position.set(IW/2+.035,.3,0);
  const front = new THREE.Mesh(new THREE.BoxGeometry(IW+.14,.3,.07), crateMat); front.position.set(0,.15,0);
  const frontRim = new THREE.Mesh(new THREE.BoxGeometry(IW+.16,.035,.085), rimMat); frontRim.position.set(0,.31,0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(IW+.14,.6,.07), crateMat); back.position.y = .3;
  root.add(floor, sideL, sideR, front, frontRim, back);

  const sleeveGeo = new THREE.BoxGeometry(SW, SW, .03);
  const items = []; let sel = 0, Lc = 1.1, LcT = 1.1;
  const discLabel = document.createElement('canvas'); discLabel.width = discLabel.height = 256;
  const discTex = canvasTex(discLabel);
  const discGeo = new THREE.CylinderGeometry(.58,.58,.012,72); discGeo.rotateX(Math.PI/2);
  const disc = new THREE.Mesh(discGeo, [new THREE.MeshStandardMaterial({ color:0x111111, roughness:.4 }), new THREE.MeshStandardMaterial({ map:discTex, roughness:.35 }), new THREE.MeshStandardMaterial({ map:discTex, roughness:.35 })]);
  const slide = sp(0); let discOwner = null;

  function art(f){   // 금사 스타일 재킷: 단색 + 금테 + 사슬 장식 + 큰 연도
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gp = gpal(f.i), G = goldPaint(g, 0, 0, 256, 256);
    g.fillStyle = gp.bg; g.fillRect(0,0,256,256); weave(g, 256, 256);
    g.strokeStyle = G; g.lineWidth = 3; g.strokeRect(14,14,228,228); g.lineWidth = 1.2; g.strokeRect(21,21,214,214);
    orn.chainH(g, 44, 212, 46, 8, G, 1.3); orn.chainH(g, 44, 212, 210, 8, G, 1.3);
    [[33,33,1],[223,33,-1],[33,223,-1],[223,223,1]].forEach(([x,y,dir]) => orn.swirl(g, x, y, 8, G, 1.3, dir));
    g.fillStyle = gp.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitFont(g, f.name, 190, 17, 800, PRET); g.fillText(f.name, 128, 86);
    if ('letterSpacing' in g) g.letterSpacing = '4px';
    g.font = `600 62px ${PRET}`; g.fillText('2026', 130, 130);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    orn.diamond(g, 128, 163, 5, G);
    fitFont(g, f.city, 170, 13, 600, PRET); g.fillText(f.city, 128, 184);
    return canvasTex(c);
  }
  function backArt(f){
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gp = gpal(f.i), G = goldPaint(g, 0, 0, 128, 128);
    g.fillStyle = '#' + new THREE.Color(gp.bg).multiplyScalar(.72).getHexString(); g.fillRect(0,0,128,128);
    g.strokeStyle = G; g.lineWidth = 1.5; g.strokeRect(8,8,112,112);
    g.fillStyle = G; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 11px ${PRET}`; g.fillText('LINEUP', 64, 50); g.font = `800 32px ${PRET}`; g.fillText(String(f.picks), 64, 80);
    return canvasTex(c);
  }
  function setDisc(f){
    const g = discLabel.getContext('2d'), gp = gpal(f.i), G = goldPaint(g, 80, 80, 176, 176);
    g.fillStyle = '#121212'; g.fillRect(0,0,256,256);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    for (let r = 56; r < 128; r += 3){ g.beginPath(); g.arc(128,128,r,0,Math.PI*2); g.stroke(); }
    g.fillStyle = gp.bg; g.beginPath(); g.arc(128,128,48,0,Math.PI*2); g.fill();
    g.strokeStyle = G; g.lineWidth = 2; g.beginPath(); g.arc(128,128,44,0,Math.PI*2); g.stroke();
    g.fillStyle = gp.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitFont(g, f.name, 70, 12, 800, PRET); g.fillText(f.name, 128, 110);
    g.font = `600 13px ${PRET}`; g.fillText('2026', 128, 146);
    g.fillStyle = '#121212'; g.beginPath(); g.arc(128,128,4,0,Math.PI*2); g.fill();
    discTex.needsUpdate = true;
  }
  const live = () => items.filter(it => !it.leaving);
  function relayout(){
    const L = live(); LcT = Math.max(1.1, .55 + L.length*SP);
    L.forEach((it, idx) => { it.k = L.length - 1 - idx; it.tz = FRONT - it.k*SP; });
    sel = clamp(sel, 0, Math.max(0, L.length-1));
  }
  function kill(it){ if (discOwner === it){ it.grp.remove(disc); discOwner = null; } root.remove(it.grp); it.sleeve.material.forEach(m => { if (m.map) m.map.dispose(); if (m.userData.own) m.dispose(); }); items.splice(items.indexOf(it),1); }

  return {
    root, rotLimit:.3,
    hint: isScan ? '내 팔찌가 카드로 맨 앞에 꽂혀요 · ‹ › 로 넘기거나 카드를 눌러 보기' : '새 판이 맨 앞에 꽂혀요 · ‹ › 로 넘기거나 판을 눌러 꺼내 보기',
    label: isScan ? i => `${SCANS[i] ? SCANS[i].name : '내 팔찌'} · 카드` : null,
    add(i, { delay = 0 } = {}){
      const f = isScan ? { i, name:SCANS[i].name } : FESTS[i];
      const edge = new THREE.MeshStandardMaterial({ color:isScan ? 0x241B4A : new THREE.Color(gpal(i).bg).multiplyScalar(.7), roughness:.7 }); edge.userData.own = true;
      const fm = new THREE.MeshStandardMaterial({ map:isScan ? cardArt(SCANS[i], i) : art(f), roughness:.5 }); fm.userData.own = true;
      const bm = new THREE.MeshStandardMaterial({ map:isScan ? cardBack(i) : backArt(f), roughness:.7 }); bm.userData.own = true;
      const sleeve = new THREE.Mesh(sleeveGeo, [edge, edge, edge, edge, fm, bm]); sleeve.position.y = SW/2;
      const grp = new THREE.Group(); grp.add(sleeve); root.add(grp);
      const it = { i, f, grp, sleeve, s:sp(3.4), rot:0, lift:0, tz:FRONT, k:0, delay, leaving:false };
      it.s.t = 0; items.push(it); sel = 0; relayout();
      grp.position.set(0, 3.4, it.tz);
    },
    remove(instant){
      const L = live(), it = L[L.length-1]; if (!it) return;
      if (instant) kill(it); else { it.leaving = true; it.s.t = 3.6; it.delay = 0; }
      relayout();
    },
    replay(){
      const L = live(), st = Math.min(.12, 2.4/Math.max(L.length,1));
      L.forEach(it => { it.s.x = 3.4; it.s.v = 0; it.delay = (L.length - 1 - it.k)*st; });
      sel = 0;
    },
    update(dt, t){
      Lc = damp(Lc, LcT, 6, dt);
      floor.scale.z = sideL.scale.z = sideR.scale.z = Lc;
      floor.position.z = sideL.position.z = sideR.position.z = -Lc/2; back.position.z = -Lc;
      let selIt = null;
      for (let j = items.length-1; j >= 0; j--){
        const it = items[j];
        if (it.delay > 0) it.delay -= dt; else springStep(it.s, dt, 16, .68);
        const isSel = !it.leaving && it.k === sel;
        const rt = it.leaving ? 0 : it.k < sel ? .42 + Math.min(.12, (sel - it.k)*.012) : isSel ? -.06 : -.12;
        it.rot = damp(it.rot, rt, 9, dt); it.lift = damp(it.lift, isSel ? .1 : 0, 9, dt);
        it.grp.position.z = damp(it.grp.position.z, it.tz, 8, dt);
        it.grp.position.y = it.s.x + it.lift; it.grp.rotation.x = it.rot;
        if (isSel) selIt = it;
        if (it.leaving && it.s.x > it.s.t - .1) kill(it);
      }
      if (isScan) return;                     // 카드 상자에는 LP 판이 없음
      if (selIt && discOwner !== selIt){
        if (discOwner) discOwner.grp.remove(disc);
        selIt.grp.add(disc); discOwner = selIt; setDisc(selIt.f); slide.x = 0; slide.v = 0;
      }
      if (!selIt && discOwner){ discOwner.grp.remove(disc); discOwner = null; }
      slide.t = selIt && Math.abs(selIt.s.x) < .3 ? .44 : 0; springStep(slide, dt, 18, .8);
      disc.position.set(0, SW/2 + slide.x, 0); disc.rotation.z = RM ? 0 : t*.6;
    },
    view(){
      const L = live(), it = L.find(x => x.k === sel);
      const z = it ? it.tz : FRONT;
      return { center:new THREE.Vector3(0,.6,z - .15), w:2.3, h:2.5, elev:.5 };
    },
    pick(ray){
      const L = live(), hit = ray.intersectObjects(L.map(it => it.sleeve))[0]; if (!hit) return -1;
      const it = L.find(x => x.sleeve === hit.object); sel = it.k; return it.i;
    },
    nav:{
      label:() => { const n = live().length; return n ? `${sel+1} / ${n}` : '— / —'; },
      prev:() => { sel = Math.max(0, sel-1); }, next:() => { sel = Math.min(live().length-1, sel+1); },
      canPrev:() => sel > 0, canNext:() => sel < live().length-1,
    },
  };
}

/* =====================================================================
   5) 에나멜 핀 — 위에서 떨어지며 돌다가 보드에 꽂힘. 한 줄 5개
   ===================================================================== */
function makePinTheme(){
  const root = new THREE.Group(); world.add(root);
  const COLS = 5, SX = .72, SY = .72, R = .25, TOP = .3, BW = COLS*SX + .3;
  const dc = document.createElement('canvas'); dc.width = dc.height = 128; const dg = dc.getContext('2d'), dr = rng(7);
  dg.fillStyle = '#2b2163'; dg.fillRect(0,0,128,128);
  for (let k = 0; k < 900; k++){ dg.fillStyle = `rgba(${dr()>.5?'255,255,255':'0,0,0'},${.05+dr()*.07})`; dg.fillRect(dr()*128, dr()*128, 2, 1); }
  const denim = canvasTex(dc); denim.wrapS = denim.wrapT = THREE.RepeatWrapping;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1,1,.1), new THREE.MeshStandardMaterial({ map:denim, roughness:.95 }));
  board.position.z = -.05; root.add(board);
  const stitchGeo = new THREE.BufferGeometry(); stitchGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(15), 3));
  const stitch = new THREE.Line(stitchGeo, new THREE.LineDashedMaterial({ color:0xff4fa0, dashSize:.06, gapSize:.05 }));
  stitch.position.z = .003; root.add(stitch);
  const rimMat = new THREE.MeshStandardMaterial({ color:0xe9c46a, metalness:.9, roughness:.25 });
  const E = R*1.2 + .02, shapes = {}, geos = {};

  function shapeOf(type){
    if (shapes[type]) return shapes[type];
    const s = new THREE.Shape();
    const polar = (fn, n = 120) => { for (let k = 0; k <= n; k++){ const a = k/n*Math.PI*2, rr = fn(a), x = Math.cos(a)*rr, y = Math.sin(a)*rr; k ? s.lineTo(x,y) : s.moveTo(x,y); } };
    const poly = pts => { pts.forEach(([x,y],k) => k ? s.lineTo(x*R,y*R) : s.moveTo(x*R,y*R)); s.closePath(); };
    switch (type){
      case 'circle': s.absarc(0,0,R,0,Math.PI*2,false); break;
      case 'star': { const p = []; for (let k = 0; k < 10; k++){ const a = Math.PI/2 + k*Math.PI/5, rr = k%2 ? .48 : 1.08; p.push([Math.cos(a)*rr, Math.sin(a)*rr]); } poly(p); break; }
      case 'flower': polar(a => R*(.8 + .2*Math.cos(5*a))); break;
      case 'burst': polar(a => R*(.88 + .12*Math.cos(12*a)), 192); break;
      case 'diamond': poly([[0,1.12],[.85,0],[0,-1.12],[-.85,0]]); break;
      case 'hex': poly([...Array(6)].map((_,k) => [Math.cos(k*Math.PI/3 + Math.PI/6)*1.02, Math.sin(k*Math.PI/3 + Math.PI/6)*1.02])); break;
      case 'bolt': poly([[.2,1.1],[-.62,-.08],[-.06,-.08],[-.22,-1.1],[.62,.12],[.06,.12]]); break;
      case 'heart': s.moveTo(0,-R*.95); s.bezierCurveTo(-R*1.35,-R*.05,-R*.75,R*1.05,0,R*.45); s.bezierCurveTo(R*.75,R*1.05,R*1.35,-R*.05,0,-R*.95); break;
      case 'leaf': s.absellipse(0,0,R*.66,R*1.08,0,Math.PI*2,false,Math.PI/4); break;
      case 'moon': { const a0 = 50*Math.PI/180, a1 = 310*Math.PI/180; s.absarc(0,0,R,a0,a1,false); s.absarc(R*.5,0,R*.78,280.3*Math.PI/180,79.7*Math.PI/180,true); break; }
    }
    return shapes[type] = s;
  }
  function geoOf(type){
    return geos[type] || (geos[type] = new THREE.ExtrudeGeometry(shapeOf(type), { depth:.04, bevelEnabled:true, bevelThickness:.018, bevelSize:.018, bevelSegments:3, curveSegments:28 }));
  }
  function face(f){
    const S = 192, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const m = v => (v + E)/(2*E)*S, my = v => (E - v)/(2*E)*S;
    g.fillStyle = f.color; g.fillRect(0,0,S,S);
    const pts = shapeOf(f.icon).getPoints(60);
    g.beginPath(); pts.forEach((p,k) => k ? g.lineTo(m(p.x), my(p.y)) : g.moveTo(m(p.x), my(p.y))); g.closePath();
    g.strokeStyle = '#F2CF63'; g.lineWidth = 14; g.stroke();
    const narrow = f.icon === 'bolt' || f.icon === 'moon';
    drawIcon(g, narrow ? 'star' : f.icon === 'circle' ? 'star' : 'circle', S/2, narrow ? S*.42 : S*.36, S*.1, f.accent);
    if (!narrow){
      g.fillStyle = f.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      const words = f.name.split(' ');
      const lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length/2)).join(' '), words.slice(Math.ceil(words.length/2)).join(' ')] : [f.name];
      lines.forEach((ln, k) => { fitFont(g, ln, S*.5, 20, 900, MONT); g.fillText(ln, S/2, S*.55 + k*20 - (lines.length-1)*6); });
    }
    const t = canvasTex(c); t.repeat.set(1/(2*E), 1/(2*E)); t.offset.set(.5, .5);
    return t;
  }
  const node = i => ({ x:(i%COLS - (COLS-1)/2)*SX, y:TOP - .2 - SY/2 - Math.floor(i/COLS)*SY });
  const items = []; let H = 2.4, HT = 2.4;
  function relayout(){ const n = items.filter(it => !it.leaving).length; HT = Math.max(2.4, Math.ceil(Math.max(n,1)/COLS)*SY + .45); }
  function kill(it){ root.remove(it.mesh); it.mesh.material[0].map.dispose(); it.mesh.material[0].dispose(); items.splice(items.indexOf(it),1); }

  return {
    root, rotLimit:.5,
    hint:'보드에 핀이 하나씩 꽂혀요 · 핀을 누르면 한 바퀴 돌아요',
    add(i, { delay = 0 } = {}){
      const f = FESTS[i], p = node(i), r = rng(i+9);
      const fm = new THREE.MeshPhysicalMaterial({ map:face(f), roughness:.22, clearcoat:1, clearcoatRoughness:.08 });
      const mesh = new THREE.Mesh(geoOf(f.icon), [fm, rimMat]); root.add(mesh);
      const it = { i, f, mesh, p, sy:sp(p.y + 3.4), sz:sp(2.4), spin:sp((r() > .5 ? 1 : -1)*Math.PI*2), sq:sp(0), tilt:(r()-.5)*.35, delay, leaving:false, landed:false };
      it.sy.t = p.y; it.sz.t = .012; it.spin.t = 0;
      mesh.position.set(p.x, it.sy.x, it.sz.x); items.push(it); relayout();
    },
    remove(instant){
      const live = items.filter(it => !it.leaving), it = live[live.length-1]; if (!it) return;
      if (instant) kill(it); else { it.leaving = true; it.delay = 0; it.sy.t = it.p.y + 4; it.sz.t = 2.5; }
      relayout();
    },
    replay(){
      const live = items.filter(it => !it.leaving), st = Math.min(.14, 2.4/Math.max(live.length,1));
      live.forEach((it, j) => { it.sy.x = it.p.y + 3.4; it.sz.x = 2.4; it.spin.x = Math.PI*2; it.sy.v = it.sz.v = it.spin.v = 0; it.landed = false; it.delay = j*st; });
    },
    update(dt){
      H = damp(H, HT, 5, dt);
      board.scale.set(BW, H, 1); board.position.y = TOP - H/2;
      denim.repeat.set(BW/.9, H/.9);
      const a = stitchGeo.attributes.position.array, hx = BW/2 - .08, t0 = TOP - .08, b0 = TOP - H + .08;
      [[-hx,t0],[hx,t0],[hx,b0],[-hx,b0],[-hx,t0]].forEach(([x,y],k) => { a[k*3] = x; a[k*3+1] = y; a[k*3+2] = 0; });
      stitchGeo.attributes.position.needsUpdate = true; stitch.computeLineDistances();
      for (let j = items.length-1; j >= 0; j--){
        const it = items[j];
        if (it.delay > 0){ it.delay -= dt; continue; }
        springStep(it.sy, dt, 16, .72); springStep(it.sz, dt, 16, .8); springStep(it.spin, dt, 9, .75); springStep(it.sq, dt, 120, .35);
        if (!it.leaving && !it.landed && it.sz.x < .05){ it.landed = true; it.sq.v = RM ? 0 : -2.2; }
        it.mesh.position.set(it.p.x, it.sy.x, it.sz.x);
        it.mesh.rotation.set(0, it.spin.x, it.tilt);
        const s = 1 + it.sq.x; it.mesh.scale.set(1/Math.max(.6,s), 1/Math.max(.6,s), s);
        if (it.leaving && it.sy.x > it.sy.t - .1) kill(it);
      }
    },
    view(){ return { center:new THREE.Vector3(0, TOP - HT/2, 0), w:BW + .5, h:HT + .6, elev:.12 }; },
    pick(ray){
      const live = items.filter(it => !it.leaving), hit = ray.intersectObjects(live.map(it => it.mesh))[0]; if (!hit) return -1;
      const it = live.find(x => x.mesh === hit.object); it.spin.x += Math.PI*2; return it.i;
    },
  };
}

/* =====================================================================
   6) 내 팔찌 스캔 — 사진의 곧은 구간을 네 점으로 잡아 펴고, 리본 텍스처로 씀
   ===================================================================== */
const SCANS = [];
const PRESETS = [   // 예시 사진에서 미리 잡아 둔 구간 [시작-위, 끝-위, 끝-아래, 시작-아래] (사진 대비 비율)
  { name:'COMBI 2024',             q:[[.430,.654],[.720,.593],[.737,.640],[.438,.713]], flip:false },
  { name:'QONTINENT · COMBI 2024', q:[[.350,.426],[.777,.222],[.804,.267],[.363,.471]], flip:true },
  { name:'DECIBEL OUTDOOR 2024',   q:[[.143,.631],[.418,.496],[.418,.541],[.143,.676]], flip:true },
  { name:'5/6/7 JULY 2024',        q:[[.060,.556],[.345,.474],[.350,.532],[.076,.616]], flip:true },
  { name:'QONTINENT',              q:[[.568,.515],[.673,.369],[.722,.392],[.620,.538]], flip:false },
  { name:'WEB',                    q:[[.748,.383],[.948,.328],[.954,.363],[.748,.419]], flip:true },
];
function photoFrom(img){
  const s = Math.min(1, 1600/Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth*s), h = Math.round(img.naturalHeight*s);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently:true }); g.drawImage(img, 0, 0, w, h);
  return { c, data:g.getImageData(0,0,w,h), w, h };
}
function solveH(src, dst){
  const A = [], b = [];
  for (let k = 0; k < 4; k++){
    const [x,y] = src[k], [u,v] = dst[k];
    A.push([x,y,1,0,0,0,-x*u,-y*u]); b.push(u);
    A.push([0,0,0,x,y,1,-x*v,-y*v]); b.push(v);
  }
  for (let i = 0; i < 8; i++){
    let p = i; for (let r = i+1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i],A[p]] = [A[p],A[i]]; [b[i],b[p]] = [b[p],b[i]];
    for (let r = i+1; r < 8; r++){ const f = A[r][i]/A[i][i]; for (let c = i; c < 8; c++) A[r][c] -= f*A[i][c]; b[r] -= f*b[i]; }
  }
  const h = Array(8);
  for (let i = 7; i >= 0; i--){ let s = b[i]; for (let c = i+1; c < 8; c++) s -= A[i][c]*h[c]; h[i] = s/A[i][i]; }
  return h;
}
// 네 점 → 가로로 편 띠 (원근 보정)
function warpStrip(ph, q, flip, maxW = 1024){
  const P = q.map(([x,y]) => [x*ph.w, y*ph.h]);
  const d = (a,b) => Math.hypot(a[0]-b[0], a[1]-b[1]);
  const L = (d(P[0],P[1]) + d(P[3],P[2]))/2, H = (d(P[0],P[3]) + d(P[1],P[2]))/2;
  const s = Math.min(1, maxW/Math.max(L,1));
  const W = Math.max(16, Math.round(L*s)), Hh = Math.max(12, Math.round(H*s));
  const h = solveH([[0,0],[W,0],[W,Hh],[0,Hh]], P);
  const c = document.createElement('canvas'); c.width = W; c.height = Hh;
  const g = c.getContext('2d'), out = g.createImageData(W, Hh), od = out.data, sd = ph.data.data, sw = ph.w, sh = ph.h;
  for (let y = 0; y < Hh; y++){
    for (let x = 0; x < W; x++){
      const X = x + .5, Y = y + .5, den = h[6]*X + h[7]*Y + 1;
      let u = (h[0]*X + h[1]*Y + h[2])/den - .5, v = (h[3]*X + h[4]*Y + h[5])/den - .5;
      u = clamp(u, 0, sw-1.001); v = clamp(v, 0, sh-1.001);
      const x0 = u|0, y0 = v|0, fx = u - x0, fy = v - y0, i00 = (y0*sw + x0)*4, i10 = i00 + 4, i01 = i00 + sw*4, i11 = i01 + 4;
      const o = (y*W + x)*4;
      for (let k = 0; k < 3; k++){
        od[o+k] = (sd[i00+k]*(1-fx) + sd[i10+k]*fx)*(1-fy) + (sd[i01+k]*(1-fx) + sd[i11+k]*fx)*fy;
      }
      od[o+3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  if (!flip) return c;
  const f = document.createElement('canvas'); f.width = W; f.height = Hh;
  const fg = f.getContext('2d'); fg.translate(W, Hh); fg.rotate(Math.PI); fg.drawImage(c, 0, 0);
  fg.setTransform(1,0,0,1,0,0);   // 이후 가리기가 뒤집힌 좌표로 그려지지 않게
  return f;
}
// 번호·QR 가리기 (모자이크)
function applyBlurs(c, rects){
  const g = c.getContext('2d'), block = Math.max(5, Math.round(c.height/5));
  rects.forEach(r => {
    const x = Math.round(r.x*c.width), y = Math.round(r.y*c.height), w = Math.max(1, Math.round(r.w*c.width)), h = Math.max(1, Math.round(r.h*c.height));
    const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w/block)); t.height = Math.max(1, Math.round(h/block));
    t.getContext('2d').drawImage(c, x, y, w, h, 0, 0, t.width, t.height);
    g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, t.width, t.height, x, y, w, h); g.imageSmoothingEnabled = true;
  });
}
// 가로 띠 → 세로 리본 텍스처 (위→아래로 읽힘) + 끝단 올 풀림
function ribbonCanvas(strip, seed){
  const W = strip.width, H = strip.height, c = document.createElement('canvas'); c.width = H; c.height = W;
  const g = c.getContext('2d'); g.translate(H, 0); g.rotate(Math.PI/2); g.drawImage(strip, 0, 0);
  g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation = 'destination-out';
  const R = rng(seed), fray = Math.max(3, H*.06);
  g.beginPath(); g.moveTo(0, W);
  for (let x = 0; x <= H; x += Math.max(2, H/14)) g.lineTo(x, W - R()*fray);
  g.lineTo(H, W); g.closePath(); g.fill();
  return c;
}
/* ---------- 사진 자동 보정: 새로 그리지 않고 본인 사진만 다듬음 ---------- */
function enhanceStrip(src){
  const W = src.width, H0 = src.height;
  const cut = Math.round(H0*.05), H = H0 - cut*2;                 // 위아래 가장자리(바닥·옆 팔찌가 섞이는 부분) 정리
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently:true }); g.drawImage(src, 0, cut, W, H, 0, 0, W, H);
  const im = g.getImageData(0, 0, W, H), d = im.data, N = W*H;
  // 1) 채널별 레벨 맞춤: 조명 색(누런 빛)을 빼고 대비를 살림
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  for (let i = 0; i < d.length; i += 4){ hist[0][d[i]]++; hist[1][d[i+1]]++; hist[2][d[i+2]]++; }
  const pct = (h, p) => { let t = 0; const n = N*p; for (let v = 0; v < 256; v++){ t += h[v]; if (t >= n) return v; } return 255; };
  const lo = hist.map(h => pct(h, .01)), hi = hist.map(h => pct(h, .995));
  const lut = [0,1,2].map(k => { const a = lo[k], b = Math.max(hi[k], a + 40), t = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) t[v] = (v - a)/(b - a)*255; return t; });
  const out = new Float32Array(N*3);
  for (let i = 0, j = 0; i < d.length; i += 4, j += 3){
    let r = lut[0][d[i]], gg = lut[1][d[i+1]], b = lut[2][d[i+2]];
    let L = .2126*r + .7152*gg + .0722*b;
    // 2) 반사광 누르기 (밝은 부분만 부드럽게 압축)
    if (L > 205){ const f = (205 + (L - 205)*.4)/L; r *= f; gg *= f; b *= f; L = .2126*r + .7152*gg + .0722*b; }
    // 3) 채도 살짝 올림
    const s = 1.18; r = L + (r - L)*s; gg = L + (gg - L)*s; b = L + (b - L)*s;
    out[j] = r; out[j+1] = gg; out[j+2] = b;
  }
  // 4) 선명하게 (언샤프)
  const a = .45;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const j = (y*W + x)*3, i = (y*W + x)*4;
    for (let k = 0; k < 3; k++){
      const cc = out[j+k];
      const up = y > 0 ? out[j - W*3 + k] : cc, dn = y < H-1 ? out[j + W*3 + k] : cc;
      const lf = x > 0 ? out[j - 3 + k] : cc, rt = x < W-1 ? out[j + 3 + k] : cc;
      d[i+k] = cc*(1 + 4*a) - a*(up + dn + lf + rt);
    }
  }
  g.putImageData(im, 0, 0);
  // 5) 균일한 천 질감 + 가장자리 그림자 (60개를 걸어도 톤이 맞게)
  g.globalAlpha = .06; g.fillStyle = '#000'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  g.globalAlpha = .04; g.fillStyle = '#fff'; for (let x = 0; x < W; x += 3) g.fillRect(x, 0, 1, H);
  g.globalAlpha = 1;
  const eg = g.createLinearGradient(0, 0, 0, H);
  eg.addColorStop(0, 'rgba(0,0,0,.28)'); eg.addColorStop(.12, 'rgba(0,0,0,0)'); eg.addColorStop(.88, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,.28)');
  g.fillStyle = eg; g.fillRect(0, 0, W, H);
  return c;
}
function makeScan(ph, q, flip, rects, name, enhance = true){
  let s = warpStrip(ph, q, flip); applyBlurs(s, rects);
  if (enhance) s = enhanceStrip(s);
  return { kind:'photo', name: name || '내 팔찌', canvas: ribbonCanvas(s, SCANS.length + 1), aspect: s.width/s.height };
}
// 사진 구간에서 대표 색 뽑기 (k-평균, AI 아님 · 기기 안에서 계산)
function extractPalette(strip){
  const sw = 72, sh = Math.max(6, Math.round(sw*strip.height/strip.width));
  const c = document.createElement('canvas'); c.width = sw; c.height = sh;
  const g = c.getContext('2d', { willReadFrequently:true }); g.drawImage(strip, 0, 0, sw, sh);
  const d = g.getImageData(0, 0, sw, sh).data, px = [];
  for (let k = 0; k < d.length; k += 4) px.push([d[k], d[k+1], d[k+2]]);
  const K = 5; let cent = [...Array(K)].map((_, k) => px[Math.floor((k + .5)*px.length/K)].slice());
  let lab = new Array(px.length).fill(0);
  for (let it = 0; it < 10; it++){
    px.forEach((p, j) => { let b = 0, bd = 1e9; cent.forEach((q, k) => { const dd = (p[0]-q[0])**2 + (p[1]-q[1])**2 + (p[2]-q[2])**2; if (dd < bd){ bd = dd; b = k; } }); lab[j] = b; });
    const sum = cent.map(() => [0,0,0,0]);
    px.forEach((p, j) => { const s = sum[lab[j]]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; });
    cent = sum.map((s, k) => s[3] ? [s[0]/s[3], s[1]/s[3], s[2]/s[3]] : cent[k]);
  }
  const cnt = cent.map((_, k) => lab.filter(x => x === k).length);
  const info = cent.map((q, k) => {
    const col = new THREE.Color(q[0]/255, q[1]/255, q[2]/255), hsl = {}; col.getHSL(hsl);
    return { hex:'#' + col.getHexString(), n:cnt[k], l:hsl.l, s:hsl.s };
  }).filter(x => x.n > px.length*.03);
  // 바탕: 많이 쓰였고 채도도 있는 색 (조명 탓에 탁해진 베이지·회색보다 원래 천 색을 고름)
  const bg = info.slice().sort((a, b) => b.n*(.35 + b.s) - a.n*(.35 + a.s))[0];
  const rest = info.filter(x => x !== bg);
  const fg = rest.slice().sort((a, b) => Math.abs(b.l - bg.l) - Math.abs(a.l - bg.l))[0] || { hex: bg.l > .5 ? '#141018' : '#F6F1FF', l:0, s:0 };
  const acc = rest.filter(x => x !== fg).sort((a, b) => b.s*Math.sqrt(b.n) - a.s*Math.sqrt(a.n))[0] || fg;
  // 사진 조명 때문에 탁해진 색을 천 원색 쪽으로 되살림 (거의 흰색·검정은 그대로)
  const vivid = hex => {
    const c = new THREE.Color(hex), h = {}; c.getHSL(h);
    if (h.l < .14 || h.l > .86 || h.s < .08) return '#' + c.getHexString();
    c.setHSL(h.h, Math.min(1, h.s*1.6 + .12), clamp(h.l, .28, .72)); return '#' + c.getHexString();
  };
  const pal = { bg:vivid(bg.hex), fg:vivid(fg.hex), accent:vivid(acc.hex) };
  if (Math.abs(new THREE.Color(pal.bg).getHSL({}).l - new THREE.Color(pal.fg).getHSL({}).l) < .22) pal.fg = contrastInk(pal.bg) === '#FFFFFF' ? '#F6F1FF' : '#141018';
  pal.tag = pal.accent; pal.tagInk = contrastInk(pal.tag);
  return pal;
}
// 역할 바꾸기: 바탕·무늬·강조 색 순서를 돌림
function rotatePal(p, k){
  const base = [p.bg, p.fg, p.accent], o = [0,1,2].map(j => base[(j + k) % 3]);
  const q = { bg:o[0], fg:o[1], accent:o[2] }; q.tag = k % 2 ? q.fg : q.accent; q.tagInk = contrastInk(q.tag); return q;
}
/* ================= 팔찌 만들기(스캔) 화면 틀 — scripts/make-band-engine.mjs 가 시안 스캔 코드 바로 앞에 끼워 넣는다 =================
   시안(sample-source.html 151~196줄)의 화면과 같다. 다른 점: 문구를 9개 언어로(TX), 맨 위에 "티켓 정보"(같은 티켓은 첫 디자인을 함께 씀),
   이미 첫 디자인이 있으면 사진 없이 바로 담는 버튼. 시안 코드가 id 로 찾으므로 시안과 같은 id 를 쓴다(한 화면에 하나만 있다). */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const FEST_OPTS = (hooks.fests || []).map(f => `<option value="${esc(f.slug)}">${esc(f.name)}</option>`).join('');
const chipRow = (id, items) => `<div class="presets tk-chips" id="${id}" role="group">${items.map(([v, l], k) => `<button type="button" data-v="${v}" aria-pressed="${k === 0}">${esc(l)}</button>`).join('')}</div>`;
const scanRoot = document.createElement('div'); scanRoot.className = 'band-scan';
scanRoot.innerHTML = `
<div class="sheet" id="scanSheet" hidden role="dialog" aria-modal="true" aria-labelledby="scanTitle">
  <div class="sheet-in">
    <div class="sheet-head"><h2 id="scanTitle">${esc(TX('scan.title','팔찌 스캔'))}</h2><button class="x" id="scanClose" aria-label="${esc(TX('scan.close','닫기'))}">×</button></div>
    <div class="tk" id="tkBox">
      <p class="s tk-h">${esc(TX('scan.tk.title','어떤 팔찌인가요?'))}</p>
      <select id="tkFest" aria-label="${esc(TX('scan.tk.fest','페스티벌'))}"><option value="">${esc(TX('scan.tk.pick','페스티벌을 골라 주세요'))}</option>${FEST_OPTS}<option value="__etc">${esc(TX('scan.tk.etc','목록에 없어요 · 직접 입력'))}</option></select>
      <input type="text" id="scanName" maxlength="40" hidden placeholder="${esc(TX('scan.name','페스티벌 이름 (예: COMBI 2024)'))}" aria-label="${esc(TX('scan.tk.fest','페스티벌'))}">
      <label class="tk-year"><span>${esc(TX('scan.tk.year','연도'))}</span><input type="number" id="tkYear" min="2000" max="2100" inputmode="numeric" value="${new Date().getFullYear()}"></label>
      <p class="s tk-l">${esc(TX('scan.tk.grade','티켓 등급'))}</p>
      ${chipRow('tkGrade', [['ga','GA'],['pga','PGA'],['vip','VIP'],['etc',TX('scan.tk.other','기타')]])}
      <input type="text" id="tkGradeEtc" maxlength="20" hidden placeholder="${esc(TX('scan.tk.gradeEtc','등급 직접 입력'))}" aria-label="${esc(TX('scan.tk.gradeEtc','등급 직접 입력'))}">
      <p class="s tk-l">${esc(TX('scan.tk.day','날짜'))}</p>
      ${chipRow('tkDay', [['day1','Day 1'],['day2','Day 2'],['day3','Day 3'],['full3',TX('scan.tk.full','전일권')],['etc',TX('scan.tk.other','기타')]])}
      <input type="text" id="tkDayEtc" maxlength="20" hidden placeholder="${esc(TX('scan.tk.dayEtc','날짜 직접 입력'))}" aria-label="${esc(TX('scan.tk.dayEtc','날짜 직접 입력'))}">
      <p class="s tk-note" id="tkNote" aria-live="polite"></p>
      <div class="tk-exist" id="tkExist" hidden>
        <img id="tkExistImg" alt="">
        <button type="button" class="btn primary" id="tkUse">${esc(TX('scan.tk.use','이 디자인으로 내 컬렉션에 추가'))}</button>
        <p class="s">${esc(TX('scan.tk.differ','내 팔찌와 다르면 아래에서 사진으로 만들 수 있어요'))}</p>
      </div>
    </div>
    <p class="s">${TX('scan.lead','팔찌의 <b>곧은 부분</b>을 네 점으로 감싸 주세요.<br><b>분홍 점과 분홍 선</b>이 글자가 시작하는 쪽 윗변이에요.')}</p>
    <div class="photo" id="photoBox"><canvas id="photoCv"></canvas><p class="empty" id="photoEmpty">${esc(TX('scan.empty','사진을 골라 주세요'))}</p></div>
    <div class="row">
      <label class="btn">📷 ${esc(TX('scan.pick','사진 고르기'))}<input type="file" accept="image/*" id="fileIn" hidden></label>
      <button class="btn" id="useSample">${esc(TX('scan.sample','예시 사진'))}</button>
    </div>
    <div class="presets" id="presets" hidden></div>
    <p class="s">${TX('scan.blur','미리보기 · 번호나 QR이 보이면 <b>끌어서 가려</b> 주세요')}</p>
    <canvas class="prev" id="prevCv"></canvas>
    <div class="row">
      <button class="btn" id="flipBtn">↻ ${esc(TX('scan.flip','방향 뒤집기'))}</button>
      <button class="btn" id="undoBlur">${esc(TX('scan.undo','가리기 되돌리기'))}</button>
    </div>
    <p class="s">${esc(TX('scan.mode','만들 방식'))}</p>
    <div class="seg" role="group" aria-label="${esc(TX('scan.mode','만들 방식'))}">
      <button data-mk="photo" aria-pressed="true">${esc(TX('scan.photo','사진 그대로'))}</button>
      <button data-mk="band" aria-pressed="false">${esc(TX('scan.design','팔찌로 디자인'))}</button>
    </div>
    <div class="design" id="photoFix">
      <div class="sw"><p class="s" style="margin:0">${esc(TX('scan.fixLead','내 팔찌 사진을 다듬어서 걸어요'))}</p><button id="enhanceBtn" aria-pressed="true">${esc(TX('scan.enhOn','✨ 자동 보정 켜짐'))}</button></div>
      <canvas class="prev" id="fixCv"></canvas>
    </div>
    <div class="design" id="designBox" hidden>
      <p class="s">${esc(TX('scan.designLead','사진에서 뽑은 색으로 패턴을 골라 주세요'))}</p>
      <div class="presets" id="styleChips"></div>
      <p class="s" id="aiStatus" hidden></p>
      <div class="sw" id="swatches"></div>
      <canvas class="prev" id="designCv"></canvas>
    </div>
    <label class="tk-agree"><input type="checkbox" id="tkAgree"> <span>${esc(TX('scan.agree','제가 직접 찍은 제 팔찌 사진이고, 번호·QR이 보이지 않게 가렸어요'))}</span></label>
    <button class="btn primary" id="scanDone">${esc(TX('scan.done','리본으로 걸기'))}</button>
  </div>
</div>
<p class="scan-toast" id="scanToast" role="status" aria-live="polite"></p>
<div class="soon" id="aiSoon" hidden role="alertdialog" aria-modal="true" aria-labelledby="aiSoonTitle">
  <div class="soon-card">
    <div class="lk" aria-hidden="true">✨</div>
    <h3 id="aiSoonTitle">${TX('scan.ai.title','AI 디자인은<br>FestLock 앱에서 만나요')}</h3>
    <p>${esc(TX('scan.ai.body','앱이 출시되면 사진 한 장으로 AI가 내 팔찌 디자인을 만들어 줘요. 출시 소식은 인스타그램에서 가장 먼저 알려 드릴게요.'))}</p>
    <a href="https://www.instagram.com/festlock/" target="_blank" rel="noopener noreferrer">📸 ${esc(TX('scan.ai.follow','@festlock 팔로우하기'))}</a>
    <button type="button" id="aiSoonClose">${esc(TX('scan.close','닫기'))}</button>
  </div>
</div>`;
document.body.appendChild(scanRoot);

/* ---------- 스캔 시트 ---------- */
const DPR = Math.min(devicePixelRatio || 1, 2);
const sheet = document.getElementById('scanSheet'), pcv = document.getElementById('photoCv'), vcv = document.getElementById('prevCv');
const pg = pcv.getContext('2d'), vg = vcv.getContext('2d');
let samplePhoto = null, photo = null, quad = null, flipped = false, blurs = [], pdrag = null, bdrag = null, fit = { ox:0, oy:0, dw:1, dh:1 }, vfit = { ox:0, oy:0, dw:1, dh:1 };
let previewStrip = null, rafPending = false, lowRes = false;

function defaultQuad(){ return [[.2,.44],[.8,.44],[.8,.56],[.2,.56]]; }
function setPhoto(ph, isSample){
  photo = ph; blurs = []; flipped = false;
  document.getElementById('photoEmpty').hidden = true;
  const pr = document.getElementById('presets'); pr.hidden = !isSample; pr.innerHTML = '';
  if (isSample){
    PRESETS.forEach((p, k) => {
      const b = document.createElement('button'); b.textContent = `${TX('scan.ex','예시')} ${k+1} · ${p.name}`;
      b.addEventListener('click', () => usePreset(k)); pr.appendChild(b);
    });
    usePreset(0);
  } else { resetAI(); quad = defaultQuad(); layoutPhoto(); }
}
function resetAI(){
  aiRecipe = null; aiStatus.hidden = true;
  if (styleIdx === -1){ styleIdx = 0; setPressed(0); }
}
function usePreset(k){
  resetAI();
  const p = PRESETS[k]; quad = p.q.map(v => v.slice()); flipped = p.flip; blurs = [];
  ticketCustom(p.name);
  [...document.getElementById('presets').children].forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
  layoutPhoto();
}
function layoutPhoto(){
  const cw = pcv.parentElement.clientWidth || 360;
  const ar = photo ? photo.h/photo.w : .6;
  const ch = Math.round(Math.min(cw*ar, innerHeight*.44, 520));
  pcv.style.height = ch + 'px'; pcv.width = cw*DPR; pcv.height = ch*DPR;
  render();
}
function render(){
  if (rafPending) return; rafPending = true;
  requestAnimationFrame(() => { rafPending = false; drawPhoto(); drawPreview(); });
}
function drawPhoto(){
  const cw = pcv.width/DPR, ch = pcv.height/DPR;
  pg.setTransform(DPR,0,0,DPR,0,0); pg.clearRect(0,0,cw,ch);
  if (!photo) return;
  const s = Math.min(cw/photo.w, ch/photo.h);
  fit = { dw:photo.w*s, dh:photo.h*s }; fit.ox = (cw - fit.dw)/2; fit.oy = (ch - fit.dh)/2;
  pg.drawImage(photo.c, fit.ox, fit.oy, fit.dw, fit.dh);
  const P = quad.map(([x,y]) => [fit.ox + x*fit.dw, fit.oy + y*fit.dh]);
  pg.beginPath(); pg.rect(0,0,cw,ch); pg.moveTo(...P[0]); P.slice(1).forEach(p => pg.lineTo(...p)); pg.closePath();
  pg.fillStyle = 'rgba(11,6,32,.5)'; pg.fill('evenodd');
  pg.lineWidth = 2; pg.strokeStyle = '#fff';
  pg.beginPath(); pg.moveTo(...P[1]); pg.lineTo(...P[2]); pg.lineTo(...P[3]); pg.lineTo(...P[0]); pg.stroke();
  pg.lineWidth = 3; pg.strokeStyle = '#FF4FA0'; pg.beginPath(); pg.moveTo(...P[0]); pg.lineTo(...P[1]); pg.stroke();
  // 읽는 방향 화살표
  const mx = (P[0][0]+P[1][0])/2, my = (P[0][1]+P[1][1])/2, a = Math.atan2(P[1][1]-P[0][1], P[1][0]-P[0][0]);
  pg.save(); pg.translate(mx, my); pg.rotate(a); pg.fillStyle = '#FF4FA0';
  pg.beginPath(); pg.moveTo(9,0); pg.lineTo(-5,-7); pg.lineTo(-5,7); pg.closePath(); pg.fill(); pg.restore();
  P.forEach((p, k) => {
    pg.beginPath(); pg.arc(p[0], p[1], 10, 0, Math.PI*2);
    pg.fillStyle = k === 0 ? '#FF4FA0' : '#fff'; pg.fill(); pg.lineWidth = 2; pg.strokeStyle = '#0B0620'; pg.stroke();
  });
  if (pdrag && pdrag.type === 'h'){                    // 손가락 아래가 보이게 돋보기
    const p = P[pdrag.k], R = 52, Z = 3, cx = p[0] < cw/2 ? cw - R - 8 : R + 8, cy = R + 8;
    pg.save(); pg.beginPath(); pg.arc(cx, cy, R, 0, Math.PI*2); pg.clip();
    pg.fillStyle = '#000'; pg.fillRect(cx-R, cy-R, 2*R, 2*R);
    const sx = (p[0]-fit.ox)/fit.dw*photo.w, sy = (p[1]-fit.oy)/fit.dh*photo.h, sw = 2*R/Z/(fit.dw/photo.w);
    pg.drawImage(photo.c, sx - sw/2, sy - sw/2, sw, sw, cx-R, cy-R, 2*R, 2*R);
    pg.strokeStyle = '#FF4FA0'; pg.lineWidth = 1.5; pg.beginPath(); pg.moveTo(cx-10,cy); pg.lineTo(cx+10,cy); pg.moveTo(cx,cy-10); pg.lineTo(cx,cy+10); pg.stroke();
    pg.restore(); pg.beginPath(); pg.arc(cx, cy, R, 0, Math.PI*2); pg.strokeStyle = '#fff'; pg.lineWidth = 2; pg.stroke();
  }
}
function drawPreview(){
  const cw = vcv.clientWidth || 360;
  if (!photo){ vcv.style.height = '56px'; vcv.width = cw*DPR; vcv.height = 56*DPR; vg.clearRect(0,0,vcv.width,vcv.height); return; }
  previewStrip = warpStrip(photo, quad, flipped, lowRes ? 420 : 900); applyBlurs(previewStrip, blurs);
  const ch = Math.round(clamp(cw*previewStrip.height/previewStrip.width, 48, 120));
  vcv.style.height = ch + 'px'; vcv.width = cw*DPR; vcv.height = ch*DPR;
  vg.setTransform(DPR,0,0,DPR,0,0); vg.clearRect(0,0,cw,ch);
  const s = Math.min(cw/previewStrip.width, ch/previewStrip.height);
  vfit = { dw:previewStrip.width*s, dh:previewStrip.height*s }; vfit.ox = (cw - vfit.dw)/2; vfit.oy = (ch - vfit.dh)/2;
  vg.drawImage(previewStrip, vfit.ox, vfit.oy, vfit.dw, vfit.dh);
  vg.strokeStyle = '#FF4FA0'; vg.lineWidth = 1.5; vg.setLineDash([4,3]);
  [...blurs, ...(bdrag && bdrag.r ? [bdrag.r] : [])].forEach(r => vg.strokeRect(vfit.ox + r.x*vfit.dw, vfit.oy + r.y*vfit.dh, r.w*vfit.dw, r.h*vfit.dh));
  vg.setLineDash([]);
  if (!lowRes && !bdrag){ extracted = extractPalette(previewStrip); drawDesign(); drawFix(); }
}

/* ---------- 팔찌로 디자인 ---------- */
let makeMode = 'photo', styleIdx = 0, palRot = 0, extracted = null, enhanceOn = true;
const fcv = document.getElementById('fixCv'), fg2 = fcv.getContext('2d');
function drawFix(){
  if (makeMode !== 'photo' || !previewStrip) return;
  const s = enhanceOn ? enhanceStrip(previewStrip) : previewStrip;
  const cw = fcv.clientWidth || 360, ch = Math.round(clamp(cw*s.height/s.width, 48, 120));
  fcv.style.height = ch + 'px'; fcv.width = cw*DPR; fcv.height = ch*DPR;
  fg2.setTransform(DPR,0,0,DPR,0,0); fg2.clearRect(0,0,cw,ch);
  const k = Math.min(cw/s.width, ch/s.height), dw = s.width*k, dh = s.height*k;
  fg2.drawImage(s, (cw - dw)/2, (ch - dh)/2, dw, dh);
  fg2.font = `700 11px ${PRET}`; fg2.fillStyle = 'rgba(11,6,32,.75)'; fg2.beginPath(); fg2.roundRect(6, 6, 58, 20, 10); fg2.fill();
  fg2.fillStyle = '#F6F1FF'; fg2.textBaseline = 'middle'; fg2.fillText(enhanceOn ? TX('scan.after','보정 후') : TX('scan.before','보정 전'), 14, 16.5);
}
document.getElementById('enhanceBtn').addEventListener('click', e => {
  enhanceOn = !enhanceOn; e.currentTarget.setAttribute('aria-pressed', String(enhanceOn));
  e.currentTarget.textContent = enhanceOn ? TX('scan.enhOn','✨ 자동 보정 켜짐') : TX('scan.enhOff','자동 보정 꺼짐'); drawFix();
});
const dcv = document.getElementById('designCv'), dg = dcv.getContext('2d');
const styleChips = document.getElementById('styleChips');
const setPressed = idx => [...styleChips.children].forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.k === idx)));
BAND_STYLES.forEach((st, k) => {
  const b = document.createElement('button'); b.textContent = st.label; b.dataset.k = k; b.setAttribute('aria-pressed', String(k === 0));
  b.addEventListener('click', () => { styleIdx = k; setPressed(k); drawDesign(); });
  styleChips.appendChild(b);
});

/* ---------- ✨ AI 디자인: 사진을 보고 설계도(JSON)를 받아 옴 ---------- */
let aiRecipe = null, aiSummary = '', aiCtl = null, aiSample = null;
const aiStatus = document.getElementById('aiStatus');
// AI 디자인은 앱 출시 후 제공: 지금은 누르면 출시 안내 + 인스타 팔로우 카드만 띄움 (AI 호출·요금 없음)
const aiChip = document.createElement('button'); aiChip.textContent = TX('scan.ai','✨ AI 디자인'); aiChip.dataset.k = -2;
aiChip.setAttribute('aria-pressed', 'false'); aiChip.style.opacity = '.55';
styleChips.prepend(aiChip);
const aiSoon = document.getElementById('aiSoon');
aiChip.addEventListener('click', () => { aiSoon.hidden = false; document.getElementById('aiSoonClose').focus(); });
document.getElementById('aiSoonClose').addEventListener('click', () => { aiSoon.hidden = true; });
aiSoon.addEventListener('click', e => { if (e.target === aiSoon) aiSoon.hidden = true; });
/* AI 호출은 넣지 않음 (앱 출시 후 제공) */
/* AI 디자인 기능은 넣지 않음 (버튼은 출시 안내 카드만 띄움) */
document.querySelectorAll('[data-mk]').forEach(b => b.addEventListener('click', () => {
  makeMode = b.dataset.mk;
  document.querySelectorAll('[data-mk]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  document.getElementById('designBox').hidden = makeMode !== 'band';
  document.getElementById('photoFix').hidden = makeMode !== 'photo';
  drawDesign(); drawFix();
}));
function currentDesign(){
  const name = document.getElementById('scanName').value.trim() || TX('scan.mine','내 팔찌');
  if (styleIdx === -1 && aiRecipe) return recipeSpec(aiRecipe, name, SCANS.length + 7);
  if (BAND_STYLES[styleIdx].id === 'gold'){
    const base = rotatePal(extracted || BAND_PALS[0], palRot), ink = contrastInk(base.bg) === '#FFFFFF' ? '#F6F1E6' : '#241C14';
    return { kind:'band', style:'gold', name, sub:'', year:String(document.getElementById('tkYear')?.value || yearOf(name)), gold:{ bg:base.bg, ink },
      pal:{ bg:base.bg, fg:ink, accent:'#D9B45A', tag:base.bg, tagInk:ink }, seed:SCANS.length + 7, L:2.7 };
  }
  return { kind:'band', name, sub:'', style:BAND_STYLES[styleIdx].id, pal:rotatePal(extracted || BAND_PALS[0], palRot), seed:SCANS.length + 7, L:2.7 };
}
function drawDesign(){
  if (makeMode !== 'band') return;
  const sw = document.getElementById('swatches');
  if (!extracted && !(styleIdx === -1 && aiRecipe)){ sw.innerHTML = ''; return; }
  const spec = currentDesign(), isAI = spec.style === 'ai';
  sw.innerHTML = '';
  const swCols = isAI
    ? [...(Array.isArray(aiRecipe.bg) ? aiRecipe.bg : [aiRecipe.bg]), ...(aiRecipe.layers || []).map(l => l && l.color), spec.pal.tag].map(c => rcCol(c, null)).filter(Boolean).slice(0, 6)
    : [spec.pal.bg, spec.pal.fg, spec.pal.accent];
  swCols.forEach(c => { const i = document.createElement('i'); i.style.background = c; i.title = c; sw.appendChild(i); });
  if (!isAI){
    const rb = document.createElement('button'); rb.textContent = TX('scan.rot','🎨 색 순서 바꾸기');
    rb.addEventListener('click', () => { palRot = (palRot + 1) % 6; drawDesign(); }); sw.appendChild(rb);
  }
  // 세로 띠를 가로로 눕혀 미리보기 + 태그
  const strap = bandStrap(spec, spec.L, .34), tag = tagCanvas(spec);
  const cw = dcv.clientWidth || 360, ch = 92;
  dcv.style.height = ch + 'px'; dcv.width = cw*DPR; dcv.height = ch*DPR;
  dg.setTransform(DPR,0,0,DPR,0,0); dg.clearRect(0,0,cw,ch);
  const bh = 40, bl = bh*strap.height/strap.width, x0 = 8, y0 = (ch - bh)/2, scale = Math.min(1, (cw - 16)/bl);
  dg.save(); dg.translate(x0, y0 + bh*scale/2 + (bh - bh*scale)/2); dg.scale(scale, scale);
  dg.translate(0, bh/2); dg.rotate(-Math.PI/2); dg.drawImage(strap, 0, 0, bh, bl); dg.restore();
  const th = 72, tw = th*tag.width/tag.height, tx = x0 + (.5/spec.L)*bl*scale - tw/2;
  dg.fillStyle = 'rgba(0,0,0,.35)'; dg.beginPath(); dg.roundRect(tx + 2, (ch - th)/2 + 3, tw, th, 10); dg.fill();
  dg.drawImage(tag, tx, (ch - th)/2, tw, th);
  dg.fillStyle = '#121014'; dg.beginPath(); dg.roundRect(x0 + (.14/spec.L)*bl*scale - 6, ch/2 - 9, 14, 18, 4); dg.fill();
}
document.getElementById('scanName').addEventListener('input', () => drawDesign());
const ptIn = (e, cv) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function insideQuad(x, y, P){
  let inside = false;
  for (let i = 0, j = 3; i < 4; j = i++){
    const [xi,yi] = P[i], [xj,yj] = P[j];
    if ((yi > y) !== (yj > y) && x < (xj-xi)*(y-yi)/(yj-yi) + xi) inside = !inside;
  }
  return inside;
}
pcv.addEventListener('pointerdown', e => {
  if (!photo) return;
  const [x,y] = ptIn(e, pcv), P = quad.map(([a,b]) => [fit.ox + a*fit.dw, fit.oy + b*fit.dh]);
  let k = -1, best = 30;
  P.forEach((p, j) => { const d = Math.hypot(p[0]-x, p[1]-y); if (d < best){ best = d; k = j; } });
  if (k >= 0) pdrag = { type:'h', k };
  else if (insideQuad(x, y, P)) pdrag = { type:'m', x, y, q0:quad.map(v => v.slice()) };
  else return;
  pcv.setPointerCapture(e.pointerId); lowRes = true; render();
});
pcv.addEventListener('pointermove', e => {
  if (!pdrag) return;
  const [x,y] = ptIn(e, pcv);
  if (pdrag.type === 'h'){ quad[pdrag.k] = [clamp((x - fit.ox)/fit.dw, 0, 1), clamp((y - fit.oy)/fit.dh, 0, 1)]; }
  else { const dx = (x - pdrag.x)/fit.dw, dy = (y - pdrag.y)/fit.dh; quad = pdrag.q0.map(([a,b]) => [clamp(a+dx,0,1), clamp(b+dy,0,1)]); }
  render();
});
const endP = () => { if (!pdrag) return; pdrag = null; lowRes = false; render(); };
pcv.addEventListener('pointerup', endP); pcv.addEventListener('pointercancel', endP);

vcv.addEventListener('pointerdown', e => {
  if (!photo) return;
  const [x,y] = ptIn(e, vcv);
  bdrag = { x0:clamp((x - vfit.ox)/vfit.dw, 0, 1), y0:clamp((y - vfit.oy)/vfit.dh, 0, 1), r:null };
  vcv.setPointerCapture(e.pointerId);
});
vcv.addEventListener('pointermove', e => {
  if (!bdrag) return;
  const [x,y] = ptIn(e, vcv), x1 = clamp((x - vfit.ox)/vfit.dw, 0, 1), y1 = clamp((y - vfit.oy)/vfit.dh, 0, 1);
  bdrag.r = { x:Math.min(bdrag.x0,x1), y:Math.min(bdrag.y0,y1), w:Math.abs(x1-bdrag.x0), h:Math.abs(y1-bdrag.y0) };
  drawPreviewOnly();
});
function drawPreviewOnly(){ if (!rafPending){ rafPending = true; requestAnimationFrame(() => { rafPending = false; drawPreview(); }); } }
const endB = () => {
  if (!bdrag) return;
  if (bdrag.r && bdrag.r.w > .01 && bdrag.r.h > .05) blurs.push(bdrag.r);
  bdrag = null; render();
};
vcv.addEventListener('pointerup', endB); vcv.addEventListener('pointercancel', endB);

document.getElementById('flipBtn').addEventListener('click', () => {
  if (!photo) return; flipped = !flipped;
  blurs = blurs.map(r => ({ x:1-r.x-r.w, y:1-r.y-r.h, w:r.w, h:r.h })); render();
});
document.getElementById('undoBlur').addEventListener('click', () => { blurs.pop(); render(); });
document.getElementById('useSample').addEventListener('click', () => { loadSample().then(ph => setPhoto(ph, true)).catch(() => toast(TX('scan.badPhoto','이 사진은 열 수 없어요'))); });
document.getElementById('fileIn').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0]; if (!file) return;
  const url = URL.createObjectURL(file);
  try { const img = new Image(); img.src = url; await img.decode(); setPhoto(photoFrom(img), false); }
  catch { toast(TX('scan.badPhoto','이 사진은 열 수 없어요')); }
  finally { URL.revokeObjectURL(url); e.target.value = ''; }
});
function openScan(){
  sheet.hidden = false; document.body.style.overflow = 'hidden';
  if (!photo && samplePhoto) setPhoto(samplePhoto, true); else layoutPhoto();
}
function closeScan(){ sheet.hidden = true; document.body.style.overflow = ''; }
document.getElementById('scanClose').addEventListener('click', closeScan);
/* =====================================================================
   내 팔찌 공통: 세로 띠(위→아래로 읽힘) / 가로 띠(왼→오른쪽) 텍스처 캐시
   ===================================================================== */
function stripOf(spec){
  if (spec._strip) return spec._strip;
  let vert, aspect;
  if (spec.kind === 'photo'){ vert = spec.canvas; aspect = spec.aspect; }
  else { const L = spec.L || 2.7; vert = bandStrap(spec, L, .34); aspect = L/.34; }
  return spec._strip = { vert, aspect: Math.max(1.5, aspect) };
}
function horizOf(spec){
  if (spec._hz) return spec._hz;
  const v = stripOf(spec).vert, c = document.createElement('canvas'); c.width = v.height; c.height = v.width;
  const g = c.getContext('2d'); g.translate(0, c.height); g.rotate(-Math.PI/2); g.drawImage(v, 0, 0);
  return spec._hz = c;
}
function cardArt(spec, i){
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), G = goldPaint(g, 0, 0, 256, 256);
  g.fillStyle = '#17122E'; g.fillRect(0, 0, 256, 256); weave(g, 256, 256);
  g.strokeStyle = G; g.lineWidth = 2; g.strokeRect(12, 12, 232, 232);
  const hz = horizOf(spec), bw = 232, bh = clamp(bw*hz.height/hz.width, 22, 72);
  g.save(); g.translate(128, 116); g.rotate(-.12);
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(-bw/2 + 5, -bh/2 + 7, bw, bh);
  g.drawImage(hz, -bw/2, -bh/2, bw, bh); g.restore();
  g.fillStyle = '#F6F1FF'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, spec.name || '내 팔찌', 216, 22, 800, PRET); g.fillText(spec.name || '내 팔찌', 128, 202);
  g.font = `600 12px ${PRET}`; g.fillStyle = '#B7AED6';
  g.textAlign = 'left'; g.fillText(`No.${String(i+1).padStart(2,'0')}`, 24, 32);
  const yr = (String(spec.name || '').match(/(?:19|20)\d{2}/) || [])[0];
  if (yr){ g.textAlign = 'right'; g.fillText(yr, 232, 32); }
  return canvasTex(c);
}
function cardBack(i){
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), G = goldPaint(g, 0, 0, 128, 128);
  g.fillStyle = '#120D26'; g.fillRect(0, 0, 128, 128); g.strokeStyle = G; g.lineWidth = 1.5; g.strokeRect(8, 8, 112, 112);
  lockGlyph(g, 64, 52, 30, G, '#120D26');
  g.fillStyle = '#B7AED6'; g.textAlign = 'center'; g.font = `600 11px ${PRET}`; g.fillText(`No.${String(i+1).padStart(2,'0')}`, 64, 102);
  return canvasTex(c);
}

/* ---------- ⭕ 손목: 기둥에 팔찌 링을 쌓음 (한 기둥 14개) ---------- */
function makeWristTheme(){
  const root = new THREE.Group(); world.add(root);
  const PER = 14, RR = .5, ROD = .42, SPX = 2.1;
  const rodMat = new THREE.MeshStandardMaterial({ color:0x1d1545, roughness:.45, metalness:.1 });
  const baseMat = new THREE.MeshStandardMaterial({ color:0x2a1f57, roughness:.6 });
  const capMat = new THREE.MeshStandardMaterial({ color:0xff4fa0, roughness:.4 });
  const rodGeo = new THREE.CylinderGeometry(ROD, ROD, 1, 40), baseGeo = new THREE.CylinderGeometry(.85, .95, .14, 48);
  const capGeo = new THREE.SphereGeometry(ROD, 32, 12, 0, Math.PI*2, 0, Math.PI/2);
  const rods = [], items = [];
  const live = () => items.filter(it => !it.leaving);
  function ensureRod(k){
    while (rods.length <= k){
      const g = new THREE.Group(), rod = new THREE.Mesh(rodGeo, rodMat), base = new THREE.Mesh(baseGeo, baseMat), cap = new THREE.Mesh(capGeo, capMat);
      base.position.y = .07; g.add(rod, base, cap); g.scale.setScalar(.001); root.add(g);
      rods.push({ g, rod, cap, h:1.6, hT:1.6, x:0, tx:0, show:0, showT:1 });
    }
  }
  function relayout(){
    const L = live(), nr = Math.max(1, Math.ceil(L.length/PER)); ensureRod(nr - 1);
    const tops = rods.map(() => .16);
    L.forEach((it, k) => { const r = Math.floor(k/PER); it.rod = r; it.s.t = tops[r] + it.h/2; tops[r] += it.h + .035; });
    rods.forEach((rd, r) => { rd.tx = (r - (nr-1)/2)*SPX; rd.hT = Math.max(1.6, tops[r] + .4); rd.showT = r < nr ? 1 : 0; });
  }
  function ringGeo(h, r){
    const g = new THREE.CylinderGeometry(r, r, h, 72, 1, true), uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++){ const u = uv.getX(k), v = uv.getY(k); uv.setXY(k, v, 1 - u); }   // 둘레 = 팔찌 길이 방향 (바깥에서 바르게 읽힘)
    return g;
  }
  function kill(it){ root.remove(it.mesh); it.mesh.geometry.dispose(); it.mesh.material.map.dispose(); it.mesh.material.dispose(); items.splice(items.indexOf(it), 1); }
  return {
    root, rotLimit:1.4, free360:true,
    hint:'좌우로 끌면 360도 돌아가요 · 팔찌를 누르면 빙글 돌아요',
    label: i => `${SCANS[i] ? SCANS[i].name : '내 팔찌'} · 손목 스택`,
    add(i, { delay = 0 } = {}){
      const spec = SCANS[i], st = stripOf(spec), R = rng(i + 17);
      const r = RR + (i % 3)*.012, C = 2*Math.PI*r;
      const h = clamp(C/st.aspect, .2, .4), reps = Math.max(1, Math.round(C/(h*st.aspect)));
      const map = canvasTex(st.vert); map.wrapT = THREE.RepeatWrapping; map.repeat.set(1, reps);
      const mesh = new THREE.Mesh(ringGeo(h, r), new THREE.MeshStandardMaterial({ map, side:THREE.DoubleSide, roughness:.8, alphaTest:.5 }));
      root.add(mesh);
      const it = { i, mesh, h, s:sp(0), spin:sp(0), rod:0, delay, leaving:false, landed:false, tx:(R()-.5)*.14, tz:(R()-.5)*.14, wob:0 };
      items.push(it); relayout();
      it.s.x = it.s.t + 4.5 + R(); it.spin.x = (R() > .5 ? 1 : -1)*Math.PI*2; it.spin.t = R()*Math.PI*2;
      mesh.position.set(rods[it.rod].tx, it.s.x, 0);
    },
    remove(instant){
      const L = live(), it = L[L.length-1]; if (!it) return;
      if (instant) kill(it); else { it.leaving = true; it.delay = 0; it.s.t += 6; }
      relayout();
    },
    replay(){
      const L = live(), st = Math.min(.12, 2.4/Math.max(L.length, 1));
      L.forEach((it, k) => { it.s.x = it.s.t + 4.5; it.s.v = 0; it.landed = false; it.delay = k*st; it.spin.x += Math.PI*2; });
    },
    update(dt, t){
      rods.forEach(rd => {
        rd.x = damp(rd.x, rd.tx, 6, dt); rd.h = damp(rd.h, rd.hT, 6, dt); rd.show = damp(rd.show, rd.showT, 6, dt);
        rd.g.position.x = rd.x; rd.g.scale.setScalar(Math.max(.001, rd.show)); rd.g.visible = rd.show > .02;
        rd.rod.scale.y = rd.h; rd.rod.position.y = rd.h/2; rd.cap.position.y = rd.h;
      });
      for (let j = items.length - 1; j >= 0; j--){
        const it = items[j];
        if (it.delay > 0){ it.delay -= dt; continue; }
        const v0 = it.s.v; springStep(it.s, dt, 16, .7); springStep(it.spin, dt, 6, .85);
        if (!it.leaving && !it.landed && it.s.x <= it.s.t + .02){ it.landed = true; it.wob = RM ? 0 : Math.min(.3, Math.abs(v0)*.05 + .1); }
        it.wob *= Math.exp(-dt*3);
        it.mesh.position.set(rods[it.rod] ? rods[it.rod].x : 0, it.s.x, 0);
        it.mesh.rotation.set(it.tx + it.wob*Math.sin(t*16), it.spin.x, it.tz + it.wob*Math.cos(t*16));
        if (it.leaving && it.s.x > it.s.t - .1) kill(it);
      }
    },
    view(){
      const shown = rods.filter(rd => rd.showT > 0), nr = Math.max(1, shown.length);
      const H = Math.max(1.6, ...shown.map(rd => rd.hT));
      return { center:new THREE.Vector3(0, H/2, 0), w:nr*SPX + .4, h:H + .7, elev:.3 };
    },
    pick(ray){
      const L = live(), hit = ray.intersectObjects(L.map(it => it.mesh))[0]; if (!hit) return -1;
      const it = L.find(x => x.mesh === hit.object); it.spin.x += Math.PI*2; return it.i;
    },
  };
}

/* ---------- 🔗 펜스: 팔찌 고리를 철망에 걸음 (한 줄 7개) ---------- */
function makeFenceBandTheme(){
  const root = new THREE.Group(); world.add(root);
  const COLS = 7, SX = .56, SY = 2.0, TOP = .25, TW = .28, TH = .4, HALF = COLS*SX/2 + .28;
  const wc = document.createElement('canvas'); wc.width = wc.height = 128;
  const wg = wc.getContext('2d'); wg.strokeStyle = '#d6d0ee'; wg.lineWidth = 6; wg.lineCap = 'round';
  wg.beginPath(); wg.moveTo(0,0); wg.lineTo(128,128); wg.moveTo(128,0); wg.lineTo(0,128); wg.stroke();
  const wireTex = canvasTex(wc); wireTex.wrapS = wireTex.wrapT = THREE.RepeatWrapping;
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.MeshStandardMaterial({ map:wireTex, alphaTest:.5, side:THREE.DoubleSide, metalness:.6, roughness:.35 }));
  fence.scale.x = 2*HALF; root.add(fence);
  const metal = new THREE.MeshStandardMaterial({ color:0xb9b3d8, metalness:.8, roughness:.3 });
  const postGeo = new THREE.CylinderGeometry(.05,.05,1,16);
  const pl = new THREE.Mesh(postGeo, metal), pr = new THREE.Mesh(postGeo, metal);
  pl.position.x = -HALF - .03; pr.position.x = HALF + .03;
  const topRail = new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,2*HALF + .12,12), metal);
  topRail.rotation.z = Math.PI/2; topRail.position.y = TOP; root.add(pl, pr, topRail);
  const beadGeo = new THREE.CylinderGeometry(.055, .055, .13, 18), beadMat = new THREE.MeshStandardMaterial({ color:0x121014, roughness:.35 });
  const items = []; let H = 2.8, HT = 2.8;
  const node = i => ({ x:-HALF + .56 + (i % COLS)*SX, y:TOP - .8 - Math.floor(i/COLS)*SY });
  // 닫힌 팔찌 고리: 앞면은 시작부터 아래로, 아래에서 꺾여 뒷면으로 올라감 (철망 줄이 고리 안을 지남)
  function loopGeo(w, L){
    const g = new THREE.PlaneGeometry(w, L, 1, 90), p = g.attributes.position, r0 = .055, a = Math.PI*r0/2, half = L/2;
    for (let k = 0; k < p.count; k++){
      const x = p.getX(k), s = L/2 - p.getY(k);
      let Y, Z;
      if (s <= half - a){ Y = -s; Z = r0; }
      else if (s >= half + a){ Y = -(L - s); Z = -r0; }
      else { const th = (s - (half - a))/(2*a)*Math.PI; Y = -(half - a) - r0*Math.sin(th); Z = r0*Math.cos(th); }
      p.setXYZ(k, x, Y - .07, Z);
    }
    g.computeVertexNormals(); return g;
  }
  function relayout(){ const n = items.filter(it => !it.leaving).length; HT = Math.max(2.8, Math.ceil(Math.max(n,1)/COLS)*SY + .7); }
  function kill(it){ root.remove(it.grp); it.mesh.geometry.dispose(); it.mesh.material.map.dispose(); it.mesh.material.dispose(); items.splice(items.indexOf(it), 1); }
  return {
    root, rotLimit:.6,
    hint:'내 팔찌를 펜스에 고리처럼 걸어요 · 누르면 흔들려요',
    label: i => `${SCANS[i] ? SCANS[i].name : '내 팔찌'} · 펜스`,
    add(i, { delay = 0 } = {}){
      const spec = SCANS[i], st = stripOf(spec), p = node(i), R = rng(i + 3);
      const L = clamp(st.aspect*.22, 1.4, 3.4), w = clamp(L/st.aspect, .14, .3);
      const mesh = new THREE.Mesh(loopGeo(w, L), new THREE.MeshStandardMaterial({ map:canvasTex(st.vert), side:THREE.DoubleSide, roughness:.8, alphaTest:.5 }));
      const bead = new THREE.Mesh(beadGeo, beadMat); bead.position.set(0, -.13, 0);
      const grp = new THREE.Group(); grp.add(mesh, bead); root.add(grp);
      grp.rotation.y = (R() - .5)*.3;
      const start = p.y + 4.5 + R(); grp.position.set(p.x, start, 0);
      const it = { i, grp, mesh, s:sp(start), th:0, thv:0, landed:false, delay, leaving:false, ph:R()*6 };
      it.s.t = p.y; items.push(it); relayout();
    },
    remove(instant){
      const L = items.filter(it => !it.leaving), it = L[L.length-1]; if (!it) return;
      if (instant) kill(it); else { it.leaving = true; it.delay = 0; it.s.t = node(it.i).y + 6; }
      relayout();
    },
    replay(){
      const L = items.filter(it => !it.leaving), st = Math.min(.14, 2.4/Math.max(L.length, 1));
      L.forEach((it, k) => { it.s.x = node(it.i).y + 4.5; it.s.v = 0; it.landed = false; it.delay = k*st; });
    },
    update(dt, t){
      H = damp(H, HT, 5, dt);
      fence.scale.y = H; fence.position.y = TOP - H/2;
      const ry = H/TH; wireTex.repeat.set(2*HALF/TW, ry); wireTex.offset.y = Math.ceil(ry) - ry;
      pl.scale.y = pr.scale.y = H + .3; pl.position.y = pr.position.y = TOP - H/2 + .05;
      for (let j = items.length - 1; j >= 0; j--){
        const it = items[j];
        if (it.delay > 0){ it.delay -= dt; continue; }
        const v0 = it.s.v; springStep(it.s, dt, 18, .72);
        if (!it.leaving && !it.landed && it.s.x <= it.s.t + .02){ it.landed = true; it.thv += (it.i % 2 ? 1 : -1)*Math.min(2.2, Math.abs(v0)*.35 + .5); }
        const a = -14*it.th - 1.1*it.thv; it.thv += a*dt; it.th += it.thv*dt;
        it.grp.position.y = it.s.x;
        it.grp.rotation.z = it.th + (RM ? 0 : .025*Math.sin(t*1.2 + it.ph));
        it.grp.rotation.x = RM ? 0 : .05*Math.sin(t*.9 + it.ph);
        if (it.leaving && it.s.x > it.s.t - .1) kill(it);
      }
    },
    view(){ return { center:new THREE.Vector3(0, TOP - HT/2, 0), w:2*HALF + .6, h:HT + .7, elev:.12 }; },
    pick(ray){
      const L = items.filter(it => !it.leaving), hit = ray.intersectObjects(L.map(it => it.grp), true)[0]; if (!hit) return -1;
      const it = L.find(x => { let o = hit.object; while (o){ if (o === x.grp) return true; o = o.parent; } return false; });
      if (!it) return -1; it.thv += RM ? 1 : 3; return it.i;
    },
  };
}

/* ---------- 🖼 액자: 팔찌를 가로로 눕혀 액자에 진열 (14개 넘으면 두 줄) ---------- */
function makeFrameTheme(){
  const root = new THREE.Group(); world.add(root);
  const BL = 2.2, GAP = .16, ROWH = .46, T = .22;
  // 한 줄 3개 → 한 줄 2개 번갈아 (벽돌 배열). 3개 줄의 양 끝은 액자 안쪽에서 잘림
  const slot3 = k => { const r5 = k % 5, row = Math.floor(k/5)*2 + (r5 < 3 ? 0 : 1); return r5 < 3 ? { row, x:(r5 - 1)*(BL + GAP) } : { row, x:(r5 - 3.5)*(BL + GAP) }; };
  const slot2 = k => { const r3 = k % 3, row = Math.floor(k/3)*2 + (r3 < 2 ? 0 : 1); return r3 < 2 ? { row, x:(r3 - .5)*(BL + GAP) } : { row, x:0 }; };
  let PAT = 2;
  const slotOf = k => PAT === 3 ? slot3(k) : slot2(k);
  const innerW = p => p === 3 ? 2.5*BL + 2*GAP : 1.5*BL + GAP;
  const rowsFor = (p, n) => Math.max(3, n ? (p === 3 ? slot3(n - 1) : slot2(n - 1)).row + 1 : 0);
  function pickPat(n){   // 화면(세로/가로) 비율에 더 가까운 배열
    const want = 1/Math.max(.2, camera.aspect), off = p => Math.abs(Math.log(((rowsFor(p, n)*ROWH + .6) + .9)/(innerW(p) + .9)/want));
    return off(2) <= off(3) ? 2 : 3;
  }
  let INNER_W = innerW(PAT);
  const clipBase = [new THREE.Plane(new THREE.Vector3(1,0,0), INNER_W/2), new THREE.Plane(new THREE.Vector3(-1,0,0), INNER_W/2)];
  const clip = clipBase.map(p => p.clone());
  const vc = document.createElement('canvas'); vc.width = vc.height = 128; const vg2 = vc.getContext('2d'), vr = rng(41);
  vg2.fillStyle = '#1a1426'; vg2.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 1400; k++){ vg2.fillStyle = `rgba(${vr() > .5 ? '255,255,255' : '0,0,0'},${.03 + vr()*.05})`; vg2.fillRect(vr()*128, vr()*128, 1.5, 1.5); }
  const velvet = canvasTex(vc); velvet.wrapS = velvet.wrapT = THREE.RepeatWrapping;
  const board = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .06), new THREE.MeshStandardMaterial({ map:velvet, roughness:.95 }));
  board.position.z = -.12; root.add(board);
  const wood = new THREE.MeshStandardMaterial({ color:0x3b2418, roughness:.55 }), gold = new THREE.MeshStandardMaterial({ color:0xD9B45A, metalness:.85, roughness:.3 });
  const boxG = new THREE.BoxGeometry(1, 1, 1);
  const fr = [0,1,2,3].map(() => { const m = new THREE.Mesh(boxG, wood); root.add(m); return m; });
  const fl = [0,1,2,3].map(() => { const m = new THREE.Mesh(boxG, gold); root.add(m); return m; });
  const items = []; let W = 3.8, Hh = 2, WT = 3.8, HT = 2;
  const live = () => items.filter(it => !it.leaving);
  function relayout(){
    const L = live(); PAT = pickPat(L.length); INNER_W = innerW(PAT);
    const rows = rowsFor(PAT, L.length), minH = PAT === 2 ? INNER_W*1.3 : 0;
    const gap = Math.min(ROWH*1.8, Math.max(ROWH, (minH - .6)/rows)), used = rows*gap + .6;
    WT = INNER_W; HT = Math.max(used, minH);
    const top = HT/2 - .5 - (HT - used)/2;
    L.forEach((it, k) => { const s = slotOf(k); it.px = s.x; it.sy.t = top - s.row*gap; });
  }
  function bandGeo(w, ph){
    const g = new THREE.PlaneGeometry(BL, w, 60, 1), p = g.attributes.position;
    for (let k = 0; k < p.count; k++){ const x = p.getX(k); p.setY(k, p.getY(k) + .03*Math.sin(x*1.3 + ph)); p.setZ(k, .02*Math.sin(x*2.2 + ph*2)); }
    g.computeVertexNormals(); return g;
  }
  function kill(it){ root.remove(it.grp); it.mesh.geometry.dispose(); it.mesh.material.map.dispose(); it.mesh.material.dispose(); it.shadow.geometry.dispose(); it.shadow.material.dispose(); items.splice(items.indexOf(it), 1); }
  return {
    root, rotLimit:.5,
    hint:'내 팔찌를 액자에 가로로 눕혀 진열해요 · 누르면 살짝 들려요',
    label: i => `${SCANS[i] ? SCANS[i].name : '내 팔찌'} · 액자`,
    add(i, { delay = 0 } = {}){
      const spec = SCANS[i], st = stripOf(spec), R = rng(i + 23), ph = R()*6;
      const w = clamp(BL/st.aspect, .16, .36);
      const mesh = new THREE.Mesh(bandGeo(w, ph), new THREE.MeshStandardMaterial({ map:canvasTex(horizOf(spec)), side:THREE.DoubleSide, roughness:.8, alphaTest:.5, clippingPlanes:clip }));
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(BL, w), new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:.4, clippingPlanes:clip }));
      shadow.position.set(.04, -.05, -.03);
      const grp = new THREE.Group(); grp.add(shadow, mesh); root.add(grp);
      const it = { i, grp, mesh, shadow, sy:sp(0), sz:sp(1.8), rx:sp(-.9), px:0, x:0, delay, leaving:false, lift:0 };
      it.sz.t = .02; it.rx.t = 0; items.push(it); relayout();
      it.x = it.px; it.sy.x = it.sy.t + 3.2; grp.position.set(it.x, it.sy.x, it.sz.x); grp.rotation.x = it.rx.x;
    },
    remove(instant){
      const L = live(), it = L[L.length-1]; if (!it) return;
      if (instant) kill(it); else { it.leaving = true; it.delay = 0; it.sy.t += 4; it.sz.t = 1.8; it.rx.t = -.9; }
      relayout();
    },
    replay(){
      const L = live(), st = Math.min(.14, 2.4/Math.max(L.length, 1));
      L.forEach((it, k) => { it.sy.x = it.sy.t + 3.2; it.sz.x = 1.8; it.rx.x = -.9; it.sy.v = it.sz.v = it.rx.v = 0; it.delay = k*st; });
    },
    update(dt){
      W = damp(W, WT, 6, dt); Hh = damp(Hh, HT, 6, dt);
      board.scale.set(W, Hh, 1); velvet.repeat.set(W/1.2, Hh/1.2);
      root.updateMatrixWorld();
      clipBase[0].constant = clipBase[1].constant = W/2 - .02;     // 액자 안쪽 테두리에서 자름 (돌려도 같이 돎)
      clip.forEach((p, k) => p.copy(clipBase[k]).applyMatrix4(root.matrixWorld));
      fr[0].scale.set(W + 2*T, T, T); fr[0].position.set(0, Hh/2 + T/2, 0);
      fr[1].scale.set(W + 2*T, T, T); fr[1].position.set(0, -Hh/2 - T/2, 0);
      fr[2].scale.set(T, Hh, T); fr[2].position.set(-W/2 - T/2, 0, 0);
      fr[3].scale.set(T, Hh, T); fr[3].position.set(W/2 + T/2, 0, 0);
      const f = .035;
      fl[0].scale.set(W, f, f); fl[0].position.set(0, Hh/2 - f/2, .02);
      fl[1].scale.set(W, f, f); fl[1].position.set(0, -Hh/2 + f/2, .02);
      fl[2].scale.set(f, Hh, f); fl[2].position.set(-W/2 + f/2, 0, .02);
      fl[3].scale.set(f, Hh, f); fl[3].position.set(W/2 - f/2, 0, .02);
      for (let j = items.length - 1; j >= 0; j--){
        const it = items[j];
        if (it.delay > 0){ it.delay -= dt; continue; }
        springStep(it.sy, dt, 14, .75); springStep(it.sz, dt, 14, .8); springStep(it.rx, dt, 12, .7);
        it.x = damp(it.x, it.px, 6, dt); it.lift *= Math.exp(-dt*2.5);
        it.grp.position.set(it.x, it.sy.x, it.sz.x + it.lift*.25); it.grp.rotation.x = it.rx.x - it.lift*.15;
        if (it.leaving && it.sy.x > it.sy.t - .1) kill(it);
      }
    },
    view(){ return { center:new THREE.Vector3(0, 0, 0), w:WT + .9, h:HT + .9, elev:.06 }; },
    pick(ray){
      const L = live(), hit = ray.intersectObjects(L.map(it => it.mesh))[0]; if (!hit) return -1;
      const it = L.find(x => x.mesh === hit.object); it.lift = 1; return it.i;
    },
  };
}

function bandRingGeo(h, r){   // 팔찌 링: 둘레 = 팔찌 길이, 바깥에서 글자가 바르게 읽힘
  const g = new THREE.CylinderGeometry(r, r, h, 64, 1, true), uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++){ const u = uv.getX(k), v = uv.getY(k); uv.setXY(k, v, 1 - u); }
  return g;
}
function ringMaterial(spec, r, hMin, hMax){
  const st = stripOf(spec), C = 2*Math.PI*r, h = clamp(C/st.aspect, hMin, hMax), reps = Math.max(1, Math.round(C/(h*st.aspect)));
  const map = canvasTex(st.vert); map.wrapT = THREE.RepeatWrapping; map.repeat.set(1, reps);
  return { h, mat:new THREE.MeshStandardMaterial({ map, side:THREE.DoubleSide, roughness:.8, alphaTest:.5 }) };
}

/* ---------- 🫙 유리병: 팔찌 링이 떨어져 병 안에 쌓임 (한 층 7개) ---------- */
function makeJarTheme(){
  const root = new THREE.Group(); world.add(root);
  const R = 1.25, PER = 7, LH = .27, RR = .31;
  const glass = new THREE.MeshPhysicalMaterial({ color:0xE8F1FF, transparent:true, opacity:.13, roughness:.06, metalness:0, side:THREE.DoubleSide, depthWrite:false, clearcoat:1 });
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1, 64, 1, true), glass);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(R, 64), glass); bottom.rotation.x = -Math.PI/2; bottom.position.y = .005;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, .045, 12, 72), new THREE.MeshStandardMaterial({ color:0xffffff, transparent:true, opacity:.55, roughness:.2 }));
  rim.rotation.x = Math.PI/2;
  const coaster = new THREE.Mesh(new THREE.CylinderGeometry(R + .18, R + .22, .1, 64), new THREE.MeshStandardMaterial({ color:0x3b2418, roughness:.55 }));
  coaster.position.y = -.05;
  // 병 앞 라벨 (FestLock 자물쇠)
  const lc = document.createElement('canvas'); lc.width = 256; lc.height = 128; const lg = lc.getContext('2d'), LG = goldPaint(lg, 0, 0, 256, 128);
  lg.fillStyle = '#17122E'; lg.beginPath(); lg.roundRect(0, 0, 256, 128, 18); lg.fill();
  lg.strokeStyle = LG; lg.lineWidth = 3; lg.beginPath(); lg.roundRect(7, 7, 242, 114, 13); lg.stroke();
  lockGlyph(lg, 52, 52, 40, LG, '#17122E');
  lg.fillStyle = '#F6F1FF'; lg.font = `800 26px ${PRET}`; lg.textBaseline = 'middle'; lg.fillText('MY FEST', 92, 50);
  lg.font = `600 15px ${PRET}`; lg.fillStyle = '#D9B45A'; lg.fillText('JAR · 2026', 92, 82);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(R + .01, R + .01, .55, 48, 1, true, -.55, 1.1),
    new THREE.MeshStandardMaterial({ map:canvasTex(lc), roughness:.6, transparent:true, alphaTest:.5 }));
  root.add(coaster, bottom, jar, rim, label);
  const items = []; let Hj = 2.2, HjT = 2.2;
  const live = () => items.filter(it => !it.leaving);
  function slot(k){
    const layer = Math.floor(k/PER), s = k % PER, R2 = rng(k + 77);
    let x = 0, z = 0;
    if (s > 0){ const a = (s - 1)/6*Math.PI*2 + layer*.55; x = Math.cos(a)*.68; z = Math.sin(a)*.68; }
    return { x:x + (R2()-.5)*.08, z:z + (R2()-.5)*.08, y:.22 + layer*LH + (R2()-.5)*.06,
      rx:(R2()-.5)*1.0, ry:R2()*Math.PI*2, rz:(R2()-.5)*1.0 };
  }
  function relayout(){
    const L = live(), layers = Math.ceil(Math.max(L.length, 1)/PER);
    HjT = Math.max(2.2, layers*LH + 1.0);
    L.forEach((it, k) => { const s = slot(k); it.t = s; it.s.t = s.y; });
  }
  function kill(it){ root.remove(it.mesh); it.mesh.geometry.dispose(); it.mesh.material.map.dispose(); it.mesh.material.dispose(); items.splice(items.indexOf(it), 1); }
  return {
    root, rotLimit:1.4,
    hint:'내 팔찌가 유리병 안으로 떨어져 쌓여요 · 누르면 통 튀어요',
    label: i => `${SCANS[i] ? SCANS[i].name : '내 팔찌'} · 유리병`,
    add(i, { delay = 0 } = {}){
      const spec = SCANS[i], R2 = rng(i + 5), { h, mat } = ringMaterial(spec, RR, .1, .26);
      const mesh = new THREE.Mesh(bandRingGeo(h, RR), mat); root.add(mesh);
      const it = { i, mesh, s:sp(0), rx:sp((R2()-.5)*6), ry:sp(R2()*6), rz:sp((R2()-.5)*6), x:0, z:0, t:null, delay, leaving:false };
      items.push(it); relayout();
      it.s.x = HjT + 2.4 + R2(); it.rx.t = it.t.rx; it.ry.t = it.t.ry; it.rz.t = it.t.rz;
      mesh.position.set(0, it.s.x, 0);
    },
    remove(instant){
      const L = live(), it = L[L.length-1]; if (!it) return;
      if (instant) kill(it); else { it.leaving = true; it.delay = 0; it.s.t = HjT + 4; }
      relayout();
    },
    replay(){
      const L = live(), st = Math.min(.12, 2.4/Math.max(L.length, 1));
      L.forEach((it, k) => { it.s.x = HjT + 2.4; it.s.v = 0; it.x = 0; it.z = 0; it.delay = k*st; it.rx.x += 3; it.rz.x -= 3; });
    },
    update(dt){
      Hj = damp(Hj, HjT, 5, dt);
      jar.scale.y = Hj; jar.position.y = Hj/2; rim.position.y = Hj; label.position.y = Math.min(Hj*.45, 1.1);
      for (let j = items.length - 1; j >= 0; j--){
        const it = items[j];
        if (it.delay > 0){ it.delay -= dt; continue; }
        springStep(it.s, dt, 20, .55);
        [it.rx, it.ry, it.rz].forEach(s => springStep(s, dt, 7, .8));
        // 병 입구 위에서는 가운데로, 안으로 들어오면 제자리로
        const inside = it.s.x < Hj;
        const tx = it.leaving || !inside ? 0 : it.t.x, tz = it.leaving || !inside ? 0 : it.t.z;
        it.x = damp(it.x, tx, 5, dt); it.z = damp(it.z, tz, 5, dt);
        it.mesh.position.set(it.x, it.s.x, it.z);
        it.mesh.rotation.set(it.rx.x, it.ry.x, it.rz.x);
        if (it.leaving && it.s.x > it.s.t - .1) kill(it);
      }
    },
    view(){ return { center:new THREE.Vector3(0, HjT/2, 0), w:2*R + 1.1, h:HjT + 1.3, elev:.42 }; },
    pick(ray){
      const L = live(), hit = ray.intersectObjects(L.map(it => it.mesh))[0]; if (!hit) return -1;
      const it = L.find(x => x.mesh === hit.object); it.s.v += RM ? 1 : 5; it.ry.x += Math.PI*2; return it.i;
    },
  };
}

/* ---------- 🎠 모빌: 금색 고리 층마다 팔찌 15개가 빙 둘러 매달려 천천히 돎 ---------- */
function makeMobileTheme(){
  const root = new THREE.Group(); world.add(root);
  const spin = new THREE.Group(); root.add(spin);
  const PER = 15, RAD = 1.55, TIER = 2.7, SEG = 30;
  /* 고리 반지름: 1개면 작게(.42), 팔찌가 늘수록 둘레가 팔찌 사이 간격만큼 커짐 (최대 1.55) */
  const RMIN = .42, radOf = n => clamp(n*.62/(Math.PI*2), RMIN, RAD);
  const gold = new THREE.MeshStandardMaterial({ color:0xD9B45A, metalness:.85, roughness:.3 });
  const hoopGeo = new THREE.TorusGeometry(RAD, .035, 10, 96), hubGeo = new THREE.SphereGeometry(.07, 16, 12);
  const cordMat = new THREE.LineBasicMaterial({ color:0xD9B45A, transparent:true, opacity:.75 });
  const tiers = [], items = [];
  const live = () => items.filter(it => !it.leaving);
  function ensureTier(k){
    while (tiers.length <= k){
      const t = tiers.length, g = new THREE.Group(); g.position.y = -t*TIER;
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(RMIN, .035, 10, 48), gold); hoop.rotation.x = Math.PI/2;
      const hub = new THREE.Mesh(hubGeo, gold); hub.position.y = .9;
      const pts = [];
      for (let a = 0; a < 4; a++){ const th = a*Math.PI/2 + .4; pts.push(new THREE.Vector3(0, .9, 0), new THREE.Vector3(Math.cos(th)*RAD, 0, Math.sin(th)*RAD)); }
      pts.push(new THREE.Vector3(0, .9, 0), new THREE.Vector3(0, t ? TIER : 2.2, 0));   // 위층(또는 천장)으로 이어지는 줄
      const cords = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), cordMat);
      g.add(hoop, hub, cords); g.scale.setScalar(.001); spin.add(g);
      tiers.push({ g, hoop, cords, show:0, showT:1, rad:RMIN, radT:RMIN, built:-1 }); shape(tiers[tiers.length - 1]);
    }
  }
  /** 고리와 고리를 매단 줄을 지금 반지름으로 다시 만든다 */
  function shape(tr){
    tr.hoop.geometry.dispose();
    tr.hoop.geometry = new THREE.TorusGeometry(tr.rad, .035, 10, Math.round(40 + 56*tr.rad/RAD)); tr.built = tr.rad;
    const p = tr.cords.geometry.attributes.position;
    for (let a = 0; a < 4; a++){ const th = a*Math.PI/2 + .4; p.setXYZ(a*2 + 1, Math.cos(th)*tr.rad, 0, Math.sin(th)*tr.rad); }
    p.needsUpdate = true; tr.cords.geometry.computeBoundingSphere();
  }
  function relayout(){
    const L = live(), nt = Math.max(1, Math.ceil(L.length/PER)); ensureTier(nt - 1);
    tiers.forEach((t, k) => { t.radT = radOf(Math.max(1, Math.min(PER, L.length - k*PER))); });
    tiers.forEach((t, k) => { t.showT = k < nt ? 1 : 0; });
    L.forEach((it, k) => {
      const tier = Math.floor(k/PER), n = Math.min(PER, L.length - tier*PER), a = (k % PER)/n*Math.PI*2 + tier*.21;
      if (it.a === null) it.a = a; it.aT = a; it.tier = tier; it.s.t = -tier*TIER;
    });
  }
  function deform(it, t){
    const a = it.mesh.geometry.attributes.position.array, b = it.base, amp = (RM ? .4 : 1)*(1 + it.flutter);
    for (let k = 0; k < a.length; k += 3){
      const bx = b[k], by = b[k+1], v = clamp(-by/it.L, 0, 1);
      a[k] = bx; a[k+1] = by;
      a[k+2] = .1*amp*Math.pow(v, 1.4)*Math.sin(t*1.6 + v*3 + it.ph) + bx*v*.25*amp*Math.sin(t*1.1 + it.ph);
    }
    it.mesh.geometry.attributes.position.needsUpdate = true; it.mesh.geometry.computeVertexNormals();
  }
  function kill(it){ spin.remove(it.mesh); it.mesh.geometry.dispose(); it.mesh.material.map.dispose(); it.mesh.material.dispose(); items.splice(items.indexOf(it), 1); }
  return {
    root, rotLimit:.4, free360:true,
    hint:'좌우로 끌면 360도 돌아가요 · 15개마다 한 층씩 늘어나요',
    label: i => `${SCANS[i] ? SCANS[i].name : '내 팔찌'} · 모빌`,
    add(i, { delay = 0 } = {}){
      const spec = SCANS[i], st = stripOf(spec);
      const L = clamp(st.aspect*.2, 1.2, 2.2), w = clamp(L/st.aspect, .12, .28);
      const geo = new THREE.PlaneGeometry(w, L, 4, SEG); geo.translate(0, -L/2, 0);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map:canvasTex(st.vert), side:THREE.DoubleSide, roughness:.8, alphaTest:.5 }));
      spin.add(mesh);
      const it = { i, mesh, L, base:Float32Array.from(geo.attributes.position.array), s:sp(0), a:null, aT:0, tier:0, flutter:0, ph:i*1.3, delay, leaving:false };
      items.push(it); relayout();
      it.s.x = it.s.t + 3.5; mesh.position.set(Math.sin(it.a)*tiers[it.tier].rad, it.s.x, Math.cos(it.a)*tiers[it.tier].rad); mesh.rotation.y = it.a;
    },
    remove(instant){
      const L = live(), it = L[L.length-1]; if (!it) return;
      if (instant) kill(it); else { it.leaving = true; it.delay = 0; it.s.t += 5; }
      relayout();
    },
    replay(){
      const L = live(), st = Math.min(.12, 2.4/Math.max(L.length, 1));
      L.forEach((it, k) => { it.s.x = it.s.t + 3.5; it.s.v = 0; it.delay = k*st; });
    },
    update(dt, t){
      spin.rotation.y += RM ? 0 : dt*.22;
      tiers.forEach(tr => { tr.show = damp(tr.show, tr.showT, 6, dt); tr.g.scale.setScalar(Math.max(.001, tr.show)); tr.g.visible = tr.show > .02; tr.rad = damp(tr.rad, tr.radT, 5, dt); if (Math.abs(tr.rad - tr.built) > .008) shape(tr); });
      for (let j = items.length - 1; j >= 0; j--){
        const it = items[j];
        if (it.delay > 0){ it.delay -= dt; continue; }
        springStep(it.s, dt, 15, .62); it.a = damp(it.a, it.aT, 5, dt);
        it.flutter = Math.max(it.flutter*Math.exp(-dt*1.6), Math.min(1.4, Math.abs(it.s.v)*.25));
        it.mesh.position.set(Math.sin(it.a)*tiers[it.tier].rad, it.s.x, Math.cos(it.a)*tiers[it.tier].rad); it.mesh.rotation.y = it.a;
        deform(it, t);
        if (it.leaving && it.s.x > it.s.t - .1) kill(it);
      }
    },
    view(){
      const nt = Math.max(1, tiers.filter(t => t.showT > 0).length);
      const top = 1.3, bot = -(nt - 1)*TIER - 2.4;
      return { center:new THREE.Vector3(0, (top + bot)/2, 0), w:2*Math.max(RMIN, ...tiers.filter(t => t.showT > 0).map(t => t.radT)) + 1.4, h:top - bot, elev:.2 };
    },
    pick(ray){
      const L = live(), hit = ray.intersectObjects(L.map(it => it.mesh))[0]; if (!hit) return -1;
      const it = L.find(x => x.mesh === hit.object); it.flutter = RM ? .6 : 2.4; return it.i;
    },
  };
}

/* ================= 테마 · 카메라 · 조작 ================= */
const THEMES = [
  { id:'scan',  label:'🎀 걸기',     make:() => makeRibbonTheme('scan') },
  { id:'wrist', label:'⭕ 손목',     make:makeWristTheme },
  { id:'mobile', label:'🎠 모빌',   make:makeMobileTheme },
  { id:'frame',  label:'🖼 액자',   make:makeFrameTheme },
];
let theme = null, themeId = 'scan', n = 0;
let EXAMPLES = [];   // 빠르게 채우기용 예시 팔찌 (예시 사진에서 만든 6개)
const cam = { center:new THREE.Vector3(0,-1,0), dist:10, elev:.1, zoom:1, pan:new THREE.Vector2() };
let rotY = 0, rotTarget = 0, rotVel = 0;
/* ================= 앱 연결 (시안의 탭·버튼·예시 사진 대신 — scripts/make-band-engine.mjs 가 끼워 넣는다) =================
   시안과 같은 동작: 끌기(확대 전엔 돌리기, 확대 후엔 이동) · 두 손가락 확대 · 탭으로 고르기 · 손목·모빌은 360도 관성 회전
   다른 점: 페이지 안에 들어가므로 확대 전에는 세로로 밀면 페이지가 내려가게(touch-action: pan-y) 했다. */
let disposed = false, raf = 0, lastNav = '';
let toastTimer = 0;
function toast(msg){
  const sh = document.getElementById('scanSheet'), el = document.getElementById('scanToast');
  if (el && sh && !sh.hidden){   // 팔찌 만들기 화면이 열려 있으면 그 위에 띄운다
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
    return;
  }
  if (hooks.onToast) hooks.onToast(msg);
}
const isScanTab = () => true;           // 모든 탭이 같은 팔찌 목록을 씀
const countNow = () => SCANS.length;
function navState(){ return theme && theme.nav ? { label: theme.nav.label(), canPrev: theme.nav.canPrev(), canNext: theme.nav.canNext() } : null; }
function refreshUI(){ if (hooks.onState) hooks.onState({ count: countNow(), theme: themeId, nav: navState() }); }
function refreshNav(){
  if (!theme || !theme.nav) return;
  const s = theme.nav.label() + '|' + theme.nav.canPrev() + '|' + theme.nav.canNext();
  if (s !== lastNav){ lastNav = s; refreshUI(); }
}
function setTheme(id){
  if (!THEMES.some(t => t.id === id)) id = 'scan';
  if (theme){ disposeTree(theme.root); world.remove(theme.root); }
  themeId = id; theme = THEMES.find(t => t.id === id).make();
  cam.zoom = 1; cam.pan.set(0,0); rotTarget = 0; rotY = 0; rotVel = 0;
  const cnt = countNow(), st = Math.min(isScanTab() ? .3 : .12, 2.4/Math.max(cnt,1));
  for (let i = 0; i < cnt; i++) theme.add(i, { delay:.15 + i*st, instant: i < cnt - 2 });
  const v = theme.view(); cam.center.copy(v.center); cam.elev = v.elev;
  lastNav = ''; refreshUI();
}
/* 화면을 열거나 탭을 바꿀 때: 팔찌들이 위에서 내려오는 등장 모션 (모션 줄이기면 바로 보임) */
function show(id){ setTheme(id); if (!RM && theme.replay) theme.replay(); }

/* ---------- 앱의 팔찌 기록 → 시안의 팔찌 모양(spec) ---------- */
const inkFor = bg => contrastInk(bg) === '#FFFFFF' ? '#F6F1E6' : '#241C14';
function goldSpec(d, i){   // 금사 디자인: 사진에서 뽑은 색(pal)으로 FestLock 오리지널 무늬를 입힘
  const gp = GPALS[i % GPALS.length];
  const bg = (d.pal && /^#[0-9a-fA-F]{6}$/.test(d.pal[0] || '')) ? d.pal[0] : gp.bg, ink = inkFor(bg);
  return { kind:'band', style:'gold', name:d.name || '', sub:d.sub || '', year:String(d.year || ''), gold:{ bg, ink },
    pal:{ bg, fg:ink, accent:'#D9B45A', tag:bg, tagInk:ink }, seed:i + 7, L:2.7 };
}
function loadImg(src){
  return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
}
async function photoSpec(d, i){   // 사진 그대로: 올린 가로 띠 이미지를 세로 리본 텍스처로 (시안의 makeScan 마지막 단계와 같음)
  const im = await loadImg(d.img);
  const w0 = im.naturalWidth || 600, h0 = im.naturalHeight || 100, s = Math.min(1, 1024/Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.max(16, Math.round(w0*s)); c.height = Math.max(12, Math.round(h0*s));
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return { kind:'photo', name:d.name || '', canvas: ribbonCanvas(c, i + 1), aspect: c.width/c.height };
}

/* ---------- 끌기·확대·탭 (시안과 같음) ---------- */
const canvas = renderer.domElement, pointers = new Map(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const FULL = !!hooks.full;   // 전체 화면(시안과 같음): 페이지 스크롤이 없으므로 모든 손동작을 3D 가 받는다
canvas.style.touchAction = FULL ? 'none' : 'pan-y';
let gesture = null;
function syncTouch(){ if (FULL) return; const v = cam.zoom > 1.05 ? 'none' : 'pan-y'; if (canvas.style.touchAction !== v) canvas.style.touchAction = v; }
canvas.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, { x:e.clientX, y:e.clientY }); try { canvas.setPointerCapture(e.pointerId); } catch {} canvas.classList.add('grabbing');
  if (pointers.size === 1){ gesture = { type:'drag', sx:e.clientX, sy:e.clientY, lx:e.clientX, ly:e.clientY, moved:false, r0:rotTarget }; rotVel = 0; }
  else if (pointers.size === 2){ const [a,b] = [...pointers.values()]; gesture = { type:'pinch', d0:Math.hypot(a.x-b.x, a.y-b.y), z0:cam.zoom }; }
});
canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });
  if (gesture.type === 'pinch' && pointers.size === 2){
    const [a,b] = [...pointers.values()]; cam.zoom = clamp(gesture.z0*Math.hypot(a.x-b.x, a.y-b.y)/gesture.d0, 1, 8); syncTouch(); return;
  }
  if (gesture.type !== 'drag') return;
  if (Math.abs(e.clientX - gesture.sx) > 6 || Math.abs(e.clientY - gesture.sy) > 6) gesture.moved = true;
  if (cam.zoom > 1.05){
    const wpp = 2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*cam.dist/Math.max(1, stage.clientHeight);
    cam.pan.x -= (e.clientX - gesture.lx)*wpp; cam.pan.y += (e.clientY - gesture.ly)*wpp;
  } else {
    const lim = theme ? theme.rotLimit : .6;
    if (theme && theme.free360){   // 손목·모빌: 제한 없이 360도, 놓으면 관성으로 조금 더 돎
      const now = performance.now(), dtm = Math.max(1, now - (gesture.lt || now - 16));
      rotVel = clamp((e.clientX - gesture.lx)*.006/(dtm/1000), -8, 8); gesture.lt = now;
      rotTarget = gesture.r0 + (e.clientX - gesture.sx)*.006;
    } else rotTarget = clamp(gesture.r0 + (e.clientX - gesture.sx)*.006, -lim, lim);
  }
  gesture.lx = e.clientX; gesture.ly = e.clientY;
});
function endPointer(e){
  const tap = gesture && gesture.type === 'drag' && !gesture.moved && pointers.size === 1;
  pointers.delete(e.pointerId);
  if (pointers.size === 0){ gesture = null; canvas.classList.remove('grabbing'); }
  else if (gesture && gesture.type === 'pinch') gesture = null;
  if (!tap || !theme) return;
  const rect = canvas.getBoundingClientRect();
  ndc.set(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
  ray.setFromCamera(ndc, camera);
  const fi = theme.pick(ray);
  if (fi >= 0 && hooks.onPick) hooks.onPick(fi);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => {
  if (!FULL && !e.ctrlKey && cam.zoom <= 1.001 && e.deltaY > 0) return;   // (페이지 안일 때) 확대 안 한 상태에서 아래로 굴리면 페이지가 내려가게
  e.preventDefault(); cam.zoom = clamp(cam.zoom*Math.exp(-e.deltaY*.0015), 1, 8); syncTouch();
}, { passive:false });

function resize(){
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix();
}
const ro = new ResizeObserver(resize); ro.observe(stage); resize();

const X = new THREE.Vector3(1,0,0), up = new THREE.Vector3(), dir = new THREE.Vector3(), look = new THREE.Vector3();
function updateCamera(dt){
  const v = theme.view(), tv = Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const fit = Math.max((v.h/2)/tv, (v.w/2)/(tv*camera.aspect))*1.05;
  const k = 1 - Math.exp(-dt*3.5);
  cam.center.lerp(v.center, k); cam.elev += (v.elev - cam.elev)*k;
  cam.dist = damp(cam.dist, fit/cam.zoom, 6, dt);
  const mx = v.w/2*(1 - 1/cam.zoom), my = v.h/2*(1 - 1/cam.zoom);
  cam.pan.x = clamp(cam.pan.x, -mx, mx); cam.pan.y = clamp(cam.pan.y, -my, my);
  dir.set(0, Math.sin(cam.elev), Math.cos(cam.elev)); up.set(0, Math.cos(cam.elev), -Math.sin(cam.elev));
  look.copy(cam.center).addScaledVector(X, cam.pan.x).addScaledVector(up, cam.pan.y);
  camera.position.copy(look).addScaledVector(dir, cam.dist); camera.lookAt(look);
}

const clock = new THREE.Clock(); let frame = 0;
function tick(){
  if (disposed) return;
  raf = requestAnimationFrame(tick);
  if (!theme) return;
  const dt = Math.min(clock.getDelta(), 1/30), t = clock.elapsedTime;
  theme.update(dt, t);
  if (!gesture){
    if (theme.free360){ if (!RM){ rotTarget += rotVel*dt; } rotVel *= Math.exp(-dt*2.2); }
    else rotTarget *= Math.exp(-dt*.6);
  }
  rotY = damp(rotY, rotTarget, 8, dt);
  world.rotation.y = rotY + (RM ? 0 : Math.sin(t*.35)*.05);
  updateCamera(dt);
  renderer.render(scene, camera);
  if ((frame++ & 7) === 0) refreshNav();
}

const fontsReady = Promise.race([
  Promise.all(['900 40px Montserrat','700 20px "Space Mono"','800 20px Pretendard','600 20px Pretendard','800 20px "Noto Sans KR"'].map(f => document.fonts.load(f))),
  new Promise(res => setTimeout(res, 1500)),
]).catch(() => {});

/** 팔찌 목록을 걸고(최대 60개) 진열을 시작한다. designs: { style, img, pal, name, sub, year } */
async function load(designs, startTheme){
  const list = (designs || []).slice(0, MAX);
  const specs = await Promise.all(list.map((d, i) => d.style === 'photo' && d.img ? photoSpec(d, i).catch(() => goldSpec(d, i)) : Promise.resolve(goldSpec(d, i))));
  await fontsReady;
  if (disposed) return;
  SCANS.length = 0; specs.forEach(s => SCANS.push(s));
  show(startTheme || themeId);
  if (!raf) tick();
}

/* ================= 팔찌 만들기(스캔) — 시안 스캔 코드에 앱을 잇는다 (scripts/make-band-engine.mjs 가 앱 연결부 뒤에 끼워 넣는다) =================
   티켓 정보(페스티벌·연도·등급·날짜) → 같은 티켓의 첫 디자인이 있으면 그대로 담기, 없으면 사진으로 만들어 "리본으로 걸기".
   저장(서버·기기)은 React 쪽 hooks.onScan / hooks.onUseExisting 이 한다. 여기서는 3D 에 거는 일만. */
let samplePromise = null;
function loadSample(){ return samplePromise || (samplePromise = loadImg(hooks.sampleSrc || '/band/sample-bands.jpg').then(img => (samplePhoto = photoFrom(img)))); }
const $id = id => document.getElementById(id);
const tk = { grade:'ga', day:'day1' };
function chipGroup(id, key, etcId){
  $id(id).addEventListener('click', e => {
    const b = e.target.closest('button[data-v]'); if (!b) return;
    tk[key] = b.dataset.v;
    [...$id(id).children].forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $id(etcId).hidden = b.dataset.v !== 'etc';
    syncTicket();
  });
}
chipGroup('tkGrade', 'grade', 'tkGradeEtc'); chipGroup('tkDay', 'day', 'tkDayEtc');
const festOf = slug => (hooks.fests || []).find(x => x.slug === slug);
$id('tkFest').addEventListener('change', () => {
  const v = $id('tkFest').value, f = festOf(v);
  $id('scanName').hidden = v !== '__etc';
  if (f){ $id('scanName').value = f.band || f.name; if (f.year) $id('tkYear').value = f.year; }
  else if (v === '__etc') $id('scanName').value = '';
  syncTicket(); drawDesign();
});
['scanName', 'tkYear', 'tkGradeEtc', 'tkDayEtc'].forEach(id => $id(id).addEventListener('input', () => { syncTicket(); drawDesign(); }));
/** 시안의 예시 사진 프리셋을 고르면 직접 입력으로 이름을 채운다 */
function ticketCustom(name){
  $id('tkFest').value = '__etc'; $id('scanName').hidden = false; $id('scanName').value = name;
  const y = (String(name).match(/(?:19|20)\d{2}/) || [])[0]; if (y) $id('tkYear').value = y;
  syncTicket();
}
function slugify(s){
  const a = String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (a) return a;
  let h = 0; for (const c of String(s)) h = (h*31 + c.codePointAt(0)) >>> 0;
  return 'x' + h.toString(36);
}
const trimSlug = (s, n) => s.slice(0, n).replace(/-+$/, '') || 'x';
function readTicket(){
  const fv = $id('tkFest').value, custom = fv === '__etc', f = festOf(fv);
  const fest = custom ? $id('scanName').value.trim() : (f ? f.name : '');
  if (!fv || !fest) return { ok:false, msg:TX('scan.tk.needFest','페스티벌을 골라 주세요') };
  const year = parseInt($id('tkYear').value, 10);
  if (!(year >= 2000 && year <= 2100)) return { ok:false, msg:TX('scan.tk.needYear','연도를 확인해 주세요') };
  let slug = custom ? slugify(fest) : fv; if (!/^[a-z]/.test(slug)) slug = 'x' + slug; slug = trimSlug(slug, 40);
  const ge = $id('tkGradeEtc').value.trim(), de = $id('tkDayEtc').value.trim();
  if (tk.grade === 'etc' && !ge) return { ok:false, msg:TX('scan.tk.needGrade','등급을 적어 주세요') };
  if (tk.day === 'etc' && !de) return { ok:false, msg:TX('scan.tk.needDay','날짜를 적어 주세요') };
  const grade = tk.grade === 'etc' ? 'etc-' + trimSlug(slugify(ge), 20) : tk.grade;
  const day = tk.day === 'etc' ? 'etc-' + trimSlug(slugify(de), 20) : tk.day;
  const band = custom ? fest : (f.band || fest);
  return { ok:true, key:`${slug}:${year}:${grade}:${day}`, slug, fest, band, year, grade, day,
    gradeLabel: tk.grade === 'etc' ? ge : tk.grade.toUpperCase(),
    dayLabel: tk.day === 'etc' ? de : tk.day === 'full3' ? TX('scan.tk.full','전일권') : 'Day ' + tk.day.slice(3) };
}
let lookSeq = 0, existing = null;
async function syncTicket(){
  const t = readTicket(), note = $id('tkNote'), box = $id('tkExist');
  existing = null; box.hidden = true;
  if (!t.ok){ note.textContent = ''; return; }
  const seq = ++lookSeq; note.textContent = TX('scan.tk.checking','확인하는 중…');
  let d = null; try { d = hooks.lookup ? await hooks.lookup(t.key) : null; } catch {}
  if (seq !== lookSeq) return;
  if (d){
    existing = { t, d };
    note.textContent = d.byName ? TX('scan.tk.existBy','{name}님이 처음 등록한 디자인이 있어요').replace('{name}', d.byName) : TX('scan.tk.exist','처음 등록된 디자인이 있어요');
    $id('tkExistImg').src = d.img; $id('tkExistImg').alt = t.fest; box.hidden = false;
  } else note.textContent = TX('scan.tk.first','당신이 처음 등록하는 거예요! 당신이 찍은 팔찌를 다른 사람들도 쓰게 될 거예요!');
}
function specOf(d){ const i = SCANS.length; return d.style === 'photo' && d.img ? photoSpec(d, i).catch(() => goldSpec(d, i)) : Promise.resolve(goldSpec(d, i)); }
function hang(spec, name){
  closeScan(); SCANS.push(spec); theme.add(SCANS.length - 1); refreshUI();
  toast(`${name} · ${TX('scan.hung','리본으로 걸었어요')}`);
}
let busy = false;
function setBusy(on){ busy = on; ['scanDone', 'tkUse'].forEach(id => { const b = $id(id); if (b) b.disabled = on; }); }
const failMsg = r => (r && r.message) || TX('scan.fail','저장하지 못했어요. 잠시 뒤 다시 해 주세요');
$id('tkUse').addEventListener('click', async () => {
  if (busy || !existing) return;
  if (SCANS.length >= MAX){ toast(TX('scan.max','60개까지 걸 수 있어요')); return; }
  setBusy(true);
  try {
    const { t, d } = existing;
    const r = hooks.onUseExisting ? await hooks.onUseExisting(t, d) : { ok:true };
    if (!r || !r.ok){ if (!r || !r.silent) toast(failMsg(r)); return; }
    if (r.reload){ closeScan(); return; }
    hang(await specOf({ ...d, name: t.band.toUpperCase(), year: t.year }), t.fest);
  } finally { setBusy(false); }
});
$id('scanDone').addEventListener('click', async () => {
  if (busy) return;
  const miss = missing();
  if (miss.length){ flagMissing(miss); return; }
  const t = readTicket();
  if (!t.ok){ toast(t.msg); return; }
  if (SCANS.length >= MAX){ toast(TX('scan.max','60개까지 걸 수 있어요')); return; }
  const label = t.band.toUpperCase();
  let spec, up, style, pal;
  if (makeMode === 'band'){
    if (!extracted) extracted = extractPalette(warpStrip(photo, quad, flipped, 400));
    spec = currentDesign(); spec.name = label; spec.year = String(t.year);
    up = horizOf(spec); style = 'design'; pal = [spec.pal.bg, spec.pal.fg, spec.pal.accent];
  } else {
    let s = warpStrip(photo, quad, flipped); applyBlurs(s, blurs); if (enhanceOn) s = enhanceStrip(s);
    spec = { kind:'photo', name:label, canvas: ribbonCanvas(s, SCANS.length + 1), aspect: s.width/s.height };
    const e = extractPalette(s); up = s; style = 'photo'; pal = [e.bg, e.fg, e.accent];
  }
  setBusy(true);
  try {
    const r = hooks.onScan ? await hooks.onScan({ ticket:t, style, pal, canvas: up }) : { ok:true };
    if (!r || !r.ok){ if (!r || !r.silent) toast(failMsg(r)); return; }
    if (r.reload){ closeScan(); return; }
    if (r.exists && r.design) spec = await specOf({ ...r.design, name: label, year: t.year });
    hang(spec, t.fest);
  } finally { setBusy(false); }
});
/* ---------- 못 채운 곳: 빨간 테두리로 깜빡여 알려 주고, 채우면 바로 끈다 ---------- */
function missing(){
  const m = [];
  if (!photo) m.push($id('photoBox'));
  const fv = $id('tkFest').value;
  if (!fv) m.push($id('tkFest'));
  else if (fv === '__etc' && !$id('scanName').value.trim()) m.push($id('scanName'));
  const y = parseInt($id('tkYear').value, 10); if (!(y >= 2000 && y <= 2100)) m.push($id('tkYear'));
  if (tk.grade === 'etc' && !$id('tkGradeEtc').value.trim()) m.push($id('tkGradeEtc'));
  if (tk.day === 'etc' && !$id('tkDayEtc').value.trim()) m.push($id('tkDayEtc'));
  if (!$id('tkAgree').checked) m.push($id('tkAgree').closest('label'));
  return m;
}
function flagMissing(m){
  scanRoot.querySelectorAll('.need').forEach(e => e.classList.remove('need'));
  m.forEach(e => { void e.offsetWidth; e.classList.add('need'); });   // 다시 누르면 다시 깜빡이게
  m[0].scrollIntoView({ block:'center', behavior: RM ? 'auto' : 'smooth' });
  toast(TX('scan.needFill','빨간색으로 표시한 곳을 채워 주세요'));
}
const unflag = el => { if (el) el.classList.remove('need'); };
$id('tkFest').addEventListener('change', () => { unflag($id('tkFest')); unflag($id('scanName')); });
['scanName', 'tkYear', 'tkGradeEtc', 'tkDayEtc'].forEach(id => $id(id).addEventListener('input', () => unflag($id(id))));
$id('tkAgree').addEventListener('change', () => unflag($id('tkAgree').closest('label')));
$id('fileIn').addEventListener('change', () => unflag($id('photoBox')));
$id('useSample').addEventListener('click', () => unflag($id('photoBox')));
['tkGrade', 'tkDay'].forEach(id => $id(id).addEventListener('click', () => { unflag($id(id + 'Etc')); }));

const onResize = () => { if (!sheet.hidden) layoutPhoto(); };
addEventListener('resize', onResize);
function openScanApp(){ sheet.hidden = false; document.body.style.overflow = 'hidden'; layoutPhoto(); syncTicket(); }

/* ---------- 공유용 그림: 지금 진열을 원하는 크기(예: 1080×1920)로 한 장 그린다 ---------- */
function snapshot(w, h){
  const pr = renderer.getPixelRatio();
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix();
  for (let i = 0; i < 40; i++) updateCamera(1/20);   // 카메라를 새 비율에 맞춘 자리로 바로 옮김
  renderer.render(scene, camera);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(renderer.domElement, 0, 0, w, h);
  renderer.setPixelRatio(pr); resize();
  return c;
}


return {
  load,
  setTheme: show,
  /** 팔찌 만들기(스캔) 화면 열기 */
  openScan: openScanApp,
  /** 지금 진열을 w×h 그림(canvas)으로 — 인스타 스토리 9:16 공유용 */
  snapshot,
  /** 지금 진열에 걸린 팔찌 수 (테스트·화면 확인용) */
  count: () => SCANS.length,
  replay(){ if (theme && theme.replay) theme.replay(); },
  zoomIn(){ cam.zoom = clamp(cam.zoom*1.5, 1, 8); syncTouch(); },
  zoomOut(){ cam.zoom = clamp(cam.zoom/1.5, 1, 8); syncTouch(); },
  fit(){ cam.zoom = 1; cam.pan.set(0,0); rotTarget = 0; syncTouch(); },
  prev(){ if (theme && theme.nav) theme.nav.prev(); },
  next(){ if (theme && theme.nav) theme.nav.next(); },
  dispose(){
    disposed = true; cancelAnimationFrame(raf); ro.disconnect();
    removeEventListener('resize', onResize); scanRoot.remove();
    if (!sheet.hidden) document.body.style.overflow = '';
    if (theme){ disposeTree(theme.root); world.remove(theme.root); theme = null; }
    disposeTree(world);
    if (scene.environment) scene.environment.dispose();
    pmrem.dispose(); renderer.dispose();
    try { renderer.forceContextLoss(); } catch {}
    renderer.domElement.remove();
  },
};

}
