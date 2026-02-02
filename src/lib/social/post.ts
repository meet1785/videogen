import type { Platform } from "@/types";

interface PostResult {
  postUrl: string;
  postId: string;
  platform: Platform;
}

interface PostInput {
  platform: Platform;
  videoUrl: string;
  title: string;
  description?: string;
}

// ============================================
// YouTube Data API v3 (FREE - 10,000 quota units/day)
// ============================================
export async function postToYouTubeShorts(input: PostInput): Promise<PostResult> {
  const accessToken = process.env.YOUTUBE_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error("YOUTUBE_ACCESS_TOKEN is not configured. Set up OAuth2 flow.");
  }

  // Step 1: Download video from Supabase URL
  const videoResponse = await fetch(input.videoUrl);
  const videoBlob = await videoResponse.blob();

  // Step 2: Initialize resumable upload
  const initResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": videoBlob.size.toString(),
      },
      body: JSON.stringify({
        snippet: {
          title: input.title.slice(0, 100), // Max 100 chars
          description: input.description || input.title,
          categoryId: "22", // People & Blogs
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.text();
    throw new Error(`YouTube init error: ${error}`);
  }

  const uploadUrl = initResponse.headers.get("Location");
  
  if (!uploadUrl) {
    throw new Error("Failed to get YouTube upload URL");
  }

  // Step 3: Upload video
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
    },
    body: videoBlob,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`YouTube upload error: ${error}`);
  }

  const videoData = await uploadResponse.json();

  return {
    postUrl: `https://youtube.com/shorts/${videoData.id}`,
    postId: videoData.id,
    platform: "YOUTUBE_SHORTS",
  };
}

// ============================================
// Instagram Graph API (FREE with Facebook Developer account)
// ============================================
export async function postToInstagramReels(input: PostInput): Promise<PostResult> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_USER_ID;
  
  if (!accessToken || !igUserId) {
    throw new Error("Instagram credentials not configured");
  }

  // Step 1: Create media container
  const containerResponse = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/media`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: input.videoUrl, // Must be publicly accessible
        caption: input.title,
        access_token: accessToken,
      }),
    }
  );

  if (!containerResponse.ok) {
    const error = await containerResponse.json();
    throw new Error(`Instagram container error: ${JSON.stringify(error)}`);
  }

  const { id: containerId } = await containerResponse.json();

  // Step 2: Wait for video processing (poll status)
  let status = "IN_PROGRESS";
  let attempts = 0;
  
  while (status === "IN_PROGRESS" && attempts < 30) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    const statusResponse = await fetch(
      `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = await statusResponse.json();
    status = statusData.status_code;
    attempts++;
  }

  if (status !== "FINISHED") {
    throw new Error(`Instagram processing failed: ${status}`);
  }

  // Step 3: Publish the container
  const publishResponse = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  );

  if (!publishResponse.ok) {
    const error = await publishResponse.json();
    throw new Error(`Instagram publish error: ${JSON.stringify(error)}`);
  }

  const { id: mediaId } = await publishResponse.json();

  return {
    postUrl: `https://www.instagram.com/reel/${mediaId}`,
    postId: mediaId,
    platform: "INSTAGRAM_REELS",
  };
}

// ============================================
// TikTok Content Publishing API (FREE with developer account)
// ============================================
export async function postToTikTok(input: PostInput): Promise<PostResult> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error("TIKTOK_ACCESS_TOKEN is not configured");
  }

  // Step 1: Initialize video upload
  const initResponse = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: input.title.slice(0, 150),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: input.videoUrl,
        },
      }),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.json();
    throw new Error(`TikTok init error: ${JSON.stringify(error)}`);
  }

  const { data } = await initResponse.json();

  return {
    postUrl: `https://www.tiktok.com/@user/video/${data.publish_id}`,
    postId: data.publish_id,
    platform: "TIKTOK",
  };
}

// ============================================
// Unified posting function
// ============================================
export async function postToSocialMedia(input: PostInput): Promise<PostResult> {
  switch (input.platform) {
    case "YOUTUBE_SHORTS":
      return postToYouTubeShorts(input);
    case "INSTAGRAM_REELS":
      return postToInstagramReels(input);
    case "TIKTOK":
      return postToTikTok(input);
    default:
      throw new Error(`Unsupported platform: ${input.platform}`);
  }
}
