# Changelog

## Milestone 1: MVP
- Use default Redis port (#98) and establish PostgreSQL & Redis baseline.
- Stream RAG sync progress for GitHub repository synchronization (#100).
- Add client-side Markdown parsing to the CLI (#104).
- Refactor RAG ingestion into the CLI with a server upsert endpoint (#103).
- Perform RAG API functional tests.
- Support per-file ingestion workflow in the CLI (#115).
- Allow RAG upsert to migrate embedding dimensions (#119).
- Add pgvector database initialization guide (#120).
- Ingest files automatically (#123).

## Milestone 2: Hybrid Search (In Progress)
- Rename RAG 第二阶段优化规划为 `docs/Milestone-2.md` 并新增子任务列表。
- AskAI 接口与 CLI 规划使用 LangChainGo 框架以支持多模型与链式调用。
- Document local and Chutes model configurations for AskAI.
