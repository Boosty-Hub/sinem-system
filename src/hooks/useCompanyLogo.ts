import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { GeneralSettings } from "@/lib/types";

const DEFAULT_SETTINGS: GeneralSettings = { managerApprovalLimit: 300000 };

export const useCompanyLogo = (): string | null => {
  const [settings] = useLocalStorage<GeneralSettings>("sinem:general-settings", DEFAULT_SETTINGS);
  return settings.companyLogoUrl ?? null;
};
