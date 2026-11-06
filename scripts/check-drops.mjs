// 빌드 전 검사: public/drops.json (Drop Studio "festlock으로 보내기"가 만든 파일) 모양이 맞는지
// 틀리면 빌드를 멈춰서, 사이트에 깨진 드랍 데이터가 나가지 않게 한다.
import fs from "node:fs";

const FILE = "public/drops.json";
if (!fs.existsSync(FILE)) {
  console.log("drops: public/drops.json 없음 (드랍 플레이어 없이 빌드)");
  process.exit(0);
}
const fail = (m) => {
  console.error("✖ drops.json:", m);
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
const ID = /^[A-Za-z0-9_-]{11}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
let n = 0;
function check(where, d) {
  if (!d || !ID.test(d.videoId)) fail(`${where}: videoId 가 이상해요`);
  if (!(Number.isFinite(d.start) && Number.isFinite(d.end) && d.start >= 0 && d.end > d.start)) fail(`${where}: 시작·끝 시간이 이상해요`);
  // 0초부터 전체 재생(full)은 길이 제한 없음
  const len = d.end - d.start;
  if (!d.full && (len < 5 - 1e-6 || len > 60 + 1e-6)) fail(`${where}: 구간 길이 ${len}초 (5~60초여야 해요)`);
  n++;
}
for (const [slug, m] of Object.entries(j.festivals)) {
  if (!SLUG.test(slug)) fail(`페스티벌 주소가 이상해요: ${slug}`);
  for (const [id, d] of Object.entries(m)) {
    if (!SLUG.test(id)) fail(`${slug}: 아티스트 id 가 이상해요: ${id}`);
    check(`${slug}/${id}`, d);
  }
}
for (const [id, d] of Object.entries(j.artists || {})) check(`artists/${id}`, d);
console.log(`drops ok: ${Object.keys(j.festivals).length}개 페스티벌, 구간 ${n}개 (보낸 시각 ${j.exportedAt || "-"})`);
