// TypeScript types for VidMax

export interface Scene {
  id: number;
  text: string;
  imagePrompt: string;
  duration: number; // seconds
}

export interface Script {
  title: string;
  scenes: Scene[];
  totalDuration: number;
}

export interface WordCaption {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface Caption {
  text: string;
  start: number;
  end: number;
  words: WordCaption[];
}

export interface VideoAssets {
  script: Script;
  audioUrl: string;
  captions: Caption[];
  imageUrls: string[];
}

export interface GenerateVideoInput {
  topic: string;
  style: VideoStyle;
  duration?: number;
}

export type VideoStyle = 
  | "VIRAL" 
  | "EDUCATIONAL" 
  | "STORYTELLING" 
  | "PRODUCT" 
  | "MOTIVATIONAL";

export type VideoStatus = 
  | "PENDING"
  | "GENERATING_SCRIPT"
  | "GENERATING_AUDIO"
  | "GENERATING_IMAGES"
  | "RENDERING"
  | "COMPLETED"
  | "FAILED";

export type Platform = 
  | "YOUTUBE_SHORTS" 
  | "INSTAGRAM_REELS" 
  | "TIKTOK";

export type PostStatus = 
  | "SCHEDULED" 
  | "POSTING" 
  | "POSTED" 
  | "FAILED";

export interface RenderPayload {
  videoId: string;
  script: Script;
  audioUrl: string;
  captions: Caption[];
  imageUrls: string[];
}
