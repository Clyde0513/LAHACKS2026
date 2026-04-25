-- ============================================================
-- TeachMeNew — Database Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── profiles (stores username, synced from auth.users metadata) ───────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

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
  user_id           uuid references auth.users(id) on delete cascade not null,
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

alter table profiles        enable row level security;
alter table topics          enable row level security;
alter table lessons         enable row level security;
alter table lesson_cards    enable row level security;
alter table quizzes         enable row level security;
alter table quiz_attempts   enable row level security;
alter table media_assets    enable row level security;
alter table upload_analyses enable row level security;
alter table user_progress   enable row level security;

-- ── profiles: each user can only see and update their own profile
create policy "profiles_self" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ── user_progress: users can only read/write their own progress
create policy "user_progress_select" on user_progress
  for select using (auth.uid() = user_id);
create policy "user_progress_insert" on user_progress
  for insert with check (auth.uid() = user_id);

-- ── All other tables: open read/write for hackathon demo
-- (These store AI-generated content, not sensitive user data)
create policy "public_all" on topics          for all using (true) with check (true);
create policy "public_all" on lessons         for all using (true) with check (true);
create policy "public_all" on lesson_cards    for all using (true) with check (true);
create policy "public_all" on quizzes         for all using (true) with check (true);
create policy "public_all" on quiz_attempts   for all using (true) with check (true);
create policy "public_all" on media_assets    for all using (true) with check (true);
create policy "public_all" on upload_analyses for all using (true) with check (true);


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
