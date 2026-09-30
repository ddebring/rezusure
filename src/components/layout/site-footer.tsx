import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="container-shell flex flex-col gap-5 py-10 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-slate-900">REZUSURE</p>
          <p className="mt-1">AI-powered resume and career optimization.</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer navigation">
          <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-900">Terms</Link>
          <Link href="/contact" className="hover:text-slate-900">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
