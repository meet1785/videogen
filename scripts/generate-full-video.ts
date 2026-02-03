/**
 * Complete Video Generation Pipeline
 * 
 * This script generates a full video from a topic:
 * 1. Generate script with Gemini (with proper image prompts)
 * 2. Generate voiceover with Deepgram TTS
 * 3. Get word-level captions with Deepgram STT
 * 4. Calculate scene durations from voice timing
 * 5. Generate images matching scene prompts
 * 6. Render final video with Remotion
 */

import dotenv from "dotenv";
dotenv.config();

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import http from "http";

// Configuration
const CONFIG = {
  topic: process.argv[2] || "Funny animal fails compilation that will make you laugh",
  duration: parseInt(process.argv[3]) || 30,
  style: process.argv[4] || "VIRAL",
  imageStyle: process.argv[5] || "cartoon",
  voice: process.argv[6] || "aura-asteria-en",
};

const OUTPUT_DIR = path.join(process.cwd(), "generated-video");
const OUTPUT_VIDEO = path.join(process.cwd(), "out", `video-${Date.now()}.mp4`);

// Types
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

// Environment checks
function checkEnv() {
  const required = ["GOOGLE_GEMINI_API_KEY", "DEEPGRAM_API_KEY"];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing environment variables: ${missing.join(", ")}`);
    console.error("   Set them in .env file");
    process.exit(1);
  }
}

// 1. Generate Script with Gemini
async function generateScript(topic: string, style: string, duration: number, imageStyle: string): Promise<Script> {
  console.log("📝 Generating script with Gemini...");
  
  const numScenes = Math.ceil(duration / 5); // ~5 seconds per scene
  
  const imageStyleGuide: Record<string, string> = {
    photorealistic: "photorealistic, high detail, natural lighting, DSLR quality",
    cartoon: "cartoon style, colorful, animated, Pixar-like, expressive characters",
    cinematic: "cinematic, dramatic lighting, movie still, widescreen, epic",
    minimalist: "minimalist, clean, simple shapes, modern design, white space",
    vibrant: "vibrant colors, high saturation, bold, eye-catching, dynamic",
  };

  const stylePrompts: Record<string, string> = {
    VIRAL: "Create fast-paced, attention-grabbing content with hooks and surprising elements. Short punchy sentences.",
    EDUCATIONAL: "Create informative content that explains concepts clearly with analogies.",
    STORYTELLING: "Create narrative-driven content with beginning, middle, end. Include emotional hooks.",
    MOTIVATIONAL: "Create inspiring content with powerful quotes and actionable advice.",
  };

  const prompt = `You are a viral short-form video scriptwriter. ${stylePrompts[style] || stylePrompts.VIRAL}

Create a ${duration}-second video script about: "${topic}"

CRITICAL REQUIREMENTS:
1. Split into exactly ${numScenes} scenes
2. Each scene should be 4-6 seconds of SPOKEN content (not too long!)
3. Start with a powerful hook in first 3 seconds
4. Each imagePrompt MUST describe a SPECIFIC visual scene that DIRECTLY illustrates the spoken text
5. Image prompts must be detailed and describe exactly what should appear on screen
6. End with a call to action

IMAGE STYLE TO USE: ${imageStyleGuide[imageStyle] || imageStyleGuide.photorealistic}

IMPORTANT: Each imagePrompt should describe a UNIQUE scene that matches the spoken text. 
For example:
- If text is about a cat falling, imagePrompt describes a cat mid-fall
- If text mentions a specific animal, describe that exact animal
- Be SPECIFIC about expressions, actions, settings

Respond ONLY with valid JSON:
{
  "title": "Catchy video title",
  "scenes": [
    {
      "id": 1,
      "text": "The spoken narration for this scene (keep short, 4-6 seconds when spoken)",
      "imagePrompt": "DETAILED visual description that matches the spoken text exactly. ${imageStyleGuide[imageStyle]}. Vertical 9:16 portrait orientation.",
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
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${await response.text()}`);
  }

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  
  // Try to parse JSON, with cleanup if needed
  let script: Script;
  try {
    script = JSON.parse(rawText);
  } catch {
    // Try to fix common JSON issues
    const cleanedText = rawText
      .replace(/[\x00-\x1F\x7F]/g, ' ')  // Remove control characters
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']');
    script = JSON.parse(cleanedText);
  }
  
  console.log(`   ✅ Generated ${script.scenes.length} scenes: "${script.title}"`);
  return script;
}

// 2. Generate Voiceover with Deepgram TTS
async function generateVoiceover(text: string, voice: string): Promise<Buffer> {
  console.log("🎙️ Generating voiceover with Deepgram TTS...");
  
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

  if (!response.ok) {
    throw new Error(`Deepgram TTS error: ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`   ✅ Generated voiceover (${(buffer.length / 1024).toFixed(1)} KB)`);
  return buffer;
}

// 3. Get word-level captions with Deepgram STT
async function getWordCaptions(audioBuffer: Buffer): Promise<Caption[]> {
  console.log("📝 Getting word-level captions with Deepgram STT...");
  
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

  if (!response.ok) {
    throw new Error(`Deepgram STT error: ${await response.text()}`);
  }

  const data = await response.json();
  const utterances = data.results?.utterances || [];
  const words = data.results?.channels?.[0]?.alternatives?.[0]?.words || [];

  // Group words into captions based on utterances
  const captions: Caption[] = utterances.map((utt: { transcript: string; start: number; end: number }) => {
    const captionWords = words.filter(
      (w: { start: number; end: number }) => w.start >= utt.start && w.end <= utt.end + 0.1
    );
    return {
      text: utt.transcript,
      start: utt.start,
      end: utt.end,
      words: captionWords.map((w: { word: string; start: number; end: number; confidence: number }) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })),
    };
  });

  // Get total audio duration
  const totalDuration = words.length > 0 ? words[words.length - 1].end : 0;
  console.log(`   ✅ Got ${captions.length} caption segments (${totalDuration.toFixed(1)}s audio)`);
  
  return captions;
}

