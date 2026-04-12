import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://fxsshhrxzjyjvfszaorq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4c3NoaHJ4emp5anZmc3phb3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyOTEwODQsImV4cCI6MjA4Njg2NzA4NH0.qJl7Dle-5iqFnNXir4mDPKR2c3-s8Og4e_6h6ZgquIE";

export interface CreateNotificationParams {
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
 * Fetch notification preferences for a user.
 * Returns { notif_system: true, notif_email: false } as safe defaults.
 */
const getUserPrefs = async (userId: string): Promise<{ notif_system: boolean; notif_email: boolean }> => {
  const { data } = await supabase
    .from("app_users")
    .select("notif_system, notif_email")
    .eq("id", userId)
    .maybeSingle();
  return {
    notif_system: data?.notif_system ?? true,
    notif_email: data?.notif_email ?? false,
  };
};

/**
 * Trigger email notification via edge function (fire-and-forget).
 */
const sendEmailNotification = async (params: CreateNotificationParams) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        userId: params.userId,
        title: params.title,
        message: params.message,
        link: params.link,
      }),
    });
  } catch (err) {
    console.error("Failed to send email notification:", err);
  }
};

/**
 * Create a notification for a specific user.
 * Respects the user's notif_system and notif_email preferences.
 */
export const createNotification = async (params: CreateNotificationParams) => {
  const prefs = await getUserPrefs(params.userId);

  // Insert into notification center only if system notifications are enabled
  if (prefs.notif_system) {
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
  }

  // Send email if email notifications are enabled
  if (prefs.notif_email) {
    await sendEmailNotification(params);
  }
};

/**
 * Notify multiple users at once, respecting each user's preferences.
 */
export const notifyUsers = async (
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) => {
  if (userIds.length === 0) return;
  await Promise.all(userIds.map((userId) => createNotification({ ...params, userId })));
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
  await notifyUsers(users.map((u) => u.id), params);
};
