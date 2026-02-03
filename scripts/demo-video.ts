/**
 * Demo Script: Generate a 10-second Funny Fail Compilation Video
 * 
 * This script demonstrates the core video generation pipeline without
 * requiring all the infrastructure (Inngest, Clerk, etc.)
 * 
 * Required Environment Variables:
 * - GOOGLE_GEMINI_API_KEY: Get free at https://makersuite.google.com/app/apikey
 * - DEEPGRAM_API_KEY: Get free $200 credit at https://deepgram.com
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 * 
 * Usage: npx tsx scripts/demo-video.ts
 */

import { config } from "dotenv";
config(); // Load .env file

// Use gemini-2.0-flash which is available and fast
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak";
const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";

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
  const required = [
    "GOOGLE_GEMINI_API_KEY",
    "DEEPGRAM_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.log("\n📝 Quick setup:");
    console.log("   1. GOOGLE_GEMINI_API_KEY: https://makersuite.google.com/app/apikey (FREE)");
    console.log("   2. DEEPGRAM_API_KEY: https://deepgram.com (FREE $200 credit)");
    process.exit(1);
  }
  
  console.log("✅ All required environment variables found!\n");
}

// Step 1: Generate Script with Gemini (or use fallback)
async function generateScript(): Promise<Script> {
  console.log("📝 Step 1: Generating script with Gemini...");
  
  const prompt = `You are a viral short-form video scriptwriter for funny fail compilations.

Create a 10-second video script about: "Funny fail compilation - epic moments caught on camera"

Requirements:
- Split into exactly 2 scenes (5 seconds each)
- Each scene describes a funny fail moment
- Make it humorous and engaging
- Keep text very short for TTS (10-15 words per scene max)

Respond ONLY with valid JSON in this exact format:
{
  "title": "Epic Fails That Made Everyone Laugh",
  "scenes": [
    {
      "id": 1,
      "text": "The spoken text for this scene",
      "imagePrompt": "Detailed image description of a funny fail moment, cartoon style, vibrant colors, comedic",
      "duration": 5
    }
  ],
  "totalDuration": 10
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GOOGLE_GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Gemini API failed");
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    const script: Script = JSON.parse(content);
    
    console.log(`   ✅ Script generated: "${script.title}"`);
    console.log(`   📄 Scenes: ${script.scenes.length}`);
    script.scenes.forEach((scene, i) => {
      console.log(`      Scene ${i + 1}: "${scene.text.substring(0, 50)}..."`);
    });
    
    return script;
  } catch (error) {
    console.log("   ⚠️ Gemini API unavailable, using demo script...");
    
    // Fallback demo script for funny fails
    const fallbackScript: Script = {
      title: "Epic Fails That Made Everyone Laugh",
      scenes: [
        {
          id: 1,
          text: "Watch this guy try to jump over the fence. Spoiler alert: the fence won!",
          imagePrompt: "A cartoon person mid-jump getting tangled in a wooden fence, legs flailing, surprised expression, vibrant colors, comedic scene, outdoor backyard setting",
          duration: 5,
        },
        {
          id: 2,
          text: "And this cake disaster? The birthday boy's face says it all!",
          imagePrompt: "A cartoon birthday party scene with cake smashed on someone's face, shocked expressions, colorful decorations, balloons, funny moment captured",
          duration: 5,
        },
      ],
      totalDuration: 10,
    };
    
    console.log(`   ✅ Using demo script: "${fallbackScript.title}"`);
    console.log(`   📄 Scenes: ${fallbackScript.scenes.length}`);
    fallbackScript.scenes.forEach((scene, i) => {
      console.log(`      Scene ${i + 1}: "${scene.text.substring(0, 50)}..."`);
    });
    
    return fallbackScript;
  }
}

// Step 2: Generate Voiceover with Deepgram TTS
async function generateVoiceover(script: Script): Promise<{ audioBuffer: Buffer }> {
  console.log("\n🎙️ Step 2: Generating voiceover with Deepgram TTS...");
  
  const fullText = script.scenes.map((s) => s.text).join(" ");
  
  const response = await fetch(`${DEEPGRAM_TTS_URL}?model=aura-asteria-en`, {
    method: "POST",
    headers: {
      "Authorization": `Token ${process.env.DEEPGRAM_API_KEY}`,
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

// Step 3: Generate Images with Pollinations (FREE!)
async function generateImages(script: Script): Promise<string[]> {
  console.log("\n🎨 Step 3: Generating images with Pollinations.ai (FREE)...");
  
  const imageUrls: string[] = [];
  
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    const enhancedPrompt = encodeURIComponent(
      `${scene.imagePrompt}, cartoon style, funny, vibrant colors, comedic scene, high quality, 9:16 vertical`
    );
    
    const imageUrl = `${POLLINATIONS_URL}/${enhancedPrompt}?width=1080&height=1920&nologo=true&seed=${Date.now() + i}`;
    
    console.log(`   ⏳ Generating image ${i + 1}/${script.scenes.length}...`);
    
    // Fetch to ensure image is generated
    const response = await fetch(imageUrl);
    if (response.ok) {
      imageUrls.push(imageUrl);
      console.log(`   ✅ Image ${i + 1} ready`);
    } else {
      console.log(`   ⚠️ Image ${i + 1} failed, using placeholder`);
      imageUrls.push(`https://placehold.co/1080x1920/1a1a2e/ffffff?text=Scene+${i + 1}`);
    }
    
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1500));
  }
  
  return imageUrls;
}

// Step 4: Save outputs locally
async function saveOutputs(
  script: Script,
  audioBuffer: Buffer,
  imageUrls: string[]
) {
  const fs = await import("fs/promises");
  const path = await import("path");
  
  const outputDir = path.join(process.cwd(), "demo-output");
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  console.log("\n💾 Step 4: Saving outputs...");
  
  // Save script
  await fs.writeFile(
    path.join(outputDir, "script.json"),
    JSON.stringify(script, null, 2)
  );
  console.log("   ✅ Saved script.json");
  
  // Save audio
  await fs.writeFile(path.join(outputDir, "voiceover.mp3"), audioBuffer);
  console.log("   ✅ Saved voiceover.mp3");
  
  // Save image URLs
  await fs.writeFile(
    path.join(outputDir, "images.json"),
    JSON.stringify(imageUrls, null, 2)
  );
  console.log("   ✅ Saved images.json");
  
  // Download images
  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const response = await fetch(imageUrls[i]);
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(path.join(outputDir, `scene-${i + 1}.png`), buffer);
      console.log(`   ✅ Saved scene-${i + 1}.png`);
    } catch (error) {
      console.log(`   ⚠️ Could not save scene-${i + 1}.png`);
    }
  }
  
  // Create Remotion render instructions
  const renderInstructions = `
# Demo Video Assets Generated! 🎬

## Files Created:
- script.json - The video script with scenes
- voiceover.mp3 - AI-generated voiceover audio
- scene-1.png, scene-2.png - AI-generated images
- images.json - Image URLs

## To Render the Final Video:

### Option 1: Use Remotion CLI (Recommended)
\`\`\`bash
cd ${process.cwd()}
npx remotion render src/remotion/index.tsx VideoComposition out/demo-video.mp4 \\
  --props='${JSON.stringify({ script, audioUrl: "file://demo-output/voiceover.mp3", captions: [], imageUrls })}'
\`\`\`

### Option 2: Preview in Remotion Studio
\`\`\`bash
npx remotion studio
\`\`\`

## Next Steps:
1. Set up Supabase for cloud storage
2. Configure Inngest for async processing
3. Set up GitHub Actions for cloud rendering
`;
  
  await fs.writeFile(path.join(outputDir, "README.md"), renderInstructions);
  console.log("   ✅ Saved README.md with render instructions");
  
  return outputDir;
}

// Main execution
async function main() {
  console.log("🎬 VidMax Demo - Generate 10s Funny Fail Video\n");
  console.log("=" .repeat(50) + "\n");
  
  checkEnvVars();
  
  try {
    // Generate all assets
    const script = await generateScript();
    const { audioBuffer } = await generateVoiceover(script);
    const imageUrls = await generateImages(script);
    
    // Save outputs
    const outputDir = await saveOutputs(script, audioBuffer, imageUrls);
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 SUCCESS! Demo video assets generated!");
    console.log("=".repeat(50));
    console.log(`\n📁 Output folder: ${outputDir}`);
    console.log("\n📋 What was created:");
    console.log("   • Script with 2 scenes for funny fails");
    console.log("   • AI voiceover audio (MP3)");
    console.log("   • 2 AI-generated images (PNG)");
    console.log("\n🚀 To render the final video:");
    console.log("   npx remotion studio");
    console.log("   # Then click Render in the Remotion UI\n");
    
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
