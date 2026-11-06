# 새 페스티벌 추가 가이드

FestLock에 페스티벌을 넣는 방법입니다. 상황에 따라 세 단계로 나뉩니다. 필요한 단계까지만 하세요.

| 단계 | 하는 일 | 걸리는 시간 | 코드 작성 |
|---|---|---|---|
| 1. 준비 중 공개 | 홈에 카드만 올리고 "준비 중" 페이지로 연결 | 10분 | 없음 (JSON 한 줄) |
| 2. 라인업 공개 (기존 화면 재사용) | 라인업 데이터 + 기존 화면 연결 | 수 시간 | 데이터 파일 |
| 3. 새 화면이 필요한 경우 | 레이아웃이 기존과 다름 | 하루 이상 | 데이터 + 화면 |

> 주소(slug)는 한번 공개하면 바꾸지 마세요. 링크가 깨집니다.

---

## 0. 먼저 알아둘 구조

- **`src/festivals.json`** 이 목록의 기준입니다. 홈 카드, 주소, 링크 미리보기 문구가 모두 여기서 나옵니다.
- 주소는 `/{slug}` 입니다 (예: `/nol-festival`). 별칭은 `aliases`로 추가합니다 (예: `/edc`).
- 화면 코드는 `src/fest/registry.tsx`의 `PAGES`가 `"page"` 값과 연결합니다.
- 사진(얼굴)은 저장소에 없고 Vercel Blob에 있습니다. 코드는 `VITE_FACE_BASE` 환경변수로 주소를 읽습니다.
- 빌드 중 `scripts/route-html.mjs`가 페스티벌마다 미리보기용 HTML을 따로 만듭니다 (카톡·인스타는 이 HTML의 태그만 읽습니다).

---

## 1단계. "준비 중"으로 먼저 공개하기

`src/festivals.json` 배열에 항목을 추가합니다. 기존 항목(예: `grand-mint-festival`)을 복사해서 고치면 편합니다.

```json
{
  "slug": "my-festival-2027",
  "name": { "ko": "마이 페스티벌 2027", "en": "My Festival 2027", "ja": "マイフェス 2027", "zh": "My Festival 2027" },
  "dates": "2027.05.01 – 05.02",
  "start": "2027-05-01",
  "end": "2027-05-02",
  "venue": { "ko": "올림픽공원", "en": "Olympic Park", "ja": "オリンピック公園", "zh": "奥林匹克公园" },
  "ready": false,
  "thumb": "/poster/my-festival-key.webp",
  "posters": [],
  "color": "#f07aa9",
  "color2": "#2e9c87",
  "og": {
    "title": "마이 페스티벌 2027 타임테이블 | FestLock",
    "desc": "타임테이블이 공개되면 알려 드릴게요.",
    "img": "/og/my-festival.jpg"
  }
}
```

| 필드 | 설명 |
|---|---|
| `slug` | 주소. 영문 소문자·숫자·하이픈. 연도를 붙이면 매년 새 주소가 됩니다 |
| `ready` | `false`면 "준비 중" 페이지(`src/pages/Soon.tsx`), `true`면 `page`가 가리키는 화면 |
| `start` / `end` | `YYYY-MM-DD`. 홈 카드의 D-day, "종료" 표시 계산에 씁니다 |
| `thumb`, `posters` | 홈 카드 이미지와 준비 중 페이지에 보일 포스터. 파일은 `public/poster/`에 둡니다 |
| `color`, `color2` | 카드 포인트 색 |
| `og` | 링크 미리보기 제목·설명·이미지(1200×630 권장, `public/og/`) |
| `aliases` | (선택) 짧은 별칭 주소. 예: `["edc"]` → `/edc` |
| `utc` | (선택) 현지 시간대(UTC 기준 시차). 해외 페스티벌은 필수 (예: 올랜도 `-5`) |
| `page`, `titleKey` | 2단계 이후에 채웁니다 |

이미지를 추가했다면 `public/poster/`, `public/og/`에 넣으세요. 공식 포스터를 쓸 때는 권리 안내 문구(푸터)가 이미 있지만, 주최측 요청이 오면 바로 내릴 수 있게 파일 이름을 기억해 두세요.

확인:

```bash
npm run dev          # http://localhost:5173/my-festival-2027
npm run build        # 통과해야 합니다
```

---

## 2단계. 라인업을 넣어 시간표 공개하기

### 2-1. 데이터 파일 만들기: `src/fest/<이름>.ts`

가장 쉬운 예시는 `src/fest/nol.ts` 와 `gmf.ts` 입니다. 구성은 세 가지입니다.

```ts
import { rows, type FDay, type FStage } from "./types";

export const MYF_DAYS: FDay[] = [
  { id: "sat", date: "2027-05-01", short: "5/1 SAT", label: { ko: "5.1 토", en: "Sat 5/1", ja: "5/1 土", zh: "5/1 周六" } },
  { id: "sun", date: "2027-05-02", short: "5/2 SUN", label: { ko: "5.2 일", en: "Sun 5/2", ja: "5/2 日", zh: "5/2 周日" } },
];

export const MYF_STAGES: FStage[] = [
  { key: "main", name: "MAIN STAGE", place: "잔디마당", color: "#2e9c87", ink: "#fffaf0" },
];

// [시작, 끝, id, 한글 이름, 영문 이름]
export const MYF_ITEMS = [
  ...rows("sat", "main", [
    ["13:00", "13:40", "artist-a", "아티스트A", "Artist A"],
    ["14:00", "14:40", "artist-b", "아티스트B", "Artist B"],
  ]),
];
```

규칙:
- **시간은 `HH:MM`, 자정을 넘기면 `25:30`처럼** 24를 넘겨서 적습니다 (`types.ts`의 `t2m`).
- 끝나는 시간이 미발표면 항목에 `open: true`를 쓰고 추정 시각을 넣습니다.
- **`id`는 영문 소문자·숫자·하이픈이고, 같은 페스티벌 안에서 유일**해야 합니다. 사진 파일 이름과 집계에 쓰이므로 한번 정하면 바꾸지 마세요.
- 같은 아티스트가 여러 번 나오면 id 뒤에 `-2`처럼 구분하되, 사진은 공통 id로 찾을 수 있게 `GmfPage`처럼 처리한 방식을 참고하세요.
- 토크·이벤트가 있으면 `kind`(`talk`/`event`/`perf`)를 씁니다. 형식은 `gmf.ts`의 `radar()` 참고.
- 무대가 여러 개이고 티켓이 따로면 `nol.ts`처럼 무대별 탭 구조를 씁니다. 한 무대 위주면 `gmf.ts` 구조가 단순합니다.

### 2-2. 화면 연결 (기존 화면 재사용)

가장 비슷한 화면을 고릅니다. 무대 탭이 있으면 `NolPage`, 무대를 한 화면에 나열하면 `GmfPage`, 다일차 해외 행사면 `OrlPage`.
복사해서 `MyfPage.tsx`를 만들고 import와 상수 이름만 바꾸는 게 현실적입니다. 공통 부품은 `src/fest/shell.tsx`(알림, 지우기 버튼, 푸터), `common.ts`, `parts.tsx`에 있으니 새로 만들지 마세요.

### 2-3. 등록

1. `src/fest/registry.tsx`의 `PAGES`에 한 줄 추가:
   ```tsx
   myf: MyfPage,
   ```
2. `src/festivals.json`에서 `"ready": true`, `"page": "myf"`, `"titleKey": "f.doc.myf"` 로 바꿉니다.
3. `src/fest/strings.ts`(필요하면 `src/i18n.tsx`)에 탭 제목 문구 `f.doc.myf`를 **4개 언어(ko/en/ja/zh)** 모두 추가합니다.

### 2-4. 다운로드 수·인기 랭킹 연결 (집계를 쓰는 경우)

화면이 "다운로드 수/인기 DJ"를 보여 준다면 아래를 모두 맞춰야 합니다. 하나라도 빠지면 집계가 거절됩니다.

| 파일 | 할 일 |
|---|---|
| `src/fest/festStats.ts` | `FestKey` 타입에 `"myf"` 추가, `FEST_DAYS`와 `DEMO_META`에 한 줄씩 추가 (`DEMO_META`는 localhost용 가짜 숫자) |
| `api/fest-download.ts` | `DAYS`에 날짜 id 목록 추가, `LINEUP`에 `MYF_IDS` 추가 |
| `api/fest-stats.ts` | `DAYS`에 같은 목록 추가 |
| `scripts/sync-lineup.mjs` | `lists`에 `myf: ids("src/fest/myf.ts")` 추가 |

그다음 **라인업을 고칠 때마다**:

