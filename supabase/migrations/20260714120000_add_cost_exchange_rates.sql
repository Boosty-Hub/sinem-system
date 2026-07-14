-- Per-currency manual exchange rates for a quotation.
-- Shape: { "DOP": 60, "EUR": 0.92 } meaning "1 USD = <value> <key>".
-- Replaces the single `exchange_rate` column as the source of truth for converting
-- item costs to USD, so a quotation can mix cost currencies (e.g. one item in DOP
-- and another in EUR) and carry a rate for each.
--
-- `exchange_rate` is kept and stays the billing-currency rate (1 USD = exchange_rate
-- <currency>), which the public offer and the quotation list still use to display the
-- total in the billing currency. It is derived from this map on save.
alter table quotations
  add column if not exists cost_exchange_rates jsonb not null default '{}'::jsonb;

comment on column quotations.cost_exchange_rates is
  'Manual exchange rates per currency: { "DOP": 60, "EUR": 0.92 } = "1 USD = value key". Used to convert item costs to USD.';
