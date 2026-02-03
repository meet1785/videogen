"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, TrendingUp, Zap, Clock, Mic } from "lucide-react";

interface CreateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Video niches with trending topics
const VIDEO_NICHES = [
  { 
    value: "FUNNY", 
    label: "😂 Funny / Fails", 
    trending: ["Funny animal fails", "Epic fail compilation", "Kids funny moments", "Prank reactions"] 
  },
  { 
    value: "FACTS", 
    label: "🧠 Facts / Trivia", 
    trending: ["Mind-blowing space facts", "Facts you didn't know", "History mysteries", "Science explained"] 
  },
  { 
    value: "MOTIVATION", 
    label: "💪 Motivation", 
    trending: ["Morning motivation", "Success mindset", "Discipline quotes", "Billionaire habits"] 
  },
  { 
    value: "TECH", 
    label: "💻 Tech / AI", 
    trending: ["AI tools you need", "Future technology", "Hidden iPhone tricks", "ChatGPT secrets"] 
  },
  { 
    value: "MONEY", 
    label: "💰 Money / Finance", 
    trending: ["Passive income ideas", "Side hustles 2024", "Investing for beginners", "Crypto explained"] 
  },
  { 
    value: "LIFESTYLE", 
    label: "🌟 Lifestyle", 
    trending: ["Morning routine", "Productivity hacks", "Life advice", "Minimalist living"] 
  },
  { 
    value: "FOOD", 
    label: "🍕 Food", 
    trending: ["Quick recipes", "Food hacks", "World street food", "Cooking fails"] 
  },
  { 
    value: "TRAVEL", 
    label: "✈️ Travel", 
    trending: ["Hidden travel gems", "Budget travel tips", "World's best beaches", "Solo travel guide"] 
  },
];

const VIDEO_STYLES = [
  { value: "VIRAL", label: "🔥 Viral", description: "Fast-paced, hooks, trending format" },
  { value: "EDUCATIONAL", label: "📚 Educational", description: "Informative, clear explanations" },
  { value: "STORYTELLING", label: "📖 Storytelling", description: "Narrative-driven, emotional" },
  { value: "PRODUCT", label: "🛍️ Product", description: "Persuasive, marketing focused" },
  { value: "MOTIVATIONAL", label: "💪 Motivational", description: "Inspiring, uplifting" },
];

const VOICE_OPTIONS = [
  { value: "aura-asteria-en", label: "🎙️ Asteria", description: "Female, warm & professional" },
  { value: "aura-luna-en", label: "🎙️ Luna", description: "Female, soft & friendly" },
  { value: "aura-stella-en", label: "🎙️ Stella", description: "Female, confident & clear" },
  { value: "aura-orion-en", label: "🎙️ Orion", description: "Male, deep & authoritative" },
  { value: "aura-arcas-en", label: "🎙️ Arcas", description: "Male, energetic & engaging" },
  { value: "aura-perseus-en", label: "🎙️ Perseus", description: "Male, calm & trustworthy" },
];

const IMAGE_STYLES = [
  { value: "photorealistic", label: "📷 Photorealistic" },
  { value: "cartoon", label: "🎨 Cartoon/Animated" },
  { value: "cinematic", label: "🎬 Cinematic" },
  { value: "minimalist", label: "⚪ Minimalist" },
  { value: "vibrant", label: "🌈 Vibrant/Colorful" },
];

export function CreateVideoDialog({ open, onOpenChange }: CreateVideoDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState("");
  const [formData, setFormData] = useState({
    topic: "",
    title: "",
    style: "VIRAL",
    duration: 30,
    voice: "aura-asteria-en",
    imageStyle: "photorealistic",
  });

  const currentNiche = VIDEO_NICHES.find(n => n.value === selectedNiche);

  const handleTrendingClick = (trend: string) => {
    setFormData({ ...formData, topic: trend });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          niche: selectedNiche,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create video");
      }

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error creating video:", error);
      alert(error instanceof Error ? error.message : "Failed to create video");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            Create New Video
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            AI generates script, voiceover, images & renders your video automatically
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Niche Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pink-400" />
              Choose Niche
            </label>
            <div className="grid grid-cols-4 gap-2">
              {VIDEO_NICHES.map((niche) => (
                <button
                  key={niche.value}
                  type="button"
                  onClick={() => setSelectedNiche(niche.value)}
                  className={`p-2 rounded-lg border text-xs text-center transition-all ${
                    selectedNiche === niche.value
                      ? "border-violet-500 bg-violet-500/20 text-white"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {niche.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trending Topics */}
          {currentNiche && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Trending in {currentNiche.label}
              </label>
              <div className="flex flex-wrap gap-2">
                {currentNiche.trending.map((trend) => (
                  <Badge
                    key={trend}
                    onClick={() => handleTrendingClick(trend)}
                    className="cursor-pointer bg-zinc-800 hover:bg-violet-600 border-zinc-700 text-zinc-300 hover:text-white transition-all"
                  >
                    {trend}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Topic Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Topic / Idea *</label>
            <Textarea
              placeholder="Describe your video idea... e.g., 'Top 5 unbelievable animal rescues caught on camera'"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[70px]"
              required
            />
          </div>

          {/* Title (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Title (optional)</label>
            <Input
              placeholder="Auto-generated if left empty"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Two column layout for selects */}
          <div className="grid grid-cols-2 gap-4">
            {/* Style */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Video Style</label>
              <Select
                value={formData.style}
                onValueChange={(value) => setFormData({ ...formData, style: value })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {VIDEO_STYLES.map((style) => (
                    <SelectItem 
                      key={style.value} 
                      value={style.value}
                      className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                    >
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Duration
              </label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="15" className="text-white hover:bg-zinc-700">15 sec (Quick)</SelectItem>
                  <SelectItem value="30" className="text-white hover:bg-zinc-700">30 sec (Short)</SelectItem>
                  <SelectItem value="60" className="text-white hover:bg-zinc-700">60 sec (Standard)</SelectItem>
                  <SelectItem value="90" className="text-white hover:bg-zinc-700">90 sec (Extended)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Voice & Image Style */}
          <div className="grid grid-cols-2 gap-4">
            {/* Voice */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Mic className="w-4 h-4 text-green-400" />
                Voice
              </label>
              <Select
                value={formData.voice}
                onValueChange={(value) => setFormData({ ...formData, voice: value })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {VOICE_OPTIONS.map((voice) => (
                    <SelectItem 
                      key={voice.value} 
                      value={voice.value}
                      className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                    >
                      <div className="flex flex-col">
                        <span>{voice.label}</span>
                        <span className="text-xs text-zinc-500">{voice.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Image Style */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Image Style</label>
              <Select
                value={formData.imageStyle}
                onValueChange={(value) => setFormData({ ...formData, imageStyle: value })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {IMAGE_STYLES.map((style) => (
                    <SelectItem 
                      key={style.value} 
                      value={style.value}
                      className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                    >
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generation Info */}
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <h4 className="text-sm font-medium text-zinc-300 mb-2">What happens next:</h4>
            <ol className="text-xs text-zinc-500 space-y-1">
              <li>1. 🤖 Gemini AI writes your script with scene prompts</li>
              <li>2. 🎙️ Deepgram generates professional voiceover</li>
              <li>3. 🎨 Pollinations AI creates matching images for each scene</li>
              <li>4. 🎬 Remotion renders your final video with captions</li>
            </ol>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.topic}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
