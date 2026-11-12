# 새 페스티벌 추가 가이드

FestLock에 페스티벌을 넣는 방법입니다. 상황에 따라 세 단계로 나뉩니다. 필요한 단계까지만 하세요.

| 단계 | 하는 일 | 걸리는 시간 | 코드 작성 |
|---|---|---|---|
| 1. 준비 중 공개 | 홈에 카드만 올리고 "준비 중" 페이지로 연결 | 10분 | 없음 (JSON 한 줄) |
| 2. 라인업 공개 (기존 화면 재사용) | 라인업 데이터 + 기존 화면 연결 | 수 시간 | 데이터 파일 |
| 3. 새 화면이 필요한 경우 | 레이아웃이 기존과 다름 | 하루 이상 | 데이터 + 화면 |

> 주소(slug)는 한번 공개하면 바꾸지 마세요. 링크가 깨집니다.

> **앞으로 만드는 페스티벌은 ZONNAFE 구조 + 필수 7가지(영상 자동재생·장르·얼굴 사진·AI 추천·이미지 최적화·무대 6개 이상일 때 위치 지도·✕ 버튼)를 따릅니다. 시작 전에 [새-페스티벌-표준-지침.md](새-페스티벌-표준-지침.md)를 먼저 읽고, 맨 아래 체크리스트로 끝냅니다.**

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
3. `src/fest/strings.ts`(필요하면 `src/i18n.tsx`)에 탭 제목 문구 `f.doc.myf`를 **5개 언어(ko/en/ja/zh 간체/zht 번체)** 모두 추가합니다.

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

> **사진을 바꿔서 같은 이름으로 다시 올렸다면** `src/fest/faces.ts`의 `PHOTO_VERSION`에서 그 페스티벌의 번호를 하나 올리세요. 사진이 30일 동안 브라우저·CDN에 캐시돼서, 번호를 올려 주소 뒤 `?v=번호`를 바꿔야 새 사진을 받습니다.

> **두 명이서 하는 공연:** 시간표·배경화면에는 두 사람을 합친 사진 한 장(`faces-src/<키>/{id}.webp`)을, 아티스트 창에는 사진 두 장(`{id}-1.webp`, `{id}-2.webp`)을 따로 보여 줍니다. 라인업 파일(`zon.ts`의 `ZON_DUO`)에 그 공연의 id를 적으면 됩니다. 이름이 `A & B`이면 사진 아래에 이름이 각각 붙습니다. 합친 사진은 가로로 좁은 칸에서도 두 얼굴이 보이게 **세로로 긴 조각 둘을 나란히** 붙입니다.

> **얼굴이 안 보이는 사진 고르기:** 자동으로 가운데를 자르면 몸통·배경이 나오는 사진이 있습니다. 얼굴 인식(OpenCV)으로 얼굴이 가운데 위쪽에 오게 자르고, 인식이 틀린 사진은 눈으로 보고 좌표를 손으로 정했습니다. 사진 칸은 가로로 좁아서(78px) **얼굴이 사진 가로 한가운데에 있어야** 잘리지 않습니다.

> 올리기 전에 내 PC에서 사진을 보려면 `.env.local`에 `VITE_FACE_BASE=/__faces` 를 넣고 `npm run dev`. 개발 서버가 `faces-src/`를 그대로 보여 줍니다 (배포본에는 영향 없음).

---

## 4단계. 미리보기 영상 (선택)

아티스트·주최측이 준 영상(mp4·mov)이 있으면, 아티스트 창(꾹 누르면 뜨는 창) 맨 위에 **미리보기 영상**으로 보여 줍니다. 창이 열리면 **자동 재생**됩니다. 영상이 있는 아티스트는 유튜브 드랍 대신 이 영상이 나오고, 없는 아티스트는 기존대로(유튜브 드랍 또는 없음) 나옵니다. 화면 코드는 건드릴 필요가 없습니다.

> 아이폰·앱 안 브라우저 재생 규칙과 테스트 방법은 **[영상-미리보기-플레이어-지침.md](영상-미리보기-플레이어-지침.md)** (유튜브는 [유튜브-드랍-플레이어-지침.md](유튜브-드랍-플레이어-지침.md)). 플레이어를 고쳤다면 개발 서버만 보지 말고 **빌드 + WebKit(아이폰 엔진)** 으로 확인하세요.

구조는 얼굴 사진과 같습니다. 영상 파일은 저장소에 없고 Vercel Blob(`festlock-blob`)의 `clips/` 폴더에 있으며, 어떤 아티스트에게 영상이 있는지는 `public/clips.json`(스크립트가 만드는 목록, 커밋함)이 알려 줍니다.

**순서**

1. 원본을 준비합니다. 둘 중 하나:
   - `_inbox/clips/<키>/{id}.mp4` 처럼 **id를 파일 이름으로** 넣거나 (예: `_inbox/clips/zon/ak.mp4`)
   - 원본이 다른 폴더에 흩어져 있으면 표를 만듭니다: `_inbox/zon-clips.json`
     ```json
     { "ak": { "src": "D:/받은영상/AK/waterbomb.mp4" }, "roha": { "src": "D:/받은영상/ROHA.mp4", "start": 12, "len": 20 } }
     ```
   `<키>`는 `festivals.json`의 `"page"` 값(예: `zon`), `id`는 라인업 파일의 id와 같아야 합니다.
2. 변환 (ffmpeg 필요. 윈도우: `winget install Gyan.FFmpeg`):
   ```bash
   npm run clips -- zon                        # _inbox/clips/zon/ 폴더 기준
   npm run clips -- zon _inbox/zon-clips.json   # 표 기준
   ```
   `clips-src/zon/{id}.mp4`가 생기고 `public/clips.json`의 그 페스티벌 목록이 새로 써집니다. 이미 만든 영상은 건너뜁니다(`--force`로 다시 만듦).
3. 내 PC에서 확인: `npm run dev` → 아티스트를 꾹 눌러 영상이 나오는지 봅니다 (개발 서버는 `clips-src/`를 바로 보여 줍니다. 올리기 전에도 보입니다).
4. 업로드: `.env.local`에 `BLOB_READ_WRITE_TOKEN=...` (3단계와 같은 토큰)을 넣고
   ```bash
   npm run upload-clips
   ```
   바뀐 영상만 올라가고, `public/clips.json`의 `"base"`에 Blob 주소가 채워집니다.
5. **`public/clips.json`을 커밋하고 배포**합니다. (`clips-src/`는 커밋하지 않습니다.) 목록에 영상이 있는데 업로드를 안 했으면 Vercel 빌드가 멈춰서 알려 줍니다.

**변환 규칙** (`scripts/make-clips.mjs` 위쪽 상수)

| 항목 | 값 | 이유 |
|---|---|---|
| 길이 | 최대 24초 (`len`으로 5~60초) | 미리보기용. 원본이 더 길면 **소리가 가장 큰 구간**을 자동으로 고릅니다. 마음에 안 들면 `start`(초)로 직접 지정 |
| 크기 | 긴 변 960px, 30fps, H.264 + AAC | 아이폰·안드로이드·인스타/카톡 앱 안 브라우저에서 모두 재생 |
| 용량 | 1편 약 1~2MB | 아래 "Blob 한도" 참고 |
| 소리 | 영상마다 비슷한 크기로 맞춤 | 영상마다 볼륨이 제각각이라 |

**Blob 한도 (꼭 읽기)**

Vercel 무료(Hobby) 요금제의 Blob은 **저장 1GB, 한 달 전송 10GB**이고, 넘으면 요금이 나오는 대신 **스토어 전체가 막힙니다. 얼굴 사진도 같이 안 나옵니다.** 그래서:

- 영상은 창이 열릴 때 **자동으로 받아 재생**합니다. 창을 열 때마다 영상 1편(약 1.7MB)을 받으므로, 영상이 5,800번 재생되면 그것만으로 10GB입니다. 전송량이 모자라면 `src/components/ClipPlayer.tsx`의 `AUTOPLAY`를 `false`로 바꿔 **▶를 눌렀을 때만** 받게 할 수 있습니다.
- 행사 전후로 Vercel → Storage → `festlock-blob` → Usage 에서 전송량을 확인하세요. 한도에 가까우면 Pro 요금제로 올리거나, 급하면 `public/clips.json`에서 그 페스티벌 칸을 비우고 배포하면 영상만 꺼집니다(사진은 유지).

**영상 내리기**: `clips-src/<키>/{id}.mp4`를 지우고 `npm run clips -- <키>` → `public/clips.json` 커밋·배포. 급하면 Blob 대시보드에서 `clips/<키>/{id}.mp4`를 지우면 즉시 내려갑니다.

---

## 한도 알림 (Blob이 막히면 이메일)

Vercel Hobby 요금제는 Blob 전송량이 한 달 10GB를 넘으면 요금이 나오는 대신 **스토어가 막혀서 사진·영상이 모두 안 나옵니다.** 사이트가 이걸 알아채고 운영자 이메일로 알립니다. (문자는 요금이 들고 발신번호 등록이 필요해서 쓰지 않았습니다. 이메일은 Resend 무료 한도로 충분합니다: 월 약 3,000통, 하루 100통.)

**동작**

1. 방문자 브라우저에서 Blob 사진·영상이 3번 실패하면 `/api/blob-alert`에 빈 요청을 한 번 보냅니다 (`src/blobHealth.ts`. 같은 브라우저는 30분에 한 번. 개발 서버·localhost에서는 꺼져 있음).
2. 10분 안에 **서로 다른 IP 3곳** 이상이 알려 오면, 서버가 Blob 사진 하나를 **직접** 확인합니다 (1바이트만 요청). 한 사람의 인터넷 문제로는 메일이 가지 않습니다.
3. 서버에서도 안 열리면(403 등) 이메일 한 통을 보냅니다. **6시간에 한 번까지만.** 서버에서 보면 멀쩡하면 보내지 않습니다.
4. 메일에는 확인 시각, 서버가 본 응답, 확인할 곳(Vercel → Storage → festlock-blob → Usage), 할 수 있는 일(Pro 올리기 / 영상만 끄기 / 자동 재생 끄기)이 들어 있습니다.

