export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{title}</h2><p className="mt-4 text-base leading-7 text-slate-600">{description}</p></div>;
}
