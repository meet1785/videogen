/**
 * Quick Render Script - Renders video from demo-output assets
 * Usage: npx tsx scripts/render-video.ts
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import http from "http";

// Simple static file server
function startStaticServer(dir: string, port: number): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url?.split("?")[0] || "/";
      const filePath = path.join(dir, urlPath);
      
      // Check if file exists and is not a directory
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const contentType = ext === ".mp3" ? "audio/mpeg" : 
                           ext === ".png" ? "image/png" : 
                           ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";
        res.writeHead(200, { 
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*"
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
  console.log("🎬 Rendering video with Remotion...\n");

  const startTime = Date.now();

  // Start static server for assets
  const assetPort = 8787;
  const assetServer = await startStaticServer(path.join(process.cwd(), "demo-output"), assetPort);
  console.log(`📂 Asset server started on port ${assetPort}`);

  // Load script from demo-output
  const scriptPath = path.join(process.cwd(), "demo-output", "script.json");
  const script = JSON.parse(fs.readFileSync(scriptPath, "utf-8"));

  // Use HTTP URLs for images and audio
  const imageUrls = [
    `http://localhost:${assetPort}/scene-1.png`,
    `http://localhost:${assetPort}/scene-2.png`,
  ];

  const audioUrl = `http://localhost:${assetPort}/voiceover.mp3`;

  const inputProps = {
    script,
    audioUrl,
    captions: [],
    imageUrls,
  };

  console.log("📦 Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), "src/remotion/index.tsx"),
    onProgress: (progress) => {
      if (progress === 100) console.log("   ✅ Bundle complete");
    },
  });

  console.log("🎥 Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "VideoComposition",
    inputProps,
  });

  // Output path
  const outputPath = path.join(process.cwd(), "out", "funny-fail-demo.mp4");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  console.log("🎞️ Rendering video...");
  console.log(`   Duration: ${script.totalDuration}s (${composition.durationInFrames} frames)`);
  console.log(`   Resolution: ${composition.width}x${composition.height}`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      const percent = Math.round(progress * 100);
      process.stdout.write(`\r   Progress: ${percent}%`);
    },
  });

  // Cleanup
  assetServer.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);

  console.log(`\n\n✅ Video rendered successfully!`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📊 Size: ${fileSize} MB`);
  console.log(`⏱️ Time: ${elapsed}s`);
}

main().catch((err) => {
  console.error("❌ Render failed:", err);
  process.exit(1);
});
