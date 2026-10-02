export default function ResumeDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-24 rounded bg-slate-200" />
      <div className="h-10 w-72 rounded bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-6 w-40 rounded bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-24 rounded-xl bg-slate-100" />
            <div className="h-24 rounded-xl bg-slate-100" />
            <div className="h-24 rounded-xl bg-slate-100" />
            <div className="h-24 rounded-xl bg-slate-100" />
          </div>
          <div className="h-36 rounded-xl bg-slate-100" />
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-6 w-32 rounded bg-slate-200" />
          <div className="h-52 rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
