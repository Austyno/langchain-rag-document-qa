import { Router, Request, Response, NextFunction } from "express";
import { upload } from "../server.js";
import { DocumentIngestionService } from "../services/documentIngestion.service.js";
import { VectorStoreManager } from "../services/vectorStore.service.js";
import { getConfig, getServerConfig } from "../config/config.js";
import { DocumentProcessingError } from "../models/types.js";
import fs from "fs";
import path from "path";

const router = Router();

// Initialize services
const documentIngestionService = new DocumentIngestionService();
const vectorStoreManager = new VectorStoreManager();

// ============================================================================
// POST /api/documents/upload - Upload and process a document
// Requirements: 1.1, 1.2, 1.3, 6.1
// ============================================================================

router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate file was uploaded
      if (!req.file) {
        throw new DocumentProcessingError("No file uploaded");
      }

      const filePath = req.file.path;
      const config = getConfig();
      const serverConfig = getServerConfig();

      // Ingest the document
      // Requirement 1.1: Accept PDF, TXT, and DOCX file formats
      // Requirement 1.2: Extract text content from document
      const result = await documentIngestionService.ingestDocument(
        filePath,
        config,
        serverConfig.maxFileSize
      );

      if (!result.success) {
        // Clean up uploaded file on failure
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        // Requirement 6.1: Provide descriptive error message on processing failure
        throw new DocumentProcessingError(
          result.error || "Document processing failed"
        );
      }

      // Get document chunks and add to vector store
      const chunks = documentIngestionService.getDocumentChunks(
        result.documentId
      );

      if (chunks && chunks.length > 0) {
        // Requirement 1.3: Generate embeddings and store in vector store
        await vectorStoreManager.addDocuments(chunks);
      }

      // Get document metadata
      const metadata = documentIngestionService.getDocumentMetadata(
        result.documentId
      );

      res.status(201).json({
        success: true,
        documentId: result.documentId,
        chunkCount: result.chunkCount,
        metadata,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// GET /api/documents - List all uploaded documents
// Requirements: 1.1, 1.2, 1.3, 6.1
// ============================================================================

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documents = documentIngestionService.getAllDocuments();

    res.json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/documents/:id/status - Get document processing status
// Requirements: 1.1, 1.2, 1.3, 6.1
// ============================================================================

router.get(
  "/:id/status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new DocumentProcessingError("Document ID is required");
      }

      // Get ingestion status
      const status = await documentIngestionService.getIngestionStatus(id);

      res.json({
        success: true,
        ...status,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// DELETE /api/documents/:id - Delete a document
// Requirements: 1.1, 1.2, 1.3, 6.1
// ============================================================================

router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new DocumentProcessingError("Document ID is required");
      }

      // Delete from vector store
      const deletedFromStore = await vectorStoreManager.deleteDocument(id);

      // Delete from ingestion service
      const deletedFromService = documentIngestionService.removeDocument(id);

      if (!deletedFromStore && !deletedFromService) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      res.json({
        success: true,
        message: "Document deleted successfully",
        documentId: id,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
