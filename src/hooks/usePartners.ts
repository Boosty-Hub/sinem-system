import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PARTNERS } from "@/lib/types";

/**
 * Hook to read/write partners from the `general_settings` table (key = "partners").
 * Shared across all users via Supabase.
 */
export function usePartners() {
  const [partners, setPartnersState] = useState<string[]>(DEFAULT_PARTNERS);
  const [loading, setLoading] = useState(true);

  const fetchPartners = useCallback(async () => {
    const { data } = await supabase
      .from("general_settings")
      .select("value")
      .eq("key", "partners")
      .single();

    if (data?.value) {
      try {
        setPartnersState(JSON.parse(data.value));
      } catch {
        setPartnersState(DEFAULT_PARTNERS);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const setPartners = useCallback(async (newPartners: string[]) => {
    setPartnersState(newPartners);
    await supabase
      .from("general_settings")
      .update({ value: JSON.stringify(newPartners) })
      .eq("key", "partners");
  }, []);

  return { partners, setPartners, loading, refetch: fetchPartners };
}
