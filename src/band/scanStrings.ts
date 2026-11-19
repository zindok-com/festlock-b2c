// 팔찌 만들기(스캔) 화면 문구 9개 언어 — 3D 엔진(src/band/three/engine.ts)의 TX('scan.…') 가 쓴다. 한국어는 시안 문구 그대로.
// <b> 는 강조 표시(우리가 쓴 문구만 넣는다).
import type { Lang } from "../i18n";

const K = [
  "scan.title", "scan.close", "scan.tk.title", "scan.tk.fest", "scan.tk.pick", "scan.tk.etc", "scan.name", "scan.tk.year", "scan.tk.grade", "scan.tk.other",
  "scan.tk.gradeEtc", "scan.tk.day", "scan.tk.full", "scan.tk.dayEtc", "scan.tk.use", "scan.tk.differ", "scan.lead", "scan.empty", "scan.pick", "scan.sample",
  "scan.blur", "scan.flip", "scan.undo", "scan.mode", "scan.photo", "scan.design", "scan.fixLead", "scan.enhOn", "scan.enhOff", "scan.designLead",
  "scan.agree", "scan.done", "scan.ai.title", "scan.ai.body", "scan.ai.follow", "scan.badPhoto", "scan.ex", "scan.after", "scan.before", "scan.rot",
  "scan.ai", "scan.mine", "scan.st.gold", "scan.st.pulse", "scan.st.rings", "scan.st.spiral", "scan.st.contour", "scan.st.wave", "scan.st.check", "scan.st.stars",
  "scan.st.leaf", "scan.tk.needFest", "scan.tk.needYear", "scan.tk.needGrade", "scan.tk.needDay", "scan.tk.checking", "scan.tk.existBy", "scan.tk.exist", "scan.tk.first", "scan.hung",
  "scan.fail", "scan.max", "scan.needAgree", "scan.needFill",
] as const;

