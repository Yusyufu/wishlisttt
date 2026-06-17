-- Run this once in Supabase Dashboard → SQL Editor → New query
-- Creates the `wishes` table with a permissive RLS policy for personal use.

create table if not exists public.wishes (
  id         text primary key,
  tab        text not null check (tab in ('kino', 'kita', 'vara')),
  text       text not null,
  completed  boolean not null default false,
  expanded   boolean not null default false,
  story      text not null default '',
  image      text,
  updated_at timestamptz not null default now()
);

-- Add `expanded` column to existing tables (idempotent).
alter table public.wishes
  add column if not exists expanded boolean not null default false;

create index if not exists wishes_tab_idx on public.wishes (tab);
create index if not exists wishes_updated_at_idx on public.wishes (updated_at);

-- Enable RLS but allow public read/write via the anon key.
-- Fine for a personal app. If you add auth later, replace with auth.uid() policies.
alter table public.wishes enable row level security;

drop policy if exists "anon read" on public.wishes;
create policy "anon read" on public.wishes
  for select to anon using (true);

drop policy if exists "anon write" on public.wishes;
create policy "anon write" on public.wishes
  for all to anon using (true) with check (true);
