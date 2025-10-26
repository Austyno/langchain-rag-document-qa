// Shared types for frontend (matching backend types)

export interface DocumentMetadata {
  documentId: string;
  filename: string;
  fileType: string;
  uploadDate: Date | string;
  chunkCount: number;
  fileSize: number;
}

export interface SourceDocument {
  documentId: string;
  filename: string;
  content: string;
  chunkIndex: number;
  relevanceScore: number;
}

export interface QAResponse {
  answer: string;
  sources: SourceDocument[];
  confidence: number;
  processingTime: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface IngestResult {
  success: boolean;
  documentId: string;
  chunkCount: number;
  error?: string;
}
