import { Suspense, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import PrivateRoute from "@/components/auth/PrivateRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { PageLoader } from "@/components/common/StateViews";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

import FarmerDashboard from "./pages/dashboard/FarmerDashboard";
import SearchPage from "./pages/dashboard/SearchPage";
import EquipmentPage from "./pages/dashboard/EquipmentPage";
import SeedsPage from "./pages/dashboard/SeedsPage";
import FertilizerPage from "./pages/dashboard/FertilizerPage";
import WorkersPage from "./pages/dashboard/WorkersPage";
import MyRentalsPage from "./pages/dashboard/farmer/MyRentalsPage";
import RentalDetailPage from "./pages/dashboard/farmer/RentalDetailPage";
import BookingsPage from "./pages/dashboard/BookingsPage";
import BookingConfirmationPage from "./pages/dashboard/BookingConfirmationPage";
import EMIPage from "./pages/dashboard/farmer/EMIPage";
import PaymentsPage from "./pages/dashboard/PaymentsPage";
import TransactionDetailPage from "./pages/dashboard/TransactionDetailPage";
import ChatPage from "./pages/dashboard/ChatPage";
import WeatherPage from "./pages/dashboard/WeatherPage";
import GpsMapPage from "./pages/dashboard/GpsMapPage";
import NotificationsPage from "./pages/dashboard/NotificationsPage";
import FarmerSettingsPage from "./pages/dashboard/farmer/FarmerSettingsPage";

import WorkerDashboard from "./pages/dashboard/WorkerDashboard";
import MyJobsPage from "./pages/dashboard/worker/MyJobsPage";
import ReviewsPage from "./pages/dashboard/worker/ReviewsPage";
import EarningsPage from "./pages/dashboard/worker/EarningsPage";
import WorkerChatPage from "./pages/dashboard/worker/WorkerChatPage";
import WorkerNotificationsPage from "./pages/dashboard/worker/WorkerNotificationsPage";
import WorkerSettingsPage from "./pages/dashboard/worker/WorkerSettingsPage";

import OwnerDashboard from "./pages/dashboard/OwnerDashboard";
import MyListingsPage from "./pages/dashboard/owner/MyListingsPage";
import OwnerSellProductsPage from "./pages/dashboard/owner/OwnerSellProductsPage";
import OwnerRentalsPage from "./pages/dashboard/owner/OwnerRentalsPage";
import OwnerEarningsPage from "./pages/dashboard/owner/OwnerEarningsPage";
import OwnerNotificationsPage from "./pages/dashboard/owner/OwnerNotificationsPage";
import OwnerSettingsPage from "./pages/dashboard/owner/OwnerSettingsPage";

import AdminDashboard from "./pages/dashboard/AdminDashboard";
import AdminUsersPage from "./pages/dashboard/admin/AdminUsersPage";
import AdminEquipmentPage from "./pages/dashboard/admin/AdminEquipmentPage";
import AdminWorkersPage from "./pages/dashboard/admin/AdminWorkersPage";
import AdminBookingsPage from "./pages/dashboard/admin/AdminBookingsPage";
import AdminAnalyticsPage from "./pages/dashboard/admin/AdminAnalyticsPage";
import AdminPaymentsPage from "./pages/dashboard/admin/AdminPaymentsPage";
import AdminEMIPage from "./pages/dashboard/admin/AdminEMIPage";
import AdminNotificationsPage from "./pages/dashboard/admin/AdminNotificationsPage";
import AdminSettingsPage from "./pages/dashboard/admin/AdminSettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retrying a 4xx can never succeed; only retry network/5xx problems.
      retry: (count, error) => !(axios.isAxiosError(error) && error.response && error.response.status < 500) && count < 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Cached API data belongs to ONE user. Wipe it whenever the signed-in user changes (login, logout, switch account)
// so a new account can never briefly see another account's cached bookings, payments or notifications.
const CacheGuard = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const id = user?.id ?? null;
    if (previous.current !== undefined && previous.current !== id) qc.clear();
    previous.current = id;
  }, [user?.id, qc]);
  return null;
};

