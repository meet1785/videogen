import { uploadFile, STORAGE_BUCKETS } from "@/lib/supabase";

// Pollinations.ai - 100% FREE, no API key required
const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";

/**
 * Generate images using Pollinations.ai (FREE, no API key needed)
 */
export async function generateImages(
  videoId: string,
  prompts: string[]
): Promise<string[]> {
  const imageUrls: string[] = [];

  for (let index = 0; index < prompts.length; index++) {
    const prompt = prompts[index];
    console.log(`🎨 Generating image ${index + 1}/${prompts.length} with Pollinations.ai...`);

    try {
      const imageBuffer = await generateImageWithPollinations(prompt);

      if (imageBuffer) {
        const imagePath = `${videoId}/scene-${index + 1}.png`;
        const publicUrl = await uploadFile(
          STORAGE_BUCKETS.IMAGES,
          imagePath,
          imageBuffer,
          "image/png"
        );
        imageUrls.push(publicUrl);
        console.log(`✅ Image ${index + 1} generated successfully`);
      } else {
        throw new Error("Failed to generate image");
      }

      // Small delay between requests to be nice to the free API
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`Error generating image ${index + 1}:`, error);
      // Use placeholder on error
      imageUrls.push(
        `https://placehold.co/1080x1920/1a1a2e/ffffff?text=Scene+${index + 1}`
      );
    }
  }

  return imageUrls;
}

/**
 * Generate image using Pollinations.ai (free, no API key)
 */
async function generateImageWithPollinations(
  prompt: string
): Promise<Buffer | null> {
  try {
    // Enhance prompt for better video-style images
    const enhancedPrompt = encodeURIComponent(
      `${prompt}, photorealistic, cinematic lighting, vertical portrait orientation, high quality, 4k, suitable for short-form video content`
    );

    const imageUrl = `${POLLINATIONS_URL}/${enhancedPrompt}?width=1080&height=1920&nologo=true&seed=${Date.now()}`;

    // Pollinations generates images on-demand, may take a few seconds
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    if (!response.ok) {
      console.error(`Pollinations returned status: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("image")) {
      console.error(`Pollinations returned non-image content: ${contentType}`);
      return null;
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error("Pollinations generation error:", error);
    return null;
  }
}
