-- Seed platform admins. Password and authenticator are set on first login,
-- exactly like client accounts — nothing is provisioned with a shared secret.
-- Edit the addresses below before running.

insert into platform_admins (email, name) values
  ('thesomaachukwu@gmail.com', 'Somaa'),
  ('domanimediacreations@gmail.com', 'Domani Media')
on conflict (email) do nothing;

-- Verify:
-- select email, name, totp_enabled from platform_admins;