```bash
node scripts/sync-lineup.mjs
```

`api/fest-download.ts`의 `<lineup:auto>` 블록을 새로 씁니다. 서버 함수는 `src/`를 import하지 못해서(Vercel에서 오류) id 목록을 파일 안에 복사해 두는 구조입니다. 이걸 안 하면 `npm run build`가 "집계 서버의 라인업 목록이 화면 데이터와 달라요"로 실패하니, 빌드가 알려 줍니다.

---

## 3단계. 얼굴 사진 (선택)

사진이 없으면 이니셜 아이콘으로 나와도 문제없습니다. 사진을 쓰려면:

1. 스크린샷을 `_inbox/{id}.jpg`로 저장(이 폴더는 git에 안 올라갑니다) → `npm run faces` 실행 → `faces-src/` 아래에 320×320 webp가 생깁니다. 페스티벌별 폴더는 `faces-src/myf/{id}.webp`.
   크롭 위치를 직접 정하려면 `npm run faces -- _inbox/crops.json` (형식은 `scripts/make-faces.mjs` 상단 주석).
2. 화면 코드에서 페스티벌 키를 `festFace("myf", id)`로 부릅니다 (`src/fest/faces.ts`). 주소는 `{VITE_FACE_BASE}/myf/{id}.webp`가 됩니다.
3. 업로드: 로컬 `.env.local`에 `BLOB_READ_WRITE_TOKEN=...` 을 넣고
   ```bash
   npm run upload-faces
   ```
   (토큰은 Vercel → Storage → `festlock-blob` → `.env.local` 탭에서 복사. 레포에 절대 올리지 마세요. `.env.*`는 git이 무시합니다.)
4. **`faces-src/`와 사진 파일은 레포에 커밋하지 않습니다.** 팀원끼리는 별도로 공유하세요.

사진을 내려야 하면 Blob 대시보드에서 해당 파일을 지우면 즉시 내려갑니다.

---

## 배포 전 점검 목록

- [ ] `npm run build` 통과 (라인업 일치 검사·타입 검사 포함)
- [ ] `/{slug}` 와 별칭 주소가 열린다
- [ ] 4개 언어(ko/en/ja/zh)로 전환해도 문구가 비지 않는다
- [ ] 폰 너비(375px)에서 레이아웃이 깨지지 않는다
- [ ] "이미지로 저장"이 되고, 사진이 있으면 사진이 들어간다
- [ ] 링크 미리보기: `og.title`·`og.desc`·`og.img` 확인
- [ ] 홈에서 카드 순서·D-day·"종료" 표시가 맞다
- [ ] 푸터에 비공식·권리 안내 문구가 보인다

## 자주 막히는 곳

| 증상 | 원인·해결 |
|---|---|
| 빌드가 "라인업 목록이 달라요"로 실패 | `node scripts/sync-lineup.mjs` 실행 후 변경분 커밋 |
| 새 주소가 배포본에서 404 | `festivals.json`에 항목이 없거나 `slug` 오타. 별칭은 `aliases`에 넣어야 파일이 생깁니다 |
| 사진이 안 나온다 | Vercel 환경변수 `VITE_FACE_BASE` 확인(빌드할 때 들어가므로 바꾸면 Redeploy), Blob에 파일이 있는지 |
| 이미지 저장 때만 사진이 빠진다 | 사진 서버의 CORS 문제. Blob은 허용하지만 다른 호스팅을 쓰면 `Access-Control-Allow-Origin` 필요 |
| 미리보기에 이전 주소가 박힌다 | `SITE_URL` 환경변수(`https://www.festlock.com`) 확인 후 Redeploy |
| 집계가 안 올라간다 | `api/` 세 파일과 `festStats.ts`의 날짜 id·페스티벌 키가 서로 같은지 확인 |

## 참고

- 환경변수: `VITE_FACE_BASE`(사진 주소), `SITE_URL`(미리보기 주소), Upstash Redis 연결 변수(`KV_REST_API_*`)
- `public/drops.json`은 Drop Studio가 만드는 파일입니다. 직접 고치지 마세요 (빌드 때 `scripts/check-drops.mjs`가 모양을 검사합니다)
- 링크 미리보기와 `robots.txt`는 지금 검색 노출을 막아 둔 상태입니다. 정식 출시 때 `public/robots.txt`와 `vercel.json`의 `X-Robots-Tag`를 바꿉니다.
