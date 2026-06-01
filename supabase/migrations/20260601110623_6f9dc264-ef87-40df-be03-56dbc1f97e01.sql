-- Public buckets (ai-exports, email-inline-images) don't need a SELECT policy
-- for files to be accessible — the public CDN endpoint bypasses RLS.
-- Removing these broad SELECT policies prevents anonymous listing of bucket contents
-- while preserving direct URL access to individual files.

DROP POLICY IF EXISTS "Public read AI exports" ON storage.objects;
DROP POLICY IF EXISTS "public_read_inline" ON storage.objects;
