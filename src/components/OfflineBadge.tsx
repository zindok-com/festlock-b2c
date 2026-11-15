import { useI18n, type Lang } from "../i18n";
import { BUILD_TIME } from "../offline";

const LOCALE: Record<Lang, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN", zht: "zh-TW", es: "es", vi: "vi-VN", th: "th-TH", id: "id-ID" };

/** 월·일·시:분 (사용자 언어, 기기 시간대) */
export function shortTime(ms: number, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(LOCALE[lang], { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(ms);
  } catch {
    return new Date(ms).toLocaleString();
  }
}

/** 인터넷이 없을 때 위쪽에 뜨는 작은 안내: 사진 없이 이름만 나오고, 시간표가 언제 기준인지 알려 준다 */
export function OfflineBadge() {
  const { t, online, lang } = useI18n();
  if (online) return null;
  const asOf = BUILD_TIME ? shortTime(Date.parse(BUILD_TIME), lang) : "";
  return (
    <div className="off-badge" role="status">
      <span aria-hidden="true">📶 </span>
      {t("off.badge")}
      {asOf && <small>{t("off.asof", { t: asOf })}</small>}
    </div>
  );
}
