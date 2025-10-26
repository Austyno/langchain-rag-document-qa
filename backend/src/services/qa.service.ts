import { ChatOpenAI } from "@langchain/openai";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { Document } from "langchain/document";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import {
  QAResponse,
  QAConfig,
  Message,
  SourceDocument,
  LLMError,
  RetrievalError,
} from "../models/types.js";
import { VectorStoreManager } from "./vectorStore.service.js";
import { getConfig } from "../config/config.js";

/**
 * QAEngine
 *
 * Main interface for question answering using RAG (Retrieval-Augmented Generation).
 * Processes user queries, retrieves relevant context, and generates answers using LLM.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class QAEngine {
  private llm: ChatOpenAI;
  private vectorStoreManager: VectorStoreManager;
  private qaChain: any = null;
  private conversationalChain: any = null;
  private chatHistory: BaseMessage[] = [];

  constructor(vectorStoreManager: VectorStoreManager) {
    const config = getConfig();

    // Initialize ChatOpenAI model
    // Requirement 3.4: LLM Interface SHALL send prompt to configured language model
    this.llm = new ChatOpenAI({
      modelName: config.llmModel,
      temperature: config.llmTemperature,
      maxTokens: config.llmMaxTokens,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.vectorStoreManager = vectorStoreManager;
  }

  /**
   * Initialize the retrieval chain with vector store retriever
   * Requirement 3.2: Query Engine SHALL retrieve relevant document chunks from Vector Store
   */
  private async initializeQAChain(config: QAConfig): Promise<void> {
    try {
      // Ensure vector store is initialized
      await this.vectorStoreManager.initializeStore();

      // Create custom prompt template for answer generation
      // Requirement 3.3: LLM Interface SHALL construct prompt containing question and retrieved context
      const promptTemplate = ChatPromptTemplate.fromTemplate(
        `Use the following pieces of context to answer the question at the end. 
If you don't know the answer based on the context provided, just say that you don't know, don't try to make up an answer.
Always cite which document or section your answer comes from when possible.

Context:
{context}

Question: {input}

Helpful Answer:`
      );

      // Get vector store from manager
      const vectorStore = (this.vectorStoreManager as any).vectorStore;
      if (!vectorStore) {
        throw new RetrievalError("Vector store not initialized");
      }

      // Create retriever with topK configuration
      const retriever = vectorStore.asRetriever({
        k: config.topK,
      });

      // Create document chain and retrieval chain
      const documentChain = await createStuffDocumentsChain({
        llm: this.llm,
        prompt: promptTemplate,
      });

      this.qaChain = await createRetrievalChain({
        retriever,
        combineDocsChain: documentChain,
      });
    } catch (error) {
      throw new LLMError(
        `Failed to initialize QA chain: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Initialize the conversational retrieval chain for chat with history
   * Requirement 3.1, 3.2, 3.3: Support conversation context with history
   */
  private async initializeConversationalChain(config: QAConfig): Promise<void> {
    try {
      // Ensure vector store is initialized
      await this.vectorStoreManager.initializeStore();

      // Get vector store from manager
      const vectorStore = (this.vectorStoreManager as any).vectorStore;
      if (!vectorStore) {
        throw new RetrievalError("Vector store not initialized");
      }

      // Create retriever with topK configuration
      const retriever = vectorStore.asRetriever({
        k: config.topK,
      });

      // Create a prompt for contextualizing the question based on chat history
      const contextualizeQSystemPrompt = `Given a chat history and the latest user question 
which might reference context in the chat history, formulate a standalone question 
which can be understood without the chat history. Do NOT answer the question, 
just reformulate it if needed and otherwise return it as is.`;

      const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
        ["system", contextualizeQSystemPrompt],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
      ]);

      // Create history-aware retriever
      const historyAwareRetriever = await createHistoryAwareRetriever({
        llm: this.llm,
        retriever,
        rephrasePrompt: contextualizeQPrompt,
      });

      // Create the QA prompt template
      const qaSystemPrompt = `Use the following pieces of context to answer the question at the end.
If you don't know the answer based on the context provided, just say that you don't know, don't try to make up an answer.
Always cite which document or section your answer comes from when possible.

Context:
{context}`;

      const qaPrompt = ChatPromptTemplate.fromMessages([
        ["system", qaSystemPrompt],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
      ]);

      // Create document chain
      const documentChain = await createStuffDocumentsChain({
        llm: this.llm,
        prompt: qaPrompt,
      });

      // Create conversational retrieval chain
      this.conversationalChain = await createRetrievalChain({
        retriever: historyAwareRetriever,
        combineDocsChain: documentChain,
      });
    } catch (error) {
      throw new LLMError(
        `Failed to initialize conversational chain: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Ask a question using RAG
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4
   *
   * @param question - User's question
   * @param config - Optional QA configuration
   * @returns QAResponse with answer and source documents
   */
  async askQuestion(
    question: string,
    config?: Partial<QAConfig>
  ): Promise<QAResponse> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!question || question.trim() === "") {
        throw new RetrievalError("Question cannot be empty");
      }

      // Merge with default config
      const ragConfig = getConfig();
      const qaConfig: QAConfig = {
        topK: config?.topK ?? ragConfig.topK,
        temperature: config?.temperature ?? ragConfig.llmTemperature,
        maxTokens: config?.maxTokens ?? ragConfig.llmMaxTokens,
      };

      // Update LLM configuration if needed
      if (
        config?.temperature !== undefined ||
        config?.maxTokens !== undefined
      ) {
        this.llm = new ChatOpenAI({
          modelName: ragConfig.llmModel,
          temperature: qaConfig.temperature,
          maxTokens: qaConfig.maxTokens,
          openAIApiKey: process.env.OPENAI_API_KEY,
        });
      }

      // Initialize QA chain if not already done
      if (!this.qaChain) {
        await this.initializeQAChain(qaConfig);
      }

      if (!this.qaChain) {
        throw new LLMError("QA chain not initialized");
      }

      // Requirement 3.1: Query Engine SHALL convert question into embedding vector
      // Requirement 3.2: Query Engine SHALL retrieve relevant document chunks
      // Process question through RAG chain
      const result = await this.qaChain.invoke({
        input: question,
      });

      // Requirement 3.4: LLM Interface SHALL send prompt to configured language model
      // Requirement 3.5: Document Q&A System SHALL return generated answer to user
      // Extract answer and source documents
      const answer = result.answer || "";
      const sourceDocuments: Document[] = result.context || [];

      // Requirement 4.1, 4.2, 4.3, 4.4: Format source metadata
      const sources = this.formatSourceDocuments(sourceDocuments);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Calculate confidence based on source relevance
      const confidence = this.calculateConfidence(sourceDocuments);

      return {
        answer,
        sources,
        confidence,
        processingTime,
      };
    } catch (error) {
      if (error instanceof RetrievalError || error instanceof LLMError) {
        throw error;
      }
      throw new LLMError(
        `Failed to process question: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Ask a question with conversation history support
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   *
   * @param question - User's question
   * @param chatHistory - Previous conversation messages
   * @param config - Optional QA configuration
   * @returns QAResponse with answer and source documents
   */
  async askWithHistory(
    question: string,
    chatHistory: Message[],
    config?: Partial<QAConfig>
  ): Promise<QAResponse> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!question || question.trim() === "") {
        throw new RetrievalError("Question cannot be empty");
      }

      // Merge with default config
      const ragConfig = getConfig();
      const qaConfig: QAConfig = {
        topK: config?.topK ?? ragConfig.topK,
        temperature: config?.temperature ?? ragConfig.llmTemperature,
        maxTokens: config?.maxTokens ?? ragConfig.llmMaxTokens,
      };

      // Update LLM configuration if needed
      if (
        config?.temperature !== undefined ||
        config?.maxTokens !== undefined
      ) {
        this.llm = new ChatOpenAI({
          modelName: ragConfig.llmModel,
          temperature: qaConfig.temperature,
          maxTokens: qaConfig.maxTokens,
          openAIApiKey: process.env.OPENAI_API_KEY,
        });
      }

      // Initialize conversational chain if not already done
      if (!this.conversationalChain) {
        await this.initializeConversationalChain(qaConfig);
      }

      if (!this.conversationalChain) {
        throw new LLMError("Conversational chain not initialized");
      }

      // Convert chat history to BaseMessage format
      const formattedHistory: BaseMessage[] = chatHistory.map((message) => {
        if (message.role === "user") {
          return new HumanMessage(message.content);
        } else {
          return new AIMessage(message.content);
        }
      });

      // Process question through conversational RAG chain
      const result = await this.conversationalChain.invoke({
        input: question,
        chat_history: formattedHistory,
      });

      // Extract answer and source documents
      const answer = result.answer || "";
      const sourceDocuments: Document[] = result.context || [];

      // Format source metadata
      const sources = this.formatSourceDocuments(sourceDocuments);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Calculate confidence
      const confidence = this.calculateConfidence(sourceDocuments);

      return {
        answer,
        sources,
        confidence,
        processingTime,
      };
    } catch (error) {
      if (error instanceof RetrievalError || error instanceof LLMError) {
        throw error;
      }
      throw new LLMError(
        `Failed to process question with history: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Format source documents into SourceDocument array
   * Requirements: 4.1, 4.2, 4.3, 4.4
   *
   * @param documents - Array of LangChain Document objects
   * @returns Array of formatted SourceDocument objects
   */
  private formatSourceDocuments(documents: Document[]): SourceDocument[] {
    return documents.map((doc, index) => {
      const metadata = doc.metadata || {};

      return {
        documentId: metadata.documentId || `unknown_${index}`,
        filename: metadata.filename || "Unknown",
        content: doc.pageContent || "",
        chunkIndex: metadata.chunkIndex ?? index,
        relevanceScore: metadata.score ?? 1.0,
      };
    });
  }

  /**
   * Calculate confidence score based on source documents
   *
   * @param documents - Array of source documents
   * @returns Confidence score between 0 and 1
   */
  private calculateConfidence(documents: Document[]): number {
    if (documents.length === 0) {
      return 0.0;
    }

    // If documents have scores in metadata, use them
    const scores = documents
      .map((doc) => doc.metadata?.score)
      .filter((score) => score !== undefined);

    if (scores.length > 0) {
      const avgScore =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return Math.min(1.0, Math.max(0.0, avgScore));
    }

    // Otherwise, use a heuristic based on number of sources
    // More sources generally means higher confidence
    const baseConfidence = Math.min(documents.length / 4, 1.0);
    return baseConfidence * 0.8; // Scale down slightly as we don't have actual scores
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.chatHistory = [];
  }

  /**
   * Get current conversation history
   */
  getHistory(): BaseMessage[] {
    return [...this.chatHistory];
  }

  /**
   * Add a message to conversation history
   */
  addToHistory(role: "user" | "assistant", content: string): void {
    if (role === "user") {
      this.chatHistory.push(new HumanMessage(content));
    } else {
      this.chatHistory.push(new AIMessage(content));
    }
  }
}
