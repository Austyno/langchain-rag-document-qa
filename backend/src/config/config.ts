import { RAGConfig } from "../models/types.js";

/**
 * Configuration validation error
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Default RAG configuration values
 */
const DEFAULT_CONFIG: RAGConfig = {
  // Document Processing
  chunkSize: 1000,
  chunkOverlap: 200,

  // Embeddings
  embeddingModel: "text-embedding-ada-002",

  // Vector Store
  vectorStoreType: "memory",
  vectorStorePath: "./data/vectorstore",

  // LLM
  llmModel: "gpt-3.5-turbo",
  llmTemperature: 0.0,
  llmMaxTokens: 500,

  // Retrieval
  topK: 4,
  scoreThreshold: 0.7,
};

/**
 * Parse environment variable as number with validation
 */
function parseNumber(
  value: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (isNaN(parsed)) {
    throw new ConfigurationError(
      `Invalid number value: ${value}. Expected a valid number.`
    );
  }

  if (min !== undefined && parsed < min) {
    throw new ConfigurationError(
      `Value ${parsed} is below minimum allowed value of ${min}`
    );
  }

  if (max !== undefined && parsed > max) {
    throw new ConfigurationError(
      `Value ${parsed} exceeds maximum allowed value of ${max}`
    );
  }

  return parsed;
}

/**
 * Validate vector store type
 */
function validateVectorStoreType(
  value: string | undefined
): "memory" | "chroma" {
  if (!value) {
    return DEFAULT_CONFIG.vectorStoreType;
  }

  if (value !== "memory" && value !== "chroma") {
    throw new ConfigurationError(
      `Invalid vector store type: ${value}. Must be either 'memory' or 'chroma'.`
    );
  }

  return value;
}

/**
 * Validate required string configuration
 */
function validateRequiredString(
  value: string | undefined,
  fieldName: string
): string {
  if (!value || value.trim() === "") {
    throw new ConfigurationError(
      `${fieldName} is required but not provided in environment variables`
    );
  }
  return value.trim();
}

/**
 * Validate optional string configuration
 */
function validateOptionalString(
  value: string | undefined,
  defaultValue: string
): string {
  if (!value || value.trim() === "") {
    return defaultValue;
  }
  return value.trim();
}

/**
 * Load and validate RAG configuration from environment variables
 */
export function loadConfig(): RAGConfig {
  try {
    const config: RAGConfig = {
      // Document Processing - validate chunk size and overlap
      chunkSize: parseNumber(
        process.env.CHUNK_SIZE,
        DEFAULT_CONFIG.chunkSize,
        100,
        10000
      ),
      chunkOverlap: parseNumber(
        process.env.CHUNK_OVERLAP,
        DEFAULT_CONFIG.chunkOverlap,
        0,
        5000
      ),

      // Embeddings
      embeddingModel: validateOptionalString(
        process.env.EMBEDDING_MODEL,
        DEFAULT_CONFIG.embeddingModel
      ),

      // Vector Store
      vectorStoreType: validateVectorStoreType(process.env.VECTOR_STORE_TYPE),
      vectorStorePath: validateOptionalString(
        process.env.VECTOR_STORE_PATH,
        DEFAULT_CONFIG.vectorStorePath!
      ),

      // LLM
      llmModel: validateOptionalString(
        process.env.LLM_MODEL,
        DEFAULT_CONFIG.llmModel
      ),
      llmTemperature: parseNumber(
        process.env.LLM_TEMPERATURE,
        DEFAULT_CONFIG.llmTemperature,
        0,
        2
      ),
      llmMaxTokens: parseNumber(
        process.env.LLM_MAX_TOKENS,
        DEFAULT_CONFIG.llmMaxTokens,
        1,
        4000
      ),

      // Retrieval
      topK: parseNumber(process.env.TOP_K, DEFAULT_CONFIG.topK, 1, 20),
      scoreThreshold: parseNumber(
        process.env.SCORE_THRESHOLD,
        DEFAULT_CONFIG.scoreThreshold,
        0,
        1
      ),
    };

    // Validate chunk overlap is less than chunk size
    if (config.chunkOverlap >= config.chunkSize) {
      throw new ConfigurationError(
        `Chunk overlap (${config.chunkOverlap}) must be less than chunk size (${config.chunkSize})`
      );
    }

    return config;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    throw new ConfigurationError(
      `Failed to load configuration: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Validate OpenAI API key
 */
export function validateApiKey(): string {
  return validateRequiredString(
    process.env.OPENAI_API_KEY,
    "OPENAI_API_KEY"
  );
}

/**
 * Get server configuration
 */
export function getServerConfig() {
  return {
    port: parseNumber(process.env.PORT, 5000, 1, 65535),
    nodeEnv: process.env.NODE_ENV || "development",
    maxFileSize: parseNumber(process.env.MAX_FILE_SIZE, 10485760, 1024),
    uploadDir: process.env.UPLOAD_DIR || "./uploads",
  };
}

/**
 * Global configuration instance
 */
let configInstance: RAGConfig | null = null;

/**
 * Get the current configuration instance
 */
export function getConfig(): RAGConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Update configuration (useful for runtime updates)
 */
export function updateConfig(updates: Partial<RAGConfig>): RAGConfig {
  const currentConfig = getConfig();
  const newConfig = { ...currentConfig, ...updates };

  // Validate the updated configuration
  if (newConfig.chunkOverlap >= newConfig.chunkSize) {
    throw new ConfigurationError(
      `Chunk overlap (${newConfig.chunkOverlap}) must be less than chunk size (${newConfig.chunkSize})`
    );
  }

  if (newConfig.chunkSize < 100 || newConfig.chunkSize > 10000) {
    throw new ConfigurationError(
      `Chunk size must be between 100 and 10000, got ${newConfig.chunkSize}`
    );
  }

  if (newConfig.topK < 1 || newConfig.topK > 20) {
    throw new ConfigurationError(
      `topK must be between 1 and 20, got ${newConfig.topK}`
    );
  }

  if (
    newConfig.llmTemperature < 0 ||
    newConfig.llmTemperature > 2
  ) {
    throw new ConfigurationError(
      `LLM temperature must be between 0 and 2, got ${newConfig.llmTemperature}`
    );
  }

  if (
    newConfig.scoreThreshold < 0 ||
    newConfig.scoreThreshold > 1
  ) {
    throw new ConfigurationError(
      `Score threshold must be between 0 and 1, got ${newConfig.scoreThreshold}`
    );
  }

  configInstance = newConfig;
  return newConfig;
}

/**
 * Reset configuration to defaults (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}
