import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useCompanyLogo = (): string | null => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("general_settings")
        .select("value")
        .eq("key", "company_logo_url")
        .maybeSingle();
      if (data?.value) setLogoUrl(data.value);
    };
    fetch();
  }, []);

  return logoUrl;
};
