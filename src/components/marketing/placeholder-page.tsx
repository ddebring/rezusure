import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";

export function PlaceholderPage({ title, description, eyebrow = "REZUSURE" }: { title: string; description: string; eyebrow?: string }) {
  return (
    <PublicLayout>
      <main>
        <section className="container-shell py-24">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-[var(--foreground)] md:text-6xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">{description}</p>
          <div className="mt-8">
            <Button asChild>
              <Link href="/signup">Get started <ArrowUpRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
