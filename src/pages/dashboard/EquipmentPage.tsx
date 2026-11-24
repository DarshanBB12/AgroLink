import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";
import { useLanguage } from "@/contexts/LanguageContext";

const EquipmentPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="farmer">
      <MarketplaceBrowser type="equipment" title={t("app.pages.equipmentTitle")} subtitle={t("app.pages.equipmentSubtitle")} />
    </DashboardLayout>
  );
};
export default EquipmentPage;
