import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { postToSocialMedia } from "@/lib/social/post";
import type { Platform } from "@/types";

interface ScheduledPostWithRelations {
  id: string;
  platform: Platform;
  video: {
    id: string;
    title: string;
    videoUrl: string | null;
  };
  user: {
    id: string;
  };
}

export const checkScheduledPosts = inngest.createFunction(
  {
    id: "check-scheduled-posts",
  },
  { cron: "*/15 * * * *" }, // Every 15 minutes
  async ({ step }) => {
    // Find all posts that are scheduled and due
    const duePosts = await step.run("find-due-posts", async () => {
      return prisma.scheduledPost.findMany({
        where: {
          status: "SCHEDULED",
          publishTime: {
            lte: new Date(),
          },
        },
        include: {
          video: true,
          user: true,
        },
      }) as unknown as ScheduledPostWithRelations[];
    });

    // Process each due post
    const results = await Promise.allSettled(
      duePosts.map(async (post: ScheduledPostWithRelations) => {
        return step.run(`post-${post.id}`, async () => {
          // Update status to posting
          await prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: "POSTING" },
          });

          try {
            if (!post.video.videoUrl) {
              throw new Error("Video URL not available");
            }

            const result = await postToSocialMedia({
              platform: post.platform,
              videoUrl: post.video.videoUrl,
              title: post.video.title,
            });

            // Update with success
            await prisma.scheduledPost.update({
              where: { id: post.id },
              data: {
                status: "POSTED",
                postUrl: result.postUrl,
                postId: result.postId,
              },
            });

            return { success: true, postId: post.id };
          } catch (error) {
            // Update with failure
            await prisma.scheduledPost.update({
              where: { id: post.id },
              data: {
                status: "FAILED",
                errorMessage: error instanceof Error ? error.message : "Unknown error",
              },
            });

            return { success: false, postId: post.id, error };
          }
        });
      })
    );

    return {
      processed: duePosts.length,
      results,
    };
  }
);