const V: Record<Lang, string[]> = {
  ko: [
    "팔찌 스캔", "닫기", "어떤 팔찌인가요?", "페스티벌", "페스티벌을 골라 주세요", "목록에 없어요 · 직접 입력", "페스티벌 이름 (예: COMBI 2024)", "연도", "티켓 등급", "기타",
    "등급 직접 입력", "날짜", "전일권", "날짜 직접 입력", "이 디자인으로 내 컬렉션에 추가", "내 팔찌와 다르면 아래에서 사진으로 만들 수 있어요", "팔찌의 <b>곧은 부분</b>을 네 점으로 감싸 주세요.<br><b>분홍 점과 분홍 선</b>이 글자가 시작하는 쪽 윗변이에요.", "사진을 골라 주세요", "사진 고르기", "예시 사진",
    "미리보기 · 번호나 QR이 보이면 <b>끌어서 가려</b> 주세요", "방향 뒤집기", "가리기 되돌리기", "만들 방식", "사진 그대로", "팔찌로 디자인", "내 팔찌 사진을 다듬어서 걸어요", "✨ 자동 보정 켜짐", "자동 보정 꺼짐", "사진에서 뽑은 색으로 패턴을 골라 주세요",
    "제가 직접 찍은 제 팔찌 사진이고, 번호·QR이 보이지 않게 가렸어요", "리본으로 걸기", "AI 디자인은<br>FestLock 앱에서 만나요", "앱이 출시되면 사진 한 장으로 AI가 내 팔찌 디자인을 만들어 줘요. 출시 소식은 인스타그램에서 가장 먼저 알려 드릴게요.", "@festlock 팔로우하기", "이 사진은 열 수 없어요", "예시", "보정 후", "보정 전", "🎨 색 순서 바꾸기",
    "✨ AI 디자인", "내 팔찌", "금사", "심박선", "반복 원", "소용돌이", "등고선", "물결", "체크", "별자리",
    "잎사귀", "페스티벌을 골라 주세요", "연도를 확인해 주세요", "등급을 적어 주세요", "날짜를 적어 주세요", "확인하는 중…", "{name}님이 처음 등록한 디자인이 있어요", "처음 등록된 디자인이 있어요", "당신이 처음 등록하는 거예요! 당신이 찍은 팔찌를 다른 사람들도 쓰게 될 거예요!", "리본으로 걸었어요",
    "저장하지 못했어요. 잠시 뒤 다시 해 주세요", "60개까지 걸 수 있어요", "확인란에 체크해 주세요", "빨간색으로 표시한 곳을 채워 주세요",
  ],
  en: [
    "Scan a wristband", "Close", "Which wristband is it?", "Festival", "Choose a festival", "Not on the list · type it", "Festival name (e.g. COMBI 2024)", "Year", "Ticket type", "Other",
    "Type the ticket type", "Date", "Full pass", "Type the date", "Add this design to my collection", "If yours looks different, make it from a photo below", "Frame the <b>straight part</b> of the band with four points.<br>The <b>pink dot and pink line</b> mark the top edge where the text starts.", "Choose a photo", "Choose photo", "Example photo",
    "Preview · if a number or QR code shows, <b>drag to cover it</b>", "Flip direction", "Undo cover", "How to make it", "Photo as is", "Design a band", "We tidy up your band photo and hang it", "✨ Auto-enhance on", "Auto-enhance off", "Pick a pattern using colors from your photo",
    "This is my own photo of my wristband, and I covered any numbers or QR codes", "Hang as a ribbon", "AI design is coming<br>in the FestLock app", "When the app launches, AI will design your wristband from a single photo. We'll announce it first on Instagram.", "Follow @festlock", "This photo can't be opened", "Example", "Enhanced", "Original", "🎨 Swap colors",
    "✨ AI design", "My wristband", "Gold thread", "Heartbeat", "Rings", "Swirl", "Contour", "Wave", "Check", "Stars",
    "Leaves", "Choose a festival", "Check the year", "Type the ticket type", "Type the date", "Checking…", "{name} registered the first design", "A first design already exists", "You're the first! Others with this ticket will use the band you photograph.", "hung as a ribbon",
    "Couldn't save. Please try again in a moment", "You can hang up to 60", "Please tick the checkbox", "Please fill in the parts marked in red",
  ],
  ja: [
    "リストバンドをスキャン", "閉じる", "どのリストバンドですか？", "フェス", "フェスを選んでください", "リストにない · 直接入力", "フェス名（例：COMBI 2024）", "年", "チケットの種類", "その他",
    "種類を入力", "日付", "通し券", "日付を入力", "このデザインをマイコレクションに追加", "自分のと違う場合は、下で写真から作れます", "バンドの<b>まっすぐな部分</b>を4つの点で囲んでください。<br><b>ピンクの点と線</b>が文字の始まる側の上の辺です。", "写真を選んでください", "写真を選ぶ", "見本写真",
    "プレビュー · 番号やQRが見えたら<b>ドラッグして隠して</b>ください", "向きを反転", "隠すを取り消す", "作り方", "写真のまま", "バンドとしてデザイン", "あなたのバンド写真を整えて飾ります", "✨ 自動補正オン", "自動補正オフ", "写真から取った色でパターンを選んでください",
    "自分で撮った自分のリストバンドで、番号やQRは隠しました", "リボンとして飾る", "AIデザインは<br>FestLockアプリで", "アプリが出たら、写真1枚でAIがリストバンドをデザインします。お知らせはInstagramで真っ先に。", "@festlockをフォロー", "この写真は開けません", "見本", "補正後", "補正前", "🎨 色の順番を変える",
    "✨ AIデザイン", "マイリストバンド", "金糸", "心拍線", "リング", "うず巻き", "等高線", "波", "チェック", "星座",
    "葉っぱ", "フェスを選んでください", "年を確認してください", "種類を入力してください", "日付を入力してください", "確認中…", "{name}さんが最初に登録したデザインがあります", "最初に登録されたデザインがあります", "あなたが最初の登録です！あなたが撮ったバンドをみんなが使います！", "リボンとして飾りました",
    "保存できませんでした。しばらくしてからもう一度お試しください", "60個まで飾れます", "チェックを入れてください", "赤く表示された所を入力してください",
  ],
  zh: [
    "扫描手环", "关闭", "是哪条手环？", "音乐节", "请选择音乐节", "列表里没有 · 自己输入", "音乐节名称（例：COMBI 2024）", "年份", "门票类型", "其他",
    "输入门票类型", "日期", "通票", "输入日期", "把这个设计加入我的收藏", "如果和你的不一样，可以在下面用照片制作", "用四个点框住手环<b>笔直的部分</b>。<br><b>粉色点和粉色线</b>是文字开头那侧的上边。", "请选择照片", "选择照片", "示例照片",
    "预览 · 如果露出号码或二维码，请<b>拖动遮住</b>", "翻转方向", "撤销遮挡", "制作方式", "保持照片原样", "设计成手环", "整理你的手环照片后挂起来", "✨ 自动优化已开", "自动优化已关", "用照片中取出的颜色选择图案",
    "这是我亲自拍的我的手环，号码和二维码已遮住", "挂成丝带", "AI 设计将在<br>FestLock 应用中推出", "应用上线后，AI 会用一张照片为你设计手环。上线消息会第一时间在 Instagram 公布。", "关注 @festlock", "无法打开这张照片", "示例", "优化后", "优化前", "🎨 调换颜色",
    "✨ AI 设计", "我的手环", "金线", "心跳线", "圆环", "漩涡", "等高线", "波浪", "格纹", "星座",
    "叶子", "请选择音乐节", "请确认年份", "请输入门票类型", "请输入日期", "确认中…", "{name}最先登记了这个设计", "已有最先登记的设计", "你是第一个登记的！你拍的手环大家都会用！", "已挂成丝带",
    "保存失败，请稍后再试", "最多可以挂 60 条", "请勾选确认框", "请填写标红的地方",
  ],
  zht: [
    "掃描手環", "關閉", "是哪條手環？", "音樂節", "請選擇音樂節", "列表裡沒有 · 自己輸入", "音樂節名稱（例：COMBI 2024）", "年份", "門票類型", "其他",
    "輸入門票類型", "日期", "通票", "輸入日期", "把這個設計加入我的收藏", "如果和你的不一樣，可以在下面用照片製作", "用四個點框住手環<b>筆直的部分</b>。<br><b>粉色點和粉色線</b>是文字開頭那側的上邊。", "請選擇照片", "選擇照片", "範例照片",
    "預覽 · 如果露出號碼或 QR 碼，請<b>拖曳遮住</b>", "翻轉方向", "復原遮擋", "製作方式", "保持照片原樣", "設計成手環", "整理你的手環照片後掛起來", "✨ 自動修飾已開", "自動修飾已關", "用照片中取出的顏色選擇圖案",
    "這是我親自拍的我的手環，號碼和 QR 碼已遮住", "掛成緞帶", "AI 設計將在<br>FestLock App 推出", "App 上線後，AI 會用一張照片為你設計手環。上線消息會第一時間在 Instagram 公布。", "追蹤 @festlock", "無法開啟這張照片", "範例", "修飾後", "修飾前", "🎨 調換顏色",
    "✨ AI 設計", "我的手環", "金線", "心跳線", "圓環", "漩渦", "等高線", "波浪", "格紋", "星座",
    "葉子", "請選擇音樂節", "請確認年份", "請輸入門票類型", "請輸入日期", "確認中…", "{name}最先登記了這個設計", "已有最先登記的設計", "你是第一個登記的！你拍的手環大家都會用！", "已掛成緞帶",
    "儲存失敗，請稍後再試", "最多可以掛 60 條", "請勾選確認框", "請填寫標紅的地方",
  ],
  es: [
    "Escanear pulsera", "Cerrar", "¿Qué pulsera es?", "Festival", "Elige un festival", "No está en la lista · escríbelo", "Nombre del festival (p. ej. COMBI 2024)", "Año", "Tipo de entrada", "Otro",
    "Escribe el tipo de entrada", "Fecha", "Abono completo", "Escribe la fecha", "Añadir este diseño a mi colección", "Si la tuya es distinta, créala con una foto abajo", "Encuadra la <b>parte recta</b> de la pulsera con cuatro puntos.<br>El <b>punto y la línea rosa</b> marcan el borde superior donde empieza el texto.", "Elige una foto", "Elegir foto", "Foto de ejemplo",
    "Vista previa · si se ve un número o QR, <b>arrastra para taparlo</b>", "Girar dirección", "Deshacer tapado", "Cómo crearla", "Foto tal cual", "Diseñar pulsera", "Retocamos la foto de tu pulsera y la colgamos", "✨ Mejora automática activada", "Mejora automática desactivada", "Elige un patrón con los colores de tu foto",
    "Es mi propia foto de mi pulsera y tapé números o códigos QR", "Colgar como cinta", "El diseño con IA llegará<br>en la app de FestLock", "Cuando salga la app, la IA diseñará tu pulsera con una sola foto. Lo anunciaremos primero en Instagram.", "Seguir a @festlock", "No se puede abrir esta foto", "Ejemplo", "Mejorada", "Original", "🎨 Cambiar colores",
    "✨ Diseño con IA", "Mi pulsera", "Hilo dorado", "Latido", "Anillos", "Espiral", "Curvas de nivel", "Ola", "Cuadros", "Estrellas",
    "Hojas", "Elige un festival", "Revisa el año", "Escribe el tipo de entrada", "Escribe la fecha", "Comprobando…", "{name} registró el primer diseño", "Ya existe un primer diseño", "¡Eres el primero! Quienes tengan esta entrada usarán la pulsera que fotografíes.", "colgada como cinta",
    "No se pudo guardar. Inténtalo de nuevo en un momento", "Puedes colgar hasta 60", "Marca la casilla", "Completa lo marcado en rojo",
  ],
  vi: [
    "Quét vòng tay", "Đóng", "Đây là vòng tay nào?", "Lễ hội", "Chọn lễ hội", "Không có trong danh sách · tự nhập", "Tên lễ hội (VD: COMBI 2024)", "Năm", "Loại vé", "Khác",
    "Nhập loại vé", "Ngày", "Vé trọn gói", "Nhập ngày", "Thêm thiết kế này vào bộ sưu tập", "Nếu vòng của bạn khác, hãy tạo từ ảnh bên dưới", "Đặt bốn điểm quanh <b>đoạn thẳng</b> của vòng.<br><b>Điểm và đường màu hồng</b> là cạnh trên, phía chữ bắt đầu.", "Hãy chọn ảnh", "Chọn ảnh", "Ảnh mẫu",
    "Xem trước · nếu thấy số hoặc mã QR, hãy <b>kéo để che</b>", "Lật chiều", "Hoàn tác che", "Cách tạo", "Giữ nguyên ảnh", "Thiết kế vòng", "Chỉnh lại ảnh vòng tay của bạn rồi treo lên", "✨ Tự chỉnh đang bật", "Tự chỉnh đang tắt", "Chọn hoa văn bằng màu lấy từ ảnh",
    "Đây là ảnh tôi tự chụp vòng tay của mình, số và mã QR đã được che", "Treo thành ruy băng", "Thiết kế bằng AI<br>sẽ có trong ứng dụng FestLock", "Khi ứng dụng ra mắt, AI sẽ thiết kế vòng tay từ một bức ảnh. Tin ra mắt sẽ có đầu tiên trên Instagram.", "Theo dõi @festlock", "Không mở được ảnh này", "Mẫu", "Sau khi chỉnh", "Trước khi chỉnh", "🎨 Đổi thứ tự màu",
    "✨ Thiết kế AI", "Vòng tay của tôi", "Chỉ vàng", "Nhịp tim", "Vòng tròn", "Xoáy", "Đường đồng mức", "Sóng", "Kẻ ô", "Chòm sao",
    "Lá", "Hãy chọn lễ hội", "Hãy kiểm tra năm", "Hãy nhập loại vé", "Hãy nhập ngày", "Đang kiểm tra…", "{name} đã đăng ký thiết kế đầu tiên", "Đã có thiết kế đầu tiên", "Bạn là người đầu tiên! Mọi người có vé này sẽ dùng vòng bạn chụp!", "đã treo thành ruy băng",
    "Không lưu được. Hãy thử lại sau", "Bạn có thể treo tối đa 60", "Hãy đánh dấu ô xác nhận", "Hãy điền vào chỗ được đánh dấu đỏ",
  ],
  th: [
    "สแกนริสต์แบนด์", "ปิด", "เป็นริสต์แบนด์อันไหน?", "เทศกาล", "เลือกเทศกาล", "ไม่มีในรายการ · พิมพ์เอง", "ชื่อเทศกาล (เช่น COMBI 2024)", "ปี", "ประเภทบัตร", "อื่น ๆ",
    "พิมพ์ประเภทบัตร", "วันที่", "บัตรทุกวัน", "พิมพ์วันที่", "เพิ่มดีไซน์นี้ในคอลเลกชันของฉัน", "ถ้าของคุณไม่เหมือน สร้างจากรูปด้านล่างได้", "วางจุดสี่จุดรอบ<b>ส่วนที่ตรง</b>ของริสต์แบนด์<br><b>จุดและเส้นสีชมพู</b>คือขอบบนฝั่งที่ตัวอักษรเริ่ม", "เลือกรูป", "เลือกรูป", "รูปตัวอย่าง",
    "ตัวอย่าง · ถ้าเห็นหมายเลขหรือ QR ให้<b>ลากเพื่อปิด</b>", "กลับทิศ", "ยกเลิกการปิด", "วิธีสร้าง", "ใช้รูปเดิม", "ออกแบบเป็นริสต์แบนด์", "ปรับรูปริสต์แบนด์ของคุณแล้วแขวน", "✨ ปรับอัตโนมัติ เปิด", "ปรับอัตโนมัติ ปิด", "เลือกลายด้วยสีจากรูปของคุณ",
    "เป็นรูปริสต์แบนด์ของฉันที่ถ่ายเอง และปิดหมายเลข/QR แล้ว", "แขวนเป็นริบบิ้น", "ดีไซน์ด้วย AI<br>พบกันในแอป FestLock", "เมื่อแอปเปิดตัว AI จะออกแบบริสต์แบนด์จากรูปเดียว ติดตามข่าวได้ที่ Instagram ก่อนใคร", "ติดตาม @festlock", "เปิดรูปนี้ไม่ได้", "ตัวอย่าง", "หลังปรับ", "ก่อนปรับ", "🎨 สลับลำดับสี",
    "✨ ดีไซน์ AI", "ริสต์แบนด์ของฉัน", "ด้ายทอง", "คลื่นหัวใจ", "วงกลม", "ก้นหอย", "เส้นชั้นความสูง", "คลื่น", "ลายตาราง", "กลุ่มดาว",
    "ใบไม้", "เลือกเทศกาล", "ตรวจสอบปี", "พิมพ์ประเภทบัตร", "พิมพ์วันที่", "กำลังตรวจสอบ…", "{name} ลงทะเบียนดีไซน์แรกไว้แล้ว", "มีดีไซน์แรกอยู่แล้ว", "คุณเป็นคนแรก! ทุกคนที่มีบัตรนี้จะใช้ริสต์แบนด์ที่คุณถ่าย!", "แขวนเป็นริบบิ้นแล้ว",
    "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", "แขวนได้สูงสุด 60 อัน", "กรุณาติ๊กช่องยืนยัน", "กรุณากรอกส่วนที่ขึ้นสีแดง",
  ],
  id: [
    "Pindai gelang", "Tutup", "Gelang yang mana?", "Festival", "Pilih festival", "Tidak ada di daftar · ketik sendiri", "Nama festival (mis. COMBI 2024)", "Tahun", "Jenis tiket", "Lainnya",
    "Ketik jenis tiket", "Tanggal", "Tiket terusan", "Ketik tanggal", "Tambahkan desain ini ke koleksiku", "Kalau punyamu berbeda, buat dari foto di bawah", "Tandai <b>bagian lurus</b> gelang dengan empat titik.<br><b>Titik dan garis merah muda</b> adalah tepi atas di sisi awal tulisan.", "Pilih foto", "Pilih foto", "Foto contoh",
    "Pratinjau · kalau nomor atau QR terlihat, <b>seret untuk menutup</b>", "Balik arah", "Batalkan tutup", "Cara membuat", "Foto apa adanya", "Desain gelang", "Kami rapikan foto gelangmu lalu menggantungnya", "✨ Perbaikan otomatis aktif", "Perbaikan otomatis mati", "Pilih pola dengan warna dari fotomu",
    "Ini foto gelangku yang kuambil sendiri, dan nomor/QR sudah kututup", "Gantung jadi pita", "Desain AI hadir<br>di aplikasi FestLock", "Saat aplikasi rilis, AI akan mendesain gelangmu dari satu foto. Kabarnya diumumkan pertama di Instagram.", "Ikuti @festlock", "Foto ini tidak bisa dibuka", "Contoh", "Sesudah", "Sebelum", "🎨 Tukar urutan warna",
    "✨ Desain AI", "Gelangku", "Benang emas", "Detak jantung", "Lingkaran", "Pusaran", "Kontur", "Gelombang", "Kotak-kotak", "Rasi bintang",
    "Daun", "Pilih festival", "Periksa tahunnya", "Ketik jenis tiket", "Ketik tanggal", "Memeriksa…", "{name} mendaftarkan desain pertama", "Sudah ada desain pertama", "Kamu yang pertama! Semua yang punya tiket ini akan memakai gelang yang kamu foto!", "digantung jadi pita",
    "Gagal menyimpan. Coba lagi sebentar lagi", "Bisa menggantung sampai 60", "Centang kotak konfirmasi", "Lengkapi bagian yang ditandai merah",
  ],
};

export const SCAN_T: Record<Lang, Record<string, string>> = Object.fromEntries(
  (Object.keys(V) as Lang[]).map((l) => {
    if (V[l].length !== K.length) throw new Error(`scanStrings ${l}: ${V[l].length} / ${K.length}`);
    return [l, Object.fromEntries(K.map((k, i) => [k, V[l][i]]))];
  }),
) as Record<Lang, Record<string, string>>;
