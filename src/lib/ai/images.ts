import { uploadFile, STORAGE_BUCKETS } from "@/lib/supabase";

// Pollinations.ai - 100% FREE, no API key required
const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";

export async function generateImages(
  videoId: string,
  prompts: string[]
): Promise<string[]> {
  const imageUrls: string[] = [];

  // Generate images sequentially to avoid rate limits
  for (let index = 0; index < prompts.length; index++) {
    const prompt = prompts[index];
    
    // Enhance prompt for better video-style images
    const enhancedPrompt = encodeURIComponent(
      `${prompt}, photorealistic, cinematic lighting, vertical portrait orientation, high quality, 4k, suitable for short-form video content`
    );

    // Pollinations returns image directly from URL
    const imageUrl = `${POLLINATIONS_URL}/${enhancedPrompt}?width=1080&height=1920&nologo=true&seed=${Date.now() + index}`;

    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to generate image for scene ${index + 1}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      // Upload to Supabase Storage
      const imagePath = `${videoId}/scene-${index + 1}.png`;
      const publicUrl = await uploadFile(
        STORAGE_BUCKETS.IMAGES,
        imagePath,
        imageBuffer,
        "image/png"
      );

      imageUrls.push(publicUrl);
      
      // Small delay to be nice to the free API
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error generating image ${index + 1}:`, error);
      // Use a placeholder on error
      imageUrls.push(`https://placehold.co/1080x1920/1a1a2e/ffffff?text=Scene+${index + 1}`);
    }
  }

  return imageUrls;
}

// Alternative: Hugging Face Inference API (also free)
export async function generateImagesHuggingFace(
  videoId: string,
  prompts: string[]
): Promise<string[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY; // Free to get
  const imageUrls: string[] = [];

  for (let index = 0; index < prompts.length; index++) {
    const prompt = prompts[index];
    
    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `${prompt}, photorealistic, cinematic, vertical portrait, high quality`,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error for scene ${index + 1}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const imagePath = `${videoId}/scene-${index + 1}.png`;
    
    const publicUrl = await uploadFile(
      STORAGE_BUCKETS.IMAGES,
      imagePath,
      imageBuffer,
      "image/png"
    );

    imageUrls.push(publicUrl);
  }

  return imageUrls;
}
