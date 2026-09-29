import Image from "next/image";

export default function Home() {
  return (
    <main className="shell flex flex-1 flex-col items-center justify-center gap-6 py-24 text-center">
      <Image
        src="/brand/logo-black.png"
        alt=""
        width={1400}
        height={215}
        priority
        className="h-auto w-[200px] md:w-[240px]"
      />
      <h1 className="text-2xl text-muted-foreground">Vaulted</h1>
    </main>
  );
}
