import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const TYPES: Record<string, string> = { ".webp": "image/webp", ".mp4": "video/mp4", ".jpg": "image/jpeg" };

/**
 * 내 PC에서만(npm run dev): 아직 Blob에 올리지 않은 사진·영상을 바로 볼 수 있게
 *   /__faces/…  → faces-src/…   (.env.local 에 VITE_FACE_BASE=/__faces 를 넣으면 사진이 보인다)
 *   /__clips/…  → clips-src/…   (영상은 개발 서버에서 항상 여기부터 찾는다)
 * 배포본에는 들어가지 않는다.
 */
function localMedia(): Plugin {
  const roots: Record<string, string> = { "/__faces/": "faces-src", "/__clips/": "clips-src" };
  return {
    name: "festlock-local-media",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url || "").split("?")[0]);
        const prefix = Object.keys(roots).find((p) => url.startsWith(p));
        if (!prefix) return next();
        const root = path.resolve(roots[prefix]);
        const file = path.resolve(root, url.slice(prefix.length));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          res.statusCode = 404;
          return res.end();
        }
        const size = fs.statSync(file).size;
        res.setHeader("Content-Type", TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Cache-Control", "no-cache");
        // 영상은 브라우저(특히 사파리)가 일부분만 달라고 한다
        const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ""));
        if (m && (m[1] || m[2])) {
          const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
          const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
          if (start > end || start >= size) {
            res.statusCode = 416;
            res.setHeader("Content-Range", `bytes */${size}`);
            return res.end();
          }
          res.statusCode = 206;
          res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
          res.setHeader("Content-Length", end - start + 1);
          return fs.createReadStream(file, { start, end }).pipe(res);
        }
        res.setHeader("Content-Length", size);
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localMedia()],
});
