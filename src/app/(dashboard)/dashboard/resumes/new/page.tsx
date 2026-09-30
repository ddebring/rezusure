import Link from "next/link";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "New resume", robots: { index: false, follow: false } };

export default function NewResumePage() { return <div className="mx-auto max-w-2xl"><div><h2 className="text-2xl font-semibold">Analyze a resume</h2><p className="mt-1 text-sm text-slate-500">The upload pipeline will validate file type and size before writing to Firebase Storage.</p></div><Card className="mt-6"><CardHeader><CardTitle>Upload file</CardTitle></CardHeader><CardContent><div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center"><FileUp className="mx-auto h-8 w-8 text-slate-500" /><p className="mt-4 font-semibold">PDF or DOCX</p><p className="mt-1 text-sm text-slate-500">Secure upload component will be enabled in the resume pipeline milestone.</p><Button className="mt-6" disabled>Choose file</Button></div><Button className="mt-5" variant="ghost" asChild><Link href="/dashboard/resumes">Back to resumes</Link></Button></CardContent></Card></div>; }
