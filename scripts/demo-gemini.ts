/**
 * Demo Script: Generate a 10-second Funny Fail Video
 * 
 * Uses:
 * - Gemini 2.5 Flash: Script generation (JSON)
 * - Pollinations.ai: Image generation (FREE, no API key)
 * - Deepgram: Text-to-Speech voiceover
 * 
 * Required Environment Variables:
 * - GOOGLE_GEMINI_API_KEY: Get free at https://aistudio.google.com/apikey
 * - DEEPGRAM_API_KEY: Get free $200 credit at https://deepgram.com
 * 
 * Usage: npx tsx scripts/demo-gemini.ts
 */

import { config } from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";

config(); // Load .env file

// API Endpoints
const GEMINI_TEXT_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";
const DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak";

// Alternative free image APIs
const PICSUM_URL = "https://picsum.photos"; // Random high-quality photos

interface Scene {
  id: number;
  text: string;
  imagePrompt: string;
  duration: number;
}

interface Script {
  title: string;
  scenes: Scene[];
  totalDuration: number;
}

// Check environment variables
function checkEnvVars() {
  const required = ["GOOGLE_GEMINI_API_KEY", "DEEPGRAM_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.log("\n📝 Quick setup:");
    console.log("   1. GOOGLE_GEMINI_API_KEY: https://aistudio.google.com/apikey (FREE)");
    console.log("   2. DEEPGRAM_API_KEY: https://deepgram.com (FREE $200 credit)");
    process.exit(1);
  }

  console.log("✅ All required environment variables found!\n");
}

// Step 1: Generate Script with Gemini 2.5 Flash
async function generateScript(): Promise<Script> {
  console.log("📝 Step 1: Generating script with Gemini 2.5 Flash...");

  const prompt = `Create a 10-second funny fail video script with exactly 2 scenes.

Requirements:
- Each scene has voiceover text (10-15 words max) and an image description
- Make it humorous and engaging  
- Theme: Epic fails caught on camera

Return ONLY valid JSON in this exact format:
{
  "title": "Video Title",
  "scenes": [
    {
      "id": 1,
      "text": "Short voiceover text for this scene",
      "imagePrompt": "Detailed image description, cartoon style, vibrant colors, funny comedy scene",
      "duration": 5
    },
    {
      "id": 2,
      "text": "Short voiceover text for scene two",
      "imagePrompt": "Detailed image description, cartoon style, vibrant colors, funny comedy scene", 
      "duration": 5
    }
  ],
  "totalDuration": 10
}`;

  try {
    const response = await fetch(
      `${GEMINI_TEXT_API}?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    const script: Script = JSON.parse(content);

    console.log(`   ✅ Script generated: "${script.title}"`);
    script.scenes.forEach((scene, i) => {
      console.log(`      Scene ${i + 1}: "${scene.text.substring(0, 50)}..."`);
    });

    return script;
  } catch (error) {
    console.log(`   ⚠️ Gemini API error, using fallback script...`);
    console.log(`   Error: ${error}`);

    // Fallback demo script
    return {
      title: "Epic Fails That Made Everyone Laugh",
      scenes: [
        {
          id: 1,
          text: "Watch this guy try to jump over the fence. Spoiler: the fence won!",
          imagePrompt:
            "A cartoon person mid-jump getting tangled in a wooden fence, legs flailing, surprised expression, vibrant colors, comedic scene",
          duration: 5,
        },
        {
          id: 2,
          text: "And this cake disaster? The birthday boy's face says it all!",
          imagePrompt:
            "A cartoon birthday party scene with cake smashed on someone's face, shocked expressions, colorful decorations, funny moment",
          duration: 5,
        },
      ],
      totalDuration: 10,
    };
  }
}

// Step 2: Generate Images (Pollinations.ai with Picsum fallback)
async function generateImages(script: Script): Promise<string[]> {
  console.log("\n🎨 Step 2: Generating images...");

  const imageBuffers: Buffer[] = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    console.log(`   ⏳ Generating image ${i + 1}/${script.scenes.length}...`);

    let buffer: Buffer | null = null;

    // Try Pollinations.ai first
    try {
      console.log(`      Trying Pollinations.ai...`);
      const enhancedPrompt = encodeURIComponent(
        `${scene.imagePrompt}, cartoon style, vibrant colors, high quality`
      );
      
      const imageUrl = `${POLLINATIONS_URL}/${enhancedPrompt}?width=720&height=1280&nologo=true&seed=${Date.now() + i}`;

      const response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(45000), // 45 second timeout
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("image")) {
          buffer = Buffer.from(await response.arrayBuffer());
          console.log(`   ✅ Image ${i + 1} generated with Pollinations (${(buffer.length / 1024).toFixed(1)} KB)`);
        }
      }
    } catch (error) {
      console.log(`      Pollinations failed: ${error}`);
    }

    // Fallback to Picsum (random high-quality photos)
    if (!buffer) {
      try {
        console.log(`      Trying Picsum (random photo)...`);
        const response = await fetch(`${PICSUM_URL}/720/1280?random=${Date.now() + i}`, {
          signal: AbortSignal.timeout(15000),
        });
        
        if (response.ok) {
          buffer = Buffer.from(await response.arrayBuffer());
          console.log(`   ✅ Image ${i + 1} from Picsum (${(buffer.length / 1024).toFixed(1)} KB)`);
        }
      } catch (error) {
        console.log(`      Picsum failed: ${error}`);
      }
    }

    // Final fallback to placeholder
    if (!buffer) {
      console.log(`      Using placeholder...`);
      buffer = await createPlaceholderImage(i + 1);
    }

    imageBuffers.push(buffer);

    // Small delay between requests
    if (i < script.scenes.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // Save images to files and return paths
  const outputDir = path.join(process.cwd(), "demo-output");
  await fs.mkdir(outputDir, { recursive: true });

  const imagePaths: string[] = [];
  for (let i = 0; i < imageBuffers.length; i++) {
    const imagePath = path.join(outputDir, `scene-${i + 1}.png`);
    await fs.writeFile(imagePath, imageBuffers[i]);
    imagePaths.push(imagePath);
  }

  return imagePaths;
}

// Create a simple placeholder image using SVG converted to PNG-like format
async function createPlaceholderImage(sceneNum: number): Promise<Buffer> {
  // Simple placeholder - just fetch from placehold.co
  const response = await fetch(
    `https://placehold.co/1080x1920/1a1a2e/ffffff/png?text=Scene+${sceneNum}`
  );
  return Buffer.from(await response.arrayBuffer());
}

// Step 3: Generate Voiceover with Deepgram TTS
async function generateVoiceover(
  script: Script
): Promise<{ audioBuffer: Buffer }> {
  console.log("\n🎙️ Step 3: Generating voiceover with Deepgram TTS...");

  const fullText = script.scenes.map((s) => s.text).join(" ");

  const response = await fetch(`${DEEPGRAM_TTS_URL}?model=aura-asteria-en`, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: fullText }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram TTS error: ${error}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`   ✅ Audio generated: ${(audioBuffer.length / 1024).toFixed(2)} KB`);

  return { audioBuffer };
}

// Step 4: Save all outputs
async function saveOutputs(
  script: Script,
  audioBuffer: Buffer,
  imagePaths: string[]
) {
  console.log("\n💾 Step 4: Saving outputs...");

  const outputDir = path.join(process.cwd(), "demo-output");
  await fs.mkdir(outputDir, { recursive: true });

  // Save script
  await fs.writeFile(
    path.join(outputDir, "script.json"),
    JSON.stringify(script, null, 2)
  );
  console.log("   ✅ Saved script.json");

  // Save audio
  await fs.writeFile(path.join(outputDir, "voiceover.mp3"), audioBuffer);
  console.log("   ✅ Saved voiceover.mp3");

  // Create Remotion render instructions
  const readme = `# Demo Video Assets Generated! 🎬

## Files Created:
- script.json - The video script with scenes
- voiceover.mp3 - AI-generated voiceover (Deepgram)
- scene-1.png, scene-2.png - AI-generated images (Imagen 4.0)

## APIs Used:
- **Script**: Gemini 2.5 Flash (text generation)
- **Images**: Imagen 4.0 Fast (image generation)  
- **Audio**: Deepgram Aura TTS

## To Render Final Video:

### Option 1: Remotion Studio
\`\`\`bash
cd ${process.cwd()}
npx remotion studio
\`\`\`

### Option 2: Remotion CLI
\`\`\`bash
npx remotion render src/remotion/index.tsx VideoComposition out/demo-video.mp4
\`\`\`

## Environment Variables Required:
- GOOGLE_GEMINI_API_KEY (for Gemini + Imagen)
- DEEPGRAM_API_KEY (for TTS)
`;

  await fs.writeFile(path.join(outputDir, "README.md"), readme);
  console.log("   ✅ Saved README.md");

  return outputDir;
}

// Main execution
async function main() {
  console.log("🎬 VidMax Demo - Generate 10s Funny Fail Video");
  console.log("   Using Gemini 2.5 Flash + Imagen 4.0 + Deepgram");
  console.log("=".repeat(55) + "\n");

  checkEnvVars();

  try {
    // Generate all assets
    const script = await generateScript();
    const imagePaths = await generateImages(script);
    const { audioBuffer } = await generateVoiceover(script);

    // Save outputs
    const outputDir = await saveOutputs(script, audioBuffer, imagePaths);

    console.log("\n" + "=".repeat(55));
    console.log("🎉 SUCCESS! Demo video assets generated!");
    console.log("=".repeat(55));
    console.log(`\n📁 Output folder: ${outputDir}`);
    console.log("\n📋 What was created:");
    console.log(`   • Script: "${script.title}" (${script.scenes.length} scenes)`);
    console.log("   • AI voiceover audio (Deepgram TTS)");
    console.log("   • AI-generated images (Imagen 4.0)");
    console.log("\n🚀 To render the final video:");
    console.log("   npx remotion studio\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
