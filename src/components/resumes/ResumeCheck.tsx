import { AlertTriangle, CheckCircle2, CircleDashed, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type ResumeCheckStatus = "pass" | "strong" | "good" | "partial" | "review" | "needs_improvement" | "weak" | "critical" | "not_applicable" | string;

type ResumeCheckData = {
  id?: string | number;
  title?: string | null;
  name?: string | null;
  category?: string | null;
  status?: ResumeCheckStatus | null;
  summary?: string | null;
  explanation?: string | null;
  recommendation?: string | null;
};

function getStatusMeta(status: string) {
  const normalized = status.toLowerCase();

  if (["pass", "strong", "good"].includes(normalized)) {
    return {
      label: "Passed",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: <CheckCircle2 className="h-4 w-4" />,
      iconWrap: "bg-emerald-100 text-emerald-700",
    };
  }

  if (["partial", "review", "needs_improvement"].includes(normalized)) {
    return {
      label: "Warning",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      icon: <AlertTriangle className="h-4 w-4" />,
      iconWrap: "bg-amber-100 text-amber-700",
    };
  }

  if (["weak", "critical"].includes(normalized)) {
    return {
      label: "Issue",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      icon: <ShieldAlert className="h-4 w-4" />,
      iconWrap: "bg-rose-100 text-rose-700",
    };
  }

  return {
    label: "Review",
    className: "border-slate-200 bg-slate-100 text-slate-700",
    icon: <CircleDashed className="h-4 w-4" />,
    iconWrap: "bg-slate-200 text-slate-700",
  };
}

export function ResumeCheck({ check }: { check: ResumeCheckData | Record<string, unknown> }) {
  const data = check as ResumeCheckData;
  const status = String(data.status ?? "review");
  const meta = getStatusMeta(status);
  const title = data.title ?? data.name ?? "Resume check";
  const category = data.category ? String(data.category).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Review";
  const summary = data.summary ?? data.explanation ?? data.recommendation ?? "No additional detail is available for this check.";

  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 grid h-7 w-7 place-items-center rounded-full shrink-0", meta.iconWrap)}>{meta.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", meta.className)}>
              {meta.label}
            </span>
          </div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{category}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{summary}</p>
        </div>
      </div>
    </li>
  );
}
