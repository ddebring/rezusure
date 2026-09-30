import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-6"><div className="text-center"><p className="text-sm font-semibold text-slate-500">404</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Page not found</h1><p className="mt-3 max-w-md text-slate-500">The page you requested does not exist or is no longer available.</p><Button className="mt-6" asChild><Link href="/">Back to REZUSURE</Link></Button></div></main>;
}
