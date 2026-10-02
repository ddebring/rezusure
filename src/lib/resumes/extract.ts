export type ResumeDocumentKind = "pdf" | "docx";

export function inferResumeDocumentKind(fileName: string, mimeType?: string | null): ResumeDocumentKind | null {
  const normalizedName = (fileName || "").toLowerCase();
  const normalizedMime = (mimeType || "").toLowerCase();

  if (normalizedMime === "application/pdf" || normalizedName.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    normalizedMime.includes("wordprocessingml") ||
    normalizedMime.includes("docx") ||
    normalizedName.endsWith(".docx")
  ) {
    return "docx";
  }

  return null;
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParseModule = await import("pdf-parse");
  const pdfParseFn = ((pdfParseModule as { default?: (buffer: Buffer) => Promise<{ text?: string }> }).default ?? pdfParseModule) as (buffer: Buffer) => Promise<{ text?: string }>;
  const parsed = await pdfParseFn(buffer);
  const text = typeof parsed?.text === "string" ? parsed.text : "";
  return normalizeExtractedText(text);
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammothModule = await import("mammoth");
  const mammoth = (mammothModule as { default?: typeof import("mammoth") }).default ?? mammothModule;
  const parsed = await mammoth.extractRawText({ buffer });
  return normalizeExtractedText(parsed?.value ?? "");
}

export async function extractResumeTextFromFile(file: {
  name: string;
  type?: string | null;
  arrayBuffer: () => Promise<ArrayBuffer>;
}): Promise<{ text: string; kind: ResumeDocumentKind }> {
  const kind = inferResumeDocumentKind(file.name, file.type);
  if (!kind) {
    throw new Error("Please upload a PDF or DOCX resume.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extractedText = kind === "pdf" ? await extractPdfText(buffer) : await extractDocxText(buffer);

  if (!extractedText || extractedText.length < 20) {
    throw new Error("Unable to extract readable text from this resume. Please upload a text-based PDF or DOCX.");
  }

  return { text: extractedText, kind };
}
