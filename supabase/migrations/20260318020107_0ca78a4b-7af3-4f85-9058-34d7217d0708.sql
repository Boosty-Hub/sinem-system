-- Add prospect_id to tasks table to allow linking tasks to CRM opportunities
ALTER TABLE public.tasks
  ADD COLUMN prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL DEFAULT NULL;