/**
 * Generate 30-second Funny Animal Fails YouTube Short
 * 
 * Creates a properly synced video with:
 * - AI-generated script (Gemini 2.5 Flash)
 * - AI voiceover with word-level timing (Deepgram)
 * - AI-generated images (Pollinations/Picsum)
 * - Proper scene synchronization
 */

import { config } from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";

config();

// API Endpoints
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak";
const DEEPGRAM_STT_URL = "https://api.deepgram.com/v1/listen";
const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";
const PICSUM_URL = "https://picsum.photos";

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

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface Caption {
  text: string;
  start: number;
  end: number;
  words: WordTiming[];
}

const OUTPUT_DIR = path.join(process.cwd(), "animal-fails-output");

async function main() {
  console.log("🎬 Creating 30s Funny Animal Fails YouTube Short\n");
  console.log("=".repeat(55) + "\n");

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Step 1: Generate optimized script
  const script = await generateAnimalFailsScript();

  // Step 2: Generate voiceover with word-level timing
  const { audioBuffer, captions, audioDuration } = await generateSyncedVoiceover(script);

  // Step 3: Adjust scene durations based on actual audio
  const syncedScript = syncScriptWithAudio(script, captions, audioDuration);

  // Step 4: Generate matching images
  const imagePaths = await generateImages(syncedScript);

  // Step 5: Save all outputs
  await saveOutputs(syncedScript, audioBuffer, captions, imagePaths);

  console.log("\n" + "=".repeat(55));
  console.log("🎉 Assets generated! Now rendering video...");
  console.log("=".repeat(55) + "\n");

  return { script: syncedScript, captions, imagePaths };
}

async function generateAnimalFailsScript(): Promise<Script> {
  console.log("📝 Step 1: Generating viral animal fails script...");

  const prompt = `You are a viral YouTube Shorts scriptwriter. Create a 30-second funny animal fails compilation script.

REQUIREMENTS:
- Exactly 6 scenes, each 4-5 seconds
- Each scene describes ONE funny animal fail moment
- Mix of cats (4) and dogs (2) for variety
- Voiceover text should be SHORT and PUNCHY (8-12 words max per scene)
- Hook in first scene to grab attention
- Include these viral fail types: jumping fail, scared reaction, sliding fail, bonk/collision, sleeping fail

STYLE:
- Casual, funny narrator voice
- Use phrases like "Watch this...", "Oh no...", "He was so confident..."
- End with a satisfying callback or funny conclusion

Return ONLY valid JSON:
{
  "title": "Funny Animal Fails Compilation",
  "scenes": [
    {
      "id": 1,
      "text": "Short punchy narration for scene",
      "imagePrompt": "Detailed cartoon-style image description of the animal fail moment, vibrant colors, funny expression, dynamic action pose",
      "duration": 5
    }
  ],
  "totalDuration": 30
}`;

  try {
    const response = await fetch(`${GEMINI_API}?key=${process.env.GOOGLE_GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
      }),
    });

    if (!response.ok) throw new Error("Gemini API failed");

    const data = await response.json();
    const script: Script = JSON.parse(data.candidates[0].content.parts[0].text);

    console.log(`   ✅ Script: "${script.title}"`);
    script.scenes.forEach((s, i) => {
      console.log(`      Scene ${i + 1}: "${s.text.substring(0, 45)}..."`);
    });

    return script;
  } catch (error) {
    console.log("   ⚠️ Using fallback script...");
    return getFallbackScript();
  }
}

function getFallbackScript(): Script {
  return {
    title: "Funniest Animal Fails That Will Make You Laugh",
    scenes: [
      {
        id: 1,
        text: "Watch this confident cat attempt the impossible jump!",
        imagePrompt: "A fluffy orange cat mid-air attempting to jump from kitchen counter to refrigerator top, legs spread wide, determined expression, cartoon style, vibrant kitchen background, dynamic action pose",
        duration: 5,
      },
      {
        id: 2,
        text: "Oh no, someone discovered a cucumber behind them!",
        imagePrompt: "A startled gray cat jumping straight up in terror after seeing a cucumber, fur puffed up, eyes wide with shock, food bowl nearby, cartoon style, comedic exaggerated reaction",
        duration: 5,
      },
      {
        id: 3,
        text: "This sleepy cat forgot about gravity!",
        imagePrompt: "A chubby tabby cat rolling off the edge of a table while sleeping, peaceful sleeping face despite falling, cartoon style, living room background, funny moment frozen in time",
        duration: 5,
      },
      {
        id: 4,
        text: "He really thought he could catch that treat!",
        imagePrompt: "A golden retriever dog with treat bouncing off its forehead, confused cross-eyed expression, treat mid-air, cartoon style, funny derpy face, outdoor park setting",
        duration: 5,
      },
      {
        id: 5,
        text: "The glass door strikes again!",
        imagePrompt: "An excited dog pressed flat against a glass sliding door after running into it, squished funny face, cartoon style, surprised expression, backyard visible through glass",
        duration: 5,
      },
      {
        id: 6,
        text: "And they'll do it all again tomorrow!",
        imagePrompt: "A collage of happy but slightly dazed cats and dogs with cartoon stars around their heads, all looking proud despite their fails, cartoon style, funny group portrait, vibrant colors",
        duration: 5,
      },
    ],
    totalDuration: 30,
  };
}

async function generateSyncedVoiceover(script: Script): Promise<{
  audioBuffer: Buffer;
  captions: Caption[];
  audioDuration: number;
}> {
  console.log("\n🎙️ Step 2: Generating synced voiceover...");

  const fullText = script.scenes.map((s) => s.text).join(" ");

  // Generate TTS audio
  console.log("   Generating speech...");
  const ttsResponse = await fetch(`${DEEPGRAM_TTS_URL}?model=aura-asteria-en`, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: fullText }),
  });

  if (!ttsResponse.ok) {
    throw new Error(`Deepgram TTS error: ${await ttsResponse.text()}`);
  }

  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
  console.log(`   ✅ Audio generated: ${(audioBuffer.length / 1024).toFixed(1)} KB`);

  // Transcribe to get word-level timestamps
  console.log("   Getting word timings...");
  const sttResponse = await fetch(
    `${DEEPGRAM_STT_URL}?model=nova-2&punctuate=true&smart_format=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/mpeg",
      },
      body: audioBuffer,
    }
  );

  if (!sttResponse.ok) {
    throw new Error(`Deepgram STT error: ${await sttResponse.text()}`);
  }

  const transcription = await sttResponse.json();
  const words = transcription.results?.channels?.[0]?.alternatives?.[0]?.words || [];
  
  // Calculate audio duration
  const audioDuration = words.length > 0 ? words[words.length - 1].end : 30;
  console.log(`   ✅ Audio duration: ${audioDuration.toFixed(1)}s`);

  // Group words into captions (3-5 words per caption for readability)
  const captions: Caption[] = [];
  let currentCaption: Caption = { text: "", start: 0, end: 0, words: [] };

  for (const word of words) {
    if (currentCaption.words.length === 0) {
      currentCaption.start = word.start;
    }

    currentCaption.words.push({
      word: word.punctuated_word || word.word,
      start: word.start,
      end: word.end,
    });
    currentCaption.text += (currentCaption.text ? " " : "") + (word.punctuated_word || word.word);
    currentCaption.end = word.end;

    // Create new caption every 4-5 words or at sentence end
    if (currentCaption.words.length >= 4 || word.punctuated_word?.match(/[.!?]$/)) {
      captions.push({ ...currentCaption });
      currentCaption = { text: "", start: 0, end: 0, words: [] };
    }
  }

  if (currentCaption.words.length > 0) {
    captions.push(currentCaption);
  }

  console.log(`   ✅ Generated ${captions.length} synced captions`);

  return { audioBuffer, captions, audioDuration };
}

