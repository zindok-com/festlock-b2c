// 한도 알림 메일이 제대로 가는지 시험 메일을 한 통 보낸다 (api/blob-alert.ts 와 같은 설정을 쓴다)
//   node scripts/test-alert-mail.mjs
// 필요한 값 (.env.local 또는 .env.vercel 파일, 또는 환경변수. 저장소에 올라가지 않는다):
//   RESEND_API_KEY=re_...        Resend → API Keys 에서 만든 키
//   ALERT_EMAIL=내이메일@...      받을 이메일 (Resend에 가입한 이메일과 같아야 한다. 무료 계정은 그 주소로만 받을 수 있다)
//   ALERT_FROM=...               (선택) 보내는 주소. 기본 "FestLock <onboarding@resend.dev>"
// 메일이 오면 Vercel 프로젝트 환경변수에도 같은 값(ALERT_EMAIL, RESEND_API_KEY)을 넣고 Redeploy 하면 끝이다 (docs/ADD-FESTIVAL.md "한도 알림").
import fs from "node:fs";

for (const f of [".env.local", ".env.vercel"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const key = process.env.RESEND_API_KEY;
const to = process.env.ALERT_EMAIL;
if (!key || !to) {
  console.error("RESEND_API_KEY 와 ALERT_EMAIL 이 필요해요. .env.local 에 두 줄을 넣고 다시 실행하세요 (docs/ADD-FESTIVAL.md \"한도 알림\").");
  process.exit(1);
}
const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
  method: "POST",
  headers: { authorization: "Bearer " + key, "content-type": "application/json" },
  body: JSON.stringify({
    from: process.env.ALERT_FROM || "FestLock <onboarding@resend.dev>",
    to: [to],
    subject: "[FestLock] 시험 메일 — 한도 알림이 이 주소로 와요",
    text: "이 메일이 보이면 설정이 맞아요.\n\nFestLock 사진·영상 저장소(Vercel Blob)가 막히면 이런 모양의 메일이 이 주소로 와요 (6시간에 한 번까지).\n받은편지함에 없으면 스팸함도 확인해 주세요.",
  }),
});
const body = await res.text();
if (res.ok) console.log(`시험 메일을 보냈어요 → ${to.replace(/(.).+(@.+)/, "$1***$2")}. 받은편지함(또는 스팸함)을 확인하세요.`);
else {
  console.error(`보내지 못했어요 (HTTP ${res.status}): ${body.slice(0, 300)}`);
  console.error("흔한 원인: 무료 계정은 Resend에 가입한 이메일로만 받을 수 있어요. ALERT_EMAIL 이 가입한 이메일과 같은지 확인하세요.");
  process.exit(1);
}
