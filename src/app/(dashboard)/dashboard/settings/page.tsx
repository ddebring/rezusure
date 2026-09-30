import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings", robots: { index: false, follow: false } };
export default function SettingsPage() { return <Card><CardHeader><CardTitle>Account settings</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">Profile, country selection, account deletion, and consent controls will be connected to Firebase Auth and Firestore here.</p></CardContent></Card>; }
