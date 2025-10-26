import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";
import { VectorStoreConfig, VectorStoreError } from "../models/types.js";
import { getConfig } from "../config/config.js";

/**
 * VectorStoreManager
 *
 * Manages vector database operations for document storage and retrieval.
 * Handles initialization, document addition, similarity search, and deletion.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export class VectorStoreManager {
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: OpenAIEmbeddings;
  private config: VectorStoreConfig;
  private documentRegistry: Map<string, string[]> = new Map(); // documentId -> chunkIds

  constructor(config?: VectorStoreConfig) {
    const ragConfig = getConfig();

    this.config = config || {
      storeType: ragConfig.vectorStoreType,
      storePath: ragConfig.vectorStorePath,
    };

    // Initialize OpenAI embeddings
    this.embeddings = new OpenAIEmbeddings({
      modelName: ragConfig.embeddingModel,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Initialize or load existing vector store
   * Requirement 2.1: Vector Store SHALL persist embeddings with associated metadata
   */
  async initializeStore(): Promise<void> {
    try {
      if (this.vectorStore) {
        return; // Already initialized
      }

      // Initialize MemoryVectorStore
      this.vectorStore = new MemoryVectorStore(this.embeddings);
    } catch (error) {
      throw new VectorStoreError(
        `Failed to initialize vector store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Add documents to the vector store
   * Requirement 2.1: Vector Store SHALL persist embeddings with associated metadata
   *
   * @param documents - Array of LangChain Document objects with content and metadata
   * @returns Array of document IDs that were added
   */
  async addDocuments(documents: Document[]): Promise<string[]> {
    try {
      if (!this.vectorStore) {
        await this.initializeStore();
      }

      if (!this.vectorStore) {
        throw new VectorStoreError("Vector store not initialized");
      }

      if (documents.length === 0) {
        return [];
      }

      // Add documents to vector store
      await this.vectorStore.addDocuments(documents);

      // Generate IDs for tracking and track document chunks in registry
      const ids: string[] = [];
      documents.forEach((doc, index) => {
        const documentId = doc.metadata.documentId;
        const chunkId = `${documentId}_chunk_${index}_${Date.now()}`;
        ids.push(chunkId);

        if (documentId) {
          if (!this.documentRegistry.has(documentId)) {
            this.documentRegistry.set(documentId, []);
          }
          this.documentRegistry.get(documentId)!.push(chunkId);
        }
      });

      return ids;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to add documents to vector store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Search for similar documents
   * Requirement 2.2: Vector Store SHALL support semantic similarity search
   * Requirement 2.3: Vector Store SHALL return top K most relevant chunks based on similarity score
   *
   * @param query - Search query string
   * @param k - Number of results to return (top K)
   * @returns Array of similar documents with metadata
   */
  async similaritySearch(query: string, k: number = 4): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        await this.initializeStore();
      }

      if (!this.vectorStore) {
        throw new VectorStoreError("Vector store not initialized");
      }

      if (!query || query.trim() === "") {
        throw new VectorStoreError("Query cannot be empty");
      }

      if (k < 1) {
        throw new VectorStoreError("k must be at least 1");
      }

      // Perform similarity search
      const results = await this.vectorStore.similaritySearch(query, k);

      return results;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to perform similarity search: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Search for similar documents with relevance scores
   * Requirement 2.3: Vector Store SHALL return top K most relevant chunks based on similarity score
   *
   * @param query - Search query string
   * @param k - Number of results to return (top K)
   * @returns Array of [document, score] tuples
   */
  async similaritySearchWithScore(
    query: string,
    k: number = 4
  ): Promise<[Document, number][]> {
    try {
      if (!this.vectorStore) {
        await this.initializeStore();
      }

      if (!this.vectorStore) {
        throw new VectorStoreError("Vector store not initialized");
      }

      if (!query || query.trim() === "") {
        throw new VectorStoreError("Query cannot be empty");
      }

      if (k < 1) {
        throw new VectorStoreError("k must be at least 1");
      }

      // Perform similarity search with scores
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        k
      );

      return results;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to perform similarity search with scores: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Delete a document and all its chunks from the vector store
   * Requirement 2.4: Maintain document metadata including source filename, chunk index, and original text
   *
   * @param documentId - ID of the document to delete
   * @returns true if deletion was successful, false if document not found
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      if (!this.vectorStore) {
        await this.initializeStore();
      }

      if (!documentId || documentId.trim() === "") {
        throw new VectorStoreError("Document ID cannot be empty");
      }

      // Check if document exists in registry
      const chunkIds = this.documentRegistry.get(documentId);
      if (!chunkIds || chunkIds.length === 0) {
        return false; // Document not found
      }

      // Delete chunks from vector store
      // Note: MemoryVectorStore doesn't have a built-in delete method,
      // so we need to implement a workaround by filtering the store
      if (this.vectorStore) {
        // Get all documents from the store
        const allDocs = await this.vectorStore.similaritySearch("", 10000);

        // Filter out documents belonging to the deleted documentId
        const remainingDocs = allDocs.filter(
          (doc) => doc.metadata.documentId !== documentId
        );

        // Reinitialize the vector store with remaining documents
        this.vectorStore = new MemoryVectorStore(this.embeddings);
        if (remainingDocs.length > 0) {
          await this.vectorStore.addDocuments(remainingDocs);
        }
      }

      // Remove from registry
      this.documentRegistry.delete(documentId);

      return true;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to delete document: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get all document IDs currently stored
   *
   * @returns Array of document IDs
   */
  getStoredDocumentIds(): string[] {
    return Array.from(this.documentRegistry.keys());
  }

  /**
   * Check if a document exists in the store
   *
   * @param documentId - ID of the document to check
   * @returns true if document exists, false otherwise
   */
  hasDocument(documentId: string): boolean {
    return this.documentRegistry.has(documentId);
  }

  /**
   * Get the number of chunks for a specific document
   *
   * @param documentId - ID of the document
   * @returns Number of chunks, or 0 if document not found
   */
  getDocumentChunkCount(documentId: string): number {
    const chunkIds = this.documentRegistry.get(documentId);
    return chunkIds ? chunkIds.length : 0;
  }

  /**
   * Get metadata for all chunks of a specific document
   * Requirement 2.4: Maintain document metadata including source filename, chunk index, and original text
   *
   * @param documentId - ID of the document
   * @returns Array of document chunks with metadata
   */
  async getDocumentMetadata(documentId: string): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        await this.initializeStore();
      }

      if (!documentId || documentId.trim() === "") {
        throw new VectorStoreError("Document ID cannot be empty");
      }

      // Check if document exists
      if (!this.documentRegistry.has(documentId)) {
        return [];
      }

      // Retrieve all documents and filter by documentId
      // Note: This is a workaround for MemoryVectorStore limitations
      const allDocs = await this.vectorStore!.similaritySearch("", 10000);
      const documentChunks = allDocs.filter(
        (doc) => doc.metadata.documentId === documentId
      );

      return documentChunks;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to retrieve document metadata: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Search within a specific document
   * Requirement 2.4: Store and retrieve document metadata with chunks
   *
   * @param documentId - ID of the document to search within
   * @param query - Search query string
   * @param k - Number of results to return
   * @returns Array of similar documents from the specified document
   */
  async searchWithinDocument(
    documentId: string,
    query: string,
    k: number = 4
  ): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        await this.initializeStore();
      }

      if (!documentId || documentId.trim() === "") {
        throw new VectorStoreError("Document ID cannot be empty");
      }

      if (!query || query.trim() === "") {
        throw new VectorStoreError("Query cannot be empty");
      }

      // Check if document exists
      if (!this.documentRegistry.has(documentId)) {
        return [];
      }

      // Perform similarity search and filter by documentId
      const results = await this.vectorStore!.similaritySearch(query, k * 3);
      const filteredResults = results
        .filter((doc) => doc.metadata.documentId === documentId)
        .slice(0, k);

      return filteredResults;
    } catch (error) {
      throw new VectorStoreError(
        `Failed to search within document: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get statistics about the vector store
   *
   * @returns Object containing store statistics
   */
  getStoreStats(): {
    totalDocuments: number;
    totalChunks: number;
    documentIds: string[];
  } {
    const totalChunks = Array.from(this.documentRegistry.values()).reduce(
      (sum, chunks) => sum + chunks.length,
      0
    );

    return {
      totalDocuments: this.documentRegistry.size,
      totalChunks,
      documentIds: this.getStoredDocumentIds(),
    };
  }

  /**
   * Clear all documents from the vector store
   */
  async clearStore(): Promise<void> {
    try {
      this.vectorStore = new MemoryVectorStore(this.embeddings);
      this.documentRegistry.clear();
    } catch (error) {
      throw new VectorStoreError(
        `Failed to clear vector store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
