import type { ReactNode } from "react";

export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: ReactNode; description: string }) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-heading mt-3 text-[var(--foreground)]">{title}</h2>
      <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)] md:text-lg">{description}</p>
    </div>
  );
}
