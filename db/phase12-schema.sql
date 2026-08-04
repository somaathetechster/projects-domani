-- Phase 12. Additive.

-- Rich approval fields — everything admin needs to communicate what the client
-- is being asked to approve, how to verify it, and what accepting it means.
alter table approvals add column if not exists context text;           -- background / what this is
alter table approvals add column if not exists verification_steps text; -- how the client should review it
alter table approvals add column if not exists review_location text;    -- URL, Figma link, staging URL, etc.
alter table approvals add column if not exists deadline date;           -- optional sign-by date
alter table approvals add column if not exists attachments text[];      -- storage paths, shown as download links

-- Per-approval comment thread so client & admin can discuss without going to Chat
create table if not exists approval_comments (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references approvals(id) on delete cascade,
  author_label text not null,  -- "display_name or email" of the author at write time
  author_role text not null check (author_role in ('client','domani_staff','admin')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_approval_comments on approval_comments(approval_id, created_at);

-- Invoice payment queries — client can flag "I've paid this"
create table if not exists invoice_queries (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  member_id uuid not null references project_members(id),
  type text not null default 'payment_made' check (type in ('payment_made','query','dispute')),
  body text not null,
  created_at timestamptz not null default now()
);

-- Timeline event comments — client can annotate any event
create table if not exists activity_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references activity_events(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  author_label text not null,
  body text not null,
  created_at timestamptz not null default now()
);
