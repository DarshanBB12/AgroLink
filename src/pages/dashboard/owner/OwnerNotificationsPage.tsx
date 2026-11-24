import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { NotificationsView } from "@/components/common/NotificationsView";

const OwnerNotificationsPage = () => (
  <DashboardLayout role="owner">
    <NotificationsView />
  </DashboardLayout>
);
export default OwnerNotificationsPage;
