import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";
import { useLanguage } from "@/contexts/LanguageContext";

const FertilizerPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="farmer">
      <MarketplaceBrowser type="fertilizer" title={t("app.pages.fertilizerTitle")} subtitle={t("app.pages.fertilizerSubtitle")} />
    </DashboardLayout>
  );
};
export default FertilizerPage;
