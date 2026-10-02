import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Hero() {
  const analysisMetrics = [
    {
      label: "ATS fit",
      value: 88,
    },
    {
      label: "Keywords",
      value: 76,
    },
    {
      label: "Role match",
      value: 81,
    },
    {
      label: "Impact",
      value: 84,
    },
  ];

  const benefits = [
    "ATS fit check",
    "Keyword gaps",
    "Section feedback",
    "Saved analysis history",
  ];

  return (
    <section className="border-b border-black/[0.08] bg-white">
      <div className="mx-auto max-w-[1320px] px-6 pb-16 pt-10 sm:px-8 md:pb-20 md:pt-12 lg:px-10 lg:pb-24 lg:pt-14">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 xl:gap-20">

          {/* ====================================================== */}
          {/* LEFT — HERO COPY                                       */}
          {/* ====================================================== */}

          <div className="max-w-[600px]">

            {/* Eyebrow */}
            <div className="inline-flex items-center rounded-full border border-black/[0.12] bg-white px-3.5 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/55">
                Resume intelligence
              </span>
            </div>

            {/* Headline */}
            <h1 className="mt-6 max-w-[600px] text-[3.45rem] font-semibold leading-[0.94] tracking-[-0.065em] text-[#11100f] sm:text-[4rem] md:text-[4.35rem] lg:text-[4.55rem] xl:text-[4.7rem]">
              Know what your
              <br />

              resume is{" "}
              <span className="relative isolate inline-block font-serif font-normal italic tracking-[-0.045em] text-[#11100f]">
                missing

                {/* Lime highlight behind the word */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-[-0.08em] bottom-[0.08em] -z-10 h-[0.48em] rounded-[0.08em] bg-[#c8ff21]"
                />
              </span>

              <br />

              before you apply.
            </h1>

            {/* Description */}
            <p className="mt-7 max-w-[550px] text-base leading-7 text-black/60 md:text-[17px] md:leading-7">
              Rezusure helps you understand how your resume matches a role,
              where it falls short, and what to improve before another
              application goes out.
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 rounded-xl border border-[#b9ef00] bg-[#c8ff21] px-6 font-semibold text-black shadow-[0_10px_28px_rgba(200,255,33,0.20)] hover:bg-[#baff00] hover:text-black"
                asChild
              >
                <Link href="/signup">
                  Analyze my resume
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-black/[0.14] bg-white px-6 font-semibold text-black hover:bg-black/[0.035]"
                asChild
              >
                <Link href="/#how-it-works">
                  See how it works
                </Link>
              </Button>
            </div>

            {/* Benefits */}
            <div className="mt-7 grid max-w-[550px] grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {benefits.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-[13px] font-medium text-black/60"
                >
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-black/65"
                    strokeWidth={1.8}
                  />

                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ====================================================== */}
          {/* RIGHT — RESUME ANALYSIS PREVIEW                        */}
          {/* ====================================================== */}

          <div className="relative flex items-center justify-end">

            {/* Very subtle background glow */}
            <div
              aria-hidden="true"
              className="absolute right-8 top-1/2 -z-10 h-[360px] w-[360px] -translate-y-1/2 rounded-full bg-[#c8ff21]/[0.08] blur-[80px]"
            />

            {/* Analysis card */}
            <div className="w-full max-w-[570px] rounded-[28px] border border-black/[0.09] bg-[#fbfbf9] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.075)] md:p-7">

              {/* Lime accent */}
              <div className="mb-5 h-[2px] w-full rounded-full bg-[#c8ff21]" />

              {/* ================================================== */}
              {/* CARD HEADER                                        */}
              {/* ================================================== */}

              <div className="flex items-start justify-between border-b border-black/[0.07] pb-5">
                <div>
                  <p className="text-sm font-semibold text-[#171614]">
                    Resume analysis
                  </p>

                  <p className="mt-1 text-xs text-black/40">
                    Sample candidate report
                  </p>
                </div>

                <span className="rounded-full border border-black/[0.09] bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/45">
                  Sample
                </span>
              </div>

              {/* ================================================== */}
              {/* SCORE + METRICS                                    */}
              {/* ================================================== */}

              <div className="mt-7 flex items-end gap-8">

                {/* Overall score */}
                <div className="shrink-0">
                  <div className="text-[4.7rem] font-semibold leading-none tracking-[-0.075em] text-[#a8e600]">
                    82
                  </div>

                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-black/40">
                    Overall score
                  </p>
                </div>

                {/* Labeled analysis metrics */}
                <div className="mb-1 flex-1 space-y-3.5">
                  {analysisMetrics.map((metric) => (
                    <div key={metric.label}>

                      {/* Label + percentage */}
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-black/55">
                          {metric.label}
                        </span>

                        <span className="text-[10px] font-semibold text-black/65">
                          {metric.value}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-[5px] overflow-hidden rounded-full bg-black/[0.055]">
                        <div
                          className="h-full rounded-full bg-[#c8ff21]"
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ================================================== */}
              {/* HIGHEST IMPACT ISSUE                               */}
              {/* ================================================== */}

              <div className="mt-7 rounded-[17px] border border-[#b9ed19]/60 bg-[#f4ffd1] px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#617d00]">
                  Highest-impact issue
                </p>

                <p className="mt-2.5 text-[13px] leading-6 text-black/70">
                  Your bullet points need more measurable outcomes to match
                  the role&apos;s expectations.
                </p>
              </div>

              {/* ================================================== */}
              {/* SUMMARY STATS                                      */}
              {/* ================================================== */}

              <div className="mt-5 grid grid-cols-3 gap-3">

                {/* ATS */}
                <div className="rounded-[15px] border border-black/[0.07] bg-white p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
                    ATS fit
                  </p>

                  <p className="mt-2 text-[15px] font-semibold text-[#171614]">
                    Strong
                  </p>
                </div>

                {/* Keywords */}
                <div className="rounded-[15px] border border-black/[0.07] bg-white p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
                    Keyword gaps
                  </p>

                  <p className="mt-2 text-[15px] font-semibold text-[#171614]">
                    6 gaps
                  </p>
                </div>

                {/* Impact */}
                <div className="rounded-[15px] border border-black/[0.07] bg-white p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
                    Impact
                  </p>

                  <p className="mt-2 text-[15px] font-semibold text-[#171614]">
                    Improve
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}