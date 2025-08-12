# Milestone 2 TODO

使用 LangChainGo 框架优化 CLI、Server 以及 AskAI 接口的子任务规划：

1. **LLM 接口层（Model I/O）**
   - [ ] 构建 OpenAI、Hugging Face、Ollama、Google AI、Cohere 等模型的 provider registry。
   - [ ] 在 CLI 与 Server 配置中暴露模型提供商切换能力。
   - [ ] 编写单元测试验证不同 provider 间的切换。
   - [ ] 补充配置和环境变量使用文档。
2. **Chains（链式流程）**
   - [ ] 将 prompt、检索结果、工具调用组合成 RAG 与聊天链。
   - [ ] 为 AskAI 提供可复用的链式定义，支持复杂任务编排。
   - [ ] 在 CLI 中提供链式调用示例。
   - [ ] 编写链式流程的集成测试。
3. **工具与 Agent 体系**
   - [ ] 实现 Web 搜索、Scraper、SQL 查询等常用工具。
   - [ ] 将工具注册到 Agent 框架中，支持动态调用。
   - [ ] 在 CLI 中演示 ReAct 风格的工具调用。
   - [ ] 为工具与 Agent 交互添加测试用例。
4. **向量检索与数据接入**
   - [ ] 接入 PGVector、Weaviate、Qdrant、Chroma、Pinecone、Redis Vector 等存储。
   - [ ] 支持自定义向量维度与检索参数。
   - [ ] 为不同向量存储编写基准测试与比较。
   - [ ] 提供检索参数调优的文档示例。
5. **文档加载与分块**
   - [ ] 提供 Markdown、代码、HTML 等多格式的 Document Loader。
   - [ ] 支持按 token 或递归策略的 Text Splitter。
   - [ ] 统一存储分块结果并支持增量更新 API。
   - [ ] 为 loader 与 splitter 编写测试。
6. **Memory 与历史追踪**
   - [ ] 为 AskAI 增加 conversation buffer 等对话记忆。
   - [ ] 在 Server 中持久化会话历史并提供配置项。
   - [ ] 支持调整记忆长度与清理策略。
   - [ ] 编写端到端测试验证记忆保留。

以上任务将逐步落实，以完成混合检索与多模型支持目标。
