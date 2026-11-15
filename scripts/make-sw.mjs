// 빌드 마지막 단계(route-html 다음): scripts/sw.template.js 에 이번 빌드의 파일 목록과 번호를 채워 dist/sw.js 를 만든다.
// 번호(BUILD)는 앱 화면 파일 이름(해시)과 index.html 내용으로 정해서, 화면이 바뀐 배포에서만 서비스워커 파일이 바뀐다 → 브라우저가 새 서비스워커로 갱신한다.
import crypto from "node:crypto";
import fs from "node:fs";

const html = fs.readFileSync("dist/index.html", "utf8");
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
if (!assets.some((a) => a.endsWith(".js"))) throw new Error("dist/index.html 에서 JS 를 못 찾았어요");
const extra = ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/brand/festlock-logo.webp", "/event/festlock.webp"];
const files = ["/index.html", ...assets, ...extra];
for (const f of files) if (!fs.existsSync("dist" + f)) throw new Error("dist 에 없는 파일: " + f);

const build = crypto.createHash("sha1").update(html + assets.join("|")).digest("hex").slice(0, 10);
const tpl = fs.readFileSync("scripts/sw.template.js", "utf8");
const out = tpl.replace("__BUILD__", build).replace("__SHELL__", JSON.stringify(files));
if (out.includes("__BUILD__") || out.includes("__SHELL__")) throw new Error("서비스워커 자리표시자가 남았어요");
fs.writeFileSync("dist/sw.js", out);
console.log(`sw.js: 빌드 ${build}, 저장 파일 ${files.length}개 (${assets.length}개는 앱 화면)`);
