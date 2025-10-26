import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { getServerConfig, validateApiKey } from "./config/config.js";
import {
  RAGException,
  DocumentProcessingError,
  VectorStoreError,
  LLMError,
  RetrievalError,
} from "./models/types.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Get server configuration
const serverConfig = getServerConfig();

// Ensure upload directory exists
const uploadDir = path.resolve(serverConfig.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ============================================================================
// Middleware Configuration
// ============================================================================

// CORS configuration for frontend communication
// Requirement 6.1, 6.2, 6.3, 6.4: Enable cross-origin requests
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Configure multer for file uploads
// Requirement 1.1, 1.2: Handle document file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

// File filter for allowed document types
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = [".pdf", ".txt", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Only PDF, TXT, and DOCX files are allowed. Got: ${ext}`
      )
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: serverConfig.maxFileSize,
  },
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Routes
// ============================================================================

import documentsRouter from "./routes/documents.routes.js";
import qaRouter from "./routes/qa.routes.js";
import configRouter from "./routes/config.routes.js";

// Mount routes
app.use("/api/documents", documentsRouter);
app.use("/api/qa", qaRouter);
app.use("/api/config", configRouter);

// ============================================================================
// Health Check Endpoint
// ============================================================================

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: serverConfig.nodeEnv,
  });
});

// ============================================================================
// Error Handling Middleware
// ============================================================================

// Error handler for multer file upload errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large",
        message: `File size exceeds the maximum allowed size of ${
          serverConfig.maxFileSize / (1024 * 1024)
        }MB`,
      });
    }
    return res.status(400).json({
      error: "File upload error",
      message: err.message,
    });
  }

  next(err);
});

// Global error handler
// Requirements 6.1, 6.2, 6.3, 6.4: Handle errors gracefully with descriptive messages
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);

  // Handle custom RAG exceptions
  if (err instanceof DocumentProcessingError) {
    return res.status(400).json({
      error: "Document processing failed",
      message: err.message,
    });
  }

  if (err instanceof VectorStoreError) {
    return res.status(503).json({
      error: "Vector store unavailable",
      message: err.message,
    });
  }

  if (err instanceof LLMError) {
    return res.status(503).json({
      error: "Language model API failure",
      message: err.message,
    });
  }

  if (err instanceof RetrievalError) {
    return res.status(404).json({
      error: "No relevant information found",
      message: err.message,
    });
  }

  if (err instanceof RAGException) {
    return res.status(500).json({
      error: "RAG system error",
      message: err.message,
    });
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation error",
      message: err.message,
    });
  }

  // Handle generic errors
  const statusCode = err.statusCode || err.status || 500;
  const message =
    serverConfig.nodeEnv === "production"
      ? "An unexpected error occurred"
      : err.message || "Internal server error";

  res.status(statusCode).json({
    error: err.name || "Error",
    message,
  });
});

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ============================================================================
// Server Initialization
// ============================================================================

/**
 * Start the Express server
 */
export function startServer(): void {
  try {
    // Validate API key before starting
    validateApiKey();

    const port = serverConfig.port;

    app.listen(port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║  Document Q&A System with RAG                              ║
║  Server running on port ${port}                               ║
║  Environment: ${serverConfig.nodeEnv}                            ║
║  Upload directory: ${uploadDir}                    ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Export app for route mounting
export default app;

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
