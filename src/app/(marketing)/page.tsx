import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileCheck2,
  SearchCheck,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Hero } from "@/components/marketing/hero";
import { PricingPreview } from "@/components/marketing/pricing-preview";

/* =========================================================
   SEO / AEO METADATA
========================================================= */

export const metadata: Metadata = {
  title: "AI Resume Checker & Job Fit Analysis | Rezusure",
  description:
    "Analyze your resume for ATS parseability, keywords, skills, evidence, role fit, formatting, clarity and application readiness before you apply.",
  keywords: [
    "AI resume checker",
    "resume checker",
    "resume analysis",
    "ATS resume checker",
    "ATS resume analysis",
    "resume score",
    "resume job description match",
    "resume vs job description",
    "resume keyword checker",
    "resume optimization",
    "job fit analysis",
    "resume ATS optimization",
    "resume feedback",
    "resume improvement",
    "application readiness",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Know what your resume is missing before you apply | Rezusure",
    description:
      "Analyze your resume for job fit, ATS parseability, keywords, evidence, structure and application readiness.",
    type: "website",
  },
};

/* =========================================================
   FAQ DATA
========================================================= */

const faqs = [
  {
    question: "What does Rezusure check on my resume?",
    answer:
      "Rezusure checks your resume across role fit, seniority, responsibilities, skills, keywords, measurable achievements, evidence quality, summary alignment, experience relevance, education, projects, career narrative, ATS parseability, section completeness, dates, contact information, grammar and overall application readiness.",
  },
  {
    question: "Can Rezusure check my resume against a specific job description?",
    answer:
      "Yes. A job description gives Rezusure additional context to evaluate how closely your experience, skills, terminology and evidence align with the specific opportunity. You can also start with a resume-only analysis.",
  },
  {
    question: "Is Rezusure an ATS?",
    answer:
      "No. Rezusure is a resume and job-application analysis tool. It checks ATS-related structure and parsing risks, but it does not claim to be the ATS used by an employer.",
  },
  {
    question: "Does Rezusure tell me whether I will get the job?",
    answer:
      "No. Hiring decisions depend on employers, applicants, interviews, referrals and many factors outside a resume. Rezusure instead focuses on measurable signals such as role relevance, evidence coverage, skills, keywords, ATS parseability and application readiness.",
  },
  {
    question: "What is an ATS resume check?",
    answer:
      "An ATS resume check looks at whether important resume information is structured and presented in a way that common applicant-screening and recruiting systems are more likely to interpret clearly. Rezusure checks structure, sections, text extraction and layout-related risks.",
  },
  {
    question: "Does Rezusure check keywords?",
    answer:
      "Yes. Rezusure checks relevant terminology, hard skills, tools, industry language, keyword context and potential keyword-stuffing risk. The goal is meaningful coverage rather than blindly adding keywords.",
  },
  {
    question: "Will Rezusure tell me which skills are missing?",
    answer:
      "Yes. When a job description is provided, Rezusure compares important requirements with evidence found in your resume. It distinguishes between missing evidence, partial evidence and stronger evidence rather than telling you to claim skills you do not have.",
  },
  {
    question: "Does Rezusure check measurable achievements?",
    answer:
      "Yes. Rezusure checks whether your experience contains meaningful outcomes, metrics, ownership, specificity and action-oriented evidence instead of relying only on responsibility statements.",
  },
  {
    question: "Can I use Rezusure for different jobs?",
    answer:
      "Yes. You can analyze your resume against different roles and job descriptions. This is useful because a resume can be strong overall while still being a weak match for a particular job.",
  },
  {
    question: "Can Rezusure analyze a resume without a job description?",
    answer:
      "Yes. A resume-only analysis can still identify structural, formatting, clarity, evidence, grammar, section, ATS and general application-readiness issues. Adding a job description enables deeper role-specific analysis.",
  },
  {
    question: "Are Rezusure's paid plans subscriptions?",
    answer:
      "Rezusure is designed around one-time analysis credits rather than requiring users to commit to a recurring monthly subscription for resume analysis.",
  },
  {
    question: "Can I see previous resume analyses?",
    answer:
      "Yes. Rezusure is designed to retain your analysis history so you can revisit previous feedback and compare improvements over time.",
  },
];

/* =========================================================
   32-POINT DIAGNOSTIC
========================================================= */

const diagnosticChecks = [
  {
    id: "01",
    category: "Role fit",
    title: "Role / domain alignment",
    description:
      "Checks whether your overall experience and professional background make sense for the target role and domain.",
  },
  {
    id: "02",
    category: "Role fit",
    title: "Target title alignment",
    description:
      "Checks how closely your resume titles and positioning relate to the target position.",
  },
  {
    id: "03",
    category: "Role fit",
    title: "Seniority alignment",
    description:
      "Evaluates whether your demonstrated scope and experience appear appropriate for the seniority of the role.",
  },
  {
    id: "04",
    category: "Role fit",
    title: "Core responsibility coverage",
    description:
      "Checks whether important responsibilities from the target role are supported by evidence in your resume.",
  },
  {
    id: "05",
    category: "Qualifications",
    title: "Required degree alignment",
    description:
      "Checks how your listed education relates to explicit degree requirements in the target opportunity.",
  },
  {
    id: "06",
    category: "Qualifications",
    title: "Relevant years of experience",
    description:
      "Checks whether your documented experience appears consistent with the experience level requested.",
  },
  {
    id: "07",
    category: "Role fit",
    title: "Location / relocation fit",
    description:
      "Checks location, relocation and work-model signals against the target opportunity when information is available.",
  },
  {
    id: "08",
    category: "Skills",
    title: "Hard-skill coverage",
    description:
      "Checks important technical and professional hard skills relevant to the role.",
  },
  {
    id: "09",
    category: "Skills",
    title: "Tool coverage",
    description:
      "Checks relevant software, platforms, systems and tools mentioned in the opportunity.",
  },
  {
    id: "10",
    category: "Keywords",
    title: "Industry terminology",
    description:
      "Checks whether your resume uses meaningful language associated with the target industry and function.",
  },
  {
    id: "11",
    category: "Skills",
    title: "Soft-skill coverage",
    description:
      "Checks whether relevant interpersonal and behavioral capabilities are supported by actual evidence.",
  },
  {
    id: "12",
    category: "Keywords",
    title: "Keyword context quality",
    description:
      "Checks whether important terms appear in meaningful context instead of being listed without supporting evidence.",
  },
  {
    id: "13",
    category: "Keywords",
    title: "Keyword stuffing risk",
    description:
      "Looks for unnatural repetition or excessive keyword usage that can reduce readability and credibility.",
  },
  {
    id: "14",
    category: "Impact",
    title: "Quantified achievements",
    description:
      "Checks whether important accomplishments include useful numbers, scale, growth, savings, revenue or other measurable evidence where appropriate.",
  },
  {
    id: "15",
    category: "Impact",
    title: "Outcome orientation",
    description:
      "Checks whether bullets communicate outcomes rather than simply describing responsibilities.",
  },
  {
    id: "16",
    category: "Impact",
    title: "Ownership and scope",
    description:
      "Checks whether your resume communicates what you owned, influenced, led or were responsible for.",
  },
  {
    id: "17",
    category: "Writing",
    title: "Specificity",
    description:
      "Identifies vague statements and checks whether important claims contain enough detail to be credible.",
  },
  {
    id: "18",
    category: "Writing",
    title: "Action verbs",
    description:
      "Checks whether experience bullets begin with clear, specific and useful action-oriented language.",
  },
  {
    id: "19",
    category: "Writing",
    title: "Bullet readability",
    description:
      "Checks bullet length, density and readability so important information is easier to scan.",
  },
  {
    id: "20",
    category: "Positioning",
    title: "Professional summary alignment",
    description:
      "Checks whether the opening summary supports the role you are actually targeting.",
  },
  {
    id: "21",
    category: "Experience",
    title: "Experience relevance",
    description:
      "Checks whether the experience most prominently presented is relevant to the target opportunity.",
  },
  {
    id: "22",
    category: "Education",
    title: "Education presentation",
    description:
      "Checks whether education is presented clearly and contains information relevant to the role.",
  },
  {
    id: "23",
    category: "Skills",
    title: "Skills organization",
    description:
      "Checks whether your skills section is structured clearly and prioritizes useful information.",
  },
  {
    id: "24",
    category: "Evidence",
    title: "Project / portfolio evidence",
    description:
      "Checks whether relevant projects or portfolio work strengthen the evidence supporting your target role.",
  },
  {
    id: "25",
    category: "Narrative",
    title: "Career narrative coherence",
    description:
      "Checks whether your career progression tells a reasonably coherent story for the opportunity you are pursuing.",
  },
  {
    id: "26",
    category: "ATS & parsing",
    title: "ATS parseability structure",
    description:
      "Checks whether the document structure is likely to be interpreted clearly by common recruiting and screening systems.",
  },
  {
    id: "27",
    category: "ATS & parsing",
    title: "ATS layout risk",
    description:
      "Looks for visual or formatting patterns that may create unnecessary parsing or readability risk.",
  },
  {
    id: "28",
    category: "ATS & parsing",
    title: "Section completeness",
    description:
      "Checks whether expected resume sections are present, recognizable and logically organized.",
  },
  {
    id: "29",
    category: "Consistency",
    title: "Date consistency",
    description:
      "Checks employment and education dates for obvious inconsistencies, gaps or formatting problems.",
  },
  {
    id: "30",
    category: "Contact",
    title: "Contact information",
    description:
      "Checks whether important contact and professional profile information is present and clearly formatted.",
  },
  {
    id: "31",
    category: "Writing",
    title: "Grammar and polish",
    description:
      "Checks for obvious grammar, wording, consistency and presentation issues that reduce professionalism.",
  },
  {
    id: "32",
    category: "Application",
    title: "Application readiness",
    description:
      "Combines the most important findings into a practical view of whether the resume is ready for the next application.",
  },
];

