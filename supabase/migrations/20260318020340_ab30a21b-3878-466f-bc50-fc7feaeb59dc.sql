-- Create notifications table to store system-wide notifications for users
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  -- The user who should receive this notification
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  -- Type categorizes the notification for filtering and icon display
  type text NOT NULL DEFAULT 'info',
  -- Short title for the notification
  title text NOT NULL DEFAULT '',
  -- Longer description with context
  message text NOT NULL DEFAULT '',
  -- Whether the user has read this notification
  is_read boolean NOT NULL DEFAULT false,
  -- Optional link to navigate to when clicking the notification
  link text DEFAULT NULL,
  -- Optional reference to the entity that triggered the notification
  reference_id uuid DEFAULT NULL,
  reference_type text DEFAULT NULL,
  -- Who triggered this notification (optional)
  triggered_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.app_users WHERE auth_user_id = auth.uid()
    )
  );

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.app_users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.app_users WHERE auth_user_id = auth.uid()
    )
  );

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.app_users WHERE auth_user_id = auth.uid()
    )
  );

-- System/authenticated users can insert notifications for any user
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Index for fast lookups by user
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;