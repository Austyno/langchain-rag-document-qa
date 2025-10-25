# Document Q&A System with RAG

A Retrieval-Augmented Generation (RAG) system built with LangChain that allows users to upload documents and ask questions about their content using natural language.

## Features

- Upload and process PDF, TXT, and DOCX documents
- Semantic search using vector embeddings
- Natural language question answering powered by OpenAI
- Source citation for answers
- Configurable RAG parameters

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key

## Setup

1. Clone the repository and install dependencies:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. Configure environment variables:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
```

3. Start the development servers:

```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start frontend
cd frontend
npm run dev
```

4. Open your browser to `http://localhost:3000`

## Project Structure

```
.
├── backend/              # Express backend with LangChain
│   ├── src/
│   │   ├── services/    # Core business logic
│   │   ├── routes/      # API endpoints
│   │   ├── models/      # TypeScript types
│   │   ├── utils/       # Helper functions
│   │   ├── config/      # Configuration management
│   │   └── server.ts    # Entry point
│   └── package.json
├── frontend/            # React frontend with Material-UI
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API client
│   │   └── main.tsx     # Entry point
│   └── package.json
└── .env.example         # Environment variables template
```

## API Endpoints

- `POST /api/documents/upload` - Upload a document
- `GET /api/documents` - List all documents
- `DELETE /api/documents/:id` - Delete a document
- `POST /api/qa/ask` - Ask a question
- `POST /api/qa/chat` - Ask with conversation history
- `GET /api/config` - Get RAG configuration
- `PUT /api/config` - Update RAG configuration

## Configuration

The system can be configured via environment variables in `.env`:

- `CHUNK_SIZE` - Size of text chunks (default: 1000)
- `CHUNK_OVERLAP` - Overlap between chunks (default: 200)
- `TOP_K` - Number of chunks to retrieve (default: 4)
- `LLM_MODEL` - OpenAI model to use (default: gpt-3.5-turbo)
- `LLM_TEMPERATURE` - Model temperature (default: 0.0)

## License

MIT
