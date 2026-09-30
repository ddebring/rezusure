"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Production observability will be connected here without exposing error details to users.
  }, []);

  return <main className="grid min-h-screen place-items-center bg-slate-50 px-6"><div className="text-center"><p className="text-sm font-semibold text-red-600">Something went wrong</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">We could not complete that request.</h1><p className="mt-3 max-w-md text-slate-500">Please retry. Detailed errors stay server-side.</p><Button className="mt-6" onClick={() => reset()}>Try again</Button></div></main>;
}
