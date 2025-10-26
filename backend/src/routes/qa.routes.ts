import { Router, Request, Response, NextFunction } from "express";
import { QAEngine } from "../services/qa.service.js";
import { VectorStoreManager } from "../services/vectorStore.service.js";
import { RetrievalError, Message, QAConfig } from "../models/types.js";

const router = Router();

// Initialize services
const vectorStoreManager = new VectorStoreManager();
const qaEngine = new QAEngine(vectorStoreManager);

// ============================================================================
// POST /api/qa/ask - Ask a question
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 6.2, 6.3, 6.4
// ============================================================================

router.post("/ask", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, config } = req.body;

    // Validate request
    if (!question || typeof question !== "string" || question.trim() === "") {
      throw new RetrievalError(
        "Question is required and must be a non-empty string"
      );
    }

    // Validate optional config
    let qaConfig: Partial<QAConfig> | undefined;
    if (config) {
      qaConfig = {};

      if (config.topK !== undefined) {
        if (
          typeof config.topK !== "number" ||
          config.topK < 1 ||
          config.topK > 20
        ) {
          throw new RetrievalError("topK must be a number between 1 and 20");
        }
        qaConfig.topK = config.topK;
      }

      if (config.temperature !== undefined) {
        if (
          typeof config.temperature !== "number" ||
          config.temperature < 0 ||
          config.temperature > 2
        ) {
          throw new RetrievalError(
            "temperature must be a number between 0 and 2"
          );
        }
        qaConfig.temperature = config.temperature;
      }

      if (config.maxTokens !== undefined) {
        if (
          typeof config.maxTokens !== "number" ||
          config.maxTokens < 1 ||
          config.maxTokens > 4000
        ) {
          throw new RetrievalError(
            "maxTokens must be a number between 1 and 4000"
          );
        }
        qaConfig.maxTokens = config.maxTokens;
      }
    }

    // Requirement 3.1: Convert question into embedding vector
    // Requirement 3.2: Retrieve relevant document chunks from Vector Store
    // Requirement 3.3: Construct prompt containing question and retrieved context
    // Requirement 3.4: Send prompt to configured language model
    // Requirement 3.5: Return generated answer to user
    const response = await qaEngine.askQuestion(question, qaConfig);

    // Requirement 4.1, 4.2, 4.3, 4.4: Return source metadata
    res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    // Requirement 6.2, 6.3, 6.4: Handle errors gracefully
    next(error);
  }
});

// ============================================================================
// POST /api/qa/chat - Ask with conversation history support
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 6.2, 6.3, 6.4
// ============================================================================

router.post(
  "/chat",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, history, config } = req.body;

      // Validate question
      if (!question || typeof question !== "string" || question.trim() === "") {
        throw new RetrievalError(
          "Question is required and must be a non-empty string"
        );
      }

      // Validate history
      let chatHistory: Message[] = [];
      if (history) {
        if (!Array.isArray(history)) {
          throw new RetrievalError("History must be an array of messages");
        }

        // Validate each message in history
        for (const msg of history) {
          if (!msg.role || !msg.content) {
            throw new RetrievalError(
              "Each message in history must have 'role' and 'content' properties"
            );
          }

          if (msg.role !== "user" && msg.role !== "assistant") {
            throw new RetrievalError(
              "Message role must be either 'user' or 'assistant'"
            );
          }

          if (typeof msg.content !== "string") {
            throw new RetrievalError("Message content must be a string");
          }

          chatHistory.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Validate optional config
      let qaConfig: Partial<QAConfig> | undefined;
      if (config) {
        qaConfig = {};

        if (config.topK !== undefined) {
          if (
            typeof config.topK !== "number" ||
            config.topK < 1 ||
            config.topK > 20
          ) {
            throw new RetrievalError("topK must be a number between 1 and 20");
          }
          qaConfig.topK = config.topK;
        }

        if (config.temperature !== undefined) {
          if (
            typeof config.temperature !== "number" ||
            config.temperature < 0 ||
            config.temperature > 2
          ) {
            throw new RetrievalError(
              "temperature must be a number between 0 and 2"
            );
          }
          qaConfig.temperature = config.temperature;
        }

        if (config.maxTokens !== undefined) {
          if (
            typeof config.maxTokens !== "number" ||
            config.maxTokens < 1 ||
            config.maxTokens > 4000
          ) {
            throw new RetrievalError(
              "maxTokens must be a number between 1 and 4000"
            );
          }
          qaConfig.maxTokens = config.maxTokens;
        }
      }

      // Requirement 3.1, 3.2, 3.3, 3.4, 3.5: Process question with conversation history
      const response = await qaEngine.askWithHistory(
        question,
        chatHistory,
        qaConfig
      );

      // Requirement 4.1, 4.2, 4.3, 4.4: Return source metadata
      res.json({
        success: true,
        ...response,
      });
    } catch (error) {
      // Requirement 6.2, 6.3, 6.4: Handle errors gracefully
      next(error);
    }
  }
);

export default router;
