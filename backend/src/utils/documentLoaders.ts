import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { DocumentProcessingError } from "../models/types.js";

/**
 * Supported document file types
 */
export enum DocumentType {
  PDF = "pdf",
  TXT = "txt",
  DOCX = "docx",
}

/**
 * Result of document loading operation
 */
export interface LoadedDocument {
  content: string;
  metadata: {
    filename: string;
    fileType: string;
    fileSize: number;
    pageCount?: number;
  };
}

/**
 * Detect document type from file extension
 */
export function detectDocumentType(filename: string): DocumentType {
  const ext = path.extname(filename).toLowerCase().replace(".", "");

  switch (ext) {
    case "pdf":
      return DocumentType.PDF;
    case "txt":
      return DocumentType.TXT;
    case "docx":
      return DocumentType.DOCX;
    default:
      throw new DocumentProcessingError(
        `Unsupported file type: ${ext}. Supported types are: PDF, TXT, DOCX`
      );
  }
}

/**
 * Load PDF document using pdf-parse
 */
export async function loadPDF(filePath: string): Promise<LoadedDocument> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    if (!data.text || data.text.trim().length === 0) {
      throw new DocumentProcessingError(
        "PDF document is empty or contains no extractable text"
      );
    }

    const stats = await fs.stat(filePath);

    return {
      content: data.text,
      metadata: {
        filename: path.basename(filePath),
        fileType: "pdf",
        fileSize: stats.size,
        pageCount: data.numpages,
      },
    };
  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      throw error;
    }
    throw new DocumentProcessingError(
      `Failed to load PDF file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Load TXT document using fs
 */
export async function loadTXT(filePath: string): Promise<LoadedDocument> {
  try {
    const content = await fs.readFile(filePath, "utf-8");

    if (!content || content.trim().length === 0) {
      throw new DocumentProcessingError("TXT document is empty");
    }

    const stats = await fs.stat(filePath);

    return {
      content,
      metadata: {
        filename: path.basename(filePath),
        fileType: "txt",
        fileSize: stats.size,
      },
    };
  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      throw error;
    }
    throw new DocumentProcessingError(
      `Failed to load TXT file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Load DOCX document using mammoth
 */
export async function loadDOCX(filePath: string): Promise<LoadedDocument> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });

    if (!result.value || result.value.trim().length === 0) {
      throw new DocumentProcessingError(
        "DOCX document is empty or contains no extractable text"
      );
    }

    const stats = await fs.stat(filePath);

    return {
      content: result.value,
      metadata: {
        filename: path.basename(filePath),
        fileType: "docx",
        fileSize: stats.size,
      },
    };
  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      throw error;
    }
    throw new DocumentProcessingError(
      `Failed to load DOCX file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Document loader factory - loads document based on file type
 */
export async function loadDocument(filePath: string): Promise<LoadedDocument> {
  try {
    // Check if file exists
    await fs.access(filePath);
  } catch (error) {
    throw new DocumentProcessingError(
      `File not found or not accessible: ${filePath}`
    );
  }

  const filename = path.basename(filePath);
  const documentType = detectDocumentType(filename);

  switch (documentType) {
    case DocumentType.PDF:
      return loadPDF(filePath);
    case DocumentType.TXT:
      return loadTXT(filePath);
    case DocumentType.DOCX:
      return loadDOCX(filePath);
    default:
      throw new DocumentProcessingError(
        `Unsupported document type: ${documentType}`
      );
  }
}

/**
 * Validate file before processing
 */
export async function validateFile(
  filePath: string,
  maxSizeBytes: number = 10485760
): Promise<void> {
  try {
    const stats = await fs.stat(filePath);

    if (stats.size === 0) {
      throw new DocumentProcessingError("File is empty");
    }

    if (stats.size > maxSizeBytes) {
      const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      throw new DocumentProcessingError(
        `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
      );
    }

    // Validate file type
    detectDocumentType(path.basename(filePath));
  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      throw error;
    }
    throw new DocumentProcessingError(
      `File validation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
