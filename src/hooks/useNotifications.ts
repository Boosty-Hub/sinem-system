import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/AuthContext";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  referenceId: string | null;
  referenceType: string | null;
  triggeredBy: string | null;
  createdAt: string;
}

const mapRow = (row: any): Notification => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title,
  message: row.message,
  isRead: row.is_read,
  link: row.link,
  referenceId: row.reference_id,
  referenceType: row.reference_type,
  triggeredBy: row.triggered_by,
  createdAt: row.created_at,
});

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [appUserId, setAppUserId] = useState<string | null>(null);

  // Resolve auth user → app_users id
  useEffect(() => {
    if (!user) { setAppUserId(null); return; }
    supabase
      .from("app_users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()
      .then(({ data }) => setAppUserId(data?.id ?? null));
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!appUserId) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", appUserId)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data ?? []).map(mapRow));
    setLoading(false);
  }, [appUserId]);

  useEffect(() => {
    if (!appUserId) return;
    fetchNotifications();

    // Real-time subscription for new notifications
    const channel = supabase
      .channel(`notifications:${appUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${appUserId}`,
        },
        (payload) => {
          setNotifications((prev) => [mapRow(payload.new), ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appUserId, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!appUserId) return;
    await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", appUserId).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = async () => {
    if (!appUserId) return;
    await supabase.from("notifications").delete().eq("user_id", appUserId);
    setNotifications([]);
  };

  return {
    notifications,
    unreadCount,
    loading,
    appUserId,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refresh: fetchNotifications,
  };
};
