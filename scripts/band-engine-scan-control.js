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
