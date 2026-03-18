-- Add invoiced_at column to track when an opportunity was invoiced
ALTER TABLE public.prospects
  ADD COLUMN invoiced_at date DEFAULT NULL;