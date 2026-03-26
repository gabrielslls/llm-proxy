# 对账与费用审计指引

本指南介绍如何使用 `llm-proxy` 生成的日志，将你的使用量与 API 厂商账单进行核对，并进行费用审计。

## 📊 日志概览

代理在 `logs/` 目录下生成两种类型的日志：

1.  **`calls.jsonl`**: 详细的机器可读 JSON 记录，包含完整的请求和响应体。**需使用 `--log-payloads` 参数开启。**
2.  **`requests.log`**: 人类可读的文本摘要，用于实时监控，包含 Token 数量。

## 🔍 关键识别字段

在 `logs/calls.jsonl` 中，每条记录包含以下关键字段：

- `vendorRequestId`: API 厂商返回的唯一请求 ID（例如 `req_123...`）。**使用此 ID 与厂商后台记录进行匹配。**
- `vendorTraceId`: 厂商内部的追踪 ID（如果提供）。
- `durationMs`: 请求的总耗时（毫秒）。
- `request.body.model`: 请求使用的模型。
- `response.body.usage`: Token 使用统计（如果厂商返回了该信息）。

## 🛠️ 自动分析工具

项目包含一个实用脚本，可通过解析系统提示词（System Prompt）来识别发起请求的“智能体（Agent）”或“角色（Role）”。

### 运行智能体分析
```bash
node analyze-agent-logs.js
```

该脚本会解析 `logs/calls.jsonl` 并根据 `system` 消息中发现的智能体名称对请求进行分组。

## 📝 手动对账流程

1.  **提取厂商 ID**: 使用 `grep` 或 `jq` 提取特定时间段内的所有厂商请求 ID。
    ```bash
    grep -o '"vendorRequestId":"[^"]*"' logs/calls.jsonl
    ```
2.  **匹配厂商后台**: 登录你的服务商控制台（如 OpenAI, DeepSeek 等），在“使用量”或“日志”部分搜索这些 ID。
3.  **校验 Token 数量**: 将本地 JSONL 日志中的 `usage` 对象与厂商账单进行对比，确保费用完全透明。

## 💡 审计小贴士

- **智能体标记**: 如果你使用 OpenCode 或 OpenClaw 等工具，请确保它们在系统提示词中包含描述性名称。我们的 `analyze-agent-logs.js` 工具经过优化，可以识别这些名称。
- **日志轮转**: 对于高频使用的环境，建议使用日志轮转工具来管理 `logs/calls.jsonl` 的文件大小。
