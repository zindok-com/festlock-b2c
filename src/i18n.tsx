// 다국어(한국어·영어·일본어·중국어 간체·중국어 번체). 폰 언어 설정으로 자동 선택하고, 🌐 버튼으로 바꿀 수 있다.
import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Item } from "./data";
import { useBackClose } from "./backClose";
import { FEST_T } from "./fest/strings";

export type Lang = "ko" | "en" | "ja" | "zh" | "zht";
export const LANGS: { id: Lang; name: string }[] = [
  { id: "ko", name: "한국어" },
  { id: "en", name: "English" },
  { id: "ja", name: "日本語" },
  { id: "zh", name: "简体中文" },
  { id: "zht", name: "繁體中文" },
];
const LANG_KEY = "edc26:lang";
const HTML_LANG: Record<Lang, string> = { ko: "ko", en: "en", ja: "ja", zh: "zh-Hans", zht: "zh-Hant" };

/** 저장된 선택 → 폰 언어 목록 순서대로 → 없으면 영어 */
function detect(): Lang {
  try {
    const s = localStorage.getItem(LANG_KEY);
    if (s === "ko" || s === "en" || s === "ja" || s === "zh" || s === "zht") return s;
  } catch {
    /* 저장소 없음 */
  }
  const list = navigator.languages?.length ? navigator.languages : [navigator.language || "en"];
  for (const l of list) {
    const low = l.toLowerCase();
    // 중국어: 번체(대만·홍콩·마카오·Hant)와 간체를 가른다
    if (low.startsWith("zh")) return /^zh-(tw|hk|mo|hant)/.test(low) ? "zht" : "zh";
    const c = low.slice(0, 2);
    if (c === "ko" || c === "en" || c === "ja") return c;
  }
  return "en";
}

