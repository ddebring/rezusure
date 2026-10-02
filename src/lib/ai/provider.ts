import { GoogleGenAI, Type } from "@google/genai";
import { ResumeAnalysisSchema, type ResumeAnalysisSchemaOutput } from "@/domain/ai/schema";

export interface ResumeAnalysisInput {
  resumeText: string;
  jobDescription?: string;
  targetRole?: string;
}

export interface AIProvider {
  analyzeResume(input: ResumeAnalysisInput): Promise<ResumeAnalysisSchemaOutput>;
}

export interface AIResumeAnalyzer {
  analyze(input: ResumeAnalysisInput): Promise<ResumeAnalysisSchemaOutput>;
}

const analysisSystemPrompt = `You are a resume optimization engine that performs a job-specific match analysis.
Compare the candidate RESUME against the TARGET JOB DESCRIPTION.
If jobDescription is blank or missing, perform a generic resume quality assessment instead.
Return only valid JSON matching the schema.

Rules:
- Use only evidence present in the resume. Do not invent skills, experience, metrics, employers, education, certifications, or accomplishments.
- If a job requirement is not supported by the resume, explicitly treat it as missing or no evidence.
- The analysis must compare RESUME and TARGET JOB DESCRIPTION, not evaluate the resume in isolation.
- Keep the output concise, structured, and actionable.
- matchedKeywords should list job keywords or phrases that are supported by the resume.
- missingKeywords should list job keywords or phrases that are absent or weakly supported.
- jobRequirements should list the key requirements from the job description and call out missing ones if no evidence is present.
- detectedProblems should describe the reasons the candidate is a poor fit or why the resume fails the target role.
- sectionFeedback should assess summary, experience, education, and skills based on the comparison.
`;

const getEnvNumber = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resumeAnalysisResponseSchema = {
  type: Type.OBJECT,
  description: "Structured resume analysis comparing a resume against a target job description or a generic resume quality review.",
  properties: {
    overallScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
    atsScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
    contentScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
    structureScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
    impactScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
    clarityScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
    summary: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    detectedProblems: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
    matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    jobRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
    sectionFeedback: {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, minimum: 0, maximum: 100 },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["score", "strengths", "issues", "suggestions"],
        },
        experience: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, minimum: 0, maximum: 100 },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["score", "strengths", "issues", "suggestions"],
        },
        education: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, minimum: 0, maximum: 100 },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["score", "strengths", "issues", "suggestions"],
        },
        skills: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, minimum: 0, maximum: 100 },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["score", "strengths", "issues", "suggestions"],
        },
      },
      required: ["summary", "experience", "education", "skills"],
    },
  },
  required: [
    "overallScore",
    "atsScore",
    "contentScore",
    "structureScore",
    "impactScore",
    "clarityScore",
    "summary",
    "strengths",
    "detectedProblems",
    "recommendations",
    "matchedKeywords",
    "missingKeywords",
    "jobRequirements",
    "sectionFeedback",
  ],
} as const;

class AIProviderError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly statusCode?: number;

  constructor(message: string, code: string, retryable: boolean, statusCode?: number) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}

export class AIQuotaExceededError extends AIProviderError {
  constructor() {
    super("Gemini quota or rate limit exceeded.", "AI_QUOTA_EXCEEDED", false, 429);
  }
}

export class AIRateLimitedError extends AIProviderError {
  constructor() {
    super("Gemini requests are being rate-limited.", "AI_RATE_LIMITED", false, 429);
  }
}

export class AIProviderBusyError extends AIProviderError {
  constructor() {
    super("Gemini is temporarily busy.", "AI_PROVIDER_BUSY", true, 503);
  }
}

export class AIAuthError extends AIProviderError {
  constructor() {
    super("Gemini authentication failed.", "AI_AUTH_ERROR", false, 401);
  }
}

export class AIBadRequestError extends AIProviderError {
  constructor() {
    super("Gemini request was malformed.", "AI_BAD_REQUEST", false, 400);
  }
}

export class AIProviderFailureError extends AIProviderError {
  constructor() {
    super("Unexpected Gemini provider failure.", "AI_PROVIDER_ERROR", true, 500);
  }
}

export class AITimeoutError extends AIProviderError {
  constructor() {
    super("Gemini request timed out.", "AI_TIMEOUT", true, 504);
  }
}

const normalizeProviderError = (error: unknown): AIProviderError => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const apiError = error as {
    status?: number;
    statusCode?: number;
    code?: number | string;
    message?: string;
  };

  if (error instanceof AIProviderError) return error;

  const status = apiError?.status ?? apiError?.statusCode ?? apiError?.code;

  if (status === 401 || /api key|authentication|unauthorized|forbidden/i.test(message)) {
    return new AIAuthError();
  }

  if (status === 400 || /malformed|invalid request|bad request|schema/i.test(message)) {
    return new AIBadRequestError();
  }

  if (status === 429 || /quota|rate limit|too many requests/i.test(message)) {
    return /quota|exhausted|limit reached/i.test(message) ? new AIQuotaExceededError() : new AIRateLimitedError();
  }

  if (status === 503 || /high demand|unavailable|temporarily busy|overloaded/i.test(message)) {
    return new AIProviderBusyError();
  }

  if (/timeout|timed out/i.test(message)) {
    return new AITimeoutError();
  }

  if (/invalid json|json.*parse|schema.*validation|malformed response/i.test(message)) {
    return new AIBadRequestError();
  }

  return new AIProviderFailureError();
};

export class GeminiResumeAnalyzer implements AIProvider, AIResumeAnalyzer {
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError("GEMINI_API_KEY is not configured.", "AI_AUTH_ERROR", false, 500);
    }

    this.client = new GoogleGenAI({ apiKey });
    this.model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    this.maxRetries = getEnvNumber("GEMINI_MAX_RETRIES", getEnvNumber("AI_MAX_RETRIES", 2));
    this.timeoutMs = getEnvNumber("GEMINI_TIMEOUT_MS", getEnvNumber("AI_TIMEOUT_MS", 30000));
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new AITimeoutError()), this.timeoutMs);
      promise
        .then((value) => {
          clearTimeout(timeout);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private async generateAnalysis(input: ResumeAnalysisInput): Promise<ResumeAnalysisSchemaOutput> {
    const startedAt = Date.now();
    console.log("[AI] provider=gemini model=%s request_started", this.model);

    const response = await this.withTimeout(
      this.client.models.generateContent({
        model: this.model,
        contents: JSON.stringify({
          targetRole: input.targetRole ?? null,
          jobDescription: input.jobDescription ?? null,
          resumeText: input.resumeText,
        }),
        config: {
          systemInstruction: analysisSystemPrompt,
          responseMimeType: "application/json",
          responseSchema: resumeAnalysisResponseSchema,
        },
      })
    );

    const latencyMs = Date.now() - startedAt;
    console.log("[AI] provider=gemini model=%s request_completed latency_ms=%d", this.model, latencyMs);

    const contentText = response.text;
    if (!contentText) {
      throw new AIBadRequestError();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(contentText);
    } catch {
      throw new AIBadRequestError();
    }

    const validated = ResumeAnalysisSchema.safeParse(parsed);
    if (!validated.success) {
      throw new AIBadRequestError();
    }

    return validated.data;
  }

  async analyzeResume(input: ResumeAnalysisInput): Promise<ResumeAnalysisSchemaOutput> {
    let attempt = 0;
    while (true) {
      try {
        return await this.generateAnalysis(input);
      } catch (error) {
        const normalized = normalizeProviderError(error);

        if (!normalized.retryable || attempt >= this.maxRetries) {
          console.error("[AI] provider=gemini model=%s error_type=%s", this.model, normalized.code);
          throw normalized;
        }

        const baseDelay = 250 * 2 ** attempt;
        const jitter = Math.floor(Math.random() * 250);
        const waitMs = baseDelay + jitter;
        console.warn("[AI] provider=gemini model=%s retrying attempt=%d/%d wait_ms=%d error_type=%s", this.model, attempt + 1, this.maxRetries, waitMs, normalized.code);
        await sleep(waitMs);
        attempt += 1;
      }
    }
  }

  async analyze(input: ResumeAnalysisInput): Promise<ResumeAnalysisSchemaOutput> {
    return this.analyzeResume(input);
  }
}
