import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Check,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageHeader } from "@/components/common/StateViews";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications, type Notification } from "@/contexts/NotificationsContext";
import { formatDateTime } from "@/lib/format";

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

const SEVERITY: Record<string, string> = {
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
};

const CATEGORIES = [
  { id: "all", label: "All Types" },
  { id: "booking", label: "Bookings & Rentals" },
  { id: "payment", label: "Payments" },
  { id: "message", label: "Messages" },
  { id: "weather", label: "Weather" },
  { id: "system", label: "System & Alerts" },
] as const;

export const NotificationsView = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    isLoading,
  } = useNotifications();

  const [tab, setTab] = useState<"all" | "unread" | "read">("all");
  const [category, setCategory] = useState<string>("all");

  const filteredList = useMemo(() => {
    return notifications.filter((n) => {
      // Status filter
      if (tab === "unread" && n.isRead) return false;
      if (tab === "read" && !n.isRead) return false;

      // Category filter
      if (category !== "all") {
        if (category === "booking" && !["booking", "equipment", "worker"].includes(n.type)) return false;
        if (category === "payment" && !["payment", "loan"].includes(n.type)) return false;
        if (category === "message" && n.type !== "message") return false;
        if (category === "weather" && n.type !== "weather") return false;
        if (category === "system" && n.type !== "system") return false;
      }

      return true;
    });
  }, [notifications, tab, category]);

  const open = async (n: Notification) => {
    if (!n.isRead) await markAsRead(n._id);
    if (n.type === "message" && n.metadata?.senderId) {
      navigate(`/dashboard/farmer/chat?with=${n.metadata.senderId}`);
      return;
    }
    if (n.link) navigate(n.link);
  };

  const hasReadNotifications = notifications.some((n) => n.isRead);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("app.pages.notificationsTitle")}
        subtitle={t("app.notifications.unreadCount", { n: unreadCount })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              {t("app.notifications.markAll")}
            </Button>
            {hasReadNotifications && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void clearAll(true)}
                className="gap-1.5 text-muted-foreground hover:text-destructive text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Read
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread" | "read")}>
          <TabsList>
            <TabsTrigger value="all">{t("app.common.all")}</TabsTrigger>
            <TabsTrigger value="unread" className="gap-1.5">
              <span>{t("app.notifications.unread")}</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0 hidden md:inline-block" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === cat.id
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {filteredList.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10 text-muted-foreground/60" />}
          title={isLoading ? t("app.common.loading") : t("app.notifications.emptyTitle")}
          hint={t("app.notifications.emptyHint")}
        />
      ) : (
        <div className="grid gap-3">
          {filteredList.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            const isMessage = n.type === "message";
            const senderAvatar = n.metadata?.senderAvatar as string | undefined;
            const senderName = n.metadata?.senderName as string | undefined;

            return (
              <article
                key={n._id}
                className={`agro-card transition-all hover:border-primary/40 ${n.isRead ? "bg-card/70" : "border-primary/50 bg-primary/[0.02]"}`}
                data-testid="notification-card"
              >
                <div className="agro-card-body flex-row items-start gap-3.5 p-4">
                  {/* Sender Avatar or Category Icon */}
                  <div className="shrink-0 pt-0.5">
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
                      <span className={`rounded-xl p-2.5 inline-flex items-center justify-center ${SEVERITY[n.severity] || SEVERITY.info}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                    )}
                  </div>

                  {/* Body click area */}
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left focus:outline-none"
                    onClick={() => void open(n)}
                  >
                    <div className="flex items-center gap-2">
                      <p className={`agro-card-title text-sm ${!n.isRead ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span
                          className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"
                          aria-label={t("app.notifications.unread")}
                        />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="agro-card-meta mt-1.5 text-[11px] text-muted-foreground/80">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </button>

                  {/* Individual actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        aria-label="Mark as read"
                        title="Mark as read"
                        onClick={() => void markAsRead(n._id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={t("app.common.delete")}
                      title={t("app.common.delete")}
                      onClick={() => void deleteNotification(n._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
