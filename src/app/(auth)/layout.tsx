import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(215,255,77,0.18),_transparent_24%),_var(--background)]">
      <header className="container-shell flex h-16 items-center">
        <Logo />
      </header>

      <main className="container-shell flex min-h-[calc(100vh-64px)] items-center justify-center py-12">
        {children}
      </main>
    </div>
  );
}