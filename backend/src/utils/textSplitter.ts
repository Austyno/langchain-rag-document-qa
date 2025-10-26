import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { RAGConfig } from "../models/types.js";
import { DocumentProcessingError } from "../models/types.js";

/**
 * Create a text splitter configured with RAG settings
 */
export function createTextSplitter(
  config: RAGConfig
): RecursiveCharacterTextSplitter {
  return new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
    separators: ["\n\n", "\n", " ", ""],
  });
}

/**
 * Split text into chunks using RecursiveCharacterTextSplitter
 */
export async function splitText(
  text: string,
  config: RAGConfig,
  metadata: Record<string, any> = {}
): Promise<Document[]> {
  try {
    // Handle empty or very small documents
    if (!text || text.trim().length === 0) {
      throw new DocumentProcessingError(
        "Cannot split empty document"
      );
    }

    const trimmedText = text.trim();

    // If document is smaller than chunk size, return as single chunk
    if (trimmedText.length <= config.chunkSize) {
      return [
        new Document({
          pageContent: trimmedText,
          metadata: {
            ...metadata,
            chunkIndex: 0,
            totalChunks: 1,
          },
        }),
      ];
    }

    // Create text splitter with configuration
    const textSplitter = createTextSplitter(config);

    // Split the text into documents
    const documents = await textSplitter.createDocuments(
      [trimmedText],
      [metadata]
    );

    // Add chunk index and total chunks to metadata
    const documentsWithIndex = documents.map((doc, index) => {
      return new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          chunkIndex: index,
          totalChunks: documents.length,
        },
      });
    });

    return documentsWithIndex;
  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      throw error;
    }
    throw new DocumentProcessingError(
      `Failed to split text: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Validate text splitting configuration
 */
export function validateSplittingConfig(config: RAGConfig): void {
  if (config.chunkSize <= 0) {
    throw new DocumentProcessingError(
      `Invalid chunk size: ${config.chunkSize}. Must be greater than 0.`
    );
  }

  if (config.chunkOverlap < 0) {
    throw new DocumentProcessingError(
      `Invalid chunk overlap: ${config.chunkOverlap}. Must be non-negative.`
    );
  }

  if (config.chunkOverlap >= config.chunkSize) {
    throw new DocumentProcessingError(
      `Chunk overlap (${config.chunkOverlap}) must be less than chunk size (${config.chunkSize})`
    );
  }
}

/**
 * Get estimated chunk count for a text
 */
export function estimateChunkCount(
  textLength: number,
  config: RAGConfig
): number {
  if (textLength <= config.chunkSize) {
    return 1;
  }

  // Rough estimation: account for overlap
  const effectiveChunkSize = config.chunkSize - config.chunkOverlap;
  return Math.ceil(textLength / effectiveChunkSize);
}
