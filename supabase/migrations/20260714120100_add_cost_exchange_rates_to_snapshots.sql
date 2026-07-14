-- Companion to 20260714120000_add_cost_exchange_rates.sql: carry the per-currency cost rate
-- map into version snapshots too, so restoring an older version of a quotation recovers the
-- exact rates that were used at that version, not just the single legacy exchange_rate.
alter table quotation_snapshots
  add column if not exists cost_exchange_rates jsonb not null default '{}'::jsonb;

comment on column quotation_snapshots.cost_exchange_rates is
  'Manual exchange rates per currency at the time this version was saved: { "DOP": 60, "EUR": 0.92 } = "1 USD = value key".';
