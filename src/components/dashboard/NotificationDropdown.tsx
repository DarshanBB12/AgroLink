import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  CreditCard,
  Landmark,
  MessageSquare,
  Megaphone,
  Package,
  Trash2,
  Cloud,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications, type Notification } from "@/contexts/NotificationsContext";

interface Props {
  role: string;
  notificationsPath: string;
}

const ICONS: Record<string, typeof Bell> = {
  booking: Package,
  equipment: Package,
  worker: Package,
  payment: CreditCard,
  loan: Landmark,
  message: MessageSquare,
  system: Megaphone,
  weather: Cloud,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900",
};

const getRelativeTime = (isoString: string): string => {
  try {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return "Yesterday";
    return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

export const NotificationDropdown = ({ role, notificationsPath }: Props) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    unreadMessagesCount,
    totalUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const displayedList = filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;
  const recentList = displayedList.slice(0, 7);

  const handleItemClick = async (n: Notification) => {
    if (!n.isRead) {
      await markAsRead(n._id);
    }
    setOpen(false);

    if (n.type === "message" && n.metadata?.senderId) {
      const roleSegment = role === "equipment_owner" ? "owner" : role || "farmer";
      navigate(`/dashboard/${roleSegment}/chat?with=${n.metadata.senderId}`);
      return;
    }

    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={t("dashboardNav.notifications")}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <>
              {/* WhatsApp-style live pulse ping */}
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-sm">
                {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[410px] p-0 shadow-2xl rounded-2xl border-border bg-popover text-popover-foreground z-50 overflow-hidden"
      >
        {/* Dropdown Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Notifications</h2>
            {totalUnreadCount > 0 && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {totalUnreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void markAllAsRead()}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filter tabs */}
        <div className="flex items-center gap-1 border-b border-border bg-background px-3 py-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === "unread"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Unread ({unreadCount})
          </button>
          {unreadMessagesCount > 0 && (
            <Link
              to={`/dashboard/${role === "equipment_owner" ? "owner" : role || "farmer"}/chat`}
              onClick={() => setOpen(false)}
              className="ml-auto flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            >
              <MessageSquare className="h-3 w-3" />
              <span>{unreadMessagesCount} unread chats</span>
            </Link>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
          {recentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-2.5">
                <Sparkles className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filter === "unread" ? "No unread notifications right now." : "No notifications to show."}
              </p>
            </div>
          ) : (
            recentList.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              const isMessage = n.type === "message";
              const senderAvatar = n.metadata?.senderAvatar as string | undefined;
              const senderName = n.metadata?.senderName as string | undefined;

              return (
                <div
                  key={n._id}
                  className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-muted/60 ${
                    n.isRead ? "opacity-85" : "bg-primary/[0.03]"
                  }`}
                  onClick={() => void handleItemClick(n)}
                >
                  {/* Sender Avatar or Category Icon */}
                  <div className="relative shrink-0">
                    {isMessage && senderAvatar && (senderAvatar.startsWith("data:") || senderAvatar.startsWith("http")) ? (
                      <img
                        src={senderAvatar}
                        alt={senderName || "Sender"}
                        className="h-10 w-10 rounded-full object-cover border border-border"
                      />
                    ) : isMessage && senderName ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-600 dark:text-emerald-400">
                        {senderName.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                          SEVERITY_COLORS[n.severity] || SEVERITY_COLORS.info
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    )}
                    {!n.isRead && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`truncate text-xs ${!n.isRead ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {getRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground mt-0.5">
                      {n.message}
                    </p>
                  </div>

                  {/* Delete action button on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteNotification(n._id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all rounded"
                    title="Delete"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Dropdown Footer */}
        <div className="border-t border-border bg-muted/30 px-3 py-2 text-center">
          <Link
            to={notificationsPath}
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline py-1"
          >
            <span>View all notifications</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};
