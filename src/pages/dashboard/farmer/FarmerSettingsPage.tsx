import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/common/StateViews";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { useLanguage } from "@/contexts/LanguageContext";

const FarmerSettingsPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="farmer">
      <PageHeader title={t("app.settings.title")} subtitle={t("app.settings.subtitle")} />
      <AccountSettings />
    </DashboardLayout>
  );
};

export default FarmerSettingsPage;