/* =========================================================
   PROBLEM CARDS
========================================================= */

const problemCards = [
  {
    title: "Good experience, weak evidence",
    text:
      "Your responsibilities may be clear, but the resume may not show enough measurable evidence of the value you created.",
  },
  {
    title: "The right role, wrong language",
    text:
      "Your experience may be relevant while your resume still misses important terminology, skills or concepts used by the target role.",
  },
  {
    title: "No clear priority",
    text:
      "You may know your resume needs work without knowing which changes are worth making first.",
  },
];

/* =========================================================
   PROCESS
========================================================= */

const processSteps = [
  {
    number: "01",
    title: "Upload",
    text:
      "Start with the resume you already have. Rezusure turns the document into structured information that can be analyzed.",
  },
  {
    number: "02",
    title: "Analyze",
    text:
      "Review role fit, skills, keywords, evidence, ATS structure, writing quality and application-readiness signals.",
  },
  {
    number: "03",
    title: "Improve",
    text:
      "Use prioritized recommendations to make focused changes before sending your next application.",
  },
];

/* =========================================================
   BENEFITS
========================================================= */

const benefits = [
  "Find problems you would otherwise discover only after applying.",
  "Understand which improvements deserve your attention first.",
  "Make your resume more relevant to the roles you actually want.",
  "Identify missing evidence without inventing experience you do not have.",
  "Improve measurable outcomes, specificity and ownership in your bullets.",
  "Build a clearer feedback loop across your job search.",
];

/* =========================================================
   CATEGORY COUNTS
========================================================= */

const categoryCounts = [
  {
    number: "07",
    label: "Role & qualification checks",
  },
  {
    number: "06",
    label: "Skills & keyword checks",
  },
  {
    number: "06",
    label: "Evidence & impact checks",
  },
  {
    number: "06",
    label: "Structure & ATS checks",
  },
  {
    number: "07",
    label: "Writing & readiness checks",
  },
];

/* =========================================================
   AEO / STRUCTURED DATA
========================================================= */

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

const softwareStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Rezusure",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-powered resume and job-application analysis that checks role fit, skills, keywords, evidence, ATS parseability and application readiness.",
};

/* =========================================================
   PAGE
========================================================= */

