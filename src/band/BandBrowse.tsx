// /collection/browse — 다른 사람들의 컬렉션 구경하기: 정렬 · 페스티벌 거르기 · 카드 목록 · 더 보기
// (전체 화면 3D 컬렉션 /collection 의 왼쪽 위 "구경하기" 버튼으로 들어온다)
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { useOnline } from "../offline";
import { FESTIVALS } from "../festivals";
import { BandTop, DemoBadge } from "./common";
import { loadCollectors, type CollectorCard, type Sort } from "./api";

type State = "loading" | "ok" | "error" | "offline";
export const BROWSE_PATH = "/collection/browse";

/** 주소의 ?fest=·?sort= 를 읽어 둔다 (컬렉터 페이지에서 뒤로 왔을 때 같은 목록) */
function readQuery(): { fest: string; sort: Sort } {
  const q = new URLSearchParams(location.search);
  const fest = q.get("fest") || "";
  return { fest: FESTIVALS.some((f) => f.slug === fest) ? fest : "", sort: q.get("sort") === "most" ? "most" : "recent" };
}

function Skeleton() {
  return (
    <ul className="band-list" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="band-card band-skel">
          <span className="band-card-t">
            <i className="band-skel-line w60" />
            <i className="band-skel-line w30" />
          </span>
          <span className="band-thumbs">
            <i />
            <i />
            <i />
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function BandBrowse() {
  const { t, lang } = useI18n();
  const online = useOnline();
  const init = useRef(readQuery());
  const [sort, setSort] = useState<Sort>(init.current.sort);
  const [fest, setFest] = useState(init.current.fest);
  const [list, setList] = useState<CollectorCard[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [state, setState] = useState<State>("loading");
  const [more, setMore] = useState<"idle" | "busy" | "error">("idle");
  const [demo, setDemo] = useState(false);
  const [tick, setTick] = useState(0);
  const req = useRef(0);

  // 정렬·거르기가 바뀌면 첫 쪽부터 다시
  useEffect(() => {
    const id = ++req.current;
    setState("loading");
    setMore("idle");
    loadCollectors({ fest, sort, cursor: 0 }).then((r) => {
      if (id !== req.current) return;
      if (r.kind === "ok") {
        setList(r.data.list);
        setNext(r.data.next);
        setDemo(r.demo);
        setState("ok");
      } else setState(r.kind === "offline" ? "offline" : "error");
    });
    // 주소에 남겨 둔다 (공유·뒤로가기)
    const q = new URLSearchParams();
    if (fest) q.set("fest", fest);
    else if (sort === "most") q.set("sort", "most");
    const s = q.toString();
    history.replaceState(history.state, "", BROWSE_PATH + (s ? "?" + s : ""));
  }, [fest, sort, tick]);

  // 인터넷이 다시 연결되면 저절로 다시 불러온다
  useEffect(() => {
    if (online && state === "offline") setTick((n) => n + 1);
  }, [online, state]);

  const loadMore = useCallback(() => {
    if (next == null) return;
    const id = req.current;
    setMore("busy");
    loadCollectors({ fest, sort, cursor: next }).then((r) => {
      if (id !== req.current) return;
      if (r.kind === "ok") {
        setList((old) => {
          const seen = new Set(old.map((c) => c.id));
          return [...old, ...r.data.list.filter((c) => !seen.has(c.id))];
        });
        setNext(r.data.next);
        setMore("idle");
      } else setMore("error");
    });
  }, [fest, sort, next]);

  const effSort: Sort = fest ? "recent" : sort;

  return (
    <div className="wrap home band-page">
      <BandTop />
      {demo && <DemoBadge />}
      <a className="band-back" href="/collection">
        <span aria-hidden="true">←</span>
        {t("band.back.mine")}
      </a>

      <section className="band-hero">
        <h1 className="band-title">{t("band.browse")}</h1>
        <p className="band-sub">{t("band.browse.sub")}</p>
      </section>

      <div className="band-sort" role="group" aria-label={t("band.sort.label")}>
        {(["recent", "most"] as Sort[]).map((s) => (
          <button key={s} type="button" aria-pressed={effSort === s} disabled={!!fest && s === "most"} onClick={() => setSort(s)}>
            {t("band.sort." + s)}
          </button>
        ))}
      </div>
      <div className="band-chips" role="group" aria-label={t("band.fest.label")}>
        <button type="button" className="band-chip" aria-pressed={!fest} onClick={() => setFest("")}>
          {t("band.fest.all")}
        </button>
        {FESTIVALS.map((f) => (
          <button key={f.slug} type="button" className="band-chip" data-fest={f.slug} aria-pressed={fest === f.slug} onClick={() => setFest(f.slug)}>
            {f.name[lang]}
          </button>
        ))}
      </div>
      {fest && <p className="band-hint">{t("band.sort.festOnly")}</p>}

      <div aria-live="polite" aria-busy={state === "loading"}>
        {state === "loading" && (
          <>
            <p className="band-sr">{t("band.loading")}</p>
            <Skeleton />
          </>
        )}
        {state === "offline" && <p className="band-state band-offline">{t("band.offline")}</p>}
        {state === "error" && (
          <div className="band-state band-error">
            <p>{t("band.error")}</p>
            <button type="button" className="btn ghost band-retry" onClick={() => setTick((n) => n + 1)}>
              {t("band.retry")}
            </button>
          </div>
        )}
        {state === "ok" && list.length === 0 && <p className="band-state band-empty">{t("band.empty")}</p>}
        {state === "ok" && list.length > 0 && (
          <ul className="band-list">
            {list.map((c) => (
              <li key={c.id}>
                <a className="band-card" href={"/c/" + c.id} aria-label={t("band.open", { name: c.name }) + " · " + t("band.count", { n: c.count })}>
                  <span className="band-card-t">
                    <span className="band-card-name">{c.name}</span>
                    <span className="band-card-n">{t("band.count", { n: c.count })}</span>
                  </span>
                  <span className="band-thumbs" aria-hidden="true">
                    {c.thumbs.map((src, i) => (
                      <img key={i} src={src} alt="" loading="lazy" decoding="async" />
                    ))}
                  </span>
                  <span className="band-card-go" aria-hidden="true">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {state === "ok" && next != null && (
          <button type="button" className="btn ghost band-more" disabled={more === "busy"} onClick={loadMore}>
            {more === "busy" ? t("band.loading") : more === "error" ? t("band.error") + " · " + t("band.retry") : t("band.more")}
          </button>
        )}
      </div>

      <footer className="foot band-foot">
        <p>{t("band.foot")}</p>
      </footer>
    </div>
  );
}
