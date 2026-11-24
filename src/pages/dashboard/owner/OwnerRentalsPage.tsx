import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { OrdersView } from "@/components/orders/OrdersView";
import { useLanguage } from "@/contexts/LanguageContext";

const OwnerRentalsPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="owner">
      <OrdersView perspective="provider" type="equipment" title={t("app.pages.ownerRentalsTitle")} subtitle={t("app.pages.ownerRentalsSubtitle")} />
    </DashboardLayout>
  );
};
export default OwnerRentalsPage;
