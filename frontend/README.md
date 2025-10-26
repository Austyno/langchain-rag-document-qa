# Document Q&A Frontend

React frontend for the Document Q&A System with RAG.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

The frontend will be available at http://localhost:3000

## Features

- **Document Upload**: Drag-and-drop or click to upload PDF, TXT, and DOCX files
- **Document Management**: View uploaded documents and delete them
- **Chat Interface**: Ask questions about your documents with conversation history
- **Source Viewer**: See which document sections were used to answer your questions
- **Error Handling**: User-friendly error messages and retry logic

## Components

- `App.tsx`: Main application component with MUI theme and React Query setup
- `DocumentUpload.tsx`: File upload component with drag-and-drop support
- `ChatInterface.tsx`: Chat interface for asking questions
- `SourceViewer.tsx`: Display source documents with relevance scores

## API Integration

The frontend communicates with the backend API at `/api` (proxied through Vite).

See `src/services/api.ts` for API endpoints and retry logic.
