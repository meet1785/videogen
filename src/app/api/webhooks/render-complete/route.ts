import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get("authorization");
    const expectedToken = `Bearer ${process.env.WEBHOOK_SECRET}`;
    
    if (authHeader !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, videoUrl, error } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }

    if (error) {
      // Update video status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: "FAILED",
          errorMessage: error,
        },
      });

      return NextResponse.json({ success: true, status: "FAILED" });
    }

    // Update video with completed status and URL
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: "COMPLETED",
        videoUrl,
      },
    });

    return NextResponse.json({ success: true, status: "COMPLETED" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