function syncScriptWithAudio(script: Script, captions: Caption[], audioDuration: number): Script {
  console.log("\n⏱️ Step 3: Syncing scene durations with audio...");

  // Calculate how long each scene's narration takes
  const sceneTexts = script.scenes.map((s) => s.text.toLowerCase());
  const sceneDurations: number[] = [];

  let captionIndex = 0;
  for (let i = 0; i < sceneTexts.length; i++) {
    const sceneWords = sceneTexts[i].split(/\s+/).length;
    let wordsMatched = 0;
    const startCaption = captionIndex;

    while (captionIndex < captions.length && wordsMatched < sceneWords) {
      wordsMatched += captions[captionIndex].words.length;
      captionIndex++;
    }

    if (startCaption < captions.length && captionIndex > 0) {
      const startTime = captions[startCaption].start;
      const endTime = captions[Math.min(captionIndex - 1, captions.length - 1)].end;
      sceneDurations.push(endTime - startTime);
    } else {
      sceneDurations.push(5); // Default 5s
    }
  }

  // Normalize durations to fit target length (add padding for visuals)
  const totalNarrationTime = sceneDurations.reduce((a, b) => a + b, 0);
  const targetDuration = 30;
  const paddingPerScene = (targetDuration - totalNarrationTime) / script.scenes.length;

  const syncedScript: Script = {
    ...script,
    scenes: script.scenes.map((scene, i) => ({
      ...scene,
      duration: Math.max(3, Math.min(6, sceneDurations[i] + Math.max(0, paddingPerScene))),
    })),
  };

  syncedScript.totalDuration = syncedScript.scenes.reduce((sum, s) => sum + s.duration, 0);

  console.log(`   ✅ Synced ${syncedScript.scenes.length} scenes`);
  console.log(`   Total duration: ${syncedScript.totalDuration.toFixed(1)}s`);

  return syncedScript;
}

async function generateImages(script: Script): Promise<string[]> {
  console.log("\n🎨 Step 4: Generating images for each scene...");

  const imagePaths: string[] = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    console.log(`   ⏳ Image ${i + 1}/${script.scenes.length}...`);

    let buffer: Buffer | null = null;

    // Try Pollinations.ai
    try {
      const prompt = encodeURIComponent(
        `${scene.imagePrompt}, cartoon illustration style, cute funny animals, bright vibrant colors, vertical 9:16 format`
      );
      const url = `${POLLINATIONS_URL}/${prompt}?width=720&height=1280&nologo=true&seed=${Date.now() + i}`;

      const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (response.ok && response.headers.get("content-type")?.includes("image")) {
        buffer = Buffer.from(await response.arrayBuffer());
        console.log(`   ✅ Image ${i + 1} from Pollinations (${(buffer.length / 1024).toFixed(0)} KB)`);
      }
    } catch (e) {
      console.log(`      Pollinations failed, trying Picsum...`);
    }

    // Fallback to Picsum
    if (!buffer) {
      try {
        const response = await fetch(`${PICSUM_URL}/720/1280?random=${Date.now() + i}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) {
          buffer = Buffer.from(await response.arrayBuffer());
          console.log(`   ✅ Image ${i + 1} from Picsum (${(buffer.length / 1024).toFixed(0)} KB)`);
        }
      } catch (e) {
        console.log(`      Picsum failed, using placeholder...`);
      }
    }

    // Final fallback
    if (!buffer) {
      const response = await fetch(`https://placehold.co/720x1280/1a1a2e/ffffff/png?text=Scene+${i + 1}`);
      buffer = Buffer.from(await response.arrayBuffer());
    }

    const imagePath = path.join(OUTPUT_DIR, `scene-${i + 1}.png`);
    await fs.writeFile(imagePath, buffer);
    imagePaths.push(imagePath);

    if (i < script.scenes.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return imagePaths;
}

async function saveOutputs(
  script: Script,
  audioBuffer: Buffer,
  captions: Caption[],
  imagePaths: string[]
) {
  console.log("\n💾 Step 5: Saving outputs...");

  await fs.writeFile(path.join(OUTPUT_DIR, "script.json"), JSON.stringify(script, null, 2));
  await fs.writeFile(path.join(OUTPUT_DIR, "captions.json"), JSON.stringify(captions, null, 2));
  await fs.writeFile(path.join(OUTPUT_DIR, "voiceover.mp3"), audioBuffer);
  await fs.writeFile(
    path.join(OUTPUT_DIR, "images.json"),
    JSON.stringify(imagePaths.map((p) => path.basename(p)), null, 2)
  );

  console.log("   ✅ All assets saved to:", OUTPUT_DIR);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
