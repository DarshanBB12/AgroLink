import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type NavbarProps = {
  activePage?: "equipment" | "workers" | "fertilizer" | "dashboard";
  user?: {
    name: string;
    role: "farmer" | "worker" | "equipment_owner" | "admin";
    avatarInitials: string;
  };
  onLogout: () => void;
};

const NAV_LINKS = [
  { label: "Equipment", to: "/dashboard/farmer/equipment" },
  { label: "Workers", to: "/dashboard/farmer/workers" },
  { label: "Fertilizer", to: "/dashboard/farmer/fertilizers" },
  { label: "Dashboard", to: "/dashboard/farmer" },
] as const;

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function Navbar({ activePage, user, onLogout }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 transition-all duration-300",
        scrolled ? "shadow-[0_2px_16px_rgba(0,0,0,0.08)]" : "shadow-none",
      )}
    >
      <div className="mx-auto h-[62px] max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-xl bg-green-50">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-green-700" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 2a9 9 0 0 1 9 9c0 4-2.5 7.5-6 9l-3-5-3 5C5.5 19.5 3 16 3 11a9 9 0 0 1 9-9z" />
                <path d="M12 2v10" />
              </svg>
            </div>
            <p className="font-sora text-lg font-bold tracking-tight">
              <span className="text-gray-900">Agro</span>
              <span className="text-green-700">Link</span>
            </p>
          </Link>

          <nav className="hidden md:flex" aria-label="Primary navigation">
            <ul role="list" className="flex items-center gap-0.5">
              {NAV_LINKS.map((link) => {
                const isActive = link.label.toLowerCase() === activePage;
                return (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className={cn(
                        "relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150",
                        isActive
                          ? "text-green-800 font-semibold after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-green-600 after:rounded-full"
                          : "text-gray-500 hover:text-green-800 hover:bg-green-50",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="hidden sm:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-gray-100 border border-gray-200/60 cursor-pointer hover:bg-gray-200/60 transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-[11px] font-semibold text-green-800">
                  {user.avatarInitials}
                </div>
                <p className="max-w-[80px] truncate text-[13px] font-medium text-gray-800">{user.name}</p>
              </div>
            ) : null}

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 px-3.5 py-1.5 text-sm font-medium text-red-600 transition-all duration-150 hover:bg-red-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              <LogoutIcon />
              <span className="hidden xs:inline">Log Out</span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 md:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              <span className="relative flex h-5 w-5 flex-col items-center justify-center">
                <span
                  className={cn(
                    "absolute block h-0.5 w-5 rounded bg-gray-500 transition-all duration-250",
                    menuOpen ? "translate-y-[7px] rotate-45" : "-translate-y-[7px]",
                  )}
                />
                <span
                  className={cn(
                    "absolute block h-0.5 w-5 rounded bg-gray-500 transition-all duration-250",
                    menuOpen ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100",
                  )}
                />
                <span
                  className={cn(
                    "absolute block h-0.5 w-5 rounded bg-gray-500 transition-all duration-250",
                    menuOpen ? "-translate-y-[7px] -rotate-45" : "translate-y-[7px]",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/97 backdrop-blur-md px-4 pb-4 pt-2">
          <nav className="mb-3 flex flex-col gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  link.label.toLowerCase() === activePage
                    ? "text-green-800 bg-green-50 font-semibold"
                    : "text-gray-600 hover:text-green-800 hover:bg-green-50",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="my-2 border-t border-gray-100" />

          <div className="flex items-center justify-between pt-1">
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-800">
                  {user.avatarInitials}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role.replace("_", " ")}</p>
                </div>
              </div>
            ) : <div />}

            <button
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogoutIcon />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