type Dict = Record<string, string>;
// **굵게**, _기울임_ 표기를 쓸 수 있다(Rich 컴포넌트). {n}은 숫자 자리.
const T: Record<Lang, Dict> = {
  ko: {
    "doc.title": "EDC KOREA 2026 · 내 타임테이블",
    "home.docTitle": "FestLock · 페스티벌 타임테이블 잠금화면",
    "home.title": "페스티벌 타임테이블을 내 잠금화면으로",
    "home.sub": "보고 싶은 아티스트만 골라 인스타 스토리·폰 배경화면 이미지로 저장하세요.",
    "home.list": "페스티벌",
    "home.notice": "비공식 팬메이드 서비스예요. 각 페스티벌 주최측과 무관하며, 시간표는 공식 발표 기준이라 변경될 수 있어요.",
    "fest.soon": "준비 중",
    "fest.live": "오픈",
    "fest.ended": "종료 · 다시 보기",
    "soon.title": "타임테이블 준비 중이에요",
    "soon.body": "타임테이블이 공개되면 여기서 바로 내 라인업을 골라 잠금화면으로 만들 수 있어요.",
    "soon.home": "다른 페스티벌 보기",
    "edc.ended": "EDC KOREA 2026은 끝났어요. 타임테이블 보기와 배경화면 만들기는 계속 쓸 수 있어요.",
    "stats.dl": "배경화면 다운로드 **{n}**회",
    "stats.split": "토 {sat} · 일 {sun}",
    "top.btn": "DJ 랭킹",
    "evt.badge": "이벤트",
    "evt.title": "MSE가 치킨 쏩니다 🍗",
    "evt.body": "나의 취향 타임테이블을 인스타 스토리로 올려주세요!",
    "evt.step1": "보고 싶은 DJ를 고르고",
    "evt.step2": "배경화면 만들기에서 인스타 9:16 이미지를 저장한 뒤",
    "evt.step3": "**@mainstageedm** 과 **@taestival_00** 을 태그해서 스토리에 올리면 끝!",
    "evt.note": "당첨자 발표 등 자세한 내용은 @mainstageedm 인스타그램에서 확인해 주세요.",
    "evt.go": "타임테이블 만들러 가기",
    "evt.insta": "@mainstageedm 보러 가기",
    "evt.hideToday": "오늘 하루 보지 않기",
    "evt.tagline": "다음 페스티벌 타임테이블도 FestLock에서 🔒",
    "evt.follow": "@festlock 팔로우하고 먼저 받아보기",
    "top.title": "DJ 랭킹", "rank.tabTop": "TOP 10", "rank.tabHour": "시간대별", "rank.hourDesc": "같은 시간대에 공연하는 DJ끼리 비교한 순위예요. 두 시간대에 걸친 DJ는 양쪽에 모두 나와요.",
    "top.desc": "배경화면을 처음 만들 때 고른 DJ 기준이에요. 한 기기에서 같은 DJ는 한 번만 세요.",
    "top.loading": "불러오는 중…",
    "top.error": "통계를 불러오지 못했어요. 잠시 후 다시 열어 주세요.",
    "top.empty": "아직 집계된 데이터가 없어요. 첫 배경화면을 만들어 보세요!",
    "top.count": "{n}명",
    "hero.intro": "보고 싶은 아티스트를 탭하면 색이 켜져요. 꾹 누르면 Spotify·YouTube·Apple Music으로 들어볼 수 있어요. 고른 라인업은 인스타용(9:16)이나 폰 배경화면용(9:19) 이미지로 저장할 수 있어요.",
    "hero.legend": "장르는 검색으로 확인한 내용이에요. _~로 시작하는 장르_는 스테이지 성향 등으로 추정한 값이라 정확하지 않을 수 있어요. \"장르 정보 없음\"은 확인하지 못한 아티스트예요.",
    "genre.none": "장르 정보 없음",
    "tab.genre": "장르",
    help: "사용법 보기",
    "lang.label": "언어",
    "day.sat": "10.3 토",
    "day.sun": "10.4 일",
    "sum.sel": "**{n}팀** 선택",
    "sum.overlap": "⚠ 시간 겹침 {n}곳",
    reset: "초기화",
    "reset.arm": "한 번 더 누르면 전체 삭제",
    "make.wall": "배경화면 만들기",
    "foot.notice": "비공식 정보 정리 페이지예요. EDC·Insomniac·주최측과 무관하며, 시간표는 공식 포스터 기준이라 변경될 수 있어요.",
    "foot.private": "사진·포스터의 저작권과 초상권은 각 권리자에게 있어요. 삭제 요청은 인스타그램 DM(@festlock)으로 알려 주세요.",
    "blk.hold": "꾹 누르면 듣기 링크",
    overlap: "시간 겹침",
    "art.title": "아티스트",
    close: "닫기",
    "link.sp": "Spotify에서 듣기",
    "link.yt": "YouTube에서 보기",
    "link.am": "Apple Music에서 듣기",
    "search.note": "위 버튼은 아티스트 이름으로 **검색만** 해 줘요. Spotify·Apple Music에는 이 아티스트의 프로필이 없을 수도 있고, 이름이 같은 다른 아티스트가 나올 수도 있어요.",
    "tt.add": "내 타임테이블에 담기",
    "tt.remove": "내 타임테이블에서 빼기",
    "app.note": "자세한 내용은 **Insomniac 앱**에서 확인하세요.",
    "exp.aria": "라인업 이미지 만들기",
    "exp.story": "인스타 9:16",
    "exp.phone": "폰 배경화면 9:19",
    "exp.lock": "잠금화면 시계 자리 비우기",
    "exp.compact": "상단 텍스트 축소",
    "exp.both": "토+일",
    "limit.title": "잠깐만요!",
    "limit.body": "짧은 시간에 여러 번 눌러서 다운로드 집계가 잠시 멈췄어요. 이미지는 정상적으로 저장되니 걱정하지 마세요. 1분 뒤에 다시 저장하면 집계돼요.",
    "limit.ok": "확인",
    "exp.stack": "위아래로",
    "exp.side": "좌우로",
    "exp.empty": "이 날 고른 아티스트가 없어요. 타임테이블에서 먼저 탭해 주세요.",
    "exp.pvAlt": "선택한 라인업 미리보기",
    "exp.save": "이미지 저장",
    "exp.view": "크게 보기",
    "exp.share": "공유",
    "exp.hint": "링크로 공유받은 화면(카톡·인스타 안 브라우저 등)에서는 \"이미지 저장\"이 안 될 수 있어요. 그럴 땐 \"크게 보기\"를 누르고 이미지를 꾹 눌러 사진에 저장해 주세요. 이미지 크기는 인스타 1080×1920(9:16), 폰 배경화면 1080×2280(9:19)이에요.",
    "viewer.aria": "이미지 크게 보기",
    "viewer.hint": "이미지를 **꾹 눌러서** 사진(갤러리)에 저장하세요",
    "viewer.alt": "저장할 라인업 이미지",
    "toast.saved": "저장했어요. 안 보이면 \"크게 보기\"에서 이미지를 꾹 눌러 주세요",
    "toast.saveFail": "저장이 안 돼서 이미지 뷰어를 열었어요. 이미지를 꾹 눌러 주세요",
    "toast.shareFail": "공유할 수 없어요. 이미지를 길게 눌러 저장해 주세요",
    "toast.shareNo": "이 기기에서는 공유가 어려워요. 이미지를 길게 눌러 저장해 주세요",
    "tut.aria": "사용법 안내",
    "tut.skip": "건너뛰기",
    "tut.next": "다음",
    "tut.start": "시작하기",
    "tut.s1.t": "탭하면 담기",
    "tut.s1.b": "보고 싶은 아티스트를 한 번 탭하면 색이 켜지고 내 타임테이블에 담겨요. 다시 탭하면 빠져요.",
    "tut.s2.t": "꾹 누르면 음악 듣기",
    "tut.s2.b": "아티스트를 꾹 누르고 있으면 음악을 들어볼 수 있는 창이 떠요. 다음을 눌러 어떤 창인지 볼게요.",
    "tut.s3.t": "이런 창이 떠요",
    "tut.s3.b": "Spotify·YouTube·Apple Music 버튼을 누르면 그 아티스트를 바로 검색해 줘요. 창은 ✕나 바깥을 눌러 닫아요.",
    "tut.drop.t": "드랍을 바로 들어 봐요",
    "tut.drop.b": "창이 열리고 잠깐 뒤, 위쪽에 유튜브 플레이어가 열리면서 드랍 구간(또는 영상)을 바로 틀어 줘요.",
    "tut.s4.t": "배경화면으로 저장",
    "tut.s4.b": "다 골랐으면 여기서 인스타 스토리(9:16)나 폰 배경화면(9:19) 이미지로 저장할 수 있어요.",
    "tut.save.ex": "이런 이미지가 만들어져요 (예시)",
    "tut.save.here": "지금 앱 안 브라우저(인스타그램 등)로 보고 계시네요. 여기서는 저장 버튼이 안 먹혀요. 이미지를 꾹 눌러 저장하거나 스크린샷을 찍어 주세요. 크롬·사파리에서 열면 버튼으로 바로 저장돼요.",
  },
  en: {
    "doc.title": "EDC KOREA 2026 · My Timetable",
    "home.docTitle": "FestLock · Festival timetable lock screens",
    "home.title": "Your festival timetable, on your lock screen",
    "home.sub": "Pick the artists you want to see and save them as an Instagram story or phone wallpaper.",
    "home.list": "Festivals",
    "home.notice": "Unofficial fan-made service. Not affiliated with any festival organizer. Times follow official announcements and may change.",
    "fest.soon": "Coming soon",
    "fest.live": "Open",
    "fest.ended": "Ended · View",
    "soon.title": "Timetable coming soon",
    "soon.body": "As soon as the timetable is out, you can pick your lineup here and turn it into a lock screen.",
    "soon.home": "See other festivals",
    "edc.ended": "EDC KOREA 2026 has ended. You can still browse the timetable and make wallpapers.",
    "stats.dl": "**{n}** wallpaper downloads",
    "stats.split": "Sat {sat} · Sun {sun}",
    "top.btn": "DJ Ranking",
    "evt.badge": "Event",
    "evt.title": "Free chicken from MSE 🍗",
    "evt.body": "Post your timetable to your Instagram story!",
    "evt.step1": "Pick the DJs you want to see",
    "evt.step2": "Save the Instagram 9:16 image from Make wallpaper",
    "evt.step3": "Tag **@mainstageedm** and **@taestival_00** in your story — that's it!",
    "evt.note": "Check @mainstageedm on Instagram for details like winner announcements.",
    "evt.go": "Make my timetable",
    "evt.insta": "Visit @mainstageedm",
    "evt.hideToday": "Don't show again today",
    "evt.tagline": "Your next festival timetable lives on FestLock 🔒",
    "evt.follow": "Follow @festlock to get it first",
    "top.title": "DJ Ranking", "rank.tabTop": "Top 10", "rank.tabHour": "By hour", "rank.hourDesc": "Ranked against DJs playing in the same hour. Sets that span two hours show up in both.",
    "top.desc": "Based on the DJs picked the first time someone makes a wallpaper. Each DJ counts once per device.",
    "top.loading": "Loading…",
    "top.error": "Couldn't load the stats. Please try again in a moment.",
    "top.empty": "No data yet. Make the first wallpaper!",
    "top.count": "{n}",
    "hero.intro": "Tap an artist to add them — the block lights up. Press and hold to listen on Spotify, YouTube or Apple Music. Save your picks as an Instagram story (9:16) or phone wallpaper (9:19) image.",
    "hero.legend": "Genres were checked by searching. _Genres starting with ~_ are guesses based on the stage and may be inaccurate. \"No genre info\" means we couldn't confirm it.",
    "genre.none": "No genre info",
    "tab.genre": "Genre",
    help: "How to use",
    "lang.label": "Language",
    "day.sat": "Sat 10.3",
    "day.sun": "Sun 10.4",
    "sum.sel": "**{n}** picked",
    "sum.overlap": "⚠ {n} time clash(es)",
    reset: "Reset",
    "reset.arm": "Tap again to clear all",
    "make.wall": "Make wallpaper",
    "foot.notice": "Unofficial info page. Not affiliated with EDC, Insomniac or the organizers. Times follow the official poster and may change.",
    "foot.private": "Photos and posters belong to their respective rights holders. To request removal, DM @festlock on Instagram.",
    "blk.hold": "press and hold for listening links",
    overlap: "Time clash",
    "art.title": "Artist",
    close: "Close",
    "link.sp": "Listen on Spotify",
    "link.yt": "Watch on YouTube",
    "link.am": "Listen on Apple Music",
    "search.note": "These buttons only **search** by the artist's name. The artist may not have a profile on Spotify or Apple Music, and a different artist with the same name may show up.",
    "tt.add": "Add to my timetable",
    "tt.remove": "Remove from my timetable",
    "app.note": "For full details, check the **Insomniac app**.",
    "exp.aria": "Create lineup image",
    "exp.story": "Instagram 9:16",
    "exp.phone": "Phone wallpaper 9:19",
    "exp.lock": "Leave space for the lock-screen clock",
    "exp.compact": "Compact header",
    "exp.both": "Sat+Sun",
    "limit.title": "Hold on!",
    "limit.body": "You tapped a few times in a row, so download counting paused for a moment. Your image still saves normally — save again in a minute and it'll be counted.",
    "limit.ok": "OK",
    "exp.stack": "Stacked",
    "exp.side": "Side by side",
    "exp.empty": "You haven't picked anyone for this day. Tap artists in the timetable first.",
    "exp.pvAlt": "Preview of your lineup",
    "exp.save": "Save image",
    "exp.view": "View large",
    "exp.share": "Share",
    "exp.hint": "In in-app browsers (KakaoTalk, Instagram, etc.) \"Save image\" may not work. If so, tap \"View large\" and press and hold the image to save it to Photos. Sizes: Instagram 1080×1920 (9:16), phone wallpaper 1080×2280 (9:19).",
    "viewer.aria": "Large image view",
    "viewer.hint": "**Press and hold** the image to save it to Photos",
    "viewer.alt": "Lineup image to save",
    "toast.saved": "Saved. If you can't find it, open \"View large\" and press and hold the image",
    "toast.saveFail": "Couldn't save, so we opened the viewer. Press and hold the image",
    "toast.shareFail": "Couldn't share. Press and hold the image to save it",
    "toast.shareNo": "Sharing isn't supported on this device. Press and hold the image to save it",
    "tut.aria": "How to use",
    "tut.skip": "Skip",
    "tut.next": "Next",
    "tut.start": "Get started",
    "tut.s1.t": "Tap to add",
    "tut.s1.b": "Tap an artist once to light it up and add it to your timetable. Tap again to remove it.",
    "tut.s2.t": "Press and hold to listen",
    "tut.s2.b": "Press and hold an artist and a window pops up where you can listen to their music. Tap Next to see it.",
    "tut.s3.t": "This window pops up",
    "tut.s3.b": "Tap Spotify, YouTube or Apple Music to search for the artist right away. Close it with ✕ or by tapping outside.",
    "tut.drop.t": "Hear the drop right away",
    "tut.drop.b": "A moment after the window opens, a YouTube player opens at the top and plays the drop (or the video) right away.",
    "tut.s4.t": "Save as wallpaper",
    "tut.s4.b": "When you're done, save your picks here as an Instagram story (9:16) or phone wallpaper (9:19) image.",
    "tut.save.ex": "You'll get an image like this (example)",
    "tut.save.here": "You're viewing this in an in-app browser (Instagram etc.), so the save button won't work here. Press and hold the image to save it, or take a screenshot. Open it in Chrome or Safari and the button saves it directly.",
  },
  ja: {
    "doc.title": "EDC KOREA 2026 · マイタイムテーブル",
    "home.docTitle": "FestLock · フェスのタイムテーブルをロック画面に",
    "home.title": "フェスのタイムテーブルを自分のロック画面に",
    "home.sub": "見たいアーティストだけを選んで、インスタのストーリーやスマホ壁紙の画像として保存できます。",
    "home.list": "フェスティバル",
    "home.notice": "非公式のファンメイドサービスです。各フェスの主催者とは関係ありません。時間は公式発表に基づくため、変更される場合があります。",
    "fest.soon": "準備中",
    "fest.live": "公開中",
    "fest.ended": "終了 · もう一度見る",
    "soon.title": "タイムテーブル準備中です",
    "soon.body": "タイムテーブルが公開されたら、ここですぐに自分のラインナップを選んでロック画面にできます。",
    "soon.home": "ほかのフェスを見る",
    "edc.ended": "EDC KOREA 2026は終了しました。タイムテーブルの閲覧と壁紙作成は引き続き使えます。",
    "stats.dl": "壁紙ダウンロード **{n}**回",
    "stats.split": "土 {sat} · 日 {sun}",
    "top.btn": "DJランキング",
    "evt.badge": "イベント",
    "evt.title": "MSEがチキンをおごります 🍗",
    "evt.body": "自分好みのタイムテーブルをインスタのストーリーに投稿してください！",
    "evt.step1": "見たいDJを選んで",
    "evt.step2": "「壁紙を作る」でインスタ 9:16 の画像を保存し",
    "evt.step3": "**@mainstageedm** と **@taestival_00** をタグ付けしてストーリーに投稿すれば完了！",
    "evt.note": "当選発表など詳しくは @mainstageedm のインスタグラムをご確認ください。",
    "evt.go": "タイムテーブルを作る",
    "evt.insta": "@mainstageedm を見る",
    "evt.hideToday": "今日は表示しない",
    "evt.tagline": "次のフェスのタイムテーブルもFestLockで 🔒",
    "evt.follow": "@festlock をフォローして先にゲット",
    "top.title": "DJランキング", "rank.tabTop": "TOP 10", "rank.tabHour": "時間帯別", "rank.hourDesc": "同じ時間帯に出演するDJ同士の順位です。2つの時間帯にまたがるDJは両方に表示されます。",
    "top.desc": "初めて壁紙を作ったときに選ばれたDJをもとに集計しています。同じ端末では同じDJを1回だけ数えます。",
    "top.loading": "読み込み中…",
    "top.error": "統計を読み込めませんでした。しばらくしてからもう一度開いてください。",
    "top.empty": "まだデータがありません。最初の壁紙を作ってみましょう！",
    "top.count": "{n}人",
    "hero.intro": "見たいアーティストをタップすると色が付きます。長押しするとSpotify・YouTube・Apple Musicで試聴できます。選んだラインナップはインスタ用(9:16)やスマホ壁紙用(9:19)の画像として保存できます。",
    "hero.legend": "ジャンルは検索で確認した内容です。_「~」で始まるジャンル_はステージの傾向などから推測したもので、正確でない場合があります。「ジャンル情報なし」は確認できなかったアーティストです。",
    "genre.none": "ジャンル情報なし",
    "tab.genre": "ジャンル",
    help: "使い方",
    "lang.label": "言語",
    "day.sat": "10.3 土",
    "day.sun": "10.4 日",
    "sum.sel": "**{n}組** 選択中",
    "sum.overlap": "⚠ 時間の重なり {n}件",
    reset: "リセット",
    "reset.arm": "もう一度押すと全て削除",
    "make.wall": "壁紙を作る",
    "foot.notice": "非公式の情報ページです。EDC・Insomniac・主催者とは関係ありません。タイムテーブルは公式ポスター基準のため、変更される場合があります。",
    "foot.private": "写真・ポスターの著作権・肖像権は各権利者に帰属します。削除のご依頼はInstagram(@festlock)のDMへ。",
    "blk.hold": "長押しで試聴リンク",
    overlap: "時間の重なり",
    "art.title": "アーティスト",
    close: "閉じる",
    "link.sp": "Spotifyで聴く",
    "link.yt": "YouTubeで見る",
    "link.am": "Apple Musicで聴く",
    "search.note": "上のボタンはアーティスト名で**検索するだけ**です。Spotify・Apple Musicにこのアーティストのプロフィールがない場合や、同名の別アーティストが表示される場合があります。",
    "tt.add": "マイタイムテーブルに追加",
    "tt.remove": "マイタイムテーブルから外す",
    "app.note": "詳しくは**Insomniacアプリ**でご確認ください。",
    "exp.aria": "ラインナップ画像を作成",
    "exp.story": "インスタ 9:16",
    "exp.phone": "スマホ壁紙 9:19",
    "exp.lock": "ロック画面の時計部分を空ける",
    "exp.compact": "上部テキストを縮小",
    "exp.both": "土+日",
    "limit.title": "ちょっと待って！",
    "limit.body": "短時間に何度も押したため、ダウンロードの集計が一時的に止まりました。画像は普通に保存できるのでご安心ください。1分後にもう一度保存すると集計されます。",
    "limit.ok": "OK",
    "exp.stack": "上下に並べる",
    "exp.side": "左右に並べる",
    "exp.empty": "この日に選んだアーティストがいません。先にタイムテーブルでタップしてください。",
    "exp.pvAlt": "選んだラインナップのプレビュー",
    "exp.save": "画像を保存",
    "exp.view": "大きく表示",
    "exp.share": "共有",
    "exp.hint": "アプリ内ブラウザ(カカオトーク・インスタなど)では「画像を保存」が使えない場合があります。その場合は「大きく表示」を押して画像を長押しし、写真に保存してください。サイズはインスタ 1080×1920(9:16)、スマホ壁紙 1080×2280(9:19)です。",
    "viewer.aria": "画像の拡大表示",
    "viewer.hint": "画像を**長押し**して写真(ギャラリー)に保存してください",
    "viewer.alt": "保存するラインナップ画像",
    "toast.saved": "保存しました。見つからない場合は「大きく表示」で画像を長押ししてください",
    "toast.saveFail": "保存できなかったのでビューアを開きました。画像を長押ししてください",
    "toast.shareFail": "共有できません。画像を長押しして保存してください",
    "toast.shareNo": "この端末では共有できません。画像を長押しして保存してください",
    "tut.aria": "使い方ガイド",
    "tut.skip": "スキップ",
    "tut.next": "次へ",
    "tut.start": "はじめる",
    "tut.s1.t": "タップで追加",
    "tut.s1.b": "見たいアーティストを1回タップすると色が付き、マイタイムテーブルに追加されます。もう一度タップすると外れます。",
    "tut.s2.t": "長押しで試聴",
    "tut.s2.b": "アーティストを長押しすると、音楽を試聴できる画面が開きます。「次へ」でどんな画面か見てみましょう。",
    "tut.s3.t": "こんな画面が開きます",
    "tut.s3.b": "Spotify・YouTube・Apple Musicのボタンを押すと、そのアーティストをすぐ検索できます。✕か外側をタップすると閉じます。",
    "tut.drop.t": "ドロップをすぐ試聴",
    "tut.drop.b": "画面が開いて少しすると、上にYouTubeプレーヤーが開き、ドロップ（または動画）をすぐ再生します。",
    "tut.s4.t": "壁紙として保存",
    "tut.s4.b": "選び終わったら、ここでインスタストーリー(9:16)やスマホ壁紙(9:19)の画像として保存できます。",
    "tut.save.ex": "こんな画像が作られます(例)",
    "tut.save.here": "今はアプリ内ブラウザ(Instagramなど)でご覧のため、保存ボタンが使えません。画像を長押しして保存するか、スクリーンショットを撮ってください。ChromeやSafariで開けばボタンでそのまま保存できます。",
  },
  zh: {
    "doc.title": "EDC KOREA 2026 · 我的时间表",
    "home.docTitle": "FestLock · 把音乐节时间表做成锁屏",
    "home.title": "把音乐节时间表放到你的锁屏上",
    "home.sub": "只挑你想看的艺人，保存为 Instagram 快拍或手机壁纸图片。",
    "home.list": "音乐节",
    "home.notice": "非官方粉丝自制服务，与各音乐节主办方无关。时间以官方公布为准，可能会有变动。",
    "fest.soon": "即将开放",
    "fest.live": "已开放",
    "fest.ended": "已结束 · 回顾",
    "soon.title": "时间表准备中",
    "soon.body": "时间表一公布，就能在这里挑选你的阵容并做成锁屏。",
    "soon.home": "看看其他音乐节",
    "edc.ended": "EDC KOREA 2026 已结束。仍可查看时间表并制作壁纸。",
    "stats.dl": "壁纸下载 **{n}** 次",
    "stats.split": "周六 {sat} · 周日 {sun}",
    "top.btn": "DJ 排行",
    "evt.badge": "活动",
    "evt.title": "MSE 请你吃炸鸡 🍗",
    "evt.body": "把你的专属时间表发到 Instagram 快拍吧！",
    "evt.step1": "选好想看的 DJ",
    "evt.step2": "在“生成壁纸”中保存 Instagram 9:16 图片",
    "evt.step3": "在快拍中标记 **@mainstageedm** 和 **@taestival_00** 即可！",
    "evt.note": "中奖公布等详情请查看 @mainstageedm 的 Instagram。",
    "evt.go": "去做我的时间表",
    "evt.insta": "查看 @mainstageedm",
    "evt.hideToday": "今天不再显示",
    "evt.tagline": "下一场音乐节的时间表也在 FestLock 🔒",
    "evt.follow": "关注 @festlock 抢先获取",
    "top.title": "DJ 排行", "rank.tabTop": "TOP 10", "rank.tabHour": "按时段", "rank.hourDesc": "与同一时段演出的 DJ 比较的排名。跨两个时段的 DJ 会同时出现在两边。",
    "top.desc": "按首次生成壁纸时所选的 DJ 统计。同一设备的同一位 DJ 只计一次。",
    "top.loading": "加载中…",
    "top.error": "无法加载统计数据，请稍后再试。",
    "top.empty": "还没有数据，来做第一张壁纸吧！",
    "top.count": "{n} 人",
    "hero.intro": "点按想看的艺人即可点亮。长按可在 Spotify、YouTube、Apple Music 试听。选好的阵容可保存为 Instagram 快拍(9:16)或手机壁纸(9:19)图片。",
    "hero.legend": "风格信息来自搜索确认。_以 ~ 开头的风格_是根据舞台风格等推测的，可能不准确。“暂无风格信息”表示未能确认。",
    "genre.none": "暂无风格信息",
    "tab.genre": "风格",
    help: "使用说明",
    "lang.label": "语言",
    "day.sat": "10.3 周六",
    "day.sun": "10.4 周日",
    "sum.sel": "已选 **{n}** 组",
    "sum.overlap": "⚠ 时间冲突 {n} 处",
    reset: "重置",
    "reset.arm": "再点一次全部清除",
    "make.wall": "生成壁纸",
    "foot.notice": "非官方信息整理页面，与 EDC、Insomniac 及主办方无关。时间表以官方海报为准，可能会有变动。",
    "foot.private": "照片与海报的版权和肖像权归各权利人所有。如需删除请私信 Instagram(@festlock)。",
    "blk.hold": "长按查看试听链接",
    overlap: "时间冲突",
    "art.title": "艺人",
    close: "关闭",
    "link.sp": "在 Spotify 收听",
    "link.yt": "在 YouTube 观看",
    "link.am": "在 Apple Music 收听",
    "search.note": "以上按钮只是按艺人名称**搜索**。Spotify、Apple Music 上可能没有该艺人的主页，也可能出现同名的其他艺人。",
    "tt.add": "加入我的时间表",
    "tt.remove": "从我的时间表移除",
    "app.note": "详细信息请查看 **Insomniac App**。",
    "exp.aria": "生成阵容图片",
    "exp.story": "Instagram 9:16",
    "exp.phone": "手机壁纸 9:19",
    "exp.lock": "为锁屏时钟留出空间",
    "exp.compact": "缩小顶部文字",
    "exp.both": "周六+周日",
    "limit.title": "稍等一下！",
    "limit.body": "短时间内点了好几次，下载统计暂时停止了。图片仍可正常保存，请放心。一分钟后再保存一次即可计入统计。",
    "limit.ok": "确定",
    "exp.stack": "上下排列",
    "exp.side": "左右排列",
    "exp.empty": "这一天还没有选择艺人，请先在时间表中点选。",
    "exp.pvAlt": "所选阵容预览",
    "exp.save": "保存图片",
    "exp.view": "放大查看",
    "exp.share": "分享",
    "exp.hint": "在应用内浏览器(KakaoTalk、Instagram 等)中，“保存图片”可能无法使用。此时请点“放大查看”，长按图片保存到相册。尺寸：Instagram 1080×1920(9:16)，手机壁纸 1080×2280(9:19)。",
    "viewer.aria": "放大图片",
    "viewer.hint": "**长按**图片即可保存到相册",
    "viewer.alt": "待保存的阵容图片",
    "toast.saved": "已保存。如果找不到，请在“放大查看”中长按图片",
    "toast.saveFail": "无法保存，已打开图片查看器，请长按图片",
    "toast.shareFail": "无法分享，请长按图片保存",
    "toast.shareNo": "此设备不支持分享，请长按图片保存",
    "tut.aria": "使用指南",
    "tut.skip": "跳过",
    "tut.next": "下一步",
    "tut.start": "开始使用",
    "tut.s1.t": "点按加入",
    "tut.s1.b": "点按一次想看的艺人，方块会亮起并加入你的时间表。再点一次即可移除。",
    "tut.s2.t": "长按试听",
    "tut.s2.b": "长按艺人会弹出试听窗口。点“下一步”看看是什么样子。",
    "tut.s3.t": "会弹出这样的窗口",
    "tut.s3.b": "点 Spotify、YouTube 或 Apple Music 按钮即可直接搜索该艺人。点 ✕ 或窗口外部即可关闭。",
    "tut.drop.t": "马上试听 Drop",
    "tut.drop.b": "窗口打开片刻后，顶部会出现 YouTube 播放器，直接播放 Drop（或整段视频）。",
    "tut.s4.t": "保存为壁纸",
    "tut.s4.b": "选好后，可在这里保存为 Instagram 快拍(9:16)或手机壁纸(9:19)图片。",
    "tut.save.ex": "会生成这样的图片(示例)",
    "tut.save.here": "您现在是在应用内浏览器(如 Instagram)中查看，保存按钮无法使用。请长按图片保存，或直接截图。在 Chrome 或 Safari 中打开即可用按钮直接保存。",
  },
  zht: {
    "doc.title": "EDC KOREA 2026 · 我的時間表",
    "home.docTitle": "FestLock · 把音樂節時間表做成鎖定畫面",
    "home.title": "把音樂節時間表放到你的鎖定畫面上",
    "home.sub": "只挑你想看的藝人，儲存為 Instagram 限時動態或手機桌布圖片。",
    "home.list": "音樂節",
    "home.notice": "非官方粉絲自製服務，與各音樂節主辦方無關。時間以官方公佈為準，可能會有變動。",
    "fest.soon": "即將開放",
    "fest.live": "已開放",
    "fest.ended": "已結束 · 回顧",
    "soon.title": "時間表準備中",
    "soon.body": "時間表一公佈，就能在這裡挑選你的陣容並做成鎖定畫面。",
    "soon.home": "看看其他音樂節",
    "edc.ended": "EDC KOREA 2026 已結束。仍可檢視時間表並製作桌布。",
    "stats.dl": "桌布下載 **{n}** 次",
    "stats.split": "週六 {sat} · 週日 {sun}",
    "top.btn": "DJ 排行",
    "evt.badge": "活動",
    "evt.title": "MSE 請你吃炸雞 🍗",
    "evt.body": "把你的專屬時間表發到 Instagram 限時動態吧！",
    "evt.step1": "選好想看的 DJ",
    "evt.step2": "在「生成桌布」中儲存 Instagram 9:16 圖片",
    "evt.step3": "在限時動態中標記 **@mainstageedm** 和 **@taestival_00** 即可！",
    "evt.note": "中獎公佈等詳情請檢視 @mainstageedm 的 Instagram。",
    "evt.go": "去做我的時間表",
    "evt.insta": "檢視 @mainstageedm",
    "evt.hideToday": "今天不再顯示",
    "evt.tagline": "下一場音樂節的時間表也在 FestLock 🔒",
    "evt.follow": "追蹤 @festlock 搶先收到",
    "top.title": "DJ 排行", "rank.tabTop": "TOP 10", "rank.tabHour": "按時段", "rank.hourDesc": "與同一時段演出的 DJ 比較的排名。跨兩個時段的 DJ 會同時出現在兩邊。",
    "top.desc": "按首次生成桌布時所選的 DJ 統計。同一裝置的同一位 DJ 只計一次。",
    "top.loading": "載入中…",
    "top.error": "無法載入統計資料，請稍後再試。",
    "top.empty": "還沒有資料，來做第一張桌布吧！",
    "top.count": "{n} 人",
    "hero.intro": "點按想看的藝人即可點亮。長按可在 Spotify、YouTube、Apple Music 試聽。選好的陣容可儲存為 Instagram 限時動態(9:16)或手機桌布(9:19)圖片。",
    "hero.legend": "風格資訊來自搜尋確認。_以 ~ 開頭的風格_是根據舞台風格等推測的，可能不準確。「暫無風格資訊」表示未能確認。",
    "genre.none": "暫無風格資訊",
    "tab.genre": "風格",
    help: "使用說明",
    "lang.label": "語言",
    "day.sat": "10.3 週六",
    "day.sun": "10.4 週日",
    "sum.sel": "已選 **{n}** 組",
    "sum.overlap": "⚠ 時間衝突 {n} 處",
    reset: "重置",
    "reset.arm": "再點一次全部清除",
    "make.wall": "生成桌布",
    "foot.notice": "非官方資訊整理頁面，與 EDC、Insomniac 及主辦方無關。時間表以官方海報為準，可能會有變動。",
    "foot.private": "照片與海報的版權和肖像權歸各權利人所有。如需刪除請私信 Instagram(@festlock)。",
    "blk.hold": "長按檢視試聽連結",
    overlap: "時間衝突",
    "art.title": "藝人",
    close: "關閉",
    "link.sp": "在 Spotify 收聽",
    "link.yt": "在 YouTube 觀看",
    "link.am": "在 Apple Music 收聽",
    "search.note": "以上按鈕只是按藝人名稱**搜尋**。Spotify、Apple Music 上可能沒有該藝人的主頁，也可能出現同名的其他藝人。",
    "tt.add": "加入我的時間表",
    "tt.remove": "從我的時間表移除",
    "app.note": "詳細資訊請檢視 **Insomniac App**。",
    "exp.aria": "生成陣容圖片",
    "exp.story": "Instagram 9:16",
    "exp.phone": "手機桌布 9:19",
    "exp.lock": "為鎖定畫面時鐘留出空間",
    "exp.compact": "縮小頂部文字",
    "exp.both": "週六+週日",
    "limit.title": "稍等一下！",
    "limit.body": "短時間內點了好幾次，下載統計暫時停止了。圖片仍可正常儲存，請放心。一分鐘後再儲存一次即可計入統計。",
    "limit.ok": "確定",
    "exp.stack": "上下排列",
    "exp.side": "左右排列",
    "exp.empty": "這一天還沒有選擇藝人，請先在時間表中點按。",
    "exp.pvAlt": "所選陣容預覽",
    "exp.save": "儲存圖片",
    "exp.view": "放大檢視",
    "exp.share": "分享",
    "exp.hint": "在 App 內建瀏覽器(KakaoTalk、Instagram 等)中，「儲存圖片」可能無法使用。此時請點「放大檢視」，長按圖片儲存到相簿。尺寸：Instagram 1080×1920(9:16)，手機桌布 1080×2280(9:19)。",
    "viewer.aria": "放大圖片",
    "viewer.hint": "**長按**圖片即可儲存到相簿",
    "viewer.alt": "待儲存的陣容圖片",
    "toast.saved": "已儲存。如果找不到，請在「放大檢視」中長按圖片",
    "toast.saveFail": "無法儲存，已開啟圖片檢視器，請長按圖片",
    "toast.shareFail": "無法分享，請長按圖片儲存",
    "toast.shareNo": "此裝置不支援分享，請長按圖片儲存",
    "tut.aria": "使用指南",
    "tut.skip": "跳過",
    "tut.next": "下一步",
    "tut.start": "開始使用",
    "tut.s1.t": "點按加入",
    "tut.s1.b": "點按一次想看的藝人，方塊會亮起並加入你的時間表。再點一次即可移除。",
    "tut.s2.t": "長按試聽",
    "tut.s2.b": "長按藝人會彈出試聽視窗。點「下一步」看看是什麼樣子。",
    "tut.s3.t": "會彈出這樣的視窗",
    "tut.s3.b": "點 Spotify、YouTube 或 Apple Music 按鈕即可直接搜尋該藝人。點 ✕ 或視窗外部即可關閉。",
    "tut.drop.t": "馬上試聽 Drop",
    "tut.drop.b": "視窗開啟片刻後，頂部會出現 YouTube 播放器，直接播放 Drop（或整段影片）。",
    "tut.s4.t": "儲存為桌布",
    "tut.s4.b": "選好後，可在這裡儲存為 Instagram 限時動態(9:16)或手機桌布(9:19)圖片。",
    "tut.save.ex": "會生成這樣的圖片(示例)",
    "tut.save.here": "您現在是在 App 內建瀏覽器(如 Instagram)中檢視，儲存按鈕無法使用。請長按圖片儲存，或直接截圖。在 Chrome 或 Safari 中開啟即可用按鈕直接儲存。",
  },
};

