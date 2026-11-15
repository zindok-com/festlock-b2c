import { useI18n } from "../i18n";
import { useBackClose } from "../backClose";

/** 이미지를 저장하기 직전에 한 번 뜨는 "곧 앱으로 나와요" 안내. 인스타 팔로우로 이어 주고, 저장은 이어서 계속한다 */
export function AppSoonPopup({ onContinue, onClose }: { onContinue: () => void; onClose: () => void }) {
  const { t } = useI18n();
  useBackClose(true, onClose);
  return (
    <div className="evt" role="alertdialog" aria-modal="true" aria-label={t("app.soon.title")} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="evt-card limit-card app-soon-pop">
        <img className="app-soon-logo" src="/event/festlock.webp" alt="" width={56} height={56} />
        <h2>{t("app.soon.title")}</h2>
        <p className="evt-lead">{t("app.soon.body")}</p>
        <a className="btn main evt-go" href="https://www.instagram.com/festlock/" target="_blank" rel="noopener noreferrer">
          {t("app.soon.go")} →
        </a>
        <button className="btn ghost evt-go app-soon-save" type="button" onClick={onContinue} autoFocus>
          {t("app.soon.save")}
        </button>
      </div>
    </div>
  );
}
