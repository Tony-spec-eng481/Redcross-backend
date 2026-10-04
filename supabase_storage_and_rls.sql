-- ═══════════════════════════════════════════════════════════
-- Supabase Storage Bucket & Row Level Security (RLS) Setup
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ═══════════════════════════════════════════════════════════

-- ── 1. Configure Storage Buckets ('Store' and 'redcross-media') ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'Store',
  'Store',
  true,
  20971520, -- 20 MB file size limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'redcross-media',
  'redcross-media',
  true,
  20971520, -- 20 MB file size limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 2. Storage Object Row Level Security & Policies ──
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public Read Policy: Allow anyone to view media & documents
DROP POLICY IF EXISTS "Public Read Access for Media Buckets" ON storage.objects;
CREATE POLICY "Public Read Access for Media Buckets"
ON storage.objects FOR SELECT
USING (bucket_id IN ('Store', 'redcross-media'));

-- Upload Policy: Allow uploading images, media & documents
DROP POLICY IF EXISTS "Allow Upload to Media Buckets" ON storage.objects;
CREATE POLICY "Allow Upload to Media Buckets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('Store', 'redcross-media'));

-- Update Policy: Allow updating existing files
DROP POLICY IF EXISTS "Allow Update in Media Buckets" ON storage.objects;
CREATE POLICY "Allow Update in Media Buckets"
ON storage.objects FOR UPDATE
USING (bucket_id IN ('Store', 'redcross-media'))
WITH CHECK (bucket_id IN ('Store', 'redcross-media'));

-- Delete Policy: Allow deleting files
DROP POLICY IF EXISTS "Allow Delete from Media Buckets" ON storage.objects;
CREATE POLICY "Allow Delete from Media Buckets"
ON storage.objects FOR DELETE
USING (bucket_id IN ('Store', 'redcross-media'));


-- ═══════════════════════════════════════════════════════════
-- 3. DATABASE TABLES ROW LEVEL SECURITY (RLS) & POLICIES
-- ═══════════════════════════════════════════════════════════

-- ── Admins Table RLS ──
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins select policy" ON public.admins;
CREATE POLICY "Admins select policy" ON public.admins FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins insert policy" ON public.admins;
CREATE POLICY "Admins insert policy" ON public.admins FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins update policy" ON public.admins;
CREATE POLICY "Admins update policy" ON public.admins FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Admins delete policy" ON public.admins;
CREATE POLICY "Admins delete policy" ON public.admins FOR DELETE USING (true);

-- ── Members Table RLS ──
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members select policy" ON public.members;
CREATE POLICY "Members select policy" ON public.members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Members insert policy" ON public.members;
CREATE POLICY "Members insert policy" ON public.members FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Members update policy" ON public.members;
CREATE POLICY "Members update policy" ON public.members FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Members delete policy" ON public.members;
CREATE POLICY "Members delete policy" ON public.members FOR DELETE USING (true);

-- ── Events Table RLS ──
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Events select policy" ON public.events;
CREATE POLICY "Events select policy" ON public.events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Events insert policy" ON public.events;
CREATE POLICY "Events insert policy" ON public.events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Events update policy" ON public.events;
CREATE POLICY "Events update policy" ON public.events FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Events delete policy" ON public.events;
CREATE POLICY "Events delete policy" ON public.events FOR DELETE USING (true);

-- ── Gallery Table RLS ──
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gallery select policy" ON public.gallery;
CREATE POLICY "Gallery select policy" ON public.gallery FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gallery insert policy" ON public.gallery;
CREATE POLICY "Gallery insert policy" ON public.gallery FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Gallery update policy" ON public.gallery;
CREATE POLICY "Gallery update policy" ON public.gallery FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Gallery delete policy" ON public.gallery;
CREATE POLICY "Gallery delete policy" ON public.gallery FOR DELETE USING (true);

-- ── First Aid Table RLS ──
ALTER TABLE public.first_aid ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "First aid select policy" ON public.first_aid;
CREATE POLICY "First aid select policy" ON public.first_aid FOR SELECT USING (true);
DROP POLICY IF EXISTS "First aid insert policy" ON public.first_aid;
CREATE POLICY "First aid insert policy" ON public.first_aid FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "First aid update policy" ON public.first_aid;
CREATE POLICY "First aid update policy" ON public.first_aid FOR UPDATE USING (true);
DROP POLICY IF EXISTS "First aid delete policy" ON public.first_aid;
CREATE POLICY "First aid delete policy" ON public.first_aid FOR DELETE USING (true);

-- ── Messages Table RLS ──
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Messages select policy" ON public.messages;
CREATE POLICY "Messages select policy" ON public.messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Messages insert policy" ON public.messages;
CREATE POLICY "Messages insert policy" ON public.messages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Messages update policy" ON public.messages;
CREATE POLICY "Messages update policy" ON public.messages FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Messages delete policy" ON public.messages;
CREATE POLICY "Messages delete policy" ON public.messages FOR DELETE USING (true);

-- ── Questions Table RLS ──
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Questions select policy" ON public.questions;
CREATE POLICY "Questions select policy" ON public.questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Questions insert policy" ON public.questions;
CREATE POLICY "Questions insert policy" ON public.questions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Questions update policy" ON public.questions;
CREATE POLICY "Questions update policy" ON public.questions FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Questions delete policy" ON public.questions;
CREATE POLICY "Questions delete policy" ON public.questions FOR DELETE USING (true);

-- ── Notifications Table RLS ──
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications select policy" ON public.notifications;
CREATE POLICY "Notifications select policy" ON public.notifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Notifications insert policy" ON public.notifications;
CREATE POLICY "Notifications insert policy" ON public.notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Notifications update policy" ON public.notifications;
CREATE POLICY "Notifications update policy" ON public.notifications FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Notifications delete policy" ON public.notifications;
CREATE POLICY "Notifications delete policy" ON public.notifications FOR DELETE USING (true);
