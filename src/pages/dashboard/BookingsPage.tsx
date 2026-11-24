import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { OrdersView } from "@/components/orders/OrdersView";
import { useLanguage } from "@/contexts/LanguageContext";

const BookingsPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="farmer">
      <OrdersView perspective="farmer" title={t("app.pages.bookingsTitle")} subtitle={t("app.pages.bookingsSubtitle")} />
    </DashboardLayout>
  );
};
export default BookingsPage;
