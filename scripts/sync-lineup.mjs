// 집계 서버(api/fest-download.ts)가 쓰는 라인업 id 목록을 화면 데이터(src/fest/gmf.ts, nol.ts)와 맞춘다.
// 서버 함수는 src/ 파일을 불러올 수 없어서(Vercel에서 실행 오류) id를 서버 파일 안에 직접 적어 둔다.
//   node scripts/sync-lineup.mjs          → 서버 파일의 목록을 새로 씀 (라인업을 고친 뒤 실행)
//   node scripts/sync-lineup.mjs --check  → 다르면 빌드 실패 (package.json build에서 실행)
import fs from "node:fs";

const API = "api/fest-download.ts";
const START = "// <lineup:auto>";
const END = "// </lineup:auto>";

/** rows() 표의 세 번째 칸(id)만 뽑는다. 토크·이벤트 줄(kind 자리)은 뺀다 */
function ids(file) {
  const src = fs.readFileSync(file, "utf8");
  const out = [];
  for (const m of src.matchAll(/\["\d+:\d+", "~?\d+:\d+", "([a-z0-9-]+)"/g)) {
    if (!["act", "talk", "event", "perf"].includes(m[1])) out.push(m[1]);
  }
  return [...new Set(out)];
}

const lists = { gmf: ids("src/fest/gmf.ts"), nol: ids("src/fest/nol.ts"), orl: ids("src/fest/orl.ts") };
const block =
  START +
  "\n// scripts/sync-lineup.mjs가 src/fest/gmf.ts·nol.ts에서 자동으로 만든 목록. 손으로 고치지 말 것\n" +
  Object.entries(lists)
    .map(([k, v]) => `const ${k.toUpperCase()}_IDS = ${JSON.stringify(v)};`)
    .join("\n") +
  "\n" +
  END;

const api = fs.readFileSync(API, "utf8").split("\r\n").join("\n");
const a = api.indexOf(START), b = api.indexOf(END);
if (a < 0 || b < 0) {
  console.error(`${API}에 ${START} … ${END} 표시가 없어요`);
  process.exit(1);
}
const now = api.slice(a, b + END.length);
if (process.argv.includes("--check")) {
  if (now !== block) {
    console.error("집계 서버의 라인업 목록이 화면 데이터와 달라요. node scripts/sync-lineup.mjs 를 실행하세요.");
    process.exit(1);
  }
  console.log(`lineup ok (gmf ${lists.gmf.length}, nol ${lists.nol.length}, orl ${lists.orl.length})`);
} else {
  fs.writeFileSync(API, api.slice(0, a) + block + api.slice(b + END.length));
  console.log(`updated (gmf ${lists.gmf.length}, nol ${lists.nol.length}, orl ${lists.orl.length})`);
}
