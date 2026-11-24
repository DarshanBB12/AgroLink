import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";
import { useLanguage } from "@/contexts/LanguageContext";

const SeedsPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="farmer">
      <MarketplaceBrowser type="seed" title={t("app.pages.seedsTitle")} subtitle={t("app.pages.seedsSubtitle")} />
    </DashboardLayout>
  );
};
export default SeedsPage;
