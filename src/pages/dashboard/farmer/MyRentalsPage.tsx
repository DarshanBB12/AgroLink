import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { OrdersView } from "@/components/orders/OrdersView";
import { useLanguage } from "@/contexts/LanguageContext";

const MyRentalsPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="farmer">
      <OrdersView perspective="farmer" type="equipment" title={t("app.pages.rentalsTitle")} subtitle={t("app.pages.rentalsSubtitle")} />
    </DashboardLayout>
  );
};
export default MyRentalsPage;
