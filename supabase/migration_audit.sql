-- Migration: Add audit fields (created_by, created_at, completed_at)
-- Run this in Supabase Dashboard → SQL Editor → New query

-- Add created_by (who created the wish: 'kino', 'vara', or 'kita')
ALTER TABLE public.wishes
  ADD COLUMN IF NOT EXISTS created_by text not null default '';

-- Add created_at (when the wish was created)
ALTER TABLE public.wishes
  ADD COLUMN IF NOT EXISTS created_at timestamptz not null default now();

-- Add completed_at (when the wish was marked complete, null if not yet)
ALTER TABLE public.wishes
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Index for sorting by created_at
CREATE INDEX IF NOT EXISTS wishes_created_at_idx ON public.wishes (created_at);
