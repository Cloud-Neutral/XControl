# Milestone 2 TODO

使用 LangChainGo 框架优化 CLI、Server 以及 AskAI 接口的子任务规划：

1. **LLM 接口层（Model I/O）**
   - 统一接入 OpenAI、Hugging Face、Ollama、Google AI、Cohere 等模型。
   - 支持在 CLI 与 Server 中通过配置切换不同模型提供商。
2. **Chains（链式流程）**
   - 将 prompt、检索结果、工具调用组合成完整流程，完善 RAG 与聊天能力。
   - 为 AskAI 提供可组合的链式 API，简化复杂任务编排。
3. **工具与 Agent 体系**
   - 定义常用工具（Web 搜索、Scraper、SQL 查询等）并集成到 Agent。
   - 在 CLI 中实现 ReAct 风格的工具调用示例。
4. **向量检索与数据接入**
   - 接入 PGVector、Weaviate、Qdrant、Chroma、Pinecone、Redis Vector 等存储。
   - 允许自定义向量维度和检索参数。
5. **文档加载与分块**
   - 提供 Document Loaders 与 Text Splitters，适配不同格式与长度的文本。
   - 将分块结果统一存储并提供增量更新能力。
6. **Memory 与历史追踪**
   - 为 AskAI 增加对话记忆，如 conversation buffer。
   - 在 Server 中持久化对话上下文，提升交互体验。

以上任务将逐步落实，以完成混合检索与多模型支持目标。
