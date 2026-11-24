import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, BarChart3, Calendar, Check, ChevronDown, Cloud, CreditCard, Globe, Home, Languages, Leaf, LogOut, MapPin, MessageCircle, Package, Sprout, Settings, Star, SunMedium, MoonStar, Tractor, Users, Wallet, User, Menu, X, Wifi, WifiOff, ShoppingBag, Phone, IndianRupee, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LANGUAGES, useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useSocket } from "@/contexts/SocketContext";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardLayoutProps {
  children: ReactNode;
  role: "farmer" | "worker" | "admin" | "owner";
}

const navKeyMap: Record<string, string> = {
  Dashboard: "dashboard",
  Equipment: "equipment",
  Seeds: "seeds",
  Fertilizer: "fertilizer",
  "My Rentals": "myRentals",
  Workers: "workers",
  Bookings: "bookings",
  Payments: "payments",
  Chat: "chat",
  Weather: "weather",
  "GPS Map": "gpsMap",
  Notifications: "notifications",
  "My Listings": "myListings",
  "Sell Products": "sellProducts",
  "Rented Out": "rentedOut",
  Earnings: "earnings",
  Users: "users",
  Analytics: "analytics",
  Settings: "settings",
  "My Jobs": "myJobs",
  Reviews: "reviews",
  "EMI / Loans": "emi",
  Search: "search",
};

const roleNavItems = {
  farmer: [
    { icon: Home, label: "Dashboard", path: "/dashboard/farmer" },
    { icon: Search, label: "Search", path: "/dashboard/farmer/search" },
    { icon: MapPin, label: "GPS Map", path: "/dashboard/farmer/map" },
    { icon: Tractor, label: "Equipment", path: "/dashboard/farmer/equipment" },
    { icon: Sprout, label: "Seeds", path: "/dashboard/farmer/seeds" },
    { icon: Leaf, label: "Fertilizer", path: "/dashboard/farmer/fertilizers" },
    { icon: Package, label: "My Rentals", path: "/dashboard/farmer/rentals" },
    { icon: Users, label: "Workers", path: "/dashboard/farmer/workers" },
    { icon: Calendar, label: "Bookings", path: "/dashboard/farmer/bookings" },
    { icon: CreditCard, label: "Payments", path: "/dashboard/farmer/payments" },
    { icon: IndianRupee, label: "EMI / Loans", path: "/dashboard/farmer/emi" },
    { icon: MessageCircle, label: "Chat", path: "/dashboard/farmer/chat" },
    { icon: Cloud, label: "Weather", path: "/dashboard/farmer/weather" },
    { icon: Bell, label: "Notifications", path: "/dashboard/farmer/notifications" },
    { icon: Settings, label: "Settings", path: "/dashboard/farmer/settings" },
  ],
  owner: [
    { icon: Home, label: "Dashboard", path: "/dashboard/owner" },
    { icon: MapPin, label: "GPS Map", path: "/dashboard/owner/map" },
    { icon: Tractor, label: "My Listings", path: "/dashboard/owner/listings" },
    { icon: ShoppingBag, label: "Sell Products", path: "/dashboard/owner/sell-products" },
    { icon: Package, label: "Rented Out", path: "/dashboard/owner/rentals" },
    { icon: Wallet, label: "Earnings", path: "/dashboard/owner/earnings" },
    { icon: Cloud, label: "Weather", path: "/dashboard/owner/weather" },
    { icon: MessageCircle, label: "Chat", path: "/dashboard/owner/chat" },
    { icon: Bell, label: "Notifications", path: "/dashboard/owner/notifications" },
    { icon: Settings, label: "Settings", path: "/dashboard/owner/settings" },
  ],
  worker: [
    { icon: Home, label: "Dashboard", path: "/dashboard/worker" },
    { icon: MapPin, label: "GPS Map", path: "/dashboard/worker/map" },
    { icon: Calendar, label: "My Jobs", path: "/dashboard/worker/jobs" },
    { icon: Star, label: "Reviews", path: "/dashboard/worker/reviews" },
    { icon: CreditCard, label: "Earnings", path: "/dashboard/worker/earnings" },
    { icon: Cloud, label: "Weather", path: "/dashboard/worker/weather" },
    { icon: MessageCircle, label: "Chat", path: "/dashboard/worker/chat" },
    { icon: Bell, label: "Notifications", path: "/dashboard/worker/notifications" },
    { icon: Settings, label: "Settings", path: "/dashboard/worker/settings" },
  ],
  admin: [
    { icon: Home, label: "Dashboard", path: "/dashboard/admin" },
    { icon: MapPin, label: "GPS Map", path: "/dashboard/admin/map" },
    { icon: Users, label: "Users", path: "/dashboard/admin/users" },
    { icon: Tractor, label: "Equipment", path: "/dashboard/admin/equipment" },
    { icon: Users, label: "Workers", path: "/dashboard/admin/workers" },
    { icon: Calendar, label: "Bookings", path: "/dashboard/admin/bookings" },
    { icon: BarChart3, label: "Analytics", path: "/dashboard/admin/analytics" },
    { icon: CreditCard, label: "Payments", path: "/dashboard/admin/payments" },
    { icon: IndianRupee, label: "EMI / Loans", path: "/dashboard/admin/emi" },
    { icon: Cloud, label: "Weather", path: "/dashboard/admin/weather" },
    { icon: Bell, label: "Notifications", path: "/dashboard/admin/notifications" },
    { icon: Settings, label: "Settings", path: "/dashboard/admin/settings" },
  ],
};

