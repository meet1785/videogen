import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const outDir = path.join(process.cwd(), "public/out");
    
    if (!fs.existsSync(outDir)) {
      return NextResponse.json({ videos: [] });
    }
    
    const files = fs.readdirSync(outDir)
      .filter(f => f.endsWith(".mp4"))
      .map(f => `/out/${f}`)
      .sort((a, b) => {
        // Sort by modification time, newest first
        const aPath = path.join(outDir, path.basename(a));
        const bPath = path.join(outDir, path.basename(b));
        try {
          return fs.statSync(bPath).mtimeMs - fs.statSync(aPath).mtimeMs;
        } catch {
          return 0;
        }
      });
    
    return NextResponse.json({ videos: files });
  } catch (error) {
    console.error("Error listing videos:", error);
    return NextResponse.json({ videos: [] });
  }
}
