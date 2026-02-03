/**
 * Render Animal Fails Video from generated assets
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import http from "http";

const ASSET_DIR = path.join(process.cwd(), "animal-fails-output");
const OUTPUT_PATH = path.join(process.cwd(), "out", "animal-fails-30s.mp4");

// Static file server for assets
function startServer(dir: string, port: number): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url?.split("?")[0] || "/";
      const filePath = path.join(dir, urlPath);
      
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const types: Record<string, string> = {
          ".mp3": "audio/mpeg",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".json": "application/json",
        };
        res.writeHead(200, {
          "Content-Type": types[ext] || "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(port, () => resolve(server));
  });
}

async function main() {
  console.log("🎬 Rendering 30s Animal Fails Video\n");

  const startTime = Date.now();
  const assetPort = 8788;

  // Start asset server
  const server = await startServer(ASSET_DIR, assetPort);
  console.log(`📂 Asset server on port ${assetPort}`);

  // Load script and captions
  const script = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, "script.json"), "utf-8"));
  const captions = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, "captions.json"), "utf-8"));

  // Build image URLs
  const imageUrls = [];
  for (let i = 1; i <= script.scenes.length; i++) {
    imageUrls.push(`http://localhost:${assetPort}/scene-${i}.png`);
  }

  const inputProps = {
    script,
    audioUrl: `http://localhost:${assetPort}/voiceover.mp3`,
    captions,
    imageUrls,
  };

  console.log("📦 Bundling...");
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), "src/remotion/index.tsx"),
  });
  console.log("   ✅ Bundle complete");

  console.log("🎥 Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "VideoComposition",
    inputProps,
  });

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  console.log(`🎞️ Rendering ${script.totalDuration}s video (${composition.durationInFrames} frames)...`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: OUTPUT_PATH,
    inputProps,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r   Progress: ${Math.round(progress * 100)}%`);
    },
  });

  server.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const fileSize = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2);

  console.log(`\n\n✅ Video rendered!`);
  console.log(`📁 ${OUTPUT_PATH}`);
  console.log(`📊 ${fileSize} MB | ⏱️ ${elapsed}s`);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
