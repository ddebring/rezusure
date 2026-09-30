import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Create account", robots: { index: false, follow: false } };

export default function SignupPage() { return <Card className="w-full max-w-md"><CardHeader><CardTitle>Create your account</CardTitle><p className="text-sm text-slate-500">Secure Firebase Authentication will be connected next.</p></CardHeader><CardContent><div className="space-y-3"><Button className="w-full" disabled>Create account</Button><Button className="w-full" variant="outline" asChild><Link href="/login">Already have an account?</Link></Button></div></CardContent></Card>; }
