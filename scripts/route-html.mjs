// 링크 미리보기용: 페이지마다 제목·설명·미리보기 이미지가 들어간 HTML을 따로 만든다.
// 카카오톡·인스타 등은 페이지 코드를 실행하지 않고 HTML의 <title>·og 태그만 읽기 때문.
// dist/index.html(메인) + dist/<주소>.html (vercel.json cleanUrls로 /<주소> 에서 열린다)
import fs from "node:fs";

const SITE =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "https://festlock.vercel.app");

// 페이지 목록: 메인(아래) + src/festivals.json의 페스티벌들(각 항목의 slug·og)
const festivals = JSON.parse(fs.readFileSync("src/festivals.json", "utf8"));
const PAGES = [
  {
    file: "index.html",
    path: "/",
    title: "FestLock · 페스티벌 타임테이블을 내 잠금화면으로",
    desc: "보고 싶은 아티스트만 골라 인스타 스토리·폰 배경화면으로 저장하세요. NOL 페스티벌 · 그랜드 민트 페스티벌 2026",
    img: "/og/home.jpg",
  },
  ...festivals.map((f) => ({ file: f.slug + ".html", path: "/" + f.slug, title: f.og.title, desc: f.og.desc, img: f.og.img })),
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const base = fs.readFileSync("dist/index.html", "utf8");
for (const p of PAGES) {
  const url = SITE + p.path, img = SITE + p.img;
  const meta = [
    `<meta name="description" content="${esc(p.desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="FestLock">`,
    `<meta property="og:title" content="${esc(p.title)}">`,
    `<meta property="og:description" content="${esc(p.desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${img}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:locale" content="ko_KR">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(p.title)}">`,
    `<meta name="twitter:description" content="${esc(p.desc)}">`,
    `<meta name="twitter:image" content="${img}">`,
  ].join("\n");
  const html = base.replace(/<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>\n${meta}`);
  if (html === base) throw new Error("dist/index.html에 <title>이 없어요");
  fs.writeFileSync("dist/" + p.file, html);
}
console.log("route html:", PAGES.map((p) => p.file).join(", "), "→", SITE);
