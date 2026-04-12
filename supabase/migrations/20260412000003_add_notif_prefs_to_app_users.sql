alter table app_users
  add column if not exists notif_system boolean not null default true,
  add column if not exists notif_email  boolean not null default false;
