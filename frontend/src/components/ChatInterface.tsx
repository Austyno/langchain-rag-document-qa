import { useState, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { useMutation } from "@tanstack/react-query";
import { qaApi } from "../services/api";
import type { Message, QAResponse } from "../types";
import SourceViewer from "./SourceViewer";

interface ChatInterfaceProps {
  disabled?: boolean;
}

interface ChatMessage extends Message {
  sources?: QAResponse["sources"];
  processingTime?: number;
}

export default function ChatInterface({
  disabled = false,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      // Use chat endpoint with history for better context
      const history: Message[] = messages.map(
        ({ role, content }: ChatMessage) => ({ role, content })
      );
      return qaApi.chat(question, history);
    },
    onSuccess: (data: QAResponse, question: string) => {
      setMessages((prev: ChatMessage[]) => [
        ...prev,
        { role: "user", content: question },
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          processingTime: data.processingTime,
        },
      ]);
      setInput("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || askMutation.isPending) return;
    askMutation.mutate(input.trim());
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Ask Questions
      </Typography>

      {disabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Please upload at least one document to start asking questions
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          height: 400,
          overflowY: "auto",
          p: 2,
          mb: 2,
          backgroundColor: "#f5f5f5",
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No messages yet. Ask a question about your documents!
            </Typography>
          </Box>
        ) : (
          <Box>
            {messages.map((message: ChatMessage, index: number) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    backgroundColor:
                      message.role === "user" ? "#e3f2fd" : "#fff",
                    ml: message.role === "user" ? "auto" : 0,
                    mr: message.role === "user" ? 0 : "auto",
                    maxWidth: "85%",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: "bold", display: "block", mb: 0.5 }}
                  >
                    {message.role === "user" ? "You" : "Assistant"}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {message.content}
                  </Typography>
                  {message.processingTime && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: "block" }}
                    >
                      Processing time: {message.processingTime.toFixed(2)}s
                    </Typography>
                  )}
                </Paper>
                {message.sources && message.sources.length > 0 && (
                  <Box sx={{ mt: 1, maxWidth: "85%" }}>
                    <SourceViewer sources={message.sources} />
                  </Box>
                )}
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Paper>

      {askMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {askMutation.error?.message || "Failed to get answer"}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", gap: 1 }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Ask a question about your documents..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled || askMutation.isPending}
          multiline
          maxRows={3}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={disabled || !input.trim() || askMutation.isPending}
          sx={{ minWidth: 100 }}
        >
          {askMutation.isPending ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            <>
              <SendIcon sx={{ mr: 1 }} />
              Send
            </>
          )}
        </Button>
      </Box>
    </Box>
  );
}
