alter table quotation_line_items
  add column if not exists cost_currency text default 'USD';
