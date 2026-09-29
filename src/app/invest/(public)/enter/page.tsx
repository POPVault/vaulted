import { EnterForm } from "@/components/invest/enter-form";
import { INVITE_LINK_ERROR } from "@/lib/validation/invite";

export default async function EnterPage({ searchParams }: PageProps<"/invest/enter">) {
  const { e } = await searchParams;

  return (
    <div className="shell py-16 md:py-24">
      <section className="flex max-w-md flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl leading-tight md:text-5xl">Enter your invite link</h1>
          <p className="text-muted-foreground">Paste the personal link you were sent.</p>
        </div>
        <EnterForm initialError={e ? INVITE_LINK_ERROR : null} />
      </section>
    </div>
  );
}
