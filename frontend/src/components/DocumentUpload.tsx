import { useState, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Snackbar,
  Alert,
  Paper,
} from "@mui/material";
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi } from "../services/api";
import type { DocumentMetadata } from "../types";

interface DocumentUploadProps {
  onUploadSuccess?: () => void;
}

export default function DocumentUpload({
  onUploadSuccess,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch documents list
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: documentApi.list,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: documentApi.upload,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSnackbar({
        open: true,
        message: `Document uploaded successfully! ${data.chunkCount} chunks created.`,
        severity: "success",
      });
      if (onUploadSuccess) onUploadSuccess();
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: `Upload failed: ${error.message}`,
        severity: "error",
      });
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: documentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSnackbar({
        open: true,
        message: "Document deleted successfully",
        severity: "success",
      });
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: `Delete failed: ${error.message}`,
        severity: "error",
      });
    },
  });

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const allowedTypes = [".pdf", ".txt", ".docx"];
    const fileExtension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      setSnackbar({
        open: true,
        message: `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
        severity: "error",
      });
      return;
    }

    setUploading(true);
    uploadMutation.mutate(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDelete = (documentId: string) => {
    deleteMutation.mutate(documentId);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Upload Documents
      </Typography>

      <Paper
        variant="outlined"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          p: 3,
          textAlign: "center",
          border: dragActive ? "2px dashed #1976d2" : "2px dashed #ccc",
          backgroundColor: dragActive ? "#f0f7ff" : "transparent",
          cursor: "pointer",
          transition: "all 0.3s",
        }}
        onClick={handleButtonClick}
      >
        <UploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
        <Typography variant="body1" gutterBottom>
          Drag and drop a document here, or click to select
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Supported formats: PDF, TXT, DOCX
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx"
          onChange={handleFileInputChange}
          style={{ display: "none" }}
        />
      </Paper>

      {uploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Uploading and processing document...
          </Typography>
        </Box>
      )}

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Uploaded Documents ({documents.length})
        </Typography>
        {isLoading ? (
          <LinearProgress />
        ) : documents.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No documents uploaded yet
          </Typography>
        ) : (
          <List>
            {documents.map((doc) => (
              <ListItem key={doc.documentId} divider>
                <ListItemText
                  primary={doc.filename}
                  secondary={`${doc.chunkCount} chunks • ${formatFileSize(
                    doc.fileSize
                  )} • ${new Date(doc.uploadDate).toLocaleString()}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDelete(doc.documentId)}
                    disabled={deleteMutation.isPending}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
