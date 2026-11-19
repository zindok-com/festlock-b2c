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
