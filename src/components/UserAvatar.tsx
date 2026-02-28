import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { mockAppUsers } from "@/lib/mockData";
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

export default function UserAvatar({ userId, size = "sm", showTooltip = true, className }: UserAvatarProps) {
  const user = mockAppUsers.find((u) => u.id === userId);
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
