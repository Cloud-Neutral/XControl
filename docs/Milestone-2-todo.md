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

## 文档 QA embedding 最佳实践

### 结构提取
- 为每篇文档生成目录（Table of Contents）并单独 embedding，用于导航检索。
- 将每个标题/小节标题单独 embedding，支持快速定位。
- 将标签、时间、来源等元数据转成文本并 embedding，参与 Hybrid Search。

### 切分策略
- 按段落切分，保持上下文一致性。
- 采用语义切分（基于句子边界或语义相似度）。
- 启用滑动窗口切分（20%~30% 重叠）减少边界信息丢失。
- 多粒度切分（同时存储小块和大块向量）。

### 信息增强
- 实现 Query Expansion / HyDE，在检索前扩展问题或生成假设文档。
- 为每个 chunk 存储摘要向量，提升跨领域匹配效果。
- 融合跨文档引用上下文 embedding。

### 向量优化与后处理
- 去重无意义 chunk（如页眉、版权声明）。
- MMR（Maximal Marginal Relevance）去冗余，提升多样性。
- 对候选结果进行轻量 Re-ranking（如 bge-reranker）。
- 融合多模态信息（如图片描述）。

### 检索优化
- 在 Query 中启用 Hybrid Search（向量 + BM25），权重可配置。
- 支持多向量查询（ColBERT 思路）匹配文档不同部分。
