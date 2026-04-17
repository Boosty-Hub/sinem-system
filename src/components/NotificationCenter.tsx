import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Bell, Check, CheckCheck, Trash2,
  ListTodo, FolderKanban, FileText, Building2,
  AtSign, Info, Target, X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface TypeConfig {
  icon: typeof Bell;
  iconColor: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
}

const typeConfig: Record<string, TypeConfig> = {
  crm: {
    icon: Target,
    iconColor: "text-blue-500",
    badgeLabel: "CRM",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-600",
    dotColor: "bg-blue-500",
  },
  task: {
    icon: ListTodo,
    iconColor: "text-amber-500",
    badgeLabel: "Tareas",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-600",
    dotColor: "bg-amber-500",
  },
  project: {
    icon: FolderKanban,
    iconColor: "text-teal-500",
    badgeLabel: "Proyectos",
    badgeBg: "bg-teal-500/10",
    badgeText: "text-teal-600",
    dotColor: "bg-teal-500",
  },
  quotation: {
    icon: FileText,
    iconColor: "text-purple-500",
    badgeLabel: "Cotizaciones",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-600",
    dotColor: "bg-purple-500",
  },
  client: {
    icon: Building2,
    iconColor: "text-green-500",
    badgeLabel: "Clientes",
    badgeBg: "bg-green-500/10",
    badgeText: "text-green-600",
    dotColor: "bg-green-500",
  },
  mention: {
    icon: AtSign,
    iconColor: "text-orange-500",
    badgeLabel: "Mención",
    badgeBg: "bg-orange-500/10",
    badgeText: "text-orange-600",
    dotColor: "bg-orange-500",
  },
  info: {
    icon: Info,
    iconColor: "text-muted-foreground",
    badgeLabel: "Sistema",
    badgeBg: "bg-muted",
    badgeText: "text-muted-foreground",
    dotColor: "bg-muted-foreground",
  },
};

const fallbackConfig = typeConfig.info;

const NotificationCenter = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleClick = (notif: Notification) => {
    if (!notif.isRead) markAsRead(notif.id);
    setOpen(false);
    if (notif.link) {
      // Use replace:false + state trick to force re-evaluation of search params
      // even when already on the same path
      navigate(notif.link, { replace: false, state: { ts: Date.now() } });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[400px] p-0 flex flex-col" style={{ maxHeight: "520px" }} sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Leer todas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={clearAll}
                title="Eliminar todas"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto" style={{ maxHeight: "460px" }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-9 w-9 mb-3 opacity-20" />
              <p className="text-sm font-medium">Sin notificaciones</p>
              <p className="text-xs opacity-60 mt-1">Todo al día</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((notif) => {
                const cfg = typeConfig[notif.type] ?? fallbackConfig;
                const Icon = cfg.icon;
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      !notif.isRead ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleClick(notif)}
                  >
                    {/* Icon with colored background */}
                    <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.badgeBg}`}>
                      <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Module badge + actions row */}
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                          {cfg.badgeLabel}
                        </span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {!notif.isRead && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                              className="p-0.5 hover:bg-muted rounded"
                              title="Marcar como leída"
                            >
                              <Check className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                            className="p-0.5 hover:bg-muted rounded"
                            title="Eliminar"
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <p className={`text-sm leading-snug ${!notif.isRead ? "font-semibold" : "font-medium"}`}>
                        {notif.title}
                      </p>

                      {/* Message */}
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Time */}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: es })}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notif.isRead && (
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${cfg.dotColor}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
