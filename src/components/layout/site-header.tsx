import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/95">
      <div className="container-shell flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">REZUSURE</Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          <Link className="text-sm text-slate-600 hover:text-slate-950" href="/features">Features</Link>
          <Link className="text-sm text-slate-600 hover:text-slate-950" href="/how-it-works">How it works</Link>
          <Link className="text-sm text-slate-600 hover:text-slate-950" href="/pricing">Pricing</Link>
          <Link className="text-sm text-slate-600 hover:text-slate-950" href="/about">About</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link href="/login">Log in</Link></Button>
          <Button size="sm" asChild><Link href="/signup">Get started <ArrowUpRight className="h-4 w-4" /></Link></Button>
        </div>
      </div>
    </header>
  );
}
