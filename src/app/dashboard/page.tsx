import { DashboardContent } from "@/components/dashboard-content";

// Demo user ID for development (auth disabled)
const DEMO_USER_ID = "demo-user";

export default async function DashboardPage() {
  // Mock data for development without database
  const videos: {
    id: string;
    title: string;
    topic: string;
    status: string;
    videoUrl: string | null;
    createdAt: Date;
  }[] = [];

  const stats = {
    totalVideos: 0,
    completedVideos: 0,
    scheduledPosts: 0,
    credits: 10,
  };

  return (
    <DashboardContent 
      videos={videos} 
      stats={stats}
    />
  );
}
