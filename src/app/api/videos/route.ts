import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";

// Demo user ID for development (auth disabled)
const DEMO_USER_ID = "demo-user-001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, style = "VIRAL", duration = 60, title } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    // Get or create demo user
    let user = await prisma.user.findUnique({
      where: { clerkId: DEMO_USER_ID },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: DEMO_USER_ID,
          email: "demo@vidmax.ai",
          credits: 10,
          plan: "FREE",
        },
      });
    }

    // Check credits
    if (user.credits < 1) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }

    // Create video record
    const video = await prisma.video.create({
      data: {
        userId: user.id,
        title: title || `Video about ${topic}`,
        topic,
        style,
        duration,
        status: "PENDING",
      },
    });

    // Deduct credit
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: 1 } },
    });

    // Trigger the Inngest workflow
    await inngest.send({
      name: "video/generate.requested",
      data: {
        videoId: video.id,
        userId: user.id,
        topic,
        style,
        duration,
      },
    });

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
      },
    });
  } catch (error) {
    console.error("Error creating video:", error);
    return NextResponse.json(
      { error: "Failed to create video" },
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

    const videos = await prisma.video.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