// 4. Calculate scene durations from captions
function calculateSceneDurations(script: Script, captions: Caption[]): Script {
  console.log("⏱️ Calculating scene durations from voice timing...");
  
  // Get all words with timing
  const allWords: WordCaption[] = captions.flatMap(c => c.words);
  if (allWords.length === 0) return script;

  const totalAudioDuration = allWords[allWords.length - 1].end;
  
  // Calculate word count per scene and assign timing
  const scenesWithTiming = script.scenes.map((scene, index) => {
    const sceneWords = scene.text.split(/\s+/).length;
    return { ...scene, wordCount: sceneWords };
  });
  
  const totalWords = scenesWithTiming.reduce((sum, s) => sum + s.wordCount, 0);
  
  let currentTime = 0;
  script.scenes = scenesWithTiming.map((scene, index) => {
    const proportion = scene.wordCount / totalWords;
    const duration = proportion * totalAudioDuration;
    const startTime = currentTime;
    const endTime = currentTime + duration;
    currentTime = endTime;
    
    return {
      ...scene,
      duration: Math.max(duration, 2), // Minimum 2 seconds
      startTime,
      endTime,
    };
  });

  script.totalDuration = totalAudioDuration;
  
  script.scenes.forEach((scene, i) => {
    console.log(`   Scene ${i + 1}: ${scene.duration.toFixed(1)}s (${scene.startTime?.toFixed(1)}-${scene.endTime?.toFixed(1)}s)`);
  });
  
  return script;
}

