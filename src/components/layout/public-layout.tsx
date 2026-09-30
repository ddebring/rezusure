import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen"><SiteHeader />{children}<SiteFooter /></div>;
}
