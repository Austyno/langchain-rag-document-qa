import axios, { AxiosError } from "axios";
import type {
  DocumentMetadata,
  QAResponse,
  Message,
  IngestResult,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

// Retry logic for failed requests
const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> => {
  try {
    return await fn();
  } catch (error: unknown) {
    if (retries > 0 && axios.isAxiosError(error)) {
      // Retry on network errors or 5xx server errors
      if (
        !error.response ||
        (error.response.status >= 500 && error.response.status < 600)
      ) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return retryRequest(fn, retries - 1);
      }
    }
    throw error;
  }
};

// Error handling interceptor
api.interceptors.response.use(
  (response: any) => response,
  (error: AxiosError) => {
    const message =
      error.response?.data || error.message || "An error occurred";
    return Promise.reject(new Error(String(message)));
  }
);

// Document API with retry logic
export const documentApi = {
  upload: async (file: File): Promise<IngestResult> => {
    return retryRequest(async () => {
      const formData = new FormData();
      formData.append("document", file);

      const response = await api.post<IngestResult>(
        "/documents/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    });
  },

  list: async (): Promise<DocumentMetadata[]> => {
    return retryRequest(async () => {
      const response = await api.get<{ documents: DocumentMetadata[] }>(
        "/documents"
      );
      return response.data.documents;
    });
  },

  delete: async (documentId: string): Promise<void> => {
    return retryRequest(async () => {
      await api.delete(`/documents/${documentId}`);
    });
  },
};

// Q&A API with retry logic
export const qaApi = {
  ask: async (question: string): Promise<QAResponse> => {
    return retryRequest(async () => {
      const response = await api.post<QAResponse>("/qa/ask", { question });
      return response.data;
    });
  },

  chat: async (question: string, history: Message[]): Promise<QAResponse> => {
    return retryRequest(async () => {
      const response = await api.post<QAResponse>("/qa/chat", {
        question,
        history,
      });
      return response.data;
    });
  },
};
