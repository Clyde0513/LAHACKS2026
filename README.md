# TeachMeNew

> **LA Hacks 2026** — You doom-scroll for hours but learn nothing. TeachMeNew gives you AI-generated visual lessons on any topic in under 15 minutes: cards, quizzes, and deep dives. Real understanding, not just content.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Custom dark-theme CSS design system (Inter font, CSS variables) |
| AI — Lessons | OpenAI GPT-4o-mini (roadmap, lesson cards, recaps, deep dives) |
| AI — Images | OpenAI DALL-E 3 (contextual card visuals, app logo) |
| Media | Cloudinary (image upload, CDN delivery, fetch optimization) |
| Auth | Supabase Auth (email/password + PKCE password reset) |
| Database | Supabase Postgres (user progress, RLS-secured) |
| Email | Resend (branded password reset emails) |
| Deployment | Vercel (Vite SPA + serverless API routes) |

---

## Features

### Core Learning Flow
- **AI Roadmap Generation** — Enter any topic and GPT-4o-mini instantly builds a structured learning roadmap with 3–8 modules, calibrated to your chosen difficulty level
- **4 Difficulty Levels** — Simplified (ELI5) · Beginner · Intermediate · Advanced — each produces a distinct lesson style, vocabulary level, and module count
- **Lesson Cards** — Bite-sized concept cards with explanations, real-world analogies, key term glossaries, and nearly contextual DALL-E 3 images (Cloudinary CDN-delivered)
- **Lesson Branching / Deep Dive** — On any card, tap **🔬 Dive deeper** to branch into a 3-card sub-lesson that unpacks that concept further, without losing your place
- **Checkpoint Quizzes** — At each module boundary, a full quiz tests retention with confidence tracking (Low / Medium / High)
- **Per-Card Quiz** — Every card has an inline multiple-choice quiz with instant explanation feedback
- **Simplify & New Example** — Rewrite any card in simpler terms or request a fresh analogy with one tap

### Upload to Learn
- **Image-to-Lesson** — Upload any photo, diagram, or screenshot via Cloudinary; GPT-4o-mini vision analyzes it, extracts concepts, and builds a tailored lesson using your image as the visual anchor throughout

### Recap & Progress
- **Personalized Recap** — After finishing, GPT generates a narrative summary of your session with key takeaways, identified weak spots, and recommended next topics
- **Dashboard** — Tracks all completed lessons, quiz scores, confidence breakdown by topic, day streak, and suggested follow-up topics
- **Certificate Share Card** — Cloudinary-generated completion card with your name, topic, and score — shareable to social

### Auth
- Sign up with username + email + password
- Sign in, sign out
- Forgot password → branded Resend email → PKCE secure reset flow

---

## Project Structure

```
TeachMeNew/
├── api/                      # Vercel serverless API routes
│   ├── _lib/
│   │   ├── openai.ts         # GPT-4o-mini + DALL-E 3 helper
│   │   └── supabase.ts       # Supabase admin client
│   ├── generate-topic.ts     # Roadmap generation (4 difficulty modes)
│   ├── generate-lesson.ts    # Lesson card generation
│   ├── generate-image.ts     # DALL-E 3 image generation
│   ├── deep-dive.ts          # Lesson branching sub-cards
│   ├── simplify-card.ts      # Card rewrite in simpler terms
│   ├── another-example.ts    # Fresh analogy generation
│   ├── analyze-upload.ts     # GPT vision analysis of uploaded image
│   ├── generate-recap.ts     # Post-lesson personalized recap
│   ├── save-progress.ts      # Persist lesson results to Supabase
│   ├── forgot-password.ts    # Trigger Resend password reset email
│   └── health.ts             # Health check
├── src/
│   ├── api/                  # Browser fetch wrappers (call /api/*)
│   │   ├── generateRoadmap.ts
│   │   └── generateLesson.ts # includes generateCardImage, generateDeepDive
│   ├── cloudinary/
│   │   ├── config.ts         # Cloudinary SDK instance
│   │   └── UploadWidget.tsx  # Cloudinary upload widget component
│   ├── context/
│   │   └── AuthContext.tsx   # Supabase auth state provider
│   ├── lib/
│   │   ├── supabase.ts       # Supabase browser client
│   │   └── lessonHistory.ts  # LocalStorage lesson history helpers
│   ├── screens/
│   │   ├── AuthScreen.tsx / .css
│   │   ├── ForgotPasswordScreen.tsx / .css
│   │   ├── ResetPasswordScreen.tsx / .css
│   │   ├── RoadmapScreen.tsx / .css     # Roadmap + difficulty selector
│   │   ├── LessonScreen.tsx / .css      # Cards + DALL-E images + deep dive
│   │   ├── CheckpointQuizScreen.tsx / .css
│   │   ├── UploadLearnScreen.tsx / .css
│   │   ├── RecapScreen.tsx / .css
│   │   └── DashboardScreen.tsx / .css
│   ├── types.ts              # Shared TypeScript interfaces
│   ├── App.tsx               # Root router + state + logo generation
│   └── App.css               # Global design tokens + layout
├── supabase/
│   └── schema.sql            # Full DB schema + RLS policies
├── vercel.json               # Vercel build config + SPA rewrite
└── vite.config.ts            # Vite config with /api proxy for local dev
```

