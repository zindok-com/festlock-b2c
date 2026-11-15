import { useI18n } from "../i18n";

/** 배경화면 만들기 팝업 안에 넣는 "곧 앱으로 나와요" 안내. 인스타그램 팔로우로 연결한다 */
export function AppSoonNote() {
  const { t } = useI18n();
  return (
    <a className="app-soon" href="https://www.instagram.com/festlock/" target="_blank" rel="noopener noreferrer">
      <img src="/event/festlock.webp" alt="" width={40} height={40} loading="lazy" />
      <span className="app-soon-txt">
        <b>{t("app.soon.title")}</b>
        <span>{t("app.soon.body")}</span>
        <em>{t("app.soon.go")} →</em>
      </span>
    </a>
  );
}