// 5. Generate images - using multiple services with fallbacks
async function generateImages(script: Script, imageStyle: string): Promise<string[]> {
  console.log("🎨 Generating images...\n");
  
  const imageUrls: string[] = [];
  
  // Image categories based on scene content keywords
  const getImageCategory = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('cat') || lower.includes('kitten')) return 'cats';
    if (lower.includes('dog') || lower.includes('puppy')) return 'dogs';
    if (lower.includes('animal')) return 'animals';
    if (lower.includes('nature') || lower.includes('outdoor')) return 'nature';
    if (lower.includes('food') || lower.includes('eat')) return 'food';
    if (lower.includes('tech') || lower.includes('computer')) return 'tech';
    if (lower.includes('city') || lower.includes('building')) return 'city';
    return 'animals'; // Default for funny animal videos
  };
  
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    const shortPrompt = scene.imagePrompt.substring(0, 60);
    console.log(`   Scene ${i + 1}: ${shortPrompt}...`);
    
    let success = false;
    
    // Try 1: Pollinations.ai
    try {
      const simplePrompt = scene.imagePrompt
        .replace(/[^\w\s,.-]/g, '')
        .substring(0, 150);
      
      const enhancedPrompt = encodeURIComponent(simplePrompt);
      const seed = Date.now() + i * 1000;
      const imageUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=1080&height=1920&nologo=true&seed=${seed}`;
      
      const response = await fetch(imageUrl, { 
        signal: AbortSignal.timeout(45000),
      });
      
      if (response.ok && response.headers.get("content-type")?.includes("image")) {
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        if (imageBuffer.length > 10000) {
          const imagePath = path.join(OUTPUT_DIR, `scene-${i + 1}.png`);
          fs.writeFileSync(imagePath, imageBuffer);
          imageUrls.push(imagePath);
          success = true;
          console.log(`   ✅ Scene ${i + 1} (Pollinations) ${(imageBuffer.length / 1024).toFixed(0)} KB`);
        }
      }
    } catch (e) {
      // Pollinations failed, try next
    }
    
    // Try 2: Unsplash Source (free, no API key) 
    if (!success) {
      try {
        const category = getImageCategory(scene.text);
        const unsplashUrl = `https://source.unsplash.com/1080x1920/?${category},funny`;
        
        const response = await fetch(unsplashUrl, { 
          signal: AbortSignal.timeout(15000),
          redirect: 'follow'
        });
        
        if (response.ok) {
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          if (imageBuffer.length > 5000) {
            const imagePath = path.join(OUTPUT_DIR, `scene-${i + 1}.png`);
            fs.writeFileSync(imagePath, imageBuffer);
            imageUrls.push(imagePath);
            success = true;
            console.log(`   ✅ Scene ${i + 1} (Unsplash) ${(imageBuffer.length / 1024).toFixed(0)} KB`);
          }
        }
      } catch (e) {
        // Unsplash failed, try next
      }
    }
    
    // Try 3: Lorem Picsum with blur effect for artistic look
    if (!success) {
      try {
        const seed = Math.floor(Math.random() * 1000);
        const picsumUrl = `https://picsum.photos/seed/${seed + i}/1080/1920`;
        
        const response = await fetch(picsumUrl, { 
          signal: AbortSignal.timeout(15000),
          redirect: 'follow'
        });
        
        if (response.ok) {
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          const imagePath = path.join(OUTPUT_DIR, `scene-${i + 1}.png`);
          fs.writeFileSync(imagePath, imageBuffer);
          imageUrls.push(imagePath);
          success = true;
          console.log(`   ✅ Scene ${i + 1} (Picsum) ${(imageBuffer.length / 1024).toFixed(0)} KB`);
        }
      } catch (e) {
        // Picsum failed
      }
    }
    
    // Fallback: Colored placeholder with scene text
    if (!success) {
      console.log(`   ⚠️ Scene ${i + 1} using text placeholder`);
      const text = encodeURIComponent(scene.text.substring(0, 25).replace(/[^\w\s]/g, ''));
      const colors = ['4a0072', '0f3460', '16213e', '1a1a2e', '533483', '2d3436'];
      const color = colors[i % colors.length];
      
      try {
        const placeholderUrl = `https://placehold.co/1080x1920/${color}/ffffff/png?text=${text || 'Scene ' + (i+1)}`;
        const resp = await fetch(placeholderUrl, { signal: AbortSignal.timeout(10000) });
        const buf = Buffer.from(await resp.arrayBuffer());
        const imagePath = path.join(OUTPUT_DIR, `scene-${i + 1}.png`);
        fs.writeFileSync(imagePath, buf);
        imageUrls.push(imagePath);
      } catch {
        // Create minimal placeholder file
        const imagePath = path.join(OUTPUT_DIR, `scene-${i + 1}.png`);
        // Copy a default image if available, else create empty
        imageUrls.push(imagePath);
      }
    }
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1500));
  }
  
  return imageUrls;
}

