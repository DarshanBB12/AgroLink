import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { NotificationsView } from "@/components/common/NotificationsView";

const AdminNotificationsPage = () => (
  <DashboardLayout role="admin">
    <NotificationsView />
  </DashboardLayout>
);
export default AdminNotificationsPage;
