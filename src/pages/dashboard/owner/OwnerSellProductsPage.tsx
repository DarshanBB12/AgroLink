import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/common/StateViews";
import { OwnerListings } from "@/components/marketplace/OwnerListings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrdersView } from "@/components/orders/OrdersView";
import { useLanguage } from "@/contexts/LanguageContext";

const OwnerSellProductsPage = () => {
  const { t } = useLanguage();
  return (
    <DashboardLayout role="owner">
      <PageHeader title={t("app.pages.sellTitle")} subtitle={t("app.pages.sellSubtitle")} />
      <Tabs defaultValue="seed">
        <TabsList className="mb-4"><TabsTrigger value="seed">{t("app.types.seed")}</TabsTrigger><TabsTrigger value="fertilizer">{t("app.types.fertilizer")}</TabsTrigger><TabsTrigger value="orders">{t("app.pages.productOrders")}</TabsTrigger></TabsList>
        <TabsContent value="seed"><OwnerListings kind="seed" /></TabsContent>
        <TabsContent value="fertilizer"><OwnerListings kind="fertilizer" /></TabsContent>
        <TabsContent value="orders"><OrdersView perspective="provider" type="product" title={t("app.pages.productOrders")} /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};
export default OwnerSellProductsPage;
