-- Phase 6. Additive.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references project_members(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  body text,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_member on notifications(member_id, read_at, created_at desc);

-- Homepage seed: five engagements, all admin-editable/deletable later.
-- Visibility 'public' so they list on portal.domanimedia.com immediately.
insert into clients (name, visibility, category)
select v.name, 'public', v.category from (values
  ('PrimeStake Corp', 'Investment Infrastructure'),
  ('Wekova', 'Consumer Technology'),
  ('Bumpa', 'Commerce Platform'),
  ('BlueOcean', 'Maritime Logistics'),
  ('Edy Consulting', 'Professional Services')
) as v(name, category)
where not exists (select 1 from clients c where c.name = v.name);

insert into projects (client_id, slug, name)
select c.id, v.slug, v.pname from (values
  ('PrimeStake Corp', 'primestakecorp', 'PrimeStake Platform'),
  ('Wekova', 'wekova', 'Wekova'),
  ('Bumpa', 'bumpa', 'Bumpa'),
  ('BlueOcean', 'blueocean', 'BlueOcean'),
  ('Edy Consulting', 'edy-consulting', 'Edy Consulting')
) as v(cname, slug, pname)
join clients c on c.name = v.cname
where not exists (select 1 from projects p where p.slug = v.slug);

-- Signature evidence lives on the approval row itself. The signatures table's
-- check constraint requires a document or module target, which approvals are not.
alter table approvals add column if not exists signed_name text;
alter table approvals add column if not exists signed_ip text;
