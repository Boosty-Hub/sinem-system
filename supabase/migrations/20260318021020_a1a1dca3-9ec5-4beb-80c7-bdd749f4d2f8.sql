-- Add start_date column to projects for editable project start date
ALTER TABLE public.projects
  ADD COLUMN start_date date DEFAULT NULL;