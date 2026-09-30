import OpenAI from "openai";
import { getServerEnv } from "@/lib/env/server";
import { ResumeAnalysisSchema, type ResumeAnalysisSchemaOutput } from "@/domain/ai/schema";

export interface ResumeAnalysisInput {
  resumeText: string;
  targetRole?: string;
}

export interface AIResumeAnalyzer {
  analyze(input: ResumeAnalysisInput): Promise<ResumeAnalysisSchemaOutput>;
}

const analysisSystemPrompt = `You are a resume optimization engine. Analyze resumes against ATS compatibility, content quality, structure, impact, and clarity. Return only JSON that matches the provided schema. Do not invent experience, education, metrics, employers, credentials, or keywords that are not justified by the supplied resume. Recommendations should be actionable and specific.`;

export class OpenAIResumeAnalyzer implements AIResumeAnalyzer {
  private readonly client: OpenAI;

  constructor() {
    const env = getServerEnv();
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  async analyze(input: ResumeAnalysisInput): Promise<ResumeAnalysisSchemaOutput> {
    const env = getServerEnv();
    if (!env.OPENAI_MODEL) throw new Error("OPENAI_MODEL is not configured.");
    const completion = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: analysisSystemPrompt },
        {
          role: "user",
          content: JSON.stringify({ targetRole: input.targetRole ?? null, resumeText: input.resumeText }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("AI provider returned an empty analysis.");
    return ResumeAnalysisSchema.parse(JSON.parse(content));
  }
}
