import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";
import { useLanguage } from "@/contexts/LanguageContext";

const WorkersPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="farmer">
      <MarketplaceBrowser type="worker" title={t("app.pages.workersTitle")} subtitle={t("app.pages.workersSubtitle")} />
    </DashboardLayout>
  );
};
export default WorkersPage;
