// Renders launch.html to an MP4, frame by frame (deterministic, no screen recording).
//   node render.mjs                  → unideals-launch.mp4 (1080p60, motion-blurred, with the score)
//   node render.mjs --stills 1,4,8   → PNG stills at those seconds, for checking
// Needs: puppeteer-core + ffmpeg-static (npm i puppeteer-core ffmpeg-static) and Google Chrome.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(process.env.TOOLS_DIR ? path.join(process.env.TOOLS_DIR, "package.json") : import.meta.url);
const puppeteer = require("puppeteer-core");
const ffmpeg = require("ffmpeg-static");

// 1. Build: inline the logo into the page.
const logo = fs.readFileSync(path.join(HERE, "../../frontend/public/fav.svg"));
const src = fs.readFileSync(path.join(HERE, "launch.src.html"), "utf8");
const html = src.replaceAll("__LOGO__", `data:image/svg+xml;base64,${logo.toString("base64")}`);
fs.writeFileSync(path.join(HERE, "launch.html"), html);
if (process.argv.includes("--build")) process.exit(0);

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--force-device-scale-factor=1", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(HERE, "launch.html")).href + "?render", { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
const shot = async (t, opts) => {
  await page.evaluate((x) => window.__render(x), t);
  return page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 }, ...opts });
};

const stillsArg = process.argv.indexOf("--stills");
if (stillsArg > 0) {
  const outDir = process.env.STILLS_DIR || path.join(HERE, "stills");
  fs.mkdirSync(outDir, { recursive: true });
  for (const s of process.argv[stillsArg + 1].split(",").map(Number)) {
    fs.writeFileSync(path.join(outDir, `t${s.toFixed(2)}.png`), await shot(s, { type: "png" }));
  }
  await browser.close();
  process.exit(0);
}

// 2. Render 120 fps subframes, blend pairs (180° shutter motion blur), output 60 fps H.264.
const CAPTURE_FPS = 120, DURATION = 20;
const out = path.join(HERE, "unideals-launch.mp4");
const silent = path.join(HERE, ".video-only.mp4"), wav = path.join(HERE, ".score.wav");
fs.writeFileSync(wav, Buffer.from(await page.evaluate(() => window.__audioWav()), "base64"));
const ff = spawn(ffmpeg, [
  "-y", "-f", "image2pipe", "-framerate", String(CAPTURE_FPS), "-c:v", "mjpeg", "-i", "-",
  "-vf", "tmix=frames=2,fps=60,format=yuv420p",
  "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-movflags", "+faststart",
  silent,
], { stdio: ["pipe", "inherit", "inherit"] });
const total = CAPTURE_FPS * DURATION;
const started = Date.now();
for (let i = 0; i < total; i++) {
  const buf = await shot(i / CAPTURE_FPS, { type: "jpeg", quality: 96 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 120 === 0) console.log(`frame ${i}/${total}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
// 3. Mux the score.
await new Promise((resolve, reject) => {
  const m = spawn(ffmpeg, ["-y", "-loglevel", "error", "-i", silent, "-i", wav, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
  m.on("close", (c) => (c === 0 ? resolve() : reject(new Error("mux failed"))));
});
fs.rmSync(silent); fs.rmSync(wav);
console.log(`Wrote ${out}`);
