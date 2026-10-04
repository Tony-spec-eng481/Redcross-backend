-- ═══════════════════════════════════════════════════════════
-- Gallery Table Migration: Add is_favourite & submitted_by_member_id columns
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Add is_favourite column (determines if gallery shows on frontend page)
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS is_favourite BOOLEAN DEFAULT false;

-- Add submitted_by_member_id column to track which member submitted the image
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS submitted_by_member_id BIGINT REFERENCES public.members(id) ON DELETE SET NULL;

-- Add submitted_by_name for display purposes
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS submitted_by_name VARCHAR(255);

-- Add submitted_by_email for display purposes
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS submitted_by_email VARCHAR(255);

-- Add category for gallery items
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';

-- Add description for gallery items
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index on is_favourite for quick frontend queries
CREATE INDEX IF NOT EXISTS idx_gallery_favourite ON public.gallery(is_favourite);

-- Create index on submitted_by_member_id
CREATE INDEX IF NOT EXISTS idx_gallery_submitted_by_member ON public.gallery(submitted_by_member_id);

-- Relax the submitted_by FK constraint to allow both admin UUIDs and NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gallery_submitted_by_fkey') THEN
    ALTER TABLE public.gallery DROP CONSTRAINT gallery_submitted_by_fkey;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;
