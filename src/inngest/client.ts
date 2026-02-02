import { Inngest } from "inngest";

// Create a client to send events
export const inngest = new Inngest({ 
  id: "vidmax",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// Event types for type safety
export type InngestEvents = {
  "video/generate.requested": {
    data: {
      videoId: string;
      userId: string;
      topic: string;
      style: string;
      duration: number;
    };
  };
  "video/render.completed": {
    data: {
      videoId: string;
      videoUrl: string;
    };
  };
  "post/schedule.check": {
    data: Record<string, never>;
  };
};
