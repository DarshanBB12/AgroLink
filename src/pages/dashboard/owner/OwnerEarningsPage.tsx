import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EarningsView } from "@/components/orders/EarningsView";

const OwnerEarningsPage = () => (
  <DashboardLayout role="owner">
    <EarningsView />
  </DashboardLayout>
);
export default OwnerEarningsPage;
