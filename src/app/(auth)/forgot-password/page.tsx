import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() { return <Card className="w-full max-w-md"><CardHeader><CardTitle>Reset your password</CardTitle><p className="text-sm text-slate-500">Firebase email reset will be wired in the authentication milestone.</p></CardHeader><CardContent><Button className="w-full" disabled>Send reset link</Button><p className="mt-5 text-center text-sm text-slate-500"><Link className="font-medium text-slate-900" href="/login">Back to log in</Link></p></CardContent></Card>; }
