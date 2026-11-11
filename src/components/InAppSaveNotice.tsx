import { useI18n } from "../i18n";
import { useBackClose } from "../backClose";
import { IN_APP, externalUrl } from "../inApp";

/**
 * 인스타그램·카카오톡 안 브라우저에서 "이미지 저장"을 눌렀을 때.
 * 이런 브라우저는 <a download> 저장을 조용히 무시해서(아무 일도 안 일어난다) 저장한 것처럼 보이면 안 된다.
 * → 안내 + 휴대폰 브라우저로 열기(가능한 경우) + 크게 보기(꾹 눌러 저장)
 */
export function InAppSaveNotice({ onClose, onView }: { onClose: () => void; onView: () => void }) {
  const { t } = useI18n();
  useBackClose(true, onClose);
  const ext = externalUrl();
  return (
    <div className="evt" role="alertdialog" aria-modal="true" aria-label={t("f.inapp.save.title")} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="evt-card limit-card">
        <div className="limit-emoji" aria-hidden="true">
          📲
        </div>
        <h2>{t("f.inapp.save.title")}</h2>
        <p className="evt-lead">{t(IN_APP === "kakao" ? "f.inapp.save.kakao" : "f.inapp.save.body")}</p>
        {ext && (
          <a className="btn main evt-go" href={ext}>
            {t("f.inapp.open")}
          </a>
        )}
        <button
          className={"btn evt-go " + (ext ? "ghost" : "main")}
          type="button"
          onClick={() => {
            onClose();
            onView();
          }}
        >
          {t("f.inapp.view")}
        </button>
      </div>
    </div>
  );
}
