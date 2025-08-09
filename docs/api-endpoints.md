# API Endpoints

This document describes the HTTP endpoints provided by the XControl server. Each entry lists the request method and path, required parameters, and a sample curl command for verification.

## GET /api/users
- **Description:** Return all users.
- **Parameters:** None.
- **Test:**
  ```bash
  curl -s http://localhost:8080/api/users
  ```

## GET /api/nodes
- **Description:** Return all nodes.
- **Parameters:** None.
- **Test:**
  ```bash
  curl -s http://localhost:8080/api/nodes
  ```

## POST /api/sync
- **Description:** Clone or update a knowledge repository.
- **Body Parameters (JSON):**
  - `repo_url` – Git repository URL.
  - `local_path` – Destination directory on the server.
- **Test:**
  ```bash
  curl -X POST http://localhost:8080/api/sync \
    -H "Content-Type: application/json" \
    -d '{"repo_url": "https://github.com/example/repo.git", "local_path": "/tmp/repo"}'
  ```

## POST /api/rag/sync
- **Description:** Trigger RAG background synchronization.
- **Parameters:** None.
- **Test:**
  ```bash
  curl -X POST http://localhost:8080/api/rag/sync
  ```

## POST /api/rag/query
- **Description:** Query the RAG service.
- **Body Parameters (JSON):**
  - `question` – Query text.
- **Test:**
  ```bash
  curl -X POST http://localhost:8080/api/rag/query \
    -H "Content-Type: application/json" \
    -d '{"question": "What is XControl?"}'
  ```
  When copying the multi-line example above, ensure your shell treats the trailing
  `\` characters as line continuations. Copying literal `\n` sequences will cause
  `curl: (3) URL rejected: Bad hostname` errors. You can also run the command on a
  single line without the backslashes:

  ```bash
  curl -X POST http://localhost:8080/api/rag/query -H "Content-Type: application/json" -d '{"question": "What is XControl?"}'
  ```

## POST /api/askai
- **Description:** Ask the AI service for an answer.
- **Body Parameters (JSON):**
  - `question` – Question text.
- **Test:**
  ```bash
  curl -X POST http://localhost:8080/api/askai \
    -H "Content-Type: application/json" \
    -d '{"question": "Hello"}'
  ```
