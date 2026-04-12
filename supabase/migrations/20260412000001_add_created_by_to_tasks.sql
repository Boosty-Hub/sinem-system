alter table tasks add column if not exists created_by uuid references app_users(id) on delete set null;
