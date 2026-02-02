import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import type { Platform } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, platform, publishTime } = body;

    if (!videoId || !platform || !publishTime) {
      return NextResponse.json(
        { error: "videoId, platform, and publishTime are required" },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms: Platform[] = ["YOUTUBE_SHORTS", "INSTAGRAM_REELS", "TIKTOK"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform" },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify video exists and belongs to user
    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        userId: user.id,
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.status !== "COMPLETED" || !video.videoUrl) {
      return NextResponse.json(
        { error: "Video must be completed before scheduling" },
        { status: 400 }
      );
    }

    // Create scheduled post
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        userId: user.id,
        videoId: video.id,
        platform,
        publishTime: new Date(publishTime),
        status: "SCHEDULED",
      },
    });

    return NextResponse.json({
      success: true,
      scheduledPost: {
        id: scheduledPost.id,
        platform: scheduledPost.platform,
        publishTime: scheduledPost.publishTime,
        status: scheduledPost.status,
      },
    });
  } catch (error) {
    console.error("Error scheduling post:", error);
    return NextResponse.json(
      { error: "Failed to schedule post" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: { userId: user.id },
      include: { video: true },
      orderBy: { publishTime: "asc" },
    });

    return NextResponse.json({ scheduledPosts });
  } catch (error) {
    console.error("Error fetching scheduled posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled posts" },
      { status: 500 }
    );
  }
}
