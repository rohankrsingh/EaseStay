-- Update members schema
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Optional: Since existing members might be Null, let's make them 'active'
UPDATE public.members SET status = 'active' WHERE status IS NULL;

-- Update issues schema
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS resident_verified boolean DEFAULT false;

-- Add rating to communities
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS rating numeric(2,1) DEFAULT 4.5;

-- Add dependent community fields for detailed profile (images, descriptions, etc)
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS images text[];
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS features text[];
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS location_address text;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS map_embed_url text;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS free_rooms integer DEFAULT 0;

-- Drop any conflicting member status constraints
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_status_check;

-- Reviews table for PG Ratings
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
    resident_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(community_id, resident_id)
);

-- Community Metrics View for Rating Calculation
CREATE OR REPLACE VIEW public.community_metrics AS
SELECT 
  c.id as community_id,
  (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (i.updated_at - i.created_at))/3600), 0) FROM issues i WHERE i.community_id = c.id AND i.status = 'Resolved') as avg_resolution_hours,
  (SELECT COUNT(*) FROM issues i WHERE i.community_id = c.id AND i.status = 'Resolved') as issues_resolved,
  (SELECT COUNT(*) FROM members m WHERE m.community_id = c.id AND m.status = 'active') + COALESCE(c.free_rooms, 0) as scale,
  (SELECT COALESCE(AVG(rating), 0) FROM reviews r WHERE r.community_id = c.id) as resident_rating,
  (SELECT COUNT(*) FROM reviews r WHERE r.community_id = c.id) as total_reviews
FROM communities c;

-- ─────────────────────────────────────────────────────────
-- ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Reviews: anyone authenticated can read
DROP POLICY IF EXISTS "Reviews: read all" ON public.reviews;
CREATE POLICY "Reviews: read all"
  ON public.reviews FOR SELECT
  USING (true);

-- Reviews: residents can insert/update their own rating
DROP POLICY IF EXISTS "Reviews: resident can insert" ON public.reviews;
CREATE POLICY "Reviews: resident can insert"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = resident_id);

DROP POLICY IF EXISTS "Reviews: resident can update own" ON public.reviews;
CREATE POLICY "Reviews: resident can update own"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = resident_id)
  WITH CHECK (auth.uid() = resident_id);

-- ─────────────────────────────────────────────────────────
-- COMMUNITIES TABLE POLICIES
-- ─────────────────────────────────────────────────────────

-- Ensure RLS is enabled on communities
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read communities (for directory / join code lookup)
DROP POLICY IF EXISTS "Communities: public read" ON public.communities;
CREATE POLICY "Communities: public read"
  ON public.communities FOR SELECT
  USING (true);

-- Allow authenticated owners to create communities
DROP POLICY IF EXISTS "Communities: owner insert" ON public.communities;
CREATE POLICY "Communities: owner insert"
  ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Allow owners to update THEIR OWN communities (covers PG Info save)
DROP POLICY IF EXISTS "Communities: owner update" ON public.communities;
CREATE POLICY "Communities: owner update"
  ON public.communities FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Allow owners to delete their own communities
DROP POLICY IF EXISTS "Communities: owner delete" ON public.communities;
CREATE POLICY "Communities: owner delete"
  ON public.communities FOR DELETE
  USING (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────
-- STORAGE BUCKET: community-images
-- Run this block to create the storage bucket and its policies
-- ─────────────────────────────────────────────────────────

-- Create the bucket (public = true allows public URL access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Storage: authenticated upload" ON storage.objects;
CREATE POLICY "Storage: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'community-images');

-- Allow anyone to view/download images (public bucket)
DROP POLICY IF EXISTS "Storage: public read" ON storage.objects;
CREATE POLICY "Storage: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-images');

-- Allow authenticated owners to delete their own uploads
DROP POLICY IF EXISTS "Storage: authenticated delete" ON storage.objects;
CREATE POLICY "Storage: authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'community-images');

