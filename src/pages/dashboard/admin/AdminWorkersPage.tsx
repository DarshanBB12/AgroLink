import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { AdminListingsTable } from "@/components/common/AdminListingsTable";
import { PageHeader } from "@/components/common/StateViews";
import { useLanguage } from "@/contexts/LanguageContext";

const AdminWorkersPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="admin">
      <PageHeader title={t("app.admin.workersTitle")} subtitle={t("app.admin.listingsSubtitle")} />
      <AdminListingsTable type="worker" />
    </DashboardLayout>
  );
};
export default AdminWorkersPage;
