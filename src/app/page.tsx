import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { Play, Sparkles, Zap, Share2 } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-white">VidMax</span>
          </div>
          <nav className="flex items-center gap-4">
            {userId ? (
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" className="text-zinc-300 hover:text-white">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700">
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-32 pb-20">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-violet-300">100% Cloud-Based • Zero Local Compute</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Create Viral Short Videos with{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              AI Magic
            </span>
          </h1>
          
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl">
            Generate scripts, voiceovers, and stunning visuals automatically. 
            Render in the cloud and publish directly to YouTube Shorts, Instagram Reels, and TikTok.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Link href={userId ? "/dashboard" : "/sign-up"}>
              <Button size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-lg px-8 py-6">
                Start Creating Free
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-lg px-8 py-6">
              Watch Demo
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 w-full mt-16">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Script Generation</h3>
              <p className="text-zinc-400">
                Gemini Pro creates viral scripts with hooks, storytelling, and CTAs tailored to your topic.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-fuchsia-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Cloud Rendering</h3>
              <p className="text-zinc-400">
                Videos render on GitHub Actions using your Pro minutes. Zero local compute needed.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Auto Publishing</h3>
              <p className="text-zinc-400">
                Schedule and auto-post to YouTube Shorts, Instagram Reels, and TikTok.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="container mx-auto px-6 text-center text-zinc-500">
          <p>Built with 💜 using Next.js, Remotion, and AI • All services on FREE tiers</p>
        </div>
      </footer>
    </div>
  );
}
