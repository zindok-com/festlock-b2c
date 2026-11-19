// 시안 3D 진열 중 대표 요청으로 바꾼 부분 (make-band-engine.mjs 가 시안 코드에 차례로 적용)
//   🎀 걸기: 레일 양쪽 분홍 공 + 분홍 줄 → 코르크 띠 + 팔찌마다 검은 압정 (팔찌가 내려와 멈추면 압정이 앞에서 꽂힘)
//   🎠 모빌: 고리 크기 고정(1.55) → 그 층 팔찌 수에 맞춰 작게 시작해 커짐 (1개일 때 빈 공간이 너무 많아서)
// 각 항목: [시안 문장, 바꿀 문장, 'all'(여러 번 나오면 모두)]
export const THEME_FIXES = [
  // ---------- 🎀 걸기: 코르크 띠 + 압정 ----------
  [
    "  const capMat  = new THREE.MeshStandardMaterial({ color:0xff4fa0, roughness:.35 });\n  const railGeo = new THREE.BoxGeometry(1,.18,.26), lineGeo = new THREE.BoxGeometry(1,.035,.01), capGeo = new THREE.SphereGeometry(.11,24,16);",
    `  /* 코르크 띠 (양쪽 공 대신) — 결이 보이게 점을 흩뿌린 그림을 띠 길이만큼 반복 */
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
  }`,
  ],
  [
    "      const body = new THREE.Mesh(railGeo, railMat), line = new THREE.Mesh(lineGeo, lineMat);\n      const cl = new THREE.Mesh(capGeo, capMat), cr = new THREE.Mesh(capGeo, capMat);\n      body.position.y = .09; line.position.set(0,.09,.132); cl.position.y = cr.position.y = .09;\n      gr.add(body, line, cl, cr); gr.visible = false; root.add(gr);\n      rows.push({ gr, body, line, cl, cr, y:0, w:0, wT:0, plane:new THREE.Plane(new THREE.Vector3(0,-1,0), 0) });",
    `      const tx = corkTex.clone(); tx.needsUpdate = true;
      const body = new THREE.Mesh(railGeo, new THREE.MeshStandardMaterial({ map:tx, roughness:.95 }));
      body.position.set(0, -.07, -.06);   // 팔찌 윗부분 뒤에 띠가 오게 (압정이 팔찌를 뚫고 띠에 꽂힘)
      gr.add(body); gr.visible = false; root.add(gr);
      rows.push({ gr, body, tx, y:0, w:0, wT:0, plane:new THREE.Plane(new THREE.Vector3(0,-1,0), 0) });`,
  ],
  // 팔찌는 띠 윗선 아래에서만 보이게 (띠 위로 삐져나오지 않게)
  ["row.y = y; row.gr.position.y = y; row.plane.constant = y;", "row.y = y; row.gr.position.y = y; row.plane.constant = y + .08;"],
  [
    "        row.body.scale.x = w; row.line.scale.x = Math.max(w - .1, .001);\n        row.cl.position.x = -w/2; row.cr.position.x = w/2; row.gr.visible = row.w > .05;",
    "        row.body.scale.x = w; row.tx.repeat.x = Math.max(w, .1)/1.2; row.gr.visible = row.w > .05;",
  ],
  [
    "      items.push(it); relayout();\n      it.x = it.tx; it.s.x = rows[r].y + L + .05;",
    "      it.pin = makePin(pinColorFor(map.image)); it.pinS = 0;\n      items.push(it); relayout();\n      it.x = it.tx; it.s.x = rows[r].y + L + .05;",
  ],
  [
    "        it.mesh.position.set(it.x, it.s.x, 0);\n        deform(it, t);",
    `        it.mesh.position.set(it.x, it.s.x, 0);
        deform(it, t);
        // 내려와 멈추면 압정이 앞에서 날아와 꽂힘 · 떠날 때는 먼저 빠짐
        const pinned = !it.leaving && it.delay <= 0 && Math.abs(it.s.x - it.s.t) < .05 && Math.abs(it.s.v) < .8;
        it.pinS = damp(it.pinS, pinned ? 1 : 0, pinned ? 12 : 22, dt);
        it.pin.visible = it.pinS > .02; it.pin.scale.setScalar(Math.max(.001, .6 + .4*it.pinS));
        it.pin.position.set(it.x, rows[it.row].y - .065, (1 - it.pinS)*.45);`,
  ],
  ["  function kill(it){\n    root.remove(it.mesh); it.mesh.geometry.dispose();", "  function kill(it){\n    if (it.pin){ root.remove(it.pin); it.pin.userData.mat.dispose(); }\n    root.remove(it.mesh); it.mesh.geometry.dispose();"],

  // 세로 화면(휴대폰)에서는 한 줄 6개 — 확대 버튼·연도 목록 사이 좁은 영역에서도 팔찌가 너무 작아지지 않게
  ["  const COLS = 10, RW = .62, GX = .08, SEG = 40;", "  const COLS = camera.aspect < .9 ? 6 : 10, RW = .62, GX = .08, SEG = 40;"],
  // 걸기도 손목·모빌처럼 360도 돌려 볼 수 있게 (대표 요청)
  ["    root, rotLimit:.75,\n", "    root, rotLimit:.75, free360:true,\n"],

  // ---------- 🎠 모빌: 팔찌 수에 맞춰 고리 크기 ----------
  [
    "const PER = 15, RAD = 1.55, TIER = 2.7, SEG = 30;",
    "const PER = 15, RAD = 1.55, TIER = 2.7, SEG = 30;\n  /* 고리 반지름: 1개면 작게(.42), 팔찌가 늘수록 둘레가 팔찌 사이 간격만큼 커짐 (최대 1.55) */\n  const RMIN = .42, radOf = n => clamp(n*.62/(Math.PI*2), RMIN, RAD);",
  ],
  ["const hoop = new THREE.Mesh(hoopGeo, gold); hoop.rotation.x = Math.PI/2;", "const hoop = new THREE.Mesh(new THREE.TorusGeometry(RMIN, .035, 10, 48), gold); hoop.rotation.x = Math.PI/2;"],
  [
    "tiers.push({ g, show:0, showT:1 });",
    "tiers.push({ g, hoop, cords, show:0, showT:1, rad:RMIN, radT:RMIN, built:-1 }); shape(tiers[tiers.length - 1]);",
  ],
  [
    "  function relayout(){\n    const L = live(), nt = Math.max(1, Math.ceil(L.length/PER)); ensureTier(nt - 1);",
    `  /** 고리와 고리를 매단 줄을 지금 반지름으로 다시 만든다 */
  function shape(tr){
    tr.hoop.geometry.dispose();
    tr.hoop.geometry = new THREE.TorusGeometry(tr.rad, .035, 10, Math.round(40 + 56*tr.rad/RAD)); tr.built = tr.rad;
    const p = tr.cords.geometry.attributes.position;
    for (let a = 0; a < 4; a++){ const th = a*Math.PI/2 + .4; p.setXYZ(a*2 + 1, Math.cos(th)*tr.rad, 0, Math.sin(th)*tr.rad); }
    p.needsUpdate = true; tr.cords.geometry.computeBoundingSphere();
  }
  function relayout(){
    const L = live(), nt = Math.max(1, Math.ceil(L.length/PER)); ensureTier(nt - 1);
    tiers.forEach((t, k) => { t.radT = radOf(Math.max(1, Math.min(PER, L.length - k*PER))); });`,
  ],
  [
    "const tier = Math.floor(k/PER), a = (k % PER)/PER*Math.PI*2 + tier*.21;",
    "const tier = Math.floor(k/PER), n = Math.min(PER, L.length - tier*PER), a = (k % PER)/n*Math.PI*2 + tier*.21;",
  ],
  ["      it.a = a; it.tier = tier; it.s.t = -tier*TIER;", "      if (it.a === null) it.a = a; it.aT = a; it.tier = tier; it.s.t = -tier*TIER;"],
  ["s:sp(0), a:0, tier:0, flutter:0, ph:i*1.3", "s:sp(0), a:null, aT:0, tier:0, flutter:0, ph:i*1.3"],
  [
    "tr.g.visible = tr.show > .02; });",
    "tr.g.visible = tr.show > .02; tr.rad = damp(tr.rad, tr.radT, 5, dt); if (Math.abs(tr.rad - tr.built) > .008) shape(tr); });",
  ],
  [
    "        springStep(it.s, dt, 15, .62);\n        it.flutter = Math.max(it.flutter*Math.exp(-dt*1.6), Math.min(1.4",
    "        springStep(it.s, dt, 15, .62); it.a = damp(it.a, it.aT, 5, dt);\n        it.flutter = Math.max(it.flutter*Math.exp(-dt*1.6), Math.min(1.4",
  ],
  ["Math.sin(it.a)*RAD, it.s.x, Math.cos(it.a)*RAD", "Math.sin(it.a)*tiers[it.tier].rad, it.s.x, Math.cos(it.a)*tiers[it.tier].rad", "all"],
  // 카메라는 지금 가장 큰 고리에 맞춤 (1개일 때 화면이 비지 않게)
  ["w:2*RAD + 1.4", "w:2*Math.max(RMIN, ...tiers.filter(t => t.showT > 0).map(t => t.radT)) + 1.4"],
];
