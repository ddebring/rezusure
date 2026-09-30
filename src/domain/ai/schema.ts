import { z } from "zod";

const score = z.number().int().min(0).max(100);
const feedback = z.object({
  score,
  strengths: z.array(z.string().max(500)).max(20),
  issues: z.array(z.string().max(500)).max(20),
  suggestions: z.array(z.string().max(700)).max(20),
});

export const ResumeAnalysisSchema = z.object({
  overallScore: score,
  categoryScores: z.object({
    ats: score,
    content: score,
    structure: score,
    impact: score,
    clarity: score,
  }),
  summary: z.string().max(3000),
  strengths: z.array(z.string().max(600)).max(20),
  criticalIssues: z.array(z.string().max(600)).max(20),
  recommendations: z.array(z.string().max(800)).max(30),
  sections: z.object({
    summary: feedback,
    experience: feedback,
    education: feedback,
    skills: feedback,
  }),
  keywords: z.object({
    present: z.array(z.string().max(100)).max(100),
    missing: z.array(z.string().max(100)).max(100),
  }),
});

export type ResumeAnalysisSchemaOutput = z.infer<typeof ResumeAnalysisSchema>;
