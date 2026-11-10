// 빌드 전 검사: public/clips.json (scripts/make-clips.mjs · upload-clips.mjs 가 만든 미리보기 영상 목록) 모양이 맞는지.
// 틀리면 빌드를 멈춘다. 영상 목록은 있는데 아직 Blob에 올리지 않았으면(base 없음) Vercel 빌드는 멈추고, 내 PC에서는 알려만 준다.
import fs from "node:fs";

const FILE = "public/clips.json";
if (!fs.existsSync(FILE)) {
  console.log("clips: public/clips.json 없음 (미리보기 영상 없이 빌드)");
  process.exit(0);
}
const fail = (m) => {
  console.error("✖ clips.json:", m);
  process.exit(1);
};
let j;
try {
  j = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch (e) {
  fail("JSON 형식이 아니에요 — " + e.message);
}
if (j.version !== 1) fail("version 이 1 이 아니에요");
if (!j.festivals || typeof j.festivals !== "object") fail("festivals 가 없어요");
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const slugs = new Set(JSON.parse(fs.readFileSync("src/festivals.json", "utf8")).map((f) => f.slug));
let n = 0;
for (const [slug, m] of Object.entries(j.festivals)) {
  if (!slugs.has(slug)) fail(`src/festivals.json 에 없는 페스티벌 주소예요: ${slug}`);
  for (const [id, c] of Object.entries(m)) {
    if (!SLUG.test(id)) fail(`${slug}: 아티스트 id 가 이상해요: ${id}`);
    if (!c || !/^[a-z0-9-]+\/[a-z0-9-]+\.mp4$/.test(c.file)) fail(`${slug}/${id}: file 이 이상해요`);
    if (!(c.w > 0 && c.h > 0 && c.dur > 0 && c.dur <= 61)) fail(`${slug}/${id}: 크기·길이가 이상해요 (길이는 60초까지)`);
    if (typeof c.v !== "string" || !c.v) fail(`${slug}/${id}: v 가 없어요`);
    n++;
  }
}
if (n && !/^https:\/\/[^/]+\/.*clips$/.test(j.base || "")) {
  const msg = `영상 ${n}편이 목록에 있는데 아직 Blob에 올리지 않았어요 (base 없음). npm run upload-clips 를 실행한 뒤 public/clips.json 을 커밋하세요.`;
  if (process.env.VERCEL) fail(msg);
  console.warn("⚠ clips: " + msg + " (이대로 배포하면 영상이 안 나와요)");
} else console.log(`clips ok: ${Object.keys(j.festivals).length}개 페스티벌, 영상 ${n}편`);
