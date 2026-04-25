-- ============================================================
-- TeachMeNew — Database Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── topics ───────────────────────────────────────────────────────────────────
create table if not exists topics (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  topic         text not null,
  difficulty    text not null default 'Beginner',
  roadmap_json  jsonb,
  created_at    timestamptz not null default now()
);

-- ── lessons ──────────────────────────────────────────────────────────────────
create table if not exists lessons (
  id            uuid primary key default gen_random_uuid(),
  topic_id      uuid references topics(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  lesson_json   jsonb,
  created_at    timestamptz not null default now()
);

-- ── lesson_cards ─────────────────────────────────────────────────────────────
create table if not exists lesson_cards (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid references lessons(id) on delete cascade,
  card_id       text not null,
  module_id     text not null,
  title         text not null,
  card_json     jsonb,
  created_at    timestamptz not null default now()
);

-- ── quizzes ──────────────────────────────────────────────────────────────────
create table if not exists quizzes (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid references lessons(id) on delete cascade,
  module_id     text not null,
  question      text not null,
  options       jsonb not null,
  correct_index int not null,
  explanation   text,
  created_at    timestamptz not null default now()
);

-- ── quiz_attempts ─────────────────────────────────────────────────────────────
create table if not exists quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid references quizzes(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  selected      int not null,
  is_correct    boolean not null,
  confidence    text check (confidence in ('low','medium','high')),
  attempted_at  timestamptz not null default now()
);

-- ── media_assets ──────────────────────────────────────────────────────────────
create table if not exists media_assets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  public_id     text not null,
  secure_url    text not null,
  format        text,
  bytes         int,
  uploaded_at   timestamptz not null default now()
);

-- ── upload_analyses ───────────────────────────────────────────────────────────
create table if not exists upload_analyses (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid references media_assets(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  analysis_json jsonb,
  created_at    timestamptz not null default now()
);

-- ── user_progress ─────────────────────────────────────────────────────────────
create table if not exists user_progress (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  topic             text not null,
  difficulty        text not null default 'Beginner',
  duration_min      int,
  score_pct         numeric(5,2),
  correct           int,
  total             int,
  confidence_low    int default 0,
  confidence_medium int default 0,
  confidence_high   int default 0,
  completed_at      timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table topics          enable row level security;
alter table lessons         enable row level security;
alter table lesson_cards    enable row level security;
alter table quizzes         enable row level security;
alter table quiz_attempts   enable row level security;
alter table media_assets    enable row level security;
alter table upload_analyses enable row level security;
alter table user_progress   enable row level security;

-- Allow public (anonymous) read/write for hackathon demo.
-- In production, replace with per-user policies.
create policy "public_all" on topics          for all using (true) with check (true);
create policy "public_all" on lessons         for all using (true) with check (true);
create policy "public_all" on lesson_cards    for all using (true) with check (true);
create policy "public_all" on quizzes         for all using (true) with check (true);
create policy "public_all" on quiz_attempts   for all using (true) with check (true);
create policy "public_all" on media_assets    for all using (true) with check (true);
create policy "public_all" on upload_analyses for all using (true) with check (true);
create policy "public_all" on user_progress   for all using (true) with check (true);
