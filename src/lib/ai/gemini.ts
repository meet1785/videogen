import type { Script, Scene, VideoStyle } from "@/types";

// Gemini 2.5 Flash - fast and reliable for JSON generation
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const STYLE_PROMPTS: Record<string, string> = {
  VIRAL: "Create a fast-paced, attention-grabbing script with hooks, surprising facts, and a strong call to action. Use short punchy sentences.",
  EDUCATIONAL: "Create an informative script that explains concepts clearly. Use analogies and step-by-step explanations.",
  STORYTELLING: "Create a narrative-driven script with a beginning, middle, and end. Include emotional hooks and relatable scenarios.",
  PRODUCT: "Create a persuasive script highlighting benefits, features, and urgency. Include social proof elements.",
  MOTIVATIONAL: "Create an inspiring script with powerful quotes, success stories, and actionable advice.",
};

export async function generateScript(
  topic: string,
  style: string,
  duration: number = 60
): Promise<Script> {
  const numScenes = Math.ceil(duration / 8); // ~8 seconds per scene
  
  const prompt = `You are a viral short-form video scriptwriter. ${STYLE_PROMPTS[style] || STYLE_PROMPTS.VIRAL}

Create a ${duration}-second video script about: "${topic}"

Requirements:
- Split into exactly ${numScenes} scenes
- Each scene should be 6-10 seconds of spoken content
- Include a powerful hook in the first 3 seconds
- End with a clear call to action

Respond ONLY with valid JSON in this exact format:
{
  "title": "Catchy video title",
  "scenes": [
    {
      "id": 1,
      "text": "The spoken text for this scene",
      "imagePrompt": "Detailed image description for AI generation (photorealistic, cinematic, 9:16 aspect ratio)",
      "duration": 8
    }
  ],
  "totalDuration": ${duration}
}`;

  const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GOOGLE_GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;
  
  // Parse and validate the script
  const script: Script = JSON.parse(content);
  
  // Validate structure
  if (!script.title || !script.scenes || !Array.isArray(script.scenes)) {
    throw new Error("Invalid script structure from Gemini");
  }

  // Ensure each scene has required fields
  script.scenes = script.scenes.map((scene: Scene, index: number) => ({
    id: scene.id || index + 1,
    text: scene.text,
    imagePrompt: scene.imagePrompt,
    duration: scene.duration || 8,
  }));

  script.totalDuration = script.scenes.reduce((sum: number, s: Scene) => sum + s.duration, 0);

  return script;
}
