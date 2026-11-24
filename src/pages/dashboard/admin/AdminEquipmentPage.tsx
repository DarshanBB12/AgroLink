import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { AdminListingsTable } from "@/components/common/AdminListingsTable";
import { PageHeader } from "@/components/common/StateViews";
import { useLanguage } from "@/contexts/LanguageContext";

const AdminEquipmentPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="admin">
      <PageHeader title={t("app.admin.equipmentTitle")} subtitle={t("app.admin.listingsSubtitle")} />
      <AdminListingsTable type="equipment" />
    </DashboardLayout>
  );
};
export default AdminEquipmentPage;
