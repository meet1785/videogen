import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { DashboardContent } from "@/components/dashboard-content";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get or create user
  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    // Create user on first visit
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: `${userId}@placeholder.com`, // Will be updated via webhook
      },
    });
  }

  // Get recent videos
  const videos = await prisma.video.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Get stats
  const stats = {
    totalVideos: await prisma.video.count({ where: { userId: user.id } }),
    completedVideos: await prisma.video.count({
      where: { userId: user.id, status: "COMPLETED" },
    }),
    scheduledPosts: await prisma.scheduledPost.count({
      where: { userId: user.id, status: "SCHEDULED" },
    }),
    credits: user.credits,
  };

  return (
    <DashboardContent 
      videos={videos} 
      stats={stats}
    />
  );
}
