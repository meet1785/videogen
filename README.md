# VidMax - AI Short Video Generator 🎬

A cloud-native SaaS for generating viral short-form videos using AI. Zero local computation required.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss)

## 🌟 Features

- **AI Script Generation** - Gemini Pro creates viral scripts with hooks and CTAs
- **Text-to-Speech** - Deepgram generates natural voiceovers with word-level captions
- **AI Image Generation** - Pollinations.ai creates stunning visuals (100% free!)
- **Cloud Rendering** - GitHub Actions renders videos using Remotion
- **Auto Publishing** - Schedule posts to YouTube Shorts, Instagram Reels, and TikTok
- **Modern Dashboard** - Beautiful UI with Shadcn components

## 💰 Cost: $0/month (All Free Tiers)

| Service | Free Tier |
|---------|-----------|
| **Clerk Auth** | 10,000 MAU |
| **Supabase** | 500MB DB, 1GB Storage |
| **Inngest** | 25,000 runs/month |
| **Gemini Pro** | 60 req/min, 1,500/day |
| **Deepgram** | $200 free credits |
| **Pollinations.ai** | Unlimited (no API key!) |
| **GitHub Actions** | 3,000 min/month (Pro) |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- GitHub Pro (for Actions minutes)
- Free accounts: Clerk, Supabase, Inngest, Google AI Studio, Deepgram

### 1. Clone & Install

```bash
git clone https://github.com/meet1785/videogen.git
cd videogen
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in your API keys in `.env`:

```env
# Required
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
GOOGLE_GEMINI_API_KEY=...
DEEPGRAM_API_KEY=...
```

### 3. Setup Database

```bash
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── inngest/       # Inngest webhook handler
│   │   ├── videos/        # Video CRUD
│   │   ├── schedule-post/ # Social scheduling
│   │   └── webhooks/      # External webhooks
│   ├── dashboard/         # Protected dashboard pages
│   ├── sign-in/           # Clerk sign in
│   └── sign-up/           # Clerk sign up
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── app-sidebar.tsx   # Dashboard sidebar
│   ├── create-video-dialog.tsx
│   └── dashboard-content.tsx
├── inngest/              # Background job functions
│   ├── client.ts         # Inngest client
│   └── functions/        # Workflow definitions
├── lib/                  # Utility libraries
│   ├── ai/              # AI service integrations
│   │   ├── gemini.ts    # Script generation
│   │   ├── deepgram.ts  # TTS & captions
│   │   └── images.ts    # Image generation
│   ├── social/          # Social media APIs
│   ├── prisma.ts        # Database client
│   └── supabase.ts      # Storage client
├── remotion/            # Video composition
│   ├── index.tsx        # Remotion root
│   └── VideoComposition.tsx
└── types/               # TypeScript types
```

## 🔄 How It Works

1. **User enters topic** → Dashboard creates video record
2. **Inngest workflow starts**:
   - Step 1: Gemini Pro generates script (JSON with scenes)
   - Step 2: Deepgram creates voiceover + captions
   - Step 3: Pollinations.ai generates scene images
   - Step 4: Triggers GitHub Actions
3. **GitHub Actions renders** video using Remotion
4. **Video uploaded** to Supabase Storage
5. **User schedules** posts to social platforms

## 🎬 GitHub Actions Rendering

The `render-video.yml` workflow:
- Triggers via `repository_dispatch`
- Installs FFmpeg and dependencies
- Runs `npx remotion render`
- Uploads to Supabase Storage
- Updates database status

Add these secrets to your repo:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEBHOOK_SECRET`

## 📱 Social Media Setup

### YouTube Shorts
1. Create project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable YouTube Data API v3
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials
5. Get access token via OAuth flow

### Instagram Reels
1. Create app at [Meta for Developers](https://developers.facebook.com)
2. Add Instagram Graph API
3. Get Instagram Business Account ID
4. Generate long-lived access token

### TikTok
1. Register at [TikTok for Developers](https://developers.tiktok.com)
2. Create app with Content Posting API
3. Complete OAuth flow

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + Shadcn UI
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL) + Prisma
- **Background Jobs**: Inngest
- **Video**: Remotion
- **AI**: Gemini Pro, Deepgram, Pollinations.ai

## 📄 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

Built with 💜 using Next.js, Remotion, and AI • All services on FREE tiers
