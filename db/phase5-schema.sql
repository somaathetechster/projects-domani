-- Phase 5. Additive. Safe to run alongside existing schema.

-- ── PLATFORM ADMINS ────────────────────────────────────────────────────
-- Deliberately separate from project_members. A project_members session is
-- scoped to exactly one project and must stay that way — that scoping is
-- what makes cross-client leakage structurally impossible. Platform admins
-- are a distinct identity with their own credentials and their own session
-- table, so admin capability is never granted by widening a client session.
create table if not exists platform_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  password_hash text,
  totp_secret text,
  totp_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references platform_admins(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists idx_admin_sessions_token on admin_sessions(token_hash);

create table if not exists admin_otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  attempt_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ── DOMAIN TABLES ──────────────────────────────────────────────────────

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  target_date date,
  progress_pct int not null default 0,
  status text not null default 'upcoming'
    check (status in ('upcoming','in_progress','review','accepted')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_milestones_project on milestones(project_id);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  milestone_id uuid references milestones(id) on delete set null,
  title text not null,
  status text not null default 'todo'
    check (status in ('todo','in_progress','blocked','review','done')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','critical')),
  estimate_hours numeric,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_tasks_project on tasks(project_id, status);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  version text,
  description text,
  status text not null default 'pending'
    check (status in ('pending','approved','changes_requested')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references project_members(id),
  resolution_note text
);
create index if not exists idx_approvals_project on approvals(project_id, status);

-- Amounts are minor units (kobo for NGN, cents for USD) as bigint.
-- Never floats: a rounding artifact on a client-facing invoice is a trust
-- failure, not a display bug.
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  number text not null,
  workstream text,
  amount_minor bigint not null,
  currency text not null default 'NGN',
  status text not null default 'pending'
    check (status in ('draft','pending','paid','overdue')),
  issued_on date,
  due_on date,
  paid_on date,
  document_id uuid references documents(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_invoices_project on invoices(project_id, status);

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  actor_label text,
  event_type text not null,
  summary text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_project on activity_events(project_id, created_at desc);

create table if not exists change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  business_reason text,
  status text not null default 'submitted'
    check (status in ('submitted','review','estimated','approved','scheduled','delivered','rejected')),
  estimate_minor bigint,
  requested_by uuid references project_members(id),
  created_at timestamptz not null default now()
);

create table if not exists meeting_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  met_on date not null,
  attendees text[],
  body text,
  created_at timestamptz not null default now()
);
