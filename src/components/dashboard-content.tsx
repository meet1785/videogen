"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateVideoDialog } from "@/components/create-video-dialog";
import { 
  Plus, 
  Video, 
  CheckCircle2, 
  Calendar, 
  Coins,
  Clock,
  Loader2,
  Play,
  ExternalLink,
  Download,
  RefreshCw,
  Sparkles
} from "lucide-react";

interface Video {
  id: string;
  title: string;
  topic: string;
  status: string;
  videoUrl: string | null;
  createdAt: Date;
}

interface Stats {
  totalVideos: number;
  completedVideos: number;
  scheduledPosts: number;
  credits: number;
}

interface DashboardContentProps {
  videos: Video[];
  stats: Stats;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-zinc-500",
  GENERATING_SCRIPT: "bg-blue-500",
  GENERATING_AUDIO: "bg-purple-500",
  GENERATING_IMAGES: "bg-pink-500",
  RENDERING: "bg-orange-500",
  COMPLETED: "bg-green-500",
  FAILED: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  GENERATING_SCRIPT: "Writing Script",
  GENERATING_AUDIO: "Creating Audio",
  GENERATING_IMAGES: "Generating Images",
  RENDERING: "Rendering Video",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function DashboardContent({ videos, stats }: DashboardContentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState("");
  const [localVideos, setLocalVideos] = useState<string[]>([]);

  // Fetch local videos on mount
  useEffect(() => {
    fetch("/api/videos/local")
      .then(r => r.json())
      .then(data => setLocalVideos(data.videos || []))
      .catch(() => {});
  }, [generatedVideo]);

  // Quick generate demo video
  const handleQuickGenerate = async () => {
    setIsGenerating(true);
    setGenerationStatus("Starting generation...");
    
    try {
      setGenerationStatus("Generating script with AI...");
      await new Promise(r => setTimeout(r, 1000));
      
      setGenerationStatus("Creating voiceover...");
      await new Promise(r => setTimeout(r, 1000));
      
      setGenerationStatus("Generating images...");
      const response = await fetch("/api/videos/quick-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "Funny animal fails compilation",
          duration: 30,
          style: "VIRAL",
          imageStyle: "cartoon",
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setGeneratedVideo(url);
        setGenerationStatus("Complete!");
      } else {
        throw new Error("Generation failed");
      }
    } catch (error) {
      console.error("Error generating video:", error);
      setGenerationStatus("Failed - check console");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Create and manage your AI-generated videos</p>
        </div>
        <div className="flex gap-3 items-center">
          {isGenerating && (
            <span className="text-sm text-violet-400 animate-pulse">
              {generationStatus}
            </span>
          )}
          <Button 
            onClick={handleQuickGenerate}
            disabled={isGenerating}
            variant="outline"
            className="border-violet-500 text-violet-400 hover:bg-violet-500/20"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? "Generating..." : "Quick Demo"}
          </Button>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Video
          </Button>
        </div>
      </div>

      {/* Generated Video Preview */}
      {generatedVideo && (
        <Card className="bg-zinc-900 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Video Generated!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <video 
                src={generatedVideo} 
                controls 
                className="w-48 h-80 rounded-lg bg-black object-contain"
              />
              <div className="flex flex-col justify-center gap-4">
                <p className="text-zinc-400">Your video is ready! Download or share it.</p>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleDownload(generatedVideo, "video.mp4")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download MP4
                  </Button>
                  <Button variant="outline" className="border-zinc-700">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Post
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Videos</CardTitle>
            <Video className="w-4 h-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalVideos}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Completed</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.completedVideos}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Scheduled</CardTitle>
            <Calendar className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.scheduledPosts}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Credits</CardTitle>
            <Coins className="w-4 h-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.credits}</div>
          </CardContent>
        </Card>
      </div>

      {/* Demo Videos Section */}
      <Card className="bg-zinc-900 border-zinc-800 mb-8">
        <CardHeader>
          <CardTitle className="text-white">Generated Videos</CardTitle>
          <CardDescription className="text-zinc-400">
            Download your locally generated videos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localVideos.length > 0 ? (
              localVideos.map((video, index) => (
                <DemoVideoCard 
                  key={video}
                  title={video.replace('/out/', '').replace('.mp4', '')} 
                  path={video}
                  duration="~30s"
                />
              ))
            ) : (
              <>
                <DemoVideoCard 
                  title="Animal Fails (30s)" 
                  path="/out/animal-fails-30s.mp4"
                  duration="30s"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Videos */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white">Recent Videos</CardTitle>
              <CardDescription className="text-zinc-400">
                Your latest AI-generated videos
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-zinc-400">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 mb-4">No videos yet. Create your first one!</p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                variant="outline" 
                className="border-zinc-700 text-zinc-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Video
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-800"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-28 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {video.status === "COMPLETED" && video.videoUrl ? (
                        <video src={video.videoUrl} className="w-full h-full object-cover" />
                      ) : video.status === "FAILED" ? (
                        <span className="text-red-400 text-xs">Error</span>
                      ) : (
                        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{video.title}</h3>
                      <p className="text-sm text-zinc-400">{video.topic}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={`${statusColors[video.status]} text-white text-xs`}>
                          {statusLabels[video.status]}
                        </Badge>
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {video.status === "COMPLETED" && video.videoUrl && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-zinc-700"
                          onClick={() => handleDownload(video.videoUrl!, `${video.title}.mp4`)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                          <Calendar className="w-4 h-4 mr-1" />
                          Schedule
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateVideoDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}

// Demo video card component
function DemoVideoCard({ title, path, duration }: { title: string; path: string; duration: string }) {
  const [exists, setExists] = useState(true);
  
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-800">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
          <Play className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-medium text-white">{title}</h4>
          <p className="text-xs text-zinc-500">{duration} • MP4</p>
        </div>
      </div>
      <a 
        href={path} 
        download
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
      >
        <Download className="w-4 h-4" />
        Download
      </a>
    </div>
  );
}
