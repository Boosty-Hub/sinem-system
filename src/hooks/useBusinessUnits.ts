import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessUnit {
  key: string;
  label: string;
}

const DEFAULT_BUS: BusinessUnit[] = [
  { key: "SE", label: "SE - Smart Infrastructure" },
  { key: "DI", label: "DI - Digital Industries" },
  { key: "SI", label: "SI - Smart Industry" },
  { key: "BT", label: "BT - Building Technologies" },
  { key: "EA", label: "EA - Electrification and Automation" },
  { key: "EP", label: "EP - Electrical Products" },
  { key: "HP", label: "HP - High Power" },
  { key: "MV", label: "MV - Medium Voltage" },
  { key: "LV", label: "LV - Low Voltage" },
  { key: "MO", label: "MO - Mobility" },
  { key: "TR", label: "TR - Trench" },
  { key: "IN", label: "IN - Innomotics" },
];

/**
 * Hook to read/write business units from `general_settings` (key = "business_units").
 */
export function useBusinessUnits() {
  const [businessUnits, setBUState] = useState<BusinessUnit[]>(DEFAULT_BUS);
  const [loading, setLoading] = useState(true);

  const fetchBUs = useCallback(async () => {
    const { data } = await supabase
      .from("general_settings")
      .select("value")
      .eq("key", "business_units")
      .single();

    if (data?.value) {
      try {
        setBUState(JSON.parse(data.value));
      } catch {
        setBUState(DEFAULT_BUS);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBUs();
  }, [fetchBUs]);

  const setBusinessUnits = useCallback(async (newBUs: BusinessUnit[]) => {
    setBUState(newBUs);
    await supabase
      .from("general_settings")
      .update({ value: JSON.stringify(newBUs) })
      .eq("key", "business_units");
  }, []);

  return { businessUnits, setBusinessUnits, loading, refetch: fetchBUs };
}
