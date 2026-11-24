import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/common/StateViews";
import { OwnerListings } from "@/components/marketplace/OwnerListings";
import { useLanguage } from "@/contexts/LanguageContext";

const MyListingsPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="owner">
      <PageHeader title={t("app.pages.listingsTitle")} subtitle={t("app.pages.listingsSubtitle")} />
      <OwnerListings kind="equipment" />
    </DashboardLayout>
  );
};
export default MyListingsPage;
