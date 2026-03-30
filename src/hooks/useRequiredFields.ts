import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RequiredField {
  id: string;
  module: string;
  fieldKey: string;
  fieldLabel: string;
  isRequired: boolean;
  sortOrder: number;
}

export const useRequiredFields = (module?: string) => {
  const [fields, setFields] = useState<RequiredField[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    let query = supabase
      .from("required_fields" as any)
      .select("*")
      .order("sort_order");
    if (module) query = query.eq("module", module);
    const { data } = await query;
    setFields(
      (data ?? []).map((r: any) => ({
        id: r.id,
        module: r.module,
        fieldKey: r.field_key,
        fieldLabel: r.field_label,
        isRequired: r.is_required,
        sortOrder: r.sort_order,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, [module]);

  const isRequired = (fieldKey: string): boolean => {
    const f = fields.find((r) => r.fieldKey === fieldKey);
    return f?.isRequired ?? false;
  };

  const refetch = fetch;

  return { fields, loading, isRequired, refetch };
};
