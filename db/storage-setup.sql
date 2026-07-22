-- Run this in Supabase SQL Editor to create the private documents bucket
-- and lock it down so only your service-role key (server-side) can read/write.
-- Do NOT make this bucket public — documents include contracts and invoices.

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

-- No public policies are created intentionally. All access goes through
-- /api/documents/upload-url and /api/documents/:id/signed-url, which use
-- the service-role key server-side and enforce project ownership before
-- issuing any signed URL.