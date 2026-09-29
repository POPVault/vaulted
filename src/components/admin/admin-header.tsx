import Image from "next/image";
import Link from "next/link";

const linkClass = "text-sm font-medium text-foreground underline-offset-[6px] hover:underline";

/** Logo always; Dashboard and Log out once the admin is logged in. */
export function AdminHeader({ loggedIn }: { loggedIn: boolean }) {
  const logo = (
    <Image src="/brand/logo-black.png" alt="Vaulted" width={1400} height={215} priority className="h-auto w-[112px]" />
  );

  return (
    <header className="border-b border-line py-5">
      <div className="shell flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-4">
          {loggedIn ? (
            <Link href="/admin" aria-label="Vaulted admin home" className="shrink-0">
              {logo}
            </Link>
          ) : (
            <div className="shrink-0">{logo}</div>
          )}
          <p className="eyebrow">Admin</p>
        </div>
        {loggedIn ? (
          <nav aria-label="Admin" className="flex items-center gap-x-5 md:gap-x-8">
            <Link href="/admin" aria-current="page" className={`${linkClass} underline decoration-accent decoration-2`}>
              Dashboard
            </Link>
            {/* Plain anchor so the logout route is never prefetched. */}
            <a href="/admin/logout" className={linkClass}>
              Log out
            </a>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
