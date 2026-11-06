// 페스티벌 화면들이 똑같이 쓰는 조각 (알림 토스트, 2번 눌러 지우기, 스크롤 잠금, 하단 푸터)
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";
import { SHOW_FACES } from "../config";

const FESTLOCK_INSTA = "https://www.instagram.com/festlock/";

/** 아래쪽에 잠깐 뜨는 알림. toast("문구")로 띄우고, 화면 맨 아래에 {node}를 넣는다 */
export function useToast() {
  const [msg, setMsg] = useState("");
  const [on, setOn] = useState(false);
  const timer = useRef<number>();
  const toast = useCallback((m: string) => {
    setMsg(m);
    setOn(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOn(false), 2800);
  }, []);
  const node = (
    <div className={"toast" + (on ? " show" : "")} role="status" aria-live="polite">
      {msg}
    </div>
  );
  return { toast, node };
}

/** "지우기" 버튼: 처음 누르면 확인 상태(armed), 3초 안에 한 번 더 누르면 action 실행 */
export function useArmedReset(action: () => void) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number>();
  function reset() {
    if (armed) {
      action();
      setArmed(false);
      clearTimeout(timer.current);
      return;
    }
    setArmed(true);
    timer.current = window.setTimeout(() => setArmed(false), 3000);
  }
  return { armed, reset };
}

/** 창·시트가 열려 있으면 뒤 화면 스크롤을 잠근다 */
export function useBodyLock(locked: boolean) {
  useEffect(() => {
    document.body.classList.toggle("lock", locked);
  }, [locked]);
}

/** 페이지 맨 아래: 인스타 팔로우 + 안내 문구. note는 페스티벌별 안내 한 줄 */
export function FestFooter({ note }: { note: ReactNode }) {
  const { t } = useI18n();
  return (
    <footer className="foot">
      <a className="evt-follow foot-follow" href={FESTLOCK_INSTA} target="_blank" rel="noopener noreferrer">
        <img src="/event/festlock.webp" alt="" width={36} height={36} />
        <span>
          <b>{t("evt.tagline")}</b>
          <span>{t("evt.follow")} →</span>
        </span>
      </a>
      <p>{note}</p>
      {SHOW_FACES && <p>{t("foot.private")}</p>}
    </footer>
  );
}
