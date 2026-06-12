alter table quotation_snapshots
  add column if not exists apply_itbis        boolean default true,
  add column if not exists itbis_percent      numeric default 18,
  add column if not exists currency           text    default 'USD',
  add column if not exists exchange_rate      numeric default 1,
  add column if not exists client             jsonb   default '{}'::jsonb,
  add column if not exists partner            text    default 'Siemens',
  add column if not exists show_partner_text  boolean default true,
  add column if not exists proposal_texts     jsonb   default '{}'::jsonb,
  add column if not exists show_item_subtotals boolean default false,
  add column if not exists language           text    default 'es';
