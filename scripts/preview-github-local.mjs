// scripts/preview-github-local.mjs
//
// Local GitHub Pages emulator for /react-my-recipes/
// - Serves dist/ build output
// - Ensures trailing slash
// - Rewrites SPA routes to index.html
//
// Usage:
//   npm run build:github
//   node scripts/preview-github-local.mjs
// Then open: http://localhost:3000/react-my-recipes/

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, "../dist");
const PREFIX = "/react-my-recipes";
const PORT = 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".txt": "text/plain; charset=utf-8"
};

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

function send(res, statusCode, contentType, bodyBuffer) {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(bodyBuffer);
}

function sendIndexHtml(res) {
  const indexPath = path.join(DIST_DIR, "index.html");
  const data = readFileSafe(indexPath);
  if (!data) {
    send(res, 500, "text/plain; charset=utf-8", Buffer.from("index.html missing"));
    return;
  }
  send(res, 200, "text/html; charset=utf-8", data);
}

function sendStatic(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || "application/octet-stream";
  const data = readFileSafe(filePath);
  if (!data) {
    // fallback to index for SPA-like behavior
    sendIndexHtml(res);
    return;
  }
  send(res, 200, contentType, data);
}

const server = http.createServer((req, res) => {
  let reqUrl = req.url || "/";

  // strip query/hash
  const q = reqUrl.indexOf("?");
  if (q !== -1) reqUrl = reqUrl.slice(0, q);
  const h = reqUrl.indexOf("#");
  if (h !== -1) reqUrl = reqUrl.slice(0, h);

  // Convenience: hitting "/" will redirect you to the "production" base
  if (reqUrl === "/") {
    res.writeHead(302, { Location: PREFIX + "/" });
    res.end();
    return;
  }

  // Case 1: /react-my-recipes   (no slash) -> redirect to /react-my-recipes/
  if (reqUrl === PREFIX) {
    res.writeHead(302, { Location: PREFIX + "/" });
    res.end();
    return;
  }

  // We only "own" /react-my-recipes/*
  if (!reqUrl.startsWith(PREFIX + "/")) {
    // Anything else outside PREFIX is 404
    send(res, 404, "text/plain; charset=utf-8", Buffer.from("Not found"));
    return;
  }

  // Now we know it's /react-my-recipes/...
  // Strip the prefix to map to real dist files.
  const subPath = reqUrl.slice(PREFIX.length); // still starts with "/"
  // subPath examples:
  //   "/"                    -> show index.html
  //   "/recipes/abc"         -> SPA route => index.html
  //   "/assets/whatever.js"  -> static file
  //   "/manifest.webmanifest"-> static file
  //   "/sw.js"               -> static file

  // If no file extension in subPath, treat like SPA route.
  // e.g. "/recipes/123", "/settings", "/"
  const hasExt = path.extname(subPath) !== "";

  if (!hasExt) {
    // Serve index.html so React Router can render the route.
    sendIndexHtml(res);
    return;
  }

  // Looks like a static asset request
  const diskPath = path.join(
    DIST_DIR,
    subPath.replace(/^\//, "") // remove leading slash
  );

  sendStatic(res, diskPath);
});

server.listen(PORT, () => {
  console.log("✅ GitHub Pages preview server running");
  console.log(`   Local URL:   http://localhost:${PORT}${PREFIX}/`);
  console.log(`   (This emulates https://<user>.github.io${PREFIX}/)`);
});