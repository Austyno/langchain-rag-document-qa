import { useState } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper,
} from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DocumentUpload from "./components/DocumentUpload";
import ChatInterface from "./components/ChatInterface";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [documentsUploaded, setDocumentsUploaded] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Document Q&A System
              </Typography>
            </Toolbar>
          </AppBar>
          
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <DocumentUpload onUploadSuccess={() => setDocumentsUploaded(true)} />
              </Paper>
              
              <Paper elevation={3} sx={{ p: 3 }}>
                <ChatInterface disabled={!documentsUploaded} />
              </Paper>
            </Box>
          </Container>
        </Box>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
