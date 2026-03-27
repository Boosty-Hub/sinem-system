import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

interface UserAvatarProps {
  userId?: string;
  size?: "xs" | "sm" | "md";
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
};

// Module-level cache so we fetch app_users only once
let cachedUsers: { id: string; name: string; avatarUrl: string }[] | null = null;
let fetchPromise: Promise<void> | null = null;

async function ensureUsers(): Promise<void> {
  if (cachedUsers) return;
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    const { data } = await supabase.from("app_users").select("id, name, avatar_url");
    cachedUsers = (data ?? []).map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatar_url ?? "" }));
  })();
  return fetchPromise;
}

export default function UserAvatar({ userId, size = "sm", showTooltip = true, className }: UserAvatarProps) {
  const [user, setUser] = useState<{ id: string; name: string; avatarUrl: string } | null>(
    cachedUsers?.find((u) => u.id === userId) ?? null
  );

  useEffect(() => {
    if (!userId) return;
    if (cachedUsers) {
      setUser(cachedUsers.find((u) => u.id === userId) ?? null);
      return;
    }
    ensureUsers().then(() => {
      setUser(cachedUsers?.find((u) => u.id === userId) ?? null);
    });
  }, [userId]);

  if (!user) return null;

  const avatar = (
    <Avatar className={cn(sizeClasses[size], className)}>
      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[inherit]">
        {getInitials(user.name)}
      </AvatarFallback>
    </Avatar>
  );

  if (!showTooltip) return avatar;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{avatar}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {user.name}
      </TooltipContent>
    </Tooltip>
  );
}