---

## Local Development

### Prerequisites

- Node.js ≥ 20.19
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key (GPT-4o-mini + DALL-E 3)
- A [Cloudinary](https://cloudinary.com) account (free tier is fine)
- A [Resend](https://resend.com) API key (for password reset emails)

### 1. Install dependencies

```bash
git clone <repo-url>
cd TeachMeNew
npm install
```

### 2. Create `.env` in the project root

```env
# ── Cloudinary (browser-safe, VITE_ prefix required) ─────────────────────
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset

# ── Supabase (browser-safe, anon key only) ────────────────────────────────
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# ── Server-only secrets (never sent to the browser) ───────────────────────
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
SITE_URL=http://localhost:5173
```

> **Security note:** All `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `RESEND_API_KEY` values are server-only. They are never included in the Vite bundle or sent to the browser.

### 3. Set up the database

Paste `supabase/schema.sql` into the **Supabase SQL Editor** and run it. This creates the `user_progress` table with Row Level Security policies.

### 4. Configure Supabase Auth

1. In **Authentication → URL Configuration**, add `http://localhost:5173` to **Redirect URLs**
2. Optionally disable **Confirm email** under Authentication → Providers → Email for frictionless local testing

### 5. Configure Cloudinary

1. Create an **unsigned upload preset** in Cloudinary Dashboard → Settings → Upload → Upload Presets
2. Set the preset name as `VITE_CLOUDINARY_UPLOAD_PRESET`

### 6. Run the dev server

```bash
npm run dev
```

This starts:
- **Vite** on `http://localhost:5173` (frontend)
- **tsx watch** on `http://localhost:3001` (local Express API server)

Vite proxies all `/api/*` requests to `localhost:3001` automatically.

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# First deploy (follow prompts)
vercel

# Production deploy
vercel --prod
```

Set all environment variables from step 2 in your **Vercel project settings** under Environment Variables (all environments). The `api/` folder is automatically deployed as Vercel Serverless Functions.

---

## Environment Variables Reference

| Variable | Where used | Description |
|---|---|---|
| `VITE_CLOUDINARY_CLOUD_NAME` | Browser | Cloudinary cloud identifier |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Browser | Unsigned upload preset name |
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | Supabase anon (public) key |
| `OPENAI_API_KEY` | Server only | OpenAI key for GPT-4o-mini + DALL-E 3 |
| `SUPABASE_URL` | Server only | Supabase project URL (server admin) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service role key (bypasses RLS) |
| `RESEND_API_KEY` | Server only | Resend key for password reset emails |
| `SITE_URL` | Server only | Base URL for auth redirect links |

---

## Database Schema

The app uses a single table `user_progress` in Supabase:

```sql
create table user_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  topic           text not null,
  difficulty      text not null,
  module_count    integer not null,
  quiz_score      integer not null,          -- 0–100
  avg_confidence  integer not null,          -- 0–100
  low_confidence  integer not null default 0,
  medium_confidence integer not null default 0,
  high_confidence integer not null default 0,
  related_topics  jsonb not null default '[]',
  completed_at    timestamptz not null default now()
);

-- RLS: users can only read/write their own rows
alter table user_progress enable row level security;
create policy "own rows" on user_progress
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Architecture Notes

### API security
All OpenAI and Supabase service-role calls go through serverless functions in `api/`. The browser never receives or sends API keys — all secrets live in server-side environment variables only.

### Image pipeline
1. GPT-4o-mini generates a 2–4 word `imageKeyword` per lesson card
2. `/api/generate-image` sends that keyword to DALL-E 3 with a cinematic illustration prompt
3. The returned URL is served via **Cloudinary fetch delivery** — Cloudinary CDN-caches it, applies `fill(700×320)` + `f_auto/q_auto` for optimal format and compression
4. While DALL-E is generating (~5s), a deterministic Picsum Photos placeholder is shown instantly, then swapped in when DALL-E resolves
5. The next card's image is prefetched in parallel

### Lesson branching
When a user taps **🔬 Dive deeper** on any card, `/api/deep-dive` generates 3 structured sub-cards (misconception → mechanism → real-world application) without interrupting the main lesson flow. The overlay renders at `z-index: 150`; the checkpoint quiz overlay sits above it at `z-index: 200`.

### Upload flow
Cloudinary's upload widget handles the file upload directly from browser → Cloudinary. The returned `public_id` is stored in a two-state system (`uploadedPublicId` → snapshotted to `lessonPublicId` at lesson start) to prevent the photo from bleeding into unrelated lessons navigated to afterwards.

---

*Built at LA Hacks 2026*


## Learn More

- [Cloudinary React SDK Docs](https://cloudinary.com/documentation/react_integration)
- [Vite Documentation](https://vite.dev)
- [React Documentation](https://react.dev)