// 새 페스티벌 페이지 문구 합치기
for (const l of Object.keys(FEST_T) as Lang[]) Object.assign(T[l], FEST_T[l]);

// 데이터(장르)에 들어 있는 한국어 조각 번역
const GENRE_PARTS: [string, Record<Lang, string>][] = [
  ["(스테이지 기준)", { ko: "(스테이지 기준)", en: "(by stage)", ja: "(ステージ傾向)", zh: "(按舞台推测)", zht: "(按舞台推測)" }],
  ["(DJ Snake의 베이스 부캐)", { ko: "(DJ Snake의 베이스 부캐)", en: "(DJ Snake's bass alias)", ja: "(DJ Snakeのベース別名義)", zh: "(DJ Snake 的贝斯分身)", zht: "(DJ Snake 的貝斯分身)" }],
  ["크로스 장르", { ko: "크로스 장르", en: "Cross-genre", ja: "クロスジャンル", zh: "跨风格", zht: "跨風格" }],
];

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** 블록·시트에 보일 장르 문구와 표시 클래스(추정 gi / 정보 없음 gu) */
  genre: (it: Item) => { t: string; c: string };
  dayLabel: (dayId: string) => string;
}
const I18n = createContext<Ctx | null>(null);

export function LangProvider({ children, titleKey = "doc.title" }: { children: ReactNode; titleKey?: string }) {
  const [lang, setLangState] = useState<Lang>(detect);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* 무시 */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
    document.title = T[lang][titleKey] ?? T.ko[titleKey] ?? "FestLock";
  }, [lang, titleKey]);

  const value = useMemo<Ctx>(() => {
    const t = (key: string, vars?: Record<string, string | number>) => {
      let s = T[lang][key] ?? T.ko[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split("{" + k + "}").join(String(v));
      return s;
    };
    const genre = (it: Item) => {
      if (it.genreConf === "unknown" || !it.genre) return { t: t("genre.none"), c: "gu" };
      let g = it.genre;
      for (const [ko, tr] of GENRE_PARTS) g = g.split(ko).join(tr[lang]);
      return it.genreConf === "inferred" ? { t: "~ " + g, c: "gi" } : { t: g, c: "" };
    };
    return { lang, setLang, t, genre, dayLabel: (id: string) => t("day." + id) };
  }, [lang, setLang]);

  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18n);
  if (!c) throw new Error("LangProvider missing");
  return c;
}

/** **굵게** / _기울임_ 을 태그로 바꿔서 보여준다 */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <b key={i}>{p.slice(2, -2)}</b>
        ) : p.length > 2 && p.startsWith("_") && p.endsWith("_") ? (
          <i key={i}>{p.slice(1, -1)}</i>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** 🌐 언어 선택 버튼 + 목록 */
export function LangMenu() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  useBackClose(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!(e.target as Element).closest?.(".lang")) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const cur = LANGS.find((l) => l.id === lang)!;
  return (
    <div className="lang">
      <button type="button" className="lang-btn" aria-haspopup="true" aria-expanded={open} aria-label={t("lang.label")} onClick={() => setOpen((v) => !v)}>
        <span aria-hidden="true">🌐</span> {cur.name} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="lang-menu" role="menu">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="menuitemradio"
              aria-checked={l.id === lang}
              lang={HTML_LANG[l.id]}
              onClick={() => {
                setLang(l.id);
                setOpen(false);
              }}
            >
              {l.name}
              {l.id === lang && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
