import AdminWorkspace from "@/components/admin/admin-workspace";

export const metadata = {
  title: "Salon dashboard preview | WordbitX",
  description:
    "Owner dashboard preview: recovered bookings, chair timeline, waitlist and the daily recovery summary.",
};

/**
 * Public dashboard preview — no login required.
 * The signed-in version of this workspace lives at /admin (owner/manager/reception logins).
 */
export default function DashboardPage() {
  return <AdminWorkspace demoMode />;
}
