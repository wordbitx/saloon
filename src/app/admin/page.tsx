import { redirect } from "next/navigation";
import AdminWorkspace from "@/components/admin/admin-workspace";
import { AuthProvider } from "@/context/auth-context";
import { getSessionUser } from "@/lib/auth/session";
import { getActiveSessionAccount, sessionUserFor } from "@/lib/auth/store";
import { workspacesFor } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin workspace | WordbitX Salon",
  robots: { index: false, follow: false },
};

/**
 * Server gate: no verified session cookie means no workspace bundle is sent.
 * The signed-in account is re-read on every request, so a disabled account or a
 * changed role takes effect on the next navigation without a new login.
 */
export default async function AdminPage() {
  const session = await getSessionUser();
  if (!session) redirect("/admin/login");

  const account = await getActiveSessionAccount(session);
  if (!account) redirect("/admin/login?reason=disabled");

  const user = await sessionUserFor(account);
  // Fetch only the salons this account may see; never put owner data in the public demo.
  const workspaces = await workspacesFor(user);

  return (
    <AuthProvider user={user}>
      <AdminWorkspace key={`${user.id}-${user.role}-${user.salonId ?? "all"}-${user.branchId ?? "none"}`} initialWorkspaces={workspaces} />
    </AuthProvider>
  );
}