const DashboardLayout = ({ children, role }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { unreadCount } = useNotifications();
  const { isConnected } = useSocket();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = roleNavItems[role];

  const resolvedUserName = user?.name || "User";
  const resolvedUserEmail = user?.email || "";
  const resolvedUserAvatar = user?.avatar || "";
  const notificationsPath = role === "owner" ? "/dashboard/owner/notifications" : role === "worker" ? "/dashboard/worker/notifications" : role === "admin" ? "/dashboard/admin/notifications" : "/dashboard/farmer/notifications";
  const currentLanguage = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const navLinks = (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        const isBell = item.icon === Bell;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{t(`dashboardNav.${navKeyMap[item.label] || item.label.toLowerCase().replace(/\s+/g, "")}`)}</span>
            {isBell && unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <>
      <div className="border-b border-sidebar-border px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-sidebar-primary" />
          <span className="text-lg font-bold text-sidebar-foreground">AgroLink</span>
        </Link>
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <span title={t("app.layout.connected")}><Wifi className="h-3.5 w-3.5 text-emerald-500" aria-label={t("app.layout.connected")} /></span>
          ) : (
            <span title={t("app.layout.disconnected")}><WifiOff className="h-3.5 w-3.5 text-muted-foreground" aria-label={t("app.layout.disconnected")} /></span>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1 px-3 py-3">{navLinks}</ScrollArea>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="w-8 h-8 overflow-hidden rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold text-sm">
            {resolvedUserAvatar.startsWith("data:") || resolvedUserAvatar.startsWith("http") ? <img src={resolvedUserAvatar} alt={resolvedUserName} className="h-full w-full object-cover" /> : resolvedUserName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{resolvedUserName}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{resolvedUserEmail}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-2 px-3">
          <button onClick={toggle} className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors" title={t("app.settings.darkMode")} aria-label={t("app.settings.darkMode")}>
            {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </button>
          {/* Language Switcher moved to top bar */}
          <button onClick={handleLogout} className="ml-auto text-sidebar-foreground/50 hover:text-destructive transition-colors" title={t("app.layout.logout")} aria-label={t("app.layout.logout")}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="fixed top-0 left-0 z-30 hidden h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
          <button
            className="lg:hidden text-foreground"
            onClick={() => setMobileOpen(true)}
            aria-label={t("app.layout.menu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground capitalize">
            {t(`dashboardTitles.${role}`)}
          </h1>
          <div className="flex items-center gap-2 ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-sm font-medium text-muted-foreground" title={t("dashboard.changeLanguage")}>
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{currentLanguage.label}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-44 p-1 z-50">
                {LANGUAGES.map((l) => (
                  <button key={l.code} onClick={() => setLang(l.code)} className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors flex items-center gap-2 ${lang === l.code ? "text-primary font-medium" : ""}`}>
                    {lang === l.code && <Check className="h-3 w-3" />}
                    <span>{l.native}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <NotificationDropdown role={role} notificationsPath={notificationsPath} />
          </div>
        </header>
        {/* Page content */}
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
