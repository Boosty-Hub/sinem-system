-- Add primary_contact_id to clients table to track which contact is the main one
ALTER TABLE public.clients
  ADD COLUMN primary_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL DEFAULT NULL;