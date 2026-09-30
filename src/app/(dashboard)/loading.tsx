import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() { return <div className="space-y-5"><Skeleton className="h-10 w-48" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-56 lg:col-span-2" /><Skeleton className="h-56" /></div><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" /></div></div>; }