export default function HomePage() {
  return (
    <>
      {/* =====================================================
          STRUCTURED DATA
      ===================================================== */}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareStructuredData),
        }}
      />

      {/* =====================================================
          HERO
      ===================================================== */}

      <Hero />

      <main>
        {/* =====================================================
            PROBLEM
        ===================================================== */}

        <section className="border-y border-[var(--border)] bg-[var(--background-elevated)]">
          <div className="container-shell py-20 md:py-28">
            <div className="max-w-4xl">
              <p className="eyebrow">The problem</p>

              <h2 className="section-heading mt-4 max-w-4xl">
                A resume can look polished
                <br className="hidden md:block" /> and still hold you back.
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] md:text-lg md:leading-8">
                A resume can have the right experience and still miss important
                keywords, measurable outcomes, role-specific language or
                structural signals that help recruiters and screening systems
                understand the candidate.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {problemCards.map((item) => (
                <article
                  key={item.title}
                  className="surface p-6 transition-transform duration-200 hover:-translate-y-1 md:p-7"
                >
                  <h3 className="text-lg font-semibold tracking-[-0.025em]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            WHAT REZUSURE CHECKS
        ===================================================== */}

        <section
          id="resume-checker"
          className="border-b border-[var(--border)] bg-white"
        >
          <div className="container-shell py-20 md:py-28">
            <div className="grid gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
              {/* LEFT */}
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="eyebrow">What Rezusure checks</p>

                <h2 className="section-heading mt-4">
                  Stop guessing.
                  <br />
                  <span className="brand-serif font-normal">
                    See what needs work.
                  </span>
                </h2>

                <p className="mt-6 max-w-lg text-base leading-7 text-[var(--muted-foreground)] md:text-lg">
                  Rezusure turns your resume into a structured analysis so you
                  can see the strengths, gaps and highest-impact improvements
                  before you send another application.
                </p>

                {/* IMPORTANT:
                    Lime CTA + BLACK TEXT.
                    No black button / black text problem.
                */}
                <Button
                  size="lg"
                  className="mt-7 rounded-xl bg-[var(--accent)] px-5 text-[var(--accent-foreground)] shadow-[0_12px_30px_rgba(174,255,0,0.22)] hover:bg-[var(--accent)] hover:brightness-95]"
                  asChild
                >
                  <Link href="/signup">
                    Analyze my resume
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
                  <CheckCircle2 className="h-4 w-4" />
                  32-point diagnostic
                </div>

                <div className="mt-8 space-y-3">
                  {categoryCounts.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between border-b border-black/10 pb-3 text-sm"
                    >
                      <span className="text-[var(--muted-foreground)]">
                        {item.label}
                      </span>

                      <span className="font-semibold text-[var(--foreground)]">
                        {item.number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT — ALL 32 CHECKS */}
              <div>
                <div className="mb-6 flex items-end justify-between gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
                      Resume intelligence
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      A deeper diagnostic across fit, evidence, writing,
                      structure and application readiness.
                    </p>
                  </div>

                  <span className="hidden shrink-0 rounded-full border border-black/10 bg-[#f5f1e8] px-3 py-1.5 text-xs font-semibold md:inline-flex">
                    32 checks
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {diagnosticChecks.map((item) => (
                    <article
                      key={item.id}
                      className="group rounded-[18px] border border-black/10 bg-[#faf8f3] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-black/15 hover:bg-white hover:shadow-[0_14px_35px_rgba(0,0,0,0.05)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)]">
                          <SearchCheck className="h-4 w-4" />
                        </div>

                        <span className="text-[10px] font-bold tracking-[0.16em] text-black/30">
                          {item.id}
                        </span>
                      </div>

                      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-black/40">
                        {item.category}
                      </p>

                      <h3 className="mt-2 text-[17px] font-semibold leading-6 tracking-[-0.025em]">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                        {item.description}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            PROCESS
        ===================================================== */}

        <section className="border-b border-[var(--border)] bg-[var(--background-elevated)]" id="how-it-works">
          <div className="container-shell py-20 md:py-28">
            <div className="max-w-3xl">
              <p className="eyebrow">A clearer process</p>

              <h2 className="section-heading mt-4">
                Know what to fix.
                <br />
                <span className="brand-serif font-normal">
                  Then fix it.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] md:text-lg">
                Rezusure is designed to take the uncertainty out of resume
                improvement. Upload your resume, understand the analysis,
                prioritize the important changes and make a stronger
                application.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {processSteps.map((item) => (
                <article
                  key={item.number}
                  className="rounded-[20px] border border-[var(--border)] bg-white p-7"
                >
                  <span className="text-xs font-bold tracking-[0.16em] text-black/40">
                    {item.number}
                  </span>

                  <h3 className="mt-8 text-xl font-semibold tracking-[-0.03em]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            WHY IT MATTERS
        ===================================================== */}

        <section className="border-b border-[var(--border)] bg-white">
          <div className="container-shell py-20 md:py-28">
            <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
              <div>
                <p className="eyebrow">Before you apply</p>

                <h2 className="section-heading mt-4">
                  Your resume deserves
                  <br />
                  <span className="brand-serif font-normal">
                    a second look.
                  </span>
                </h2>

                <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted-foreground)] md:text-lg">
                  The goal is not to make your resume longer. It is to make
                  the important evidence easier to understand, more relevant
                  to the opportunity and easier to act on.
                </p>
              </div>

              <div className="space-y-5">
                {benefits.map((item) => (
                  <div
                    key={item}
                    className="flex gap-4 border-b border-black/10 pb-5"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>

                    <p className="text-base leading-7 text-black/70">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            SEO / AEO EXPLAINER
        ===================================================== */}

        <section className="border-b border-[var(--border)] bg-[#f5f1e8]">
          <div className="container-shell py-20 md:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div>
                <p className="eyebrow">Resume analysis explained</p>

                <h2 className="section-heading mt-4">
                  More than a resume score.
                  <br />
                  <span className="brand-serif font-normal">
                    Know why.
                  </span>
                </h2>
              </div>

              <div className="space-y-8 text-base leading-8 text-black/65 md:text-lg">
                <div>
                  <h3 className="text-lg font-semibold text-black">
                    What is an AI resume checker?
                  </h3>

                  <p className="mt-3">
                    An AI resume checker analyzes the content and structure of
                    a resume and identifies areas that may be improved. A useful
                    analysis should go beyond a single number and explain what
                    is affecting the result.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-black">
                    What does ATS optimization actually mean?
                  </h3>

                  <p className="mt-3">
                    ATS optimization is primarily about making important
                    information clear, extractable and logically structured.
                    Rezusure checks parseability, section structure, text
                    extraction and layout-related risks rather than promising
                    to “beat” a universal ATS.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-black">
                    Why compare a resume with the job description?
                  </h3>

                  <p className="mt-3">
                    A resume can be well written and still be poorly aligned
                    with a particular job. Comparing the two allows the analysis
                    to identify relevant skills, responsibilities, terminology,
                    evidence gaps and qualification mismatches.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            PRICING
            IMPORTANT:
            DO NOT ADD ANOTHER "Get the level..." HEADING HERE.
            PricingPreview already owns the pricing presentation.
        ===================================================== */}

        <section
          id="pricing"
          className="border-b border-[var(--border)] bg-[var(--background)]"
        >

              <PricingPreview />

        </section>

        {/* =====================================================
            FAQ — CENTERED ACCORDION
        ===================================================== */}

        <section
          id="faq"
          className="border-b border-[var(--border)] bg-[#f5f1e8]"
        >
          <div className="container-shell py-20 md:py-28">
            <div className="mx-auto max-w-4xl text-center">
              <p className="eyebrow">Frequently asked questions</p>

              <h2 className="section-heading mt-4">
                Questions about resume analysis?
                <br />
                <span className="brand-serif font-normal">
                  Start here.
                </span>
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] md:text-lg">
                Clear answers about resume checking, ATS optimization,
                keywords, job matching, skills, evidence and improving your
                resume before you apply.
              </p>
            </div>

            {/* CENTERED FAQ WIDTH */}
            <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-[0_15px_45px_rgba(0,0,0,0.035)]">
              {faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  className="group border-b border-black/10 last:border-b-0"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-5 px-6 py-6 text-left transition-colors hover:bg-black/[0.018] md:px-8 md:py-7 [&::-webkit-details-marker]:hidden">
                    <span className="w-8 shrink-0 text-[10px] font-bold tracking-[0.16em] text-black/35">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="flex-1 text-base font-semibold tracking-[-0.02em] md:text-lg">
                      {faq.question}
                    </span>

                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#f5f1e8]">
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
                    </span>
                  </summary>

                  <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 group-open:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      <div className="border-t border-black/10 px-6 pb-7 pt-5 md:ml-13 md:px-8">
                        <p className="max-w-3xl text-sm leading-7 text-black/65 md:text-base">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            FINAL CTA
        ===================================================== */}

        <section className="bg-white">
          <div className="container-shell py-16 md:py-24">
            <div className="relative overflow-hidden rounded-[28px] bg-[#151513] px-7 py-10 md:px-12 md:py-12">
              {/* subtle lime glow */}
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--accent)] opacity-10 blur-3xl" />

              <div className="relative flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                    Ready to review
                  </p>

                  <h2 className="mt-4 text-3xl font-semibold leading-[1] tracking-[-0.055em] text-white md:text-5xl">
                    Apply with a resume you{" "}
                    <span className="brand-serif font-normal text-[var(--accent)]">
                      understand.
                    </span>
                  </h2>

                  <p className="mt-5 max-w-xl text-base leading-7 text-white/60 md:text-lg">
                    Start with a free analysis and see what your resume is
                    missing before your next application goes out.
                  </p>
                </div>

                {/* BLACK TEXT ON LIME = HIGH CONTRAST */}
                <Button
                  size="lg"
                  className="relative shrink-0 rounded-xl bg-[var(--accent)] px-6 text-[var(--accent-foreground)] shadow-[0_12px_35px_rgba(174,255,0,0.2)] hover:bg-[var(--accent)] hover:brightness-95"
                  asChild
                >
                  <Link href="/signup">
                    Analyze my resume
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}