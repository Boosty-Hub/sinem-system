-- Junction table for multiple direct clients per prospect
CREATE TABLE public.prospect_clients (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prospect_id, client_id)
);

-- RLS
ALTER TABLE public.prospect_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access on prospect_clients"
  ON public.prospect_clients
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_prospect_clients_prospect ON public.prospect_clients(prospect_id);
CREATE INDEX idx_prospect_clients_client ON public.prospect_clients(client_id);