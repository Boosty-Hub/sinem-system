import { supabase } from "@/integrations/supabase/client";

interface CreateNotificationParams {
  userId: string;
  type: "crm" | "task" | "project" | "quotation" | "client" | "info" | "mention";
  title: string;
  message: string;
  link?: string;
  referenceId?: string;
  referenceType?: string;
  triggeredBy?: string;
}

/**
 * Create a notification for a specific user.
 */
export const createNotification = async (params: CreateNotificationParams) => {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link ?? null,
    reference_id: params.referenceId ?? null,
    reference_type: params.referenceType ?? null,
    triggered_by: params.triggeredBy ?? null,
  } as any);
  if (error) console.error("Failed to create notification:", error);
};

/**
 * Notify multiple users at once.
 */
export const notifyUsers = async (
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) => {
  if (userIds.length === 0) return;
  const rows = userIds.map((userId) => ({
    user_id: userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link ?? null,
    reference_id: params.referenceId ?? null,
    reference_type: params.referenceType ?? null,
    triggered_by: params.triggeredBy ?? null,
  }));
  const { error } = await supabase.from("notifications").insert(rows as any);
  if (error) console.error("Failed to create notifications:", error);
};

/**
 * Notify all active users except the triggering user.
 */
export const notifyAllExcept = async (
  excludeUserId: string,
  params: Omit<CreateNotificationParams, "userId">
) => {
  const { data: users } = await supabase
    .from("app_users")
    .select("id")
    .eq("status", "activo")
    .neq("id", excludeUserId);
  if (!users || users.length === 0) return;
  await notifyUsers(
    users.map((u) => u.id),
    params
  );
};
