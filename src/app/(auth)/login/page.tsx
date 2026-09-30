import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Log in", robots: { index: false, follow: false } };

export default function LoginPage() { return <Card className="w-full max-w-md"><CardHeader><CardTitle>Log in</CardTitle><p className="text-sm text-slate-500">Authentication wiring is the next implementation milestone.</p></CardHeader><CardContent><div className="space-y-3"><Button className="w-full" disabled>Continue with email</Button><Button className="w-full" variant="outline" asChild><Link href="/signup">Create an account</Link></Button></div><p className="mt-6 text-center text-sm text-slate-500"><Link className="font-medium text-slate-900" href="/forgot-password">Forgot password?</Link></p></CardContent></Card>; }
