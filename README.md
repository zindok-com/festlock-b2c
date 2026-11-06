# FestLock

비공식 팬메이드 페스티벌 타임테이블 서비스. 보고 싶은 아티스트를 골라 잠금화면·스토리용 이미지로 저장합니다.

## 실행

```bash
npm install
npm run dev
npm run build
```

`VITE_FACE_BASE`를 비워 두면 얼굴 사진 없이 이니셜 아이콘으로 나옵니다.

## 페스티벌 추가 · 수정 (FestLock)

여러 페스티벌을 `/{slug}` 주소로 보여 줍니다. 목록·주소·미리보기 문구는 **`src/festivals.json` 한 파일**이 기준입니다.

| 하고 싶은 일 | 고칠 곳 |
|---|---|
| 이름·날짜·장소·포스터·색 수정 | `src/festivals.json`의 해당 항목 |
| 링크 미리보기(카톡·인스타) 제목·설명·이미지 | 같은 항목의 `og` (빌드할 때 `scripts/route-html.mjs`가 읽음) |
| 주소(slug) 별칭 추가 | 같은 항목의 `aliases` (예: `/edc` → EDC KOREA) |
| 새 페스티벌을 "준비 중"으로 먼저 공개 | `festivals.json`에 항목 추가, `"ready": false`(화면 `page`는 비워 둠) |
| 라인업 시간표 수정 | `src/fest/nol.ts`, `gmf.ts`, `orl.ts` (EDC KOREA는 `src/data/lineup.json`) → 고친 뒤 `node scripts/sync-lineup.mjs` |

**라인업까지 들어간 새 페스티벌** (새 화면이 필요한 경우)
1. `src/fest/<이름>.ts`에 라인업 작성 (`rows()` 형식은 `types.ts`, 예시는 `nol.ts`).
2. 화면 `src/fest/<이름>Page.tsx` 작성. 공통 조각은 `shell.tsx`(`useToast`·`useArmedReset`·`useBodyLock`·`FestFooter`), `common.ts`, `parts.tsx` 사용.
3. `src/fest/registry.tsx`의 `PAGES`에 한 줄 추가 → `festivals.json`의 `"page"`에 그 키, `"titleKey"`에 탭 제목 문구 키를 쓰고 `strings.ts`에 문구 추가.
4. 집계가 필요하면 `festStats.ts`(`FEST_DAYS`, `DEMO_META`)와 `api/fest-download.ts`·`fest-stats.ts`에 키 추가, `scripts/sync-lineup.mjs`에 라인업 파일 추가.

주소(slug)는 `festivals.json`의 값 그대로 쓰이므로, 화면 코드를 바꿔도 기존 주소는 변하지 않습니다.

## 얼굴 사진 (Vercel Blob)

사진은 저장소에 없고 Vercel **Blob(Public 스토어)**에 있습니다. 로컬 원본은 `faces-src/`(커밋 안 됨)에 둡니다.

- 스크린샷 → 320×320 webp: `_inbox/`에 `{id}.jpg`를 넣고 `npm run faces` (크롭 표는 `npm run faces -- _inbox/crops.json`). 결과는 `faces-src/{id}.webp`, 페스티벌별은 `faces-src/{gmf,nol,orl}/{id}.webp`.
- 올리기: `.env.local`에 `BLOB_READ_WRITE_TOKEN=...` 을 넣고 `npm run upload-faces`. 끝에 출력되는 `VITE_FACE_BASE=...` 값을 Vercel 환경변수에 넣고 Redeploy.
- 사진 없는 아티스트(`way2-x`, `w-and-w`)는 이니셜 아이콘.
- 사진 파일은 캔버스로 읽기 때문에 `crossOrigin="anonymous"`로 불러옵니다(Blob은 CORS 허용).

## 배포 (Vercel)

1. 이 저장소를 Vercel에 Import.
2. Storage → Blob 스토어(Public) 생성·Connect, 환경변수 `VITE_FACE_BASE` 추가.
3. Storage → Upstash Redis 연결(아래 참고).
4. 확인: 사이트에서 사진이 보이고, `/nol` 같은 주소가 열리는지.

## 테이크다운

Blob 대시보드에서 해당 파일(또는 `artists/` 전체) 삭제 → 즉시 내려갑니다. 저장소에는 사진이 없습니다. 삭제 요청은 인스타그램 DM(@festlock)으로 받습니다.

## 다운로드 수 · 인기 DJ TOP 10 (Upstash Redis)

- 서버 함수: `api/download.ts`(기록), `api/stats.ts`(조회). 저장소는 Vercel Marketplace의 **Upstash Redis**(무료).
- 설정: Vercel 프로젝트 → Storage → Upstash(Redis) 만들기 → 이 프로젝트에 Connect. 환경변수(`KV_REST_API_URL`/`KV_REST_API_TOKEN` 또는 `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`)는 자동으로 들어간다. 그다음 Redeploy.
- 중복 방지: 기기마다 무작위 ID(브라우저 저장). 서버는 요일별 집합(`edc26:dl:sat`, `edc26:dl:sun`)에 넣어 기기당 토 1회·일 1회만 센다. 인기 DJ(`edc26:top`)는 그 첫 다운로드에 담긴 DJ만 +1 → 기기당 DJ 1번.
- 한계: 시크릿 창이나 브라우저 데이터 삭제 시 새 기기로 보고 다시 셀 수 있다. 로그인 없이 사람 단위로 완벽하게 막을 수는 없다.
- DB가 연결되지 않으면 다운로드 수는 숨겨지고, TOP 10 창에는 "불러오지 못했어요"가 뜬다.
