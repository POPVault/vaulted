import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getAdminOrNull } from "@/lib/admin-session";

// Temporary. The dashboard arrives in a later piece; its branch will call requireAdmin().
export default async function AdminPage() {
  const admin = await getAdminOrNull();

  if (!admin) {
    return (
      <div className="shell py-16 md:py-24">
        <section className="flex max-w-md flex-col gap-8">
          <h1 className="text-4xl leading-tight md:text-5xl">Admin</h1>
          <AdminLoginForm />
        </section>
      </div>
    );
  }

  return (
    <div className="shell flex flex-col gap-6 py-16 md:py-24">
      <h1 className="text-4xl leading-tight md:text-5xl">Dashboard coming next</h1>
      {/* Plain anchor so the logout route is never prefetched. */}
      <a href="/admin/logout" className="text-sm font-medium underline underline-offset-[6px]">
        Log out
      </a>
    </div>
  );
}
