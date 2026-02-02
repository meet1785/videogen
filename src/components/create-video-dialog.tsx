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
import { Loader2, Sparkles } from "lucide-react";

interface CreateVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VIDEO_STYLES = [
  { value: "VIRAL", label: "🔥 Viral", description: "Fast-paced, attention-grabbing" },
  { value: "EDUCATIONAL", label: "📚 Educational", description: "Informative and clear" },
  { value: "STORYTELLING", label: "📖 Storytelling", description: "Narrative-driven" },
  { value: "PRODUCT", label: "🛍️ Product", description: "Persuasive marketing" },
  { value: "MOTIVATIONAL", label: "💪 Motivational", description: "Inspiring and uplifting" },
];

export function CreateVideoDialog({ open, onOpenChange }: CreateVideoDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic: "",
    title: "",
    style: "VIRAL",
    duration: 60,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            Create New Video
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter a topic and our AI will generate a complete short video with script, voiceover, and images.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Topic *</label>
            <Textarea
              placeholder="e.g., 5 mind-blowing facts about black holes, How to start investing with $100, Morning routine of successful people..."
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[80px]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Title (optional)</label>
            <Input
              placeholder="Auto-generated if left empty"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

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
                    <div>
                      <span className="font-medium">{style.label}</span>
                      <span className="text-zinc-400 text-sm ml-2">- {style.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Duration</label>
            <Select
              value={formData.duration.toString()}
              onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="30" className="text-white hover:bg-zinc-700">30 seconds</SelectItem>
                <SelectItem value="60" className="text-white hover:bg-zinc-700">60 seconds (Recommended)</SelectItem>
                <SelectItem value="90" className="text-white hover:bg-zinc-700">90 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
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
