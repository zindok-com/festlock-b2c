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

/*@@SCAN_CONTROL@@*/

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