const guard = (roles: string[], element: JSX.Element) => <PrivateRoute allowedRoles={roles as never}>{element}</PrivateRoute>;

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CacheGuard />
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <SocketProvider>
                  <NotificationsProvider>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/dashboard/farmer" element={guard(["farmer"], <FarmerDashboard />)} />
                        <Route path="/dashboard/farmer/search" element={guard(["farmer"], <SearchPage />)} />
                        <Route path="/dashboard/farmer/map" element={guard(["farmer"], <GpsMapPage />)} />
                        <Route path="/dashboard/farmer/equipment" element={guard(["farmer"], <EquipmentPage />)} />
                        <Route path="/dashboard/farmer/seeds" element={guard(["farmer"], <SeedsPage />)} />
                        <Route path="/dashboard/farmer/fertilizers" element={guard(["farmer"], <FertilizerPage />)} />
                        <Route path="/dashboard/farmer/workers" element={guard(["farmer"], <WorkersPage />)} />
                        <Route path="/dashboard/farmer/rentals" element={guard(["farmer"], <MyRentalsPage />)} />
                        <Route path="/dashboard/farmer/rentals/:id" element={guard(["farmer"], <RentalDetailPage />)} />
                        <Route path="/dashboard/farmer/bookings" element={guard(["farmer"], <BookingsPage />)} />
                        <Route path="/dashboard/farmer/bookings/confirm" element={guard(["farmer"], <BookingConfirmationPage />)} />
                        <Route path="/dashboard/farmer/booking-confirmed" element={guard(["farmer"], <BookingConfirmationPage />)} />
                        <Route path="/dashboard/farmer/emi" element={guard(["farmer"], <EMIPage />)} />
                        <Route path="/dashboard/farmer/payments" element={guard(["farmer"], <PaymentsPage />)} />
                        <Route path="/dashboard/farmer/payments/:id" element={guard(["farmer"], <TransactionDetailPage />)} />
                        <Route path="/dashboard/farmer/chat" element={guard(["farmer"], <ChatPage />)} />
                        <Route path="/dashboard/farmer/weather" element={guard(["farmer"], <WeatherPage />)} />
                        <Route path="/dashboard/farmer/notifications" element={guard(["farmer"], <NotificationsPage />)} />
                        <Route path="/dashboard/farmer/settings" element={guard(["farmer"], <FarmerSettingsPage />)} />
                        <Route path="/dashboard/worker" element={guard(["worker"], <WorkerDashboard />)} />
                        <Route path="/dashboard/worker/map" element={guard(["worker"], <GpsMapPage />)} />
                        <Route path="/dashboard/worker/weather" element={guard(["worker"], <WeatherPage />)} />
                        <Route path="/dashboard/worker/jobs" element={guard(["worker"], <MyJobsPage />)} />
                        <Route path="/dashboard/worker/reviews" element={guard(["worker"], <ReviewsPage />)} />
                        <Route path="/dashboard/worker/earnings" element={guard(["worker"], <EarningsPage />)} />
                        <Route path="/dashboard/worker/chat" element={guard(["worker"], <WorkerChatPage />)} />
                        <Route path="/dashboard/worker/notifications" element={guard(["worker"], <WorkerNotificationsPage />)} />
                        <Route path="/dashboard/worker/settings" element={guard(["worker"], <WorkerSettingsPage />)} />
                        <Route path="/dashboard/owner" element={guard(["equipment_owner"], <OwnerDashboard />)} />
                        <Route path="/dashboard/owner/map" element={guard(["equipment_owner"], <GpsMapPage />)} />
                        <Route path="/dashboard/owner/weather" element={guard(["equipment_owner"], <WeatherPage />)} />
                        <Route path="/dashboard/owner/listings" element={guard(["equipment_owner"], <MyListingsPage />)} />
                        <Route path="/dashboard/owner/sell-products" element={guard(["equipment_owner"], <OwnerSellProductsPage />)} />
                        <Route path="/dashboard/owner/rentals" element={guard(["equipment_owner"], <OwnerRentalsPage />)} />
                        <Route path="/dashboard/owner/earnings" element={guard(["equipment_owner"], <OwnerEarningsPage />)} />
                        <Route path="/dashboard/owner/chat" element={guard(["equipment_owner"], <ChatPage />)} />
                        <Route path="/dashboard/owner/notifications" element={guard(["equipment_owner"], <OwnerNotificationsPage />)} />
                        <Route path="/dashboard/owner/settings" element={guard(["equipment_owner"], <OwnerSettingsPage />)} />
                        <Route path="/dashboard/admin" element={guard(["admin"], <AdminDashboard />)} />
                        <Route path="/dashboard/admin/map" element={guard(["admin"], <GpsMapPage />)} />
                        <Route path="/dashboard/admin/weather" element={guard(["admin"], <WeatherPage />)} />
                        <Route path="/dashboard/admin/users" element={guard(["admin"], <AdminUsersPage />)} />
                        <Route path="/dashboard/admin/equipment" element={guard(["admin"], <AdminEquipmentPage />)} />
                        <Route path="/dashboard/admin/workers" element={guard(["admin"], <AdminWorkersPage />)} />
                        <Route path="/dashboard/admin/bookings" element={guard(["admin"], <AdminBookingsPage />)} />
                        <Route path="/dashboard/admin/analytics" element={guard(["admin"], <AdminAnalyticsPage />)} />
                        <Route path="/dashboard/admin/payments" element={guard(["admin"], <AdminPaymentsPage />)} />
                        <Route path="/dashboard/admin/emi" element={guard(["admin"], <AdminEMIPage />)} />
                        <Route path="/dashboard/admin/notifications" element={guard(["admin"], <AdminNotificationsPage />)} />
                        <Route path="/dashboard/admin/settings" element={guard(["admin"], <AdminSettingsPage />)} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </NotificationsProvider>
                </SocketProvider>
              </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
