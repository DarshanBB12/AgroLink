import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";
import { useLanguage } from "@/contexts/LanguageContext";

const SearchPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="farmer">
      <MarketplaceBrowser type="all" title={t("app.pages.searchTitle")} subtitle={t("app.pages.searchSubtitle")} />
    </DashboardLayout>
  );
};
export default SearchPage;
