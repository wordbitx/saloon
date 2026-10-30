import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin/admin-login-form";
import { getSessionUser } from "@/lib/auth/session";
import { getActiveSessionAccount, getDefaultCredentialHint } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin sign in | WordbitX Salon",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const session = await getSessionUser();
  if (session) {
    const account = await getActiveSessionAccount(session);
    if (account) redirect("/admin");
  }

  const defaultHint = await getDefaultCredentialHint();

  return <AdminLoginForm defaultHint={defaultHint} signedOutReason={reason ?? null} />;
}
