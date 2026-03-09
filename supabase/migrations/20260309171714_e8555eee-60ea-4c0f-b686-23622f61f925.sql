
ALTER TABLE public.forecast_years 
  ADD COLUMN IF NOT EXISTS revenue_budget numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_year_revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_budget numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previous_year_margin numeric NOT NULL DEFAULT 0;
