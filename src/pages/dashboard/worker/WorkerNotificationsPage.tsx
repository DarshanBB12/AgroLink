import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { NotificationsView } from "@/components/common/NotificationsView";

const WorkerNotificationsPage = () => (
  <DashboardLayout role="worker">
    <NotificationsView />
  </DashboardLayout>
);
export default WorkerNotificationsPage;
