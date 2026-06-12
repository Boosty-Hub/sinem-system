alter table quotation_snapshots
  add column if not exists distributed_costs jsonb default '[]'::jsonb;
