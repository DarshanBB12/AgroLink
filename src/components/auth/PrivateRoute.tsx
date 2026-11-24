import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface PrivateRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export const roleDashboardMap: Record<string, string> = {
  farmer: "/dashboard/farmer",
  worker: "/dashboard/worker",
  admin: "/dashboard/admin",
  equipment_owner: "/dashboard/owner",
};

const PrivateRoute = ({ children, allowedRoles }: PrivateRouteProps) => {
  const { isAuthenticated, isLoading, user, sessionExpired } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status">
        <div className="flex flex-col items-center gap-3">
          <Leaf className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">{t("app.common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location, expired: sessionExpired }} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleDashboardMap[user.role] || "/dashboard/farmer"} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
