-- Phase 7. Additive.

alter table projects add column if not exists codename text;
alter table project_members add column if not exists display_name text;

-- Codenames: celestial, future-facing, on-brand. Admin can change later.
update projects set codename = 'AURORA'   where slug = 'infinitswap'    and codename is null;
update projects set codename = 'MERIDIAN' where slug = 'primestakecorp' and codename is null;
update projects set codename = 'SOLSTICE' where slug = 'wekova'         and codename is null;
update projects set codename = 'ZENITH'   where slug = 'bumpa'          and codename is null;
update projects set codename = 'VEGA'     where slug = 'blueocean'      and codename is null;
update projects set codename = 'LYRA'     where slug = 'edy-consulting' and codename is null;

-- Ensure Infinitswap lists on the homepage (as its codename only).
update clients set visibility = 'public'
where id = (select client_id from projects where slug = 'infinitswap');

-- Any project still without a codename gets one derived from its id.
update projects set codename = 'ORBIT-' || upper(substr(id::text, 1, 4)) where codename is null;
