import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell, CreditCard, Landmark, MessageSquare, Package, Megaphone, Cloud, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { playNotificationSound, showBrowserNotification } from "@/lib/notificationSound";

export interface Notification {
  _id: string;
  userId: string;
  senderId?: string | { _id: string; name: string; avatar?: string } | null;
  type: "booking" | "message" | "payment" | "system" | "weather" | "crop" | "equipment" | "worker" | "loan";
  title: string;
  message: string;
  severity: "info" | "success" | "warning" | "critical";
  isRead: boolean;
  readAt: string | null;
  link: string | null;
  metadata?: {
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
    orderId?: string;
    transactionId?: string;
    [key: string]: unknown;
  };
  createdAt: string;
}

interface IncomingChatMessage {
  _id: string;
  senderId: string | { _id: string; name: string; role?: string; avatar?: string };
  receiverId: string;
  message: string;
  createdAt: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  unreadMessagesCount: number;
  totalUnreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: (readOnly?: boolean) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  unreadMessagesCount: 0,
  totalUnreadCount: 0,
  isLoading: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  clearAll: async () => {},
});

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const fetchRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Setup multi-tab communication via BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("agrolink_notifications_sync");
    broadcastRef.current = channel;

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "READ_ONE") {
        setNotifications((prev) =>
          prev.map((n) => (n._id === data.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } else if (data.type === "READ_ALL") {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
        setUnreadCount(0);
      } else if (data.type === "DELETE_ONE") {
        setNotifications((prev) => {
          const removed = prev.find((n) => n._id === data.id);
          if (removed && !removed.isRead) setUnreadCount((c) => Math.max(0, c - 1));
          return prev.filter((n) => n._id !== data.id);
        });
      } else if (data.type === "CLEAR_ALL") {
        if (data.readOnly) {
          setNotifications((prev) => prev.filter((n) => !n.isRead));
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      } else if (data.type === "REFRESH") {
        void fetchRef.current();
      }
    };

    return () => {
      channel.close();
      broadcastRef.current = null;
    };
  }, []);

  const notifyOtherTabs = (payload: unknown) => {
    try {
      broadcastRef.current?.postMessage(payload);
    } catch {
      // Ignore broadcast errors
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [notifRes, msgRes] = await Promise.allSettled([
        api.get("/notifications"),
        api.get("/messages/unread-count"),
      ]);

      if (notifRes.status === "fulfilled" && notifRes.value.data.success) {
        setNotifications(notifRes.value.data.notifications || []);
        setUnreadCount(notifRes.value.data.unreadCount || 0);
      }
      if (msgRes.status === "fulfilled" && msgRes.value.data.success) {
        setUnreadMessagesCount(msgRes.value.data.count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);
  fetchRef.current = fetchNotifications;

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      notifyOtherTabs({ type: "READ_ONE", id });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      notifyOtherTabs({ type: "READ_ALL" });
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => {
        const removed = prev.find((n) => n._id === id);
        if (removed && !removed.isRead) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n._id !== id);
      });
      notifyOtherTabs({ type: "DELETE_ONE", id });
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  }, []);

  const clearAll = useCallback(async (readOnly = false) => {
    try {
      await api.delete(`/notifications/clear-all${readOnly ? "?readOnly=true" : ""}`);
      if (readOnly) {
        setNotifications((prev) => prev.filter((n) => !n.isRead));
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
      notifyOtherTabs({ type: "CLEAR_ALL", readOnly });
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  }, []);

  // Sync on initial auth & on socket reconnect
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setUnreadMessagesCount(0);
      return;
    }
    fetchNotifications();
  }, [fetchNotifications, isAuthenticated]);

  useEffect(() => {
    if (isConnected) {
      fetchNotifications();
    }
  }, [isConnected, fetchNotifications]);

  // Real-time socket event handling
  useEffect(() => {
    if (!socket) return;

    // 1. New System/Booking/Payment/Message Notification
    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => (prev.some((n) => n._id === notification._id) ? prev : [notification, ...prev]));
      setUnreadCount((prev) => prev + 1);

      // Play audio chime if user preference allows (default true)
      const userSettings = user?.settings?.notifications;
      if (userSettings?.sound !== false) {
        playNotificationSound();
      }

      // Show native browser desktop notification if enabled
      if (userSettings?.desktop === true) {
        showBrowserNotification(
          notification.title,
          {
            body: notification.message,
            tag: notification._id,
          },
          () => {
            if (notification.link) navigate(notification.link);
          }
        );
      }

      // Display WhatsApp-style interactive toast
      toast.custom(
        (t) => {
          const isMsg = notification.type === "message";
          const Icon =
            notification.type === "booking"
              ? Package
              : notification.type === "payment"
              ? CreditCard
              : notification.type === "loan"
              ? Landmark
              : notification.type === "weather"
              ? Cloud
              : notification.type === "system"
              ? Megaphone
              : MessageSquare;

          return (
            <div
              className="flex w-full max-w-md items-center gap-3 rounded-xl border border-primary/20 bg-background/95 p-3.5 shadow-xl backdrop-blur-md transition-all hover:bg-muted/80 cursor-pointer"
              onClick={() => {
                toast.dismiss(t);
                if (notification.link) navigate(notification.link);
              }}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                {isMsg && notification.metadata?.senderName ? (
                  <span className="text-sm font-bold">
                    {String(notification.metadata.senderName).charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-sm font-semibold text-foreground">{notification.title}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">Just now</span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground mt-0.5">{notification.message}</p>
              </div>
              <div className="flex shrink-0 items-center text-primary">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          );
        },
        { duration: 5000 }
      );
    };

    // 2. Incoming chat message
    const handleReceiveMessage = (msg: IncomingChatMessage) => {
      const senderId = typeof msg.senderId === "string" ? msg.senderId : msg.senderId?._id;
      const senderName = typeof msg.senderId === "object" ? msg.senderId.name : "Contact";
      const senderRole = typeof msg.senderId === "object" ? msg.senderId.role || "user" : "user";
      const senderAvatar = typeof msg.senderId === "object" ? msg.senderId.avatar : "";

      setUnreadMessagesCount((c) => c + 1);

      // Check if user is actively in ChatPage with this exact sender open
      const queryParams = new URLSearchParams(location.search);
      const isChatPage = location.pathname.includes("/chat");
      const activeContact = queryParams.get("with") || queryParams.get("contact");
      const isCurrentlyLookingAtThisChat = isChatPage && activeContact === senderId && document.hasFocus();

      if (isCurrentlyLookingAtThisChat) {
        // Active in conversation: don't show duplicate popup toast
        return;
      }

      // Play audio chime
      const userSettings = user?.settings?.notifications;
      if (userSettings?.sound !== false) {
        playNotificationSound();
      }

      // Show native desktop notification
      if (userSettings?.desktop === true) {
        showBrowserNotification(
          `Message from ${senderName}`,
          {
            body: msg.message,
            tag: `msg-${senderId}`,
          },
          () => {
            const rolePath = user?.role === "equipment_owner" ? "owner" : user?.role || "farmer";
            navigate(`/dashboard/${rolePath}/chat?with=${senderId}`);
          }
        );
      }

      // WhatsApp-style message toast banner
      toast.custom(
        (t) => {
          const rolePath = user?.role === "equipment_owner" ? "owner" : user?.role || "farmer";
          const initials = senderName ? senderName.charAt(0).toUpperCase() : "M";

          return (
            <div
              className="flex w-full max-w-md items-center gap-3 rounded-2xl border-2 border-emerald-500/30 bg-card p-3.5 shadow-2xl backdrop-blur-md transition-all hover:border-emerald-500 cursor-pointer"
              onClick={() => {
                toast.dismiss(t);
                navigate(`/dashboard/${rolePath}/chat?with=${senderId}`);
              }}
            >
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-600 dark:text-emerald-400">
                {senderAvatar && (senderAvatar.startsWith("data:") || senderAvatar.startsWith("http")) ? (
                  <img src={senderAvatar} alt={senderName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate text-sm font-bold text-foreground">{senderName}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                      {senderRole.replace("_", " ")}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Now</span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground mt-0.5 font-normal">{msg.message}</p>
              </div>
              <div className="flex shrink-0 items-center rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Reply
              </div>
            </div>
          );
        },
        { duration: 6000 }
      );
    };

    const handleNotificationCount = (data: { unreadCount: number }) => {
      if (typeof data?.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    };

    const handleMessagesUnreadCount = (data: { count: number }) => {
      if (typeof data?.count === "number") {
        setUnreadMessagesCount(data.count);
      }
    };

    const handleMessagesRead = () => {
      // Refresh count on read receipt
      api.get("/messages/unread-count")
        .then((r) => r.data?.success && setUnreadMessagesCount(r.data.count || 0))
        .catch(() => {});
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:count", handleNotificationCount);
    socket.on("message:receive", handleReceiveMessage);
    socket.on("messages:unread_count", handleMessagesUnreadCount);
    socket.on("messages:read", handleMessagesRead);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:count", handleNotificationCount);
      socket.off("message:receive", handleReceiveMessage);
      socket.off("messages:unread_count", handleMessagesUnreadCount);
      socket.off("messages:read", handleMessagesRead);
    };
  }, [socket, user, location.pathname, location.search, navigate]);

  const totalUnreadCount = unreadCount + unreadMessagesCount;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadMessagesCount,
        totalUnreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
