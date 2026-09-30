import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Resumes", robots: { index: false, follow: false } };

export default function ResumesPage() { return <div><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-semibold">Resumes</h2><p className="mt-1 text-sm text-slate-500">Saved resume files and their latest analysis status.</p></div><Button asChild><Link href="/dashboard/resumes/new"><Plus className="h-4 w-4" /> New resume</Link></Button></div><Card className="mt-6"><CardContent className="grid min-h-80 place-items-center py-16 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100"><FileText className="h-5 w-5 text-slate-500" /></div><h3 className="mt-4 font-semibold">No resumes yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Your resume library will be populated from Firebase Storage metadata once upload is implemented.</p><Button className="mt-5" variant="outline" asChild><Link href="/dashboard/resumes/new">Upload a resume</Link></Button></div></CardContent></Card></div>; }
