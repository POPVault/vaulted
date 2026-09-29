import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { getAdminOrNull } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Vaulted admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminOrNull();

  return (
    <>
      <AdminHeader loggedIn={admin !== null} />
      <main className="flex-1">{children}</main>
    </>
  );
}
