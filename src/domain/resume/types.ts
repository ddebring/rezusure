export type ResumeId = string;

export type ResumeFileType = "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export type ResumeStatus = "uploaded" | "parsing" | "ready" | "analyzing" | "failed";

export interface ResumeMetadata {
  pageCount?: number;
  fileSizeBytes: number;
  language?: string;
}

export interface ResumeDocument {
  id: ResumeId;
  ownerId: string;
  originalFileName: string;
  storagePath: string;
  fileType: ResumeFileType;
  uploadedAt: string;
  status: ResumeStatus;
  parsedContent?: string;
  metadata: ResumeMetadata;
}
