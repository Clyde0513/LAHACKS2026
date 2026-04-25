# TeachMeNew

> **LA Hacks 2026** — AI-powered visual learning app. Upload an image or enter any topic, and TeachMeNew builds a full lesson roadmap, teaches it card-by-card with analogies, quizzes you along the way, and generates a personalized recap.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Custom dark-theme CSS design system |
| AI | OpenAI GPT-4o-mini (via secure server-side proxy) |
| Media | Cloudinary (image uploads + analysis) |
| Auth | Supabase Auth (email/password + PKCE password reset) |
| Database | Supabase Postgres (user progress, RLS-secured) |
| Email | Resend (password reset emails) |
| Deployment | Vercel (Vite frontend + serverless API routes) |

## Features

- **7 learning screens** — Home → Roadmap → Lesson → Checkpoint → Upload → Recap → Dashboard
- **AI lesson generation** — generates a roadmap, lesson cards with analogies & key terms, and a personalized recap
- **Image-to-lesson** — upload any image via Cloudinary; GPT-4o-mini vision extracts concepts, glossary, and quiz questions
- **Simplify & re-explain** — tap "Simplify" or "Another analogy" on any card for a different explanation
- **Checkpoint quizzes** — per-card quiz with confidence tracking (low / medium / high)
- **Auth** — sign up with username + email + password, sign in, forgot password with branded email, PKCE reset flow
- **Progress persistence** — lesson results saved to Supabase `user_progress` (per-user RLS) and localStorage; Dashboard merges both

## Project Structure

```
TeachMeNew/
├── api/                  # Vercel serverless API routes (production)
│   ├── _lib/             # Shared OpenAI + Supabase admin helpers
│   ├── generate-topic.ts
│   ├── generate-lesson.ts
│   ├── simplify-card.ts
│   ├── another-example.ts
│   ├── analyze-upload.ts
│   ├── generate-recap.ts
│   ├── save-progress.ts
│   ├── forgot-password.ts
│   └── health.ts
├── server/               # Express server (local dev only)
│   ├── index.ts
│   ├── lib/              # OpenAI + Supabase admin helpers
│   └── routes/           # Same routes as api/ but Express handlers
├── src/
│   ├── api/              # Browser fetch helpers (call /api/*)
│   ├── context/          # AuthContext (Supabase auth state)
│   ├── lib/              # Supabase browser client
│   ├── screens/          # All 7 app screens + auth screens
│   └── types.ts          # Shared TypeScript types
├── supabase/
│   └── schema.sql        # Full DB schema + RLS policies
└── vercel.json           # Vercel build + SPA rewrite config
```

## Local Development

### Prerequisites

- Node.js ≥ 20.19
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key
- A [Cloudinary](https://cloudinary.com) account
- A [Resend](https://resend.com) API key (for password reset emails)

### Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd TeachMeNew
   npm install
   ```

2. **Create `.env`** in the project root:
   ```env
   # Cloudinary (browser-safe)
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

   # Supabase (browser-safe — anon key only)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key

   # Server-only secrets (never exposed to browser)
   OPENAI_API_KEY=sk-...
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   RESEND_API_KEY=re_...
   SITE_URL=http://localhost:5173
   ```

3. **Set up the database** — paste `supabase/schema.sql` into the Supabase SQL Editor and run it.

4. **Configure Supabase Auth**
   - In **Authentication → URL Configuration**, add `http://localhost:5173` to Redirect URLs
   - Optionally disable **Confirm email** under Authentication → Providers → Email for easier local testing

5. **Start the dev server**
   ```bash
   npm run dev
   ```
   This runs Vite (port 5173) and the Express proxy server (port 3001) concurrently. The Vite dev server proxies all `/api/*` requests to Express.

## Deployment (Vercel)

The `api/` folder contains Vercel-native serverless function handlers — no separate server needed in production.

1. Push to GitHub and connect the repo to Vercel
2. Add all environment variables in **Vercel → Settings → Environment Variables**:
   - All the same keys from `.env` above
   - Set `SITE_URL` to your actual Vercel URL (e.g. `https://teach-me-new.vercel.app`) — used in password reset emails
3. Deploy — Vercel auto-detects Vite + the `api/` folder

## Cloudinary Upload Preset

1. Go to [Cloudinary Upload Presets](https://console.cloudinary.com/app/settings/upload/presets)
2. Click **Add upload preset** → set to **Unsigned** mode
3. Copy the preset name into `VITE_CLOUDINARY_UPLOAD_PRESET` in your `.env`



## AI Assistant Support

This project includes AI coding rules for your selected AI assistant(s). The rules help AI assistants understand Cloudinary React SDK patterns, common errors, and best practices.

**Try the AI Prompts**: Check out the "🤖 Try Asking Your AI Assistant" section in the app for ready-to-use Cloudinary prompts! Copy and paste them into your AI assistant to get started.

## Learn More

- [Cloudinary React SDK Docs](https://cloudinary.com/documentation/react_integration)
- [Vite Documentation](https://vite.dev)
- [React Documentation](https://react.dev)
