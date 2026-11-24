import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Leaf, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgroLinkStickyNavbarProps {
  role: "farmer" | "worker" | "admin" | "owner";
  onLogout: () => void;
}

interface NavItem {
  label: string;
  path: string;
}

const AgroLinkStickyNavbar = ({ role, onLogout }: AgroLinkStickyNavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navItems = useMemo<NavItem[]>(() => {
    if (role === "farmer") {
      return [
        { label: "Equipment", path: "/dashboard/farmer/equipment" },
        { label: "Workers", path: "/dashboard/farmer/workers" },
        { label: "Fertilizer", path: "/dashboard/farmer/fertilizers" },
        { label: "Dashboard", path: "/dashboard/farmer" },
      ];
    }

    if (role === "worker") {
      return [
        { label: "Jobs", path: "/dashboard/worker/jobs" },
        { label: "Reviews", path: "/dashboard/worker/reviews" },
        { label: "Earnings", path: "/dashboard/worker/earnings" },
        { label: "Dashboard", path: "/dashboard/worker" },
      ];
    }

    if (role === "owner") {
      return [
        { label: "Listings", path: "/dashboard/owner/listings" },
        { label: "Rentals", path: "/dashboard/owner/rentals" },
        { label: "Earnings", path: "/dashboard/owner/earnings" },
        { label: "Dashboard", path: "/dashboard/owner" },
      ];
    }

    return [
      { label: "Users", path: "/dashboard/admin/users" },
      { label: "Equipment", path: "/dashboard/admin/equipment" },
      { label: "Bookings", path: "/dashboard/admin/bookings" },
      { label: "Dashboard", path: "/dashboard/admin" },
    ];
  }, [role]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 w-full z-[70] border-b border-gray-200/50 bg-white/80 backdrop-blur-md transition-all duration-300",
        scrolled ? "shadow-md" : "shadow-none",
      )}
    >
      <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">AgroLink</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-500 transition-all duration-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log Out</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-gray-200/70 bg-white/95 px-4 py-3 backdrop-blur md:hidden" aria-label="Mobile primary">
          <div className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-slate-100",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};

export default AgroLinkStickyNavbar;
