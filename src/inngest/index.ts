import { generateVideoWorkflow } from "./functions/generate-video";
import { checkScheduledPosts } from "./functions/schedule-posts";

// Export all Inngest functions to be registered with the serve handler
export const functions = [
  generateVideoWorkflow,
  checkScheduledPosts,
];
