import assert from "node:assert/strict";
import test from "node:test";
import { assertNoUndefined, removeUndefined } from "@/lib/firebase/firestore-safe";
import { inferResumeDocumentKind } from "@/lib/resumes/extract";
import { buildResumeIntelligence, validateResumeAnalysisInput } from "./resume-intelligence";

const sampleResume = `
Alex Morgan
Growth Marketing Leader

Summary
Growth-focused marketer with 8+ years leading acquisition, experimentation, and lifecycle strategy. Delivered 310% user growth and 42% CAC reduction while scaling organic acquisition to 85M+ views and 140,000+ sign-ups.

Experience
Senior Growth Marketing Manager, Northstar Labs
- Drove acquisition strategy and content optimization across organic, paid, and lifecycle channels.
- Increased organic search growth by 240% year-over-year and drove 34% more course completions.
- Built experimentation programs that improved conversion and retention across key funnel stages.

Skills
SEO, AEO, content strategy, analytics, experimentation, growth marketing, lifecycle, conversion optimization, stakeholder management
`;

const sampleJobDescription = `
Senior RF Developer - Base station Antennas

We are seeking a Senior RF Developer with proven experience in RF and antenna design for multiband base-station antennas. The ideal candidate will have hands-on experience with 3D EM simulation, 2D simulation, RF measurements, and hardware prototypes. Candidates should be proficient in CST Microwave Studio, Ansys HFSS, AWR Microwave Office, and Keysight ADS. A degree in electrical engineering is required. Experience with PIM/EMC, MATLAB, Python, and cross-functional collaboration is preferred. Relocation to Rosenheim, Germany is required.
`;

test("resume intelligence engine creates the required 32-point diagnostic output and identifies RF gaps", () => {
  const analysis = buildResumeIntelligence({
    resumeText: sampleResume,
    jobDescription: sampleJobDescription,
    targetRole: "Senior RF Developer",
    resumeFileName: "alex-morgan-resume.pdf",
    userId: "user-123",
    resumeId: "resume-123",
  });

  assert.ok(analysis.diagnostic.length >= 40);
  assert.ok(analysis.diagnostic.some((check) => check.id === "R01" || check.id === "R40"));
  assert.ok(analysis.diagnostic.some((check) => check.id === "R30" || check.id === "R41"));
  assert.ok(analysis.keywords.some((keyword) => keyword.phrase === "ansys hfss" && keyword.evidenceStatus === "missing"));
  assert.ok(analysis.blockers.length > 0);
  assert.ok(analysis.scores.resumeQuality >= 0 && analysis.scores.resumeQuality <= 100);
  assert.ok(analysis.scores.jobMatch >= 0 && analysis.scores.jobMatch <= 100);
  assert.ok(analysis.scores.applicationReadiness >= 0 && analysis.scores.applicationReadiness <= 100);
  assert.ok(analysis.evidenceMap.length >= 3);
  assert.ok(analysis.recommendations.length >= 3);
});

test("resume intelligence engine distinguishes supported business evidence from missing technical qualifications", () => {
  const analysis = buildResumeIntelligence({
    resumeText: sampleResume,
    jobDescription: sampleJobDescription,
    targetRole: "Senior RF Developer",
  });

  const supportedBusinessSignal = analysis.strengths.some((strength) =>
    /(growth|analytical|execution|operating|leadership)/i.test(`${strength.title} ${strength.detail}`),
  );
  assert.ok(supportedBusinessSignal);

  const missingTool = analysis.keywords.find((keyword) => keyword.phrase === "ansys hfss");
  assert.ok(missingTool);
  assert.equal(missingTool?.evidenceStatus, "missing");
  assert.equal(missingTool?.fixability, "not_fixable_by_wording");
});

test("resume analysis validation rejects empty job descriptions before analysis starts", () => {
  assert.throws(() => {
    validateResumeAnalysisInput({
      resumeText: sampleResume,
      jobDescription: "   ",
      targetRole: "Senior RF Developer",
    });
  }, /Please paste the target job description/);
});

test("browser uploads with generic MIME types still infer the correct document kind", () => {
  assert.equal(inferResumeDocumentKind("candidate.pdf", "application/octet-stream"), "pdf");
  assert.equal(inferResumeDocumentKind("candidate.docx", "application/octet-stream"), "docx");
  assert.equal(inferResumeDocumentKind("candidate.PDF", "application/pdf"), "pdf");
  assert.equal(inferResumeDocumentKind("candidate.txt", "text/plain"), null);
});

test("firestore-safe normalizer strips undefined values while preserving legitimate falsy values", () => {
  const input = {
    targetRole: {
      title: "Head of Growth",
      company: "GlobalLogic",
      workModel: undefined,
      nested: {
        value: undefined,
        score: 0,
        required: false,
        notes: "",
        workModel: null,
      },
    },
    recommendations: [
      { title: "Improve keywords", score: undefined },
      { title: "Improve summary", score: 80 },
    ],
  } as const;

  const normalized = removeUndefined(input);
  assert.deepEqual(normalized, {
    targetRole: {
      title: "Head of Growth",
      company: "GlobalLogic",
      nested: {
        score: 0,
        required: false,
        notes: "",
        workModel: null,
      },
    },
    recommendations: [
      { title: "Improve keywords" },
      { title: "Improve summary", score: 80 },
    ],
  });

  assert.doesNotThrow(() => assertNoUndefined(normalized));
  assert.throws(() => assertNoUndefined({ targetRole: { workModel: undefined } }), /targetRole\.workModel/);
});
