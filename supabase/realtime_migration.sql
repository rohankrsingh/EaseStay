-- ─────────────────────────────────────────────────────────
-- REALTIME MIGRATION — Enable Supabase Realtime for issues & members
-- Run this in your Supabase SQL Editor (idempotent, safe to re-run)
-- ─────────────────────────────────────────────────────────

-- Enable Realtime change-data-capture on the issues table
ALTER PUBLICATION supabase_realtime ADD TABLE public.issues;

-- Enable Realtime change-data-capture on the members table
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
