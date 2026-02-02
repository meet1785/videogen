import type { RenderPayload } from "@/types";

export async function triggerRender(payload: RenderPayload): Promise<string> {
  const githubPat = process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!githubPat || !owner || !repo) {
    throw new Error("GitHub configuration is incomplete");
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/dispatches`,
    {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubPat}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        event_type: "render-video",
        client_payload: {
          videoId: payload.videoId,
          script: payload.script,
          audioUrl: payload.audioUrl,
          captions: payload.captions,
          imageUrls: payload.imageUrls,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub dispatch error: ${error}`);
  }

  // Generate a unique job ID (GitHub doesn't return one for dispatches)
  const jobId = `render-${payload.videoId}-${Date.now()}`;
  
  return jobId;
}
