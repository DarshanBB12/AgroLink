import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { OrdersView } from "@/components/orders/OrdersView";
import { useLanguage } from "@/contexts/LanguageContext";

const MyJobsPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="worker">
      <OrdersView perspective="provider" type="worker" title={t("app.pages.jobsTitle")} subtitle={t("app.pages.jobsSubtitle")} />
    </DashboardLayout>
  );
};
export default MyJobsPage;
