import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { generateScript } from "@/lib/ai/gemini";
import { generateVoiceover } from "@/lib/ai/deepgram";
import { generateImages } from "@/lib/ai/images";
import { triggerRender } from "@/lib/github";
import type { Script, Caption } from "@/types";

export const generateVideoWorkflow = inngest.createFunction(
  { 
    id: "generate-video-workflow",
    retries: 3,
  },
  { event: "video/generate.requested" },
  async ({ event, step }) => {
    const { videoId, topic, style, duration } = event.data;

    // Step 1: Generate Script with Gemini Pro
    const script = await step.run("generate-script", async () => {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "GENERATING_SCRIPT" },
      });

      const generatedScript = await generateScript(topic, style, duration);
      
      await prisma.video.update({
        where: { id: videoId },
        data: { script: generatedScript as object },
      });

      return generatedScript;
    });

    // Step 2: Generate Voiceover with Deepgram TTS
    const voiceover = await step.run("generate-voiceover", async () => {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "GENERATING_AUDIO" },
      });

      const { audioUrl, captions } = await generateVoiceover(
        videoId,
        (script as Script).scenes.map((s) => s.text).join(" ")
      );

      await prisma.video.update({
        where: { id: videoId },
        data: { 
          audioUrl,
          captionsUrl: JSON.stringify(captions),
        },
      });

      return { audioUrl, captions };
    });

    // Step 3: Generate Images with DALL-E 3
    const imageUrls = await step.run("generate-images", async () => {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "GENERATING_IMAGES" },
      });

      const urls = await generateImages(
        videoId,
        (script as Script).scenes.map((s) => s.imagePrompt)
      );

      await prisma.video.update({
        where: { id: videoId },
        data: { imageUrls: urls },
      });

      return urls;
    });

    // Step 4: Trigger GitHub Actions Render
    const renderJobId = await step.run("trigger-render", async () => {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: "RENDERING" },
      });

      const jobId = await triggerRender({
        videoId,
        script: script as Script,
        audioUrl: voiceover.audioUrl,
        captions: voiceover.captions as Caption[],
        imageUrls: imageUrls as string[],
      });

      await prisma.video.update({
        where: { id: videoId },
        data: { renderJobId: jobId },
      });

      return jobId;
    });

    return {
      videoId,
      renderJobId,
      status: "RENDERING",
    };
  }
);
