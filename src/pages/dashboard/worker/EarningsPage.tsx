import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EarningsView } from "@/components/orders/EarningsView";

const EarningsPage = () => (
  <DashboardLayout role="worker">
    <EarningsView />
  </DashboardLayout>
);
export default EarningsPage;
