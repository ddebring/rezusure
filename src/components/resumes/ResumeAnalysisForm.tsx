"use client";

import React, { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/auth/auth-client";
import { ANALYSIS_PACKS } from "@/config/analysis-packs";
import { BillingCheckout } from "@/components/billing/BillingCheckout";
import ResumeUpload from "./ResumeUpload";

const progressStages = [
  "Reading your resume",
  "Extracting skills and experience",
  "Comparing with the target role",
  "Checking ATS alignment",
  "Preparing recommendations",
];

export default function ResumeAnalysisForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditExhaustedOpen, setCreditExhaustedOpen] = useState(false);

  const canSubmit = !!file && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !file || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setCreditExhaustedOpen(false);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("jobTitle", jobTitle || "");
      fd.append("jobDescription", jobDescription);

      const response = await fetchWithAuth("/api/resumes/upload", {
        method: "POST",
        body: fd,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);

        if (response.status === 401 || payload?.code === "AUTH_INVALID" || payload?.code === "AUTH_REQUIRED") {
          router.replace(`/login?redirect=${encodeURIComponent("/dashboard/resumes")}`);
          throw new Error("Your session expired. Please sign in again.");
        }

        if (response.status === 402 || payload?.code === "ANALYSIS_CREDITS_EXHAUSTED") {
          setCreditExhaustedOpen(true);
          setError(null);
          return;
        }

        throw new Error(payload?.error ?? `Create resume failed with ${response.status}`);
      }

      const payload = await response.json().catch(() => null);
      if (payload?.id) {
        router.push(`/dashboard/resumes/${payload.id}`);
      } else {
        router.push(`/dashboard/resumes`);
      }
    } catch (err) {
      console.error("Failed to submit resume analysis:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, file, isSubmitting, jobDescription, jobTitle, router]);

  return (
    <>
      {creditExhaustedOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Resume analysis</p>
                <h3 className="mt-2 text-2xl font-semibold">You’ve used your free analysis</h3>
              </div>
              <Button variant="ghost" onClick={() => setCreditExhaustedOpen(false)}>Close</Button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Your first resume analysis was free. Choose a one-time analysis pack to continue analyzing your resume against new opportunities.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {ANALYSIS_PACKS.map((pack) => (
                <div key={pack.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{pack.title}</p>
                      <p className="mt-1 text-2xl font-semibold">₹{pack.amountMinor / 100}</p>
                    </div>
                    {pack.badge ? <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">{pack.badge}</span> : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{pack.description}</p>
                  <div className="mt-4">
                    <BillingCheckout pack={pack} onSuccess={() => setCreditExhaustedOpen(false)} />
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-slate-500">No subscription. One-time purchase.</p>
          </div>
        </div>
      ) : null}

      <div>
        <div>
          <h2 className="text-2xl font-semibold">See how well your resume matches the job.</h2>
          <p className="mt-1 text-sm text-slate-500">Upload your resume and paste the job description. REZUSURE will compare them to identify strengths, gaps, missing keywords, and opportunities to improve your chances.</p>
        </div>

        <div className="mt-6 space-y-6">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {isSubmitting ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 animate-pulse rounded-full bg-slate-900" />
                <p className="text-lg font-medium">Analyzing your resume...</p>
              </div>
              <p className="mt-3 text-sm text-slate-600">This usually takes a little while. We are comparing your resume with the target role and preparing your recommendations.</p>
              <div className="mt-4 space-y-2">
                {progressStages.map((stage, index) => (
                  <div key={stage} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className={cn("inline-flex h-2.5 w-2.5 rounded-full", index === 0 ? "bg-slate-900" : "bg-slate-300")} />
                    <span className={index === 0 ? "font-medium text-slate-900" : ""}>{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h3 className="text-lg font-medium">Upload your resume</h3>
            <div className="mt-3">
              <ResumeUpload onFile={setFile} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium">Target job description</h3>
            <label className="block text-sm font-medium text-slate-700 mt-3">Job title (optional)</label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2" placeholder="e.g. Senior Product Designer" />

            <label className="block text-sm font-medium text-slate-700 mt-4">Paste the job description here</label>
            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="mt-2 w-full min-h-[160px] rounded-md border p-3" placeholder="Paste the complete job description here — responsibilities, requirements, qualifications, and preferred skills." />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={!canSubmit} className={cn("", { "cursor-not-allowed": !canSubmit })}>
              {isSubmitting ? "Analyzing your resume…" : "Analyze my resume →"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
