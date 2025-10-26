// ============================================================================
// Document Models
// ============================================================================

export interface DocumentMetadata {
  documentId: string;
  filename: string;
  fileType: string;
  uploadDate: Date;
  chunkCount: number;
  fileSize: number;
}

export interface DocumentChunk {
  chunkId: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  metadata: Record<string, any>;
}

// ============================================================================
// Q&A Models
// ============================================================================

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

export interface QAConfig {
  topK: number;
  temperature: number;
  maxTokens: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

// ============================================================================
// Configuration Models
// ============================================================================

export interface RAGConfig {
  // Document Processing
  chunkSize: number;
  chunkOverlap: number;

  // Embeddings
  embeddingModel: string;

  // Vector Store
  vectorStoreType: "memory" | "chroma";
  vectorStorePath?: string;

  // LLM
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;

  // Retrieval
  topK: number;
  scoreThreshold: number;
}

export interface VectorStoreConfig {
  storeType: "memory" | "chroma";
  storePath?: string;
}

// ============================================================================
// Service Response Models
// ============================================================================

export interface IngestResult {
  success: boolean;
  documentId: string;
  chunkCount: number;
  error?: string;
}

export interface IngestionStatus {
  documentId: string;
  status: "processing" | "completed" | "failed";
  progress: number;
}

// ============================================================================
// Error Classes
// ============================================================================

export class RAGException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RAGException";
    Object.setPrototypeOf(this, RAGException.prototype);
  }
}

export class DocumentProcessingError extends RAGException {
  constructor(message: string) {
    super(message);
    this.name = "DocumentProcessingError";
    Object.setPrototypeOf(this, DocumentProcessingError.prototype);
  }
}

export class VectorStoreError extends RAGException {
  constructor(message: string) {
    super(message);
    this.name = "VectorStoreError";
    Object.setPrototypeOf(this, VectorStoreError.prototype);
  }
}

export class LLMError extends RAGException {
  constructor(message: string) {
    super(message);
    this.name = "LLMError";
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

export class RetrievalError extends RAGException {
  constructor(message: string) {
    super(message);
    this.name = "RetrievalError";
    Object.setPrototypeOf(this, RetrievalError.prototype);
  }
}
