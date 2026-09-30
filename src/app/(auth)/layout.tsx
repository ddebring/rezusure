import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50"><header className="container-shell flex h-16 items-center"><Link href="/" className="text-lg font-bold tracking-tight">REZUSURE</Link></header><main className="container-shell flex min-h-[calc(100vh-64px)] items-center justify-center py-12">{children}</main></div>;
}
