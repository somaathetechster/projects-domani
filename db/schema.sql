-- Domani Projects (projects.domanimedia.com) — Core Schema
-- Postgres / Supabase

create extension if not exists "pgcrypto";

-- Organization is implicitly Domani; kept for future multi-org use
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  visibility text not null default 'hidden' check (visibility in ('public','category_only','hidden')),
  category text, -- e.g. 'Fintech', 'HealthTech' — shown when visibility = category_only
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  slug text not null unique, -- e.g. 'infinitswap' -> projects.domanimedia.com/infinitswap
  name text not null,
  status text not null default 'planning' check (status in ('planning','in_progress','blocked','review','completed')),
  progress_pct int not null default 0,
  current_phase text,
  next_milestone text,
  eta date,
  created_at timestamptz not null default now()
);

-- Whitelisted emails per project — the ONLY emails allowed to authenticate for that project
create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  email text not null,
  role text not null default 'client' check (role in ('client','domani_staff')),
  password_hash text, -- set on first successful OTP verification
  totp_secret text,   -- set when authenticator app is configured
  totp_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique(project_id, email)
);

create table otp_codes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  attempt_count int not null default 0,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references project_members(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  status text not null default 'upcoming' check (status in ('upcoming','in_progress','completed','blocked')),
  progress_pct int not null default 0,
  sort_order int not null default 0
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  number serial,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','investigating','in_progress','awaiting_client','resolved','closed')),
  created_by uuid not null references project_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  author_id uuid not null references project_members(id),
  body text not null,
  attachment_url text,
  created_at timestamptz not null default now()
);

create table feature_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  business_reason text,
  status text not null default 'submitted' check (status in ('submitted','review','estimate','approved','scheduled','in_progress','delivered','rejected')),
  requested_by uuid not null references project_members(id),
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  doc_type text not null check (doc_type in ('sow','contract','invoice','acceptance_certificate','architecture','meeting_notes','other')),
  file_url text not null,
  status text not null default 'uploaded' check (status in ('uploaded','pending_signature','signed','paid')),
  uploaded_by uuid references project_members(id),
  created_at timestamptz not null default now()
);

-- Electronic signatures on documents / milestone acceptance
create table signatures (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  module_id uuid references modules(id) on delete cascade,
  signed_by uuid not null references project_members(id),
  signature_type text not null default 'click_accept' check (signature_type in ('click_accept','typed_name')),
  signed_value text, -- typed full name if applicable
  ip_address text,
  signed_at timestamptz not null default now(),
  check (document_id is not null or module_id is not null)
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'approved' check (status in ('approved','deferred','future_phase','rejected')),
  decided_by uuid references project_members(id),
  decided_at timestamptz not null default now()
);

create table weekly_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  week_of date not null,
  completed text[],
  blocked text[],
  notes text,
  posted_by uuid references project_members(id),
  created_at timestamptz not null default now()
);

create table notification_preferences (
  member_id uuid primary key references project_members(id) on delete cascade,
  on_issue_update boolean not null default true,
  on_document_upload boolean not null default true,
  on_weekly_update boolean not null default true,
  on_milestone_ready boolean not null default true
);

create index on issues (project_id, status);
create index on documents (project_id, doc_type);
create index on decisions (project_id);
create index on otp_codes (project_id, email, consumed);
