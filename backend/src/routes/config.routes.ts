import { Router, Request, Response, NextFunction } from "express";
import {
  getConfig,
  updateConfig,
  ConfigurationError,
} from "../config/config.js";
import { RAGConfig } from "../models/types.js";

const router = Router();

// ============================================================================
// GET /api/config - Get current RAG configuration
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
// ============================================================================

router.get("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = getConfig();

    // Requirement 5.1, 5.2, 5.3, 5.4, 5.5: Return all configuration parameters
    res.json({
      success: true,
      config,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PUT /api/config - Update configuration
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
// ============================================================================

router.put("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const updates = req.body;

    if (!updates || typeof updates !== "object") {
      throw new ConfigurationError("Request body must be an object");
    }

    // Validate updates
    const validatedUpdates: Partial<RAGConfig> = {};

    // Requirement 5.1: Allow configuration of chunk size
    if (updates.chunkSize !== undefined) {
      if (
        typeof updates.chunkSize !== "number" ||
        updates.chunkSize < 100 ||
        updates.chunkSize > 10000
      ) {
        throw new ConfigurationError(
          "chunkSize must be a number between 100 and 10000"
        );
      }
      validatedUpdates.chunkSize = updates.chunkSize;
    }

    // Requirement 5.2: Allow configuration of chunk overlap
    if (updates.chunkOverlap !== undefined) {
      if (
        typeof updates.chunkOverlap !== "number" ||
        updates.chunkOverlap < 0 ||
        updates.chunkOverlap > 5000
      ) {
        throw new ConfigurationError(
          "chunkOverlap must be a number between 0 and 5000"
        );
      }
      validatedUpdates.chunkOverlap = updates.chunkOverlap;
    }

    // Requirement 5.3: Allow configuration of number of retrieved chunks (topK)
    if (updates.topK !== undefined) {
      if (
        typeof updates.topK !== "number" ||
        updates.topK < 1 ||
        updates.topK > 20
      ) {
        throw new ConfigurationError("topK must be a number between 1 and 20");
      }
      validatedUpdates.topK = updates.topK;
    }

    // Requirement 5.4: Allow configuration of embedding model
    if (updates.embeddingModel !== undefined) {
      if (
        typeof updates.embeddingModel !== "string" ||
        updates.embeddingModel.trim() === ""
      ) {
        throw new ConfigurationError(
          "embeddingModel must be a non-empty string"
        );
      }
      validatedUpdates.embeddingModel = updates.embeddingModel.trim();
    }

    // Requirement 5.5: Allow configuration of language model
    if (updates.llmModel !== undefined) {
      if (
        typeof updates.llmModel !== "string" ||
        updates.llmModel.trim() === ""
      ) {
        throw new ConfigurationError("llmModel must be a non-empty string");
      }
      validatedUpdates.llmModel = updates.llmModel.trim();
    }

    // LLM temperature
    if (updates.llmTemperature !== undefined) {
      if (
        typeof updates.llmTemperature !== "number" ||
        updates.llmTemperature < 0 ||
        updates.llmTemperature > 2
      ) {
        throw new ConfigurationError(
          "llmTemperature must be a number between 0 and 2"
        );
      }
      validatedUpdates.llmTemperature = updates.llmTemperature;
    }

    // LLM max tokens
    if (updates.llmMaxTokens !== undefined) {
      if (
        typeof updates.llmMaxTokens !== "number" ||
        updates.llmMaxTokens < 1 ||
        updates.llmMaxTokens > 4000
      ) {
        throw new ConfigurationError(
          "llmMaxTokens must be a number between 1 and 4000"
        );
      }
      validatedUpdates.llmMaxTokens = updates.llmMaxTokens;
    }

    // Score threshold
    if (updates.scoreThreshold !== undefined) {
      if (
        typeof updates.scoreThreshold !== "number" ||
        updates.scoreThreshold < 0 ||
        updates.scoreThreshold > 1
      ) {
        throw new ConfigurationError(
          "scoreThreshold must be a number between 0 and 1"
        );
      }
      validatedUpdates.scoreThreshold = updates.scoreThreshold;
    }

    // Vector store type
    if (updates.vectorStoreType !== undefined) {
      if (
        updates.vectorStoreType !== "memory" &&
        updates.vectorStoreType !== "chroma"
      ) {
        throw new ConfigurationError(
          "vectorStoreType must be either 'memory' or 'chroma'"
        );
      }
      validatedUpdates.vectorStoreType = updates.vectorStoreType;
    }

    // Vector store path
    if (updates.vectorStorePath !== undefined) {
      if (typeof updates.vectorStorePath !== "string") {
        throw new ConfigurationError("vectorStorePath must be a string");
      }
      validatedUpdates.vectorStorePath = updates.vectorStorePath;
    }

    // Apply updates
    const updatedConfig = updateConfig(validatedUpdates);

    res.json({
      success: true,
      message: "Configuration updated successfully",
      config: updatedConfig,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
