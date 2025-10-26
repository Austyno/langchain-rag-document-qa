import { randomUUID } from "crypto";
import { Document } from "langchain/document";
import {
  RAGConfig,
  IngestResult,
  IngestionStatus,
  DocumentMetadata,
  DocumentProcessingError,
} from "../models/types.js";
import { loadDocument, validateFile } from "../utils/documentLoaders.js";
import { splitText, validateSplittingConfig } from "../utils/textSplitter.js";

/**
 * Ingestion status tracking
 */
interface IngestionState {
  documentId: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  error?: string;
  metadata?: DocumentMetadata;
  chunks?: Document[];
}

/**
 * Document Ingestion Service
 * Orchestrates document loading, splitting, and preparation for embedding
 */
export class DocumentIngestionService {
  private ingestionStates: Map<string, IngestionState>;

  constructor() {
    this.ingestionStates = new Map();
  }

  /**
   * Generate a unique document ID
   */
  private generateDocumentId(): string {
    return randomUUID();
  }

  /**
   * Update ingestion progress
   */
  private updateProgress(
    documentId: string,
    status: "processing" | "completed" | "failed",
    progress: number,
    error?: string
  ): void {
    const state = this.ingestionStates.get(documentId);
    if (state) {
      state.status = status;
      state.progress = progress;
      if (error) {
        state.error = error;
      }
    }
  }

  /**
   * Ingest a document: load, split, and prepare for embedding
   */
  async ingestDocument(
    filePath: string,
    config: RAGConfig,
    maxFileSize?: number
  ): Promise<IngestResult> {
    const documentId = this.generateDocumentId();

    // Initialize ingestion state
    this.ingestionStates.set(documentId, {
      documentId,
      status: "processing",
      progress: 0,
    });

    try {
      // Step 1: Validate file (10% progress)
      this.updateProgress(documentId, "processing", 10);
      await validateFile(filePath, maxFileSize);

      // Step 2: Validate splitting configuration
      validateSplittingConfig(config);

      // Step 3: Load document (40% progress)
      this.updateProgress(documentId, "processing", 40);
      const loadedDoc = await loadDocument(filePath);

      // Step 4: Split text into chunks (70% progress)
      this.updateProgress(documentId, "processing", 70);
      const chunks = await splitText(loadedDoc.content, config, {
        documentId,
        filename: loadedDoc.metadata.filename,
        fileType: loadedDoc.metadata.fileType,
        fileSize: loadedDoc.metadata.fileSize,
        pageCount: loadedDoc.metadata.pageCount,
      });

      // Step 5: Create document metadata (90% progress)
      this.updateProgress(documentId, "processing", 90);
      const metadata: DocumentMetadata = {
        documentId,
        filename: loadedDoc.metadata.filename,
        fileType: loadedDoc.metadata.fileType,
        uploadDate: new Date(),
        chunkCount: chunks.length,
        fileSize: loadedDoc.metadata.fileSize,
      };

      // Step 6: Store state and complete (100% progress)
      const state = this.ingestionStates.get(documentId);
      if (state) {
        state.metadata = metadata;
        state.chunks = chunks;
      }

      this.updateProgress(documentId, "completed", 100);

      return {
        success: true,
        documentId,
        chunkCount: chunks.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.updateProgress(documentId, "failed", 0, errorMessage);

      return {
        success: false,
        documentId,
        chunkCount: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Get ingestion status for a document
   */
  async getIngestionStatus(documentId: string): Promise<IngestionStatus> {
    const state = this.ingestionStates.get(documentId);

    if (!state) {
      throw new DocumentProcessingError(
        `No ingestion record found for document ID: ${documentId}`
      );
    }

    return {
      documentId: state.documentId,
      status: state.status,
      progress: state.progress,
    };
  }

  /**
   * Get document metadata after ingestion
   */
  getDocumentMetadata(documentId: string): DocumentMetadata | undefined {
    const state = this.ingestionStates.get(documentId);
    return state?.metadata;
  }

  /**
   * Get document chunks after ingestion
   */
  getDocumentChunks(documentId: string): Document[] | undefined {
    const state = this.ingestionStates.get(documentId);
    return state?.chunks;
  }

  /**
   * Get all document metadata
   */
  getAllDocuments(): DocumentMetadata[] {
    const documents: DocumentMetadata[] = [];

    for (const state of this.ingestionStates.values()) {
      if (state.metadata && state.status === "completed") {
        documents.push(state.metadata);
      }
    }

    return documents;
  }

  /**
   * Remove document from ingestion tracking
   */
  removeDocument(documentId: string): boolean {
    return this.ingestionStates.delete(documentId);
  }

  /**
   * Clear all ingestion states (useful for testing)
   */
  clearAll(): void {
    this.ingestionStates.clear();
  }

  /**
   * Get total number of tracked documents
   */
  getDocumentCount(): number {
    return this.ingestionStates.size;
  }
}
