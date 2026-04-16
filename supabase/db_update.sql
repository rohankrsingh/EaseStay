-- Update members schema
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add admin role to users
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- Enable profile policies for admin management
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
CREATE POLICY "Admins can update any profile." ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text = 'admin'
    )
  );

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
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

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
WITH issue_stats AS (
  SELECT
    i.community_id,
    COUNT(*) AS issues_resolved,
    COALESCE(AVG(EXTRACT(EPOCH FROM (i.updated_at - i.created_at)) / 3600.0), 0)::numeric AS avg_resolution_hours
  FROM public.issues i
  WHERE i.status = 'Resolved'
  GROUP BY i.community_id
),
review_stats AS (
  SELECT
    r.community_id,
    COUNT(*) AS total_reviews,
    COALESCE(AVG(r.rating), 0)::numeric AS resident_rating
  FROM public.reviews r
  GROUP BY r.community_id
),
member_stats AS (
  SELECT
    m.community_id,
    COUNT(*) AS active_members
  FROM public.members m
  WHERE m.status = 'active'
  GROUP BY m.community_id
),
global_stats AS (
  SELECT COALESCE(AVG(r.rating), 3.8)::numeric AS global_avg_rating
  FROM public.reviews r
)
SELECT
  c.id AS community_id,
  COALESCE(i.avg_resolution_hours, 0) AS avg_resolution_hours,
  COALESCE(i.issues_resolved, 0) AS issues_resolved,
  COALESCE(ms.active_members, 0) + COALESCE(c.free_rooms, 0) AS scale,
  COALESCE(rs.resident_rating, 0) AS resident_rating,
  COALESCE(rs.total_reviews, 0) AS total_reviews,
  CASE
    WHEN COALESCE(rs.total_reviews, 0) = 0 THEN LEAST(
      3.0::numeric,
      LEAST(
        5::numeric,
        GREATEST(
          1::numeric,
          (
            (
              (
                (
                  (COALESCE(rs.total_reviews, 0)::numeric / (COALESCE(rs.total_reviews, 0)::numeric + 10::numeric))
                  * COALESCE(NULLIF(rs.resident_rating, 0), g.global_avg_rating)
                )
                +
                (
                  (10::numeric / (COALESCE(rs.total_reviews, 0)::numeric + 10::numeric))
                  * g.global_avg_rating
                )
              ) * 0.35
            )
            +
            (
              (
                (
                  (
                    (
                      (
                        CASE
                          WHEN COALESCE(i.issues_resolved, 0) > 0
                            THEN LEAST(5::numeric, GREATEST(0::numeric, 5::numeric - (COALESCE(i.avg_resolution_hours, 0) / 16::numeric)))
                          ELSE 2.5::numeric
                        END
                      ) * 0.25
                    )
                    +
                    (
                      LEAST(5::numeric, 1.2::numeric + (LN(1::numeric + COALESCE(i.issues_resolved, 0)::numeric) * 1.15::numeric)) * 0.75
                    )
                  )
                  * LEAST(1::numeric, COALESCE(i.issues_resolved, 0)::numeric / 40::numeric)
                )
                +
                (
                  g.global_avg_rating * (1::numeric - LEAST(1::numeric, COALESCE(i.issues_resolved, 0)::numeric / 40::numeric))
                )
              ) * 0.65
            )
          )
        )
      )
    )
    ELSE LEAST(
      5::numeric,
      GREATEST(
        1::numeric,
        (
          (
            (
              (
                (COALESCE(rs.total_reviews, 0)::numeric / (COALESCE(rs.total_reviews, 0)::numeric + 10::numeric))
                * COALESCE(NULLIF(rs.resident_rating, 0), g.global_avg_rating)
              )
              +
              (
                (10::numeric / (COALESCE(rs.total_reviews, 0)::numeric + 10::numeric))
                * g.global_avg_rating
              )
            ) * 0.35
          )
          +
          (
            (
              (
                (
                  (
                    (
                      (
                        CASE
                          WHEN COALESCE(i.issues_resolved, 0) > 0
                            THEN LEAST(5::numeric, GREATEST(0::numeric, 5::numeric - (COALESCE(i.avg_resolution_hours, 0) / 16::numeric)))
                          ELSE 2.5::numeric
                        END
                      ) * 0.25
                    )
                    +
                    (
                      LEAST(5::numeric, 1.2::numeric + (LN(1::numeric + COALESCE(i.issues_resolved, 0)::numeric) * 1.15::numeric)) * 0.75
                    )
                  )
                  * LEAST(1::numeric, COALESCE(i.issues_resolved, 0)::numeric / 40::numeric)
                )
                +
                (
                  g.global_avg_rating * (1::numeric - LEAST(1::numeric, COALESCE(i.issues_resolved, 0)::numeric / 40::numeric))
                )
              ) * 0.65
            )
          )
        )
      )
    )
  END AS weighted_rating
FROM public.communities c
LEFT JOIN issue_stats i ON i.community_id = c.id
LEFT JOIN review_stats rs ON rs.community_id = c.id
LEFT JOIN member_stats ms ON ms.community_id = c.id
CROSS JOIN global_stats g;

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
  USING (status is null OR status <> 'banned');

-- Allow authenticated owners to create communities
DROP POLICY IF EXISTS "Communities: owner insert" ON public.communities;
CREATE POLICY "Communities: owner insert"
  ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Communities: owner select" ON public.communities;
CREATE POLICY "Communities: owner select"
  ON public.communities FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Communities: admin select all" ON public.communities;
CREATE POLICY "Communities: admin select all"
  ON public.communities FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text = 'admin'
    )
  );

-- Allow owners to update THEIR OWN communities (covers PG Info save)
DROP POLICY IF EXISTS "Communities: owner update" ON public.communities;
CREATE POLICY "Communities: owner update"
  ON public.communities FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Communities: admin update" ON public.communities;
CREATE POLICY "Communities: admin update"
  ON public.communities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text = 'admin'
    )
  );

-- Allow owners to delete their own communities
DROP POLICY IF EXISTS "Communities: owner delete" ON public.communities;
CREATE POLICY "Communities: owner delete"
  ON public.communities FOR DELETE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Communities: admin delete" ON public.communities;
CREATE POLICY "Communities: admin delete"
  ON public.communities FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text = 'admin'
    )
  );

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

-- ─────────────────────────────────────────────────────────
-- ROOM HISTORY + MEMBERSHIP UPDATE POLICIES
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.room_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  room_number text NOT NULL,
  change_type text NOT NULL DEFAULT 'changed' CHECK (change_type IN ('joined', 'changed', 'left', 'recorded')),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_room_history_user_changed_at
  ON public.room_history (user_id, changed_at DESC);

ALTER TABLE public.room_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room history: resident read own" ON public.room_history;
CREATE POLICY "Room history: resident read own"
  ON public.room_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Room history: resident insert own" ON public.room_history;
CREATE POLICY "Room history: resident insert own"
  ON public.room_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members: resident update own membership" ON public.members;
CREATE POLICY "Members: resident update own membership"
  ON public.members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members: owner update community members" ON public.members;
CREATE POLICY "Members: owner update community members"
  ON public.members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.id = community_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.id = community_id AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members: owner delete community members" ON public.members;
CREATE POLICY "Members: owner delete community members"
  ON public.members FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.id = community_id AND c.owner_id = auth.uid()
    )
  );

