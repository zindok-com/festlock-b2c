// "나만의 컬렉션" 문구 중 첫 화면(메인 묶음)에 꼭 있어야 하는 것만: 홈 버튼 · 탭 제목 · 화면 불러오기 실패.
// 나머지 문구는 src/band/strings.ts 에 있고, 컬렉션 화면을 열 때 함께 불러온다(addDict).
import type { Lang } from "../i18n";

export const BAND_CORE_T: Record<Lang, Record<string, string>> = {
  ko: {
    "home.band": "나만의 컬렉션을 만들자",
    "home.bandSub": "다녀온 페스티벌 팔찌를 기록하고 구경해요",
    "band.docTitle": "나만의 페스티벌 팔찌 컬렉션 · FestLock",
    "band.c.docTitle": "팔찌 컬렉션 · FestLock",
    "band.chunkFail": "화면을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.",
    "band.retry": "다시 시도",
  },
  en: {
    "home.band": "Build your own collection",
    "home.bandSub": "Log your festival wristbands and browse others'",
    "band.docTitle": "My festival wristband collection · FestLock",
    "band.c.docTitle": "Wristband collection · FestLock",
    "band.chunkFail": "Couldn't load this screen. Check your connection and try again.",
    "band.retry": "Try again",
  },
  ja: {
    "home.band": "自分だけのコレクションを作ろう",
    "home.bandSub": "行ったフェスのリストバンドを記録して、みんなのも見てみよう",
    "band.docTitle": "フェスのリストバンドコレクション · FestLock",
    "band.c.docTitle": "リストバンドコレクション · FestLock",
    "band.chunkFail": "画面を読み込めませんでした。接続を確認して、もう一度お試しください。",
    "band.retry": "もう一度",
  },
  zh: {
    "home.band": "打造你的专属收藏",
    "home.bandSub": "记录去过的音乐节手环，也看看别人的",
    "band.docTitle": "我的音乐节手环收藏 · FestLock",
    "band.c.docTitle": "手环收藏 · FestLock",
    "band.chunkFail": "页面加载失败。请检查网络后重试。",
    "band.retry": "重试",
  },
  zht: {
    "home.band": "打造你的專屬收藏",
    "home.bandSub": "記錄去過的音樂節手環，也看看別人的",
    "band.docTitle": "我的音樂節手環收藏 · FestLock",
    "band.c.docTitle": "手環收藏 · FestLock",
    "band.chunkFail": "頁面載入失敗。請檢查網路後再試一次。",
    "band.retry": "重試",
  },
  es: {
    "home.band": "Crea tu propia colección",
    "home.bandSub": "Guarda tus pulseras de festival y mira las de otros",
    "band.docTitle": "Mi colección de pulseras de festival · FestLock",
    "band.c.docTitle": "Colección de pulseras · FestLock",
    "band.chunkFail": "No se pudo cargar esta pantalla. Revisa tu conexión e inténtalo de nuevo.",
    "band.retry": "Reintentar",
  },
  vi: {
    "home.band": "Tạo bộ sưu tập của riêng bạn",
    "home.bandSub": "Lưu lại vòng tay lễ hội đã đi và xem của mọi người",
    "band.docTitle": "Bộ sưu tập vòng tay lễ hội · FestLock",
    "band.c.docTitle": "Bộ sưu tập vòng tay · FestLock",
    "band.chunkFail": "Không tải được màn hình này. Hãy kiểm tra kết nối và thử lại.",
    "band.retry": "Thử lại",
  },
  th: {
    "home.band": "สร้างคอลเลกชันของคุณเอง",
    "home.bandSub": "บันทึกริสต์แบนด์เฟสติวัลที่เคยไป และดูของคนอื่น",
    "band.docTitle": "คอลเลกชันริสต์แบนด์เฟสติวัลของฉัน · FestLock",
    "band.c.docTitle": "คอลเลกชันริสต์แบนด์ · FestLock",
    "band.chunkFail": "โหลดหน้านี้ไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง",
    "band.retry": "ลองอีกครั้ง",
  },
  id: {
    "home.band": "Buat koleksimu sendiri",
    "home.bandSub": "Catat gelang festival yang pernah kamu datangi dan lihat milik orang lain",
    "band.docTitle": "Koleksi gelang festivalku · FestLock",
    "band.c.docTitle": "Koleksi gelang · FestLock",
    "band.chunkFail": "Layar ini gagal dimuat. Periksa koneksi lalu coba lagi.",
    "band.retry": "Coba lagi",
  },
};
