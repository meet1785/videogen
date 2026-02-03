/**
 * Quick Generate Video API
 * 
 * This endpoint generates a complete video synchronously:
 * 1. Generates script with Gemini
 * 2. Generates voiceover with Deepgram TTS
 * 3. Gets word-level captions with Deepgram STT
 * 4. Generates images matching scene prompts with Pollinations
 * 5. Renders final video with Remotion
 * 
 * Returns the video file directly
 */

import { NextRequest, NextResponse } from "next/server";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import http from "http";

interface Scene {
  id: number;
  text: string;
  imagePrompt: string;
  duration: number;
  startTime?: number;
  endTime?: number;
}

interface Script {
  title: string;
  scenes: Scene[];
  totalDuration: number;
}

interface WordCaption {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface Caption {
  text: string;
  start: number;
  end: number;
  words: WordCaption[];
}

// Generate Script with Gemini
async function generateScript(
  topic: string, 
  style: string, 
  duration: number, 
  imageStyle: string
): Promise<Script> {
  const numScenes = Math.ceil(duration / 5);
  
  const imageStyleGuide: Record<string, string> = {
    photorealistic: "photorealistic, high detail, natural lighting",
    cartoon: "cartoon style, colorful, animated, Pixar-like, expressive",
    cinematic: "cinematic, dramatic lighting, movie still, epic",
    minimalist: "minimalist, clean, simple shapes, modern",
    vibrant: "vibrant colors, high saturation, bold, eye-catching",
  };

  const stylePrompts: Record<string, string> = {
    VIRAL: "Fast-paced, attention-grabbing with hooks and surprises. Short punchy sentences.",
    EDUCATIONAL: "Informative content with clear explanations and analogies.",
    STORYTELLING: "Narrative-driven with beginning, middle, end and emotional hooks.",
    MOTIVATIONAL: "Inspiring content with powerful quotes and actionable advice.",
  };

  const prompt = `You are a viral short-form video scriptwriter. ${stylePrompts[style] || stylePrompts.VIRAL}

Create a ${duration}-second video script about: "${topic}"

REQUIREMENTS:
1. Exactly ${numScenes} scenes
2. Each scene 4-6 seconds spoken content
3. Powerful hook in first 3 seconds
4. Each imagePrompt MUST describe SPECIFIC visuals that DIRECTLY match the spoken text
5. Image style: ${imageStyleGuide[imageStyle]}

Respond ONLY with JSON:
{
  "title": "Video title",
  "scenes": [
    {
      "id": 1,
      "text": "Spoken narration (4-6 seconds)",
      "imagePrompt": "Detailed visual matching the text. ${imageStyleGuide[imageStyle]}. Vertical 9:16.",
      "duration": 5
    }
  ],
  "totalDuration": ${duration}
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) throw new Error("Gemini API error");
  const data = await response.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

// Generate Voiceover
async function generateVoiceover(text: string, voice: string): Promise<Buffer> {
  const response = await fetch(
    `https://api.deepgram.com/v1/speak?model=${voice}&encoding=mp3`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "text/plain",
      },
      body: text,
    }
  );

  if (!response.ok) throw new Error("Deepgram TTS error");
  return Buffer.from(await response.arrayBuffer());
}

// Get word-level captions
async function getWordCaptions(audioBuffer: Buffer): Promise<Caption[]> {
  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&utterances=true&smart_format=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/mp3",
      },
      body: audioBuffer,
    }
  );

  if (!response.ok) throw new Error("Deepgram STT error");
  
  const data = await response.json();
  const utterances = data.results?.utterances || [];
  const words = data.results?.channels?.[0]?.alternatives?.[0]?.words || [];

  return utterances.map((utt: { transcript: string; start: number; end: number }) => ({
    text: utt.transcript,
    start: utt.start,
    end: utt.end,
    words: words
      .filter((w: { start: number; end: number }) => w.start >= utt.start && w.end <= utt.end + 0.1)
      .map((w: { word: string; start: number; end: number; confidence: number }) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })),
  }));
}