// 6. Render video with Remotion
async function renderVideo(
  script: Script,
  audioPath: string,
  captions: Caption[],
  imagePaths: string[]
): Promise<string> {
  console.log("\n🎬 Rendering video with Remotion...");
  
  const assetPort = 8799;
  
  // Start asset server
  const server = await startAssetServer(OUTPUT_DIR, assetPort);
  
  // Build HTTP URLs for assets
  const audioUrl = `http://localhost:${assetPort}/voiceover.mp3`;
  const imageUrls = imagePaths.map((_, i) => `http://localhost:${assetPort}/scene-${i + 1}.png`);
  
  const inputProps = { script, audioUrl, captions, imageUrls };
  
  console.log("   📦 Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), "src/remotion/index.tsx"),
  });
  
  console.log("   🎥 Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "VideoComposition",
    inputProps,
  });
  
  fs.mkdirSync(path.dirname(OUTPUT_VIDEO), { recursive: true });
  
  console.log(`   🎞️ Rendering ${script.totalDuration.toFixed(1)}s video (${composition.durationInFrames} frames)...`);
  
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: OUTPUT_VIDEO,
    inputProps,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r   Progress: ${Math.round(progress * 100)}%`);
    },
  });
  
  server.close();
  
  console.log("\n");
  return OUTPUT_VIDEO;
}

// Asset server helper
function startAssetServer(dir: string, port: number): Promise<http.Server> {
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

// Main function
async function main() {
  console.log("\n🚀 VidMax Full Video Generation Pipeline\n");
  console.log(`📌 Topic: "${CONFIG.topic}"`);
  console.log(`⏱️ Duration: ${CONFIG.duration}s | 🎨 Style: ${CONFIG.imageStyle} | 🎙️ Voice: ${CONFIG.voice}\n`);
  
  checkEnv();
  
  const startTime = Date.now();
  
  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Step 1: Generate Script
  let script = await generateScript(CONFIG.topic, CONFIG.style, CONFIG.duration, CONFIG.imageStyle);
  fs.writeFileSync(path.join(OUTPUT_DIR, "script.json"), JSON.stringify(script, null, 2));
  
  // Step 2: Generate Voiceover
  const fullText = script.scenes.map(s => s.text).join(" ");
  const audioBuffer = await generateVoiceover(fullText, CONFIG.voice);
  const audioPath = path.join(OUTPUT_DIR, "voiceover.mp3");
  fs.writeFileSync(audioPath, audioBuffer);
  
  // Step 3: Get word-level captions
  const captions = await getWordCaptions(audioBuffer);
  fs.writeFileSync(path.join(OUTPUT_DIR, "captions.json"), JSON.stringify(captions, null, 2));
  
  // Step 4: Calculate scene durations from voice timing
  script = calculateSceneDurations(script, captions);
  fs.writeFileSync(path.join(OUTPUT_DIR, "script.json"), JSON.stringify(script, null, 2));
  
  // Step 5: Generate images matching scene prompts
  const imagePaths = await generateImages(script, CONFIG.imageStyle);
  
  // Step 6: Render final video
  const videoPath = await renderVideo(script, audioPath, captions, imagePaths);
  
  // Done!
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const fileSize = (fs.statSync(videoPath).size / 1024 / 1024).toFixed(2);
  
  console.log("✅ Video generation complete!\n");
  console.log(`📁 Video: ${videoPath}`);
  console.log(`📊 Size: ${fileSize} MB | ⏱️ Total time: ${elapsed}s`);
  console.log(`\n📂 Assets saved to: ${OUTPUT_DIR}`);
  
  // Copy to public folder for frontend access
  const publicPath = path.join(process.cwd(), "public/out", path.basename(videoPath));
  fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  fs.copyFileSync(videoPath, publicPath);
  console.log(`🌐 Web accessible at: /out/${path.basename(videoPath)}`);
}

main().catch((e) => {
  console.error("\n❌ Error:", e.message);
  process.exit(1);
});