> Vercel도 한도에 가까워지면 가입 이메일로 알려 줍니다 ([문서](https://vercel.com/docs/vercel-blob/usage-and-pricing)). 이 알림은 그것과 별개로, "이미 막혀서 사진이 안 나오는" 순간을 사이트가 직접 알려 주는 것입니다.

**처음 설정 (한 번만, 5분)**

1. [resend.com](https://resend.com)에 **알림을 받고 싶은 이메일로** 가입합니다. (무료 계정은 가입한 이메일로만 받을 수 있습니다. 도메인은 필요 없습니다.)
2. Resend → API Keys → Create API Key (권한 "Sending access") → `re_...` 키를 복사합니다.
3. 먼저 내 PC에서 시험합니다. `C:\festlock\.env.local`에 두 줄을 추가하고 (이 파일은 저장소에 올라가지 않습니다)
   ```
   RESEND_API_KEY=re_여기에키
   ALERT_EMAIL=알림받을이메일@gmail.com
   ```
   ```bash
   node scripts/test-alert-mail.mjs
   ```
   시험 메일이 오면(스팸함도 확인) 성공입니다.
4. Vercel → 프로젝트 → Settings → Environment Variables에 **같은 두 값**(`ALERT_EMAIL`, `RESEND_API_KEY`)을 넣고 **Redeploy**합니다. 이메일 주소는 코드에 적혀 있지 않고 이 환경변수에만 있습니다.

**끄거나 바꾸기:** `ALERT_EMAIL`을 지우면 아무것도 보내지 않습니다. 보내는 주소를 바꾸려면 `ALERT_FROM`, 직접 확인할 사진을 바꾸려면 `ALERT_PROBE_URL`. 코드는 `api/blob-alert.ts`(조건·메일 내용)와 `src/blobHealth.ts`(브라우저 쪽).

---

## 배경화면 "AI 추천" 투표 (👍 좋아요 / 👎 별로예요)

배경화면 만들기 창에서 사용자가 지금 보이는 배경화면이 괜찮은지 투표합니다. 배치를 다듬는 데 쓰려고 모으는 것이고, **사이트에는 결과를 보여 주는 곳이 없습니다.** 나만 DB에서 봅니다.

- 화면: ZONNAFE 배경화면 창의 `✨ AI 추천 | 전체 스테이지` 탭 아래 설명 + 미리보기 아래 "이 배경화면 어때요?" (`FestExport`의 `views`, `voteFest`). "AI 추천"은 고른 공연에 맞춰 규칙으로 가장 읽기 좋은 모양을 자동으로 고르는 것입니다.
- 저장: `api/fest-vote.ts` → Upstash Redis (다운로드 수·랭킹과 같은 DB). 한 기기는 한 모양에 한 표이고 👍↔👎로 바꿀 수 있습니다. 기록에는 기기 id·IP를 남기지 않습니다.
- 모양: `ai:packed`(고른 공연만) · `ai:grid`(많이 겹쳐 전체 표로 바뀜) · `ai:text`(사진 뺌) · `all:all`(전체 스테이지) 별로 따로 셉니다.

**투표 보기 (나만)**

1. 터미널에서 (Redis 접속 정보를 한 번 받아 둡니다. `.env.local`은 덮어쓰지 않게 다른 이름으로)
   ```bash
   vercel env pull .env.vercel
   node scripts/fest-votes.mjs zon
   ```
   모양별 👍/👎/호감도, 고른 무대 수별 호감도, 최근 투표(언제·몇 팀·무대 몇 곳·비율·옵션·언어·기기 종류)가 나옵니다. `--log 50`으로 최근 50건.
2. 또는 Vercel → Storage → Upstash(Redis) → Data Browser에서 `fl:zon:votesum`(합계 해시), `fl:zon:votelog`(최근 2000건 리스트)를 봅니다.

**다른 페스티벌에도 넣기:** 그 페스티벌 화면에서 `FestExport`에 `voteFest="키"`를 주고, 키가 `src/fest/festStats.ts`의 `FestKey`와 `api/fest-vote.ts`의 `FESTS`에 있는지 확인합니다. 투표 줄은 render가 돌려주는 캔버스의 `dataset.layout`(·`view`·`picks`·`stages`·`busiest`)이 있어야 나옵니다 — `festMulti.ts`의 `renderMulti` 참고.

**지우기:** Data Browser에서 `fl:zon:vote:*`, `fl:zon:votesum`, `fl:zon:votelog`를 삭제하면 처음부터 다시 셉니다.

---

## 무대가 6개 이상인 페스티벌

무대가 많으면 칸을 좁히지 않고 **옆으로 밀어서** 보는 화면을 씁니다. 화면·배경화면 규칙은 **[무대-많은-페스티벌-UIUX.md](무대-많은-페스티벌-UIUX.md)**, 예시 코드는 `src/fest/ZonPage.tsx`(화면) · `src/fest/festMulti.ts`(배경화면)입니다. 새 페스티벌은 `ZonPage.tsx`를 복사하고, 배경·제목만 `zonLook.ts`처럼 따로 만들면 됩니다.

---

## 배포 전 점검 목록

- [ ] `npm run build` 통과 (라인업 일치 검사·타입 검사 포함)
- [ ] `/{slug}` 와 별칭 주소가 열린다
- [ ] 5개 언어(ko/en/ja/zh/zht)로 전환해도 문구가 비지 않는다
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

- 환경변수: `VITE_FACE_BASE`(사진 주소), `SITE_URL`(미리보기 주소), Upstash Redis 연결 변수(`KV_REST_API_*`), 한도 알림(`ALERT_EMAIL`, `RESEND_API_KEY`)
- `public/drops.json`은 Drop Studio가 만드는 파일입니다. 직접 고치지 마세요 (빌드 때 `scripts/check-drops.mjs`가 모양을 검사합니다)
- 링크 미리보기와 `robots.txt`는 지금 검색 노출을 막아 둔 상태입니다. 정식 출시 때 `public/robots.txt`와 `vercel.json`의 `X-Robots-Tag`를 바꿉니다.