// Calculate scene durations from captions
function calculateSceneDurations(script: Script, captions: Caption[]): Script {
  const allWords: WordCaption[] = captions.flatMap(c => c.words);
  if (allWords.length === 0) return script;

  const totalAudioDuration = allWords[allWords.length - 1].end;
  
  const scenesWithTiming = script.scenes.map((scene) => ({
    ...scene,
    wordCount: scene.text.split(/\s+/).length,
  }));
  
  const totalWords = scenesWithTiming.reduce((sum, s) => sum + s.wordCount, 0);
  
  let currentTime = 0;
  script.scenes = scenesWithTiming.map((scene) => {
    const proportion = scene.wordCount / totalWords;
    const duration = proportion * totalAudioDuration;
    const startTime = currentTime;
    currentTime += duration;
    return { ...scene, duration: Math.max(duration, 2), startTime };
  });

  script.totalDuration = totalAudioDuration;
  return script;
}

// Generate images
async function generateImages(script: Script, outputDir: string): Promise<string[]> {
  const imagePaths: string[] = [];
  
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    const enhancedPrompt = encodeURIComponent(
      `${scene.imagePrompt}, vertical 9:16, high quality`
    );
    
    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=1080&height=1920&nologo=true&seed=${Date.now() + i}`;
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(60000) });
      
      if (response.ok && response.headers.get("content-type")?.includes("image")) {
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        const imagePath = path.join(outputDir, `scene-${i + 1}.png`);
        fs.writeFileSync(imagePath, imageBuffer);
        imagePaths.push(imagePath);
      } else {
        throw new Error("Image generation failed");
      }
      
      await new Promise(r => setTimeout(r, 1500));
    } catch {
      // Fallback placeholder
      const resp = await fetch(`https://placehold.co/1080x1920/1a1a2e/ffffff/png?text=Scene+${i + 1}`);
      const buf = Buffer.from(await resp.arrayBuffer());
      const imagePath = path.join(outputDir, `scene-${i + 1}.png`);
      fs.writeFileSync(imagePath, buf);
      imagePaths.push(imagePath);
    }
  }
  
  return imagePaths;
}

// Asset server
function startAssetServer(dir: string, port: number): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url?.split("?")[0] || "/";
      const filePath = path.join(dir, urlPath);
      
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const types: Record<string, string> = {
          ".mp3": "audio/mpeg", ".png": "image/png", ".jpg": "image/jpeg"
        };
        res.writeHead(200, {
          "Content-Type": types[ext] || "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(port, () => resolve(server));
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic = "Funny animal fails",
      duration = 30,
      style = "VIRAL",
      imageStyle = "cartoon",
      voice = "aura-asteria-en",
    } = body;

    // Create temp directory
    const outputDir = path.join(process.cwd(), "temp", `video-${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });

    // 1. Generate script
    let script = await generateScript(topic, style, duration, imageStyle);

    // 2. Generate voiceover
    const fullText = script.scenes.map(s => s.text).join(" ");
    const audioBuffer = await generateVoiceover(fullText, voice);
    const audioPath = path.join(outputDir, "voiceover.mp3");
    fs.writeFileSync(audioPath, audioBuffer);

    // 3. Get captions
    const captions = await getWordCaptions(audioBuffer);

    // 4. Calculate scene durations
    script = calculateSceneDurations(script, captions);

    // 5. Generate images
    const imagePaths = await generateImages(script, outputDir);

    // 6. Render video
    const assetPort = 8800 + Math.floor(Math.random() * 100);
    const server = await startAssetServer(outputDir, assetPort);

    const audioUrl = `http://localhost:${assetPort}/voiceover.mp3`;
    const imageUrls = imagePaths.map((_, i) => `http://localhost:${assetPort}/scene-${i + 1}.png`);

    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), "src/remotion/index.tsx"),
    });

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "VideoComposition",
      inputProps: { script, audioUrl, captions, imageUrls },
    });

    const outputPath = path.join(outputDir, "video.mp4");

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: { script, audioUrl, captions, imageUrls },
    });

    server.close();

    // Read and return video
    const videoBuffer = fs.readFileSync(outputPath);

    // Cleanup temp files
    fs.rmSync(outputDir, { recursive: true, force: true });

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="video.mp4"`,
      },
    });
  } catch (error) {
    console.error("Quick generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video generation failed" },
      { status: 500 }
    );
  }
}
