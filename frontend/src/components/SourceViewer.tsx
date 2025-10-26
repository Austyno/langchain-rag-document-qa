import { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import type { SourceDocument } from "../types";

interface SourceViewerProps {
  sources: SourceDocument[];
}

export default function SourceViewer({ sources }: SourceViewerProps) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbarOpen(true);
  };

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Sources ({sources.length})
      </Typography>
      {sources.map((source, index) => (
        <Accordion key={index} sx={{ mb: 1 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`source-${index}-content`}
            id={`source-${index}-header`}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                width: "100%",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                {source.filename}
              </Typography>
              <Chip
                label={`Chunk ${source.chunkIndex}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Score: ${(source.relevanceScore * 100).toFixed(1)}%`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Text excerpt:
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleCopy(source.content)}
                  title="Copy to clipboard"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  backgroundColor: "#f5f5f5",
                  p: 1.5,
                  borderRadius: 1,
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                }}
              >
                {source.content}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
}
