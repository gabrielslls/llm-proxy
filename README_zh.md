# LLM Proxy

LLM Proxy 是一个轻量级、中立、开源的 LLM 代理工具，专注于请求拦截、Token 统计与费用审计。

[English](./README.md) | [简体中文](./README_zh.md)

---

## ✨ 核心特性

- 🔌 **通用转发**: 兼容所有 OpenAI 协议的厂商（如 OpenAI, Anthropic, DeepSeek, 百度文心, 阿里通义, 火山引擎等）。
- 📊 **实时统计**: 自动提取并记录输入/输出 Token 数量、预估费用、请求状态及响应耗时。
- 📝 **本地日志**: 
    - `requests.log`: 包含 Token 和费用的实时监控日志（默认开启）。
    - `calls.jsonl`: 可选的机器可读完整交互记录（默认关闭，需 `--log-payloads` 开启）。
- 🛡️ **中立透明**: 不修改任何业务数据，不做请求劫持，对客户端和厂商侧完全透明。
- 🚫 **无硬编码**: 没有任何内置密钥或特定平台的黑盒逻辑。
- 🤝 **协作友好**: 针对 OpenClaw、OpenCode 等 AI 软件进行了优化，可通过 System Prompt 识别 Agent 名称。
- ⌨️ **交互式控制台**: 按回车键查看全局统计，2秒内再次按回车退出程序

## 🤝 软件适配

### OpenClaw / OpenCode / Cline / Continue
在你的 AI 客户端中，将 `baseURL` 或 `OPENAI_BASE_URL` 设置为代理地址即可：

```text
http://localhost:8000/v1
```

## 🚀 快速开始

### 前提条件
- Node.js >= 18

### 安装方法
```bash
# 克隆仓库
git clone https://github.com/gabrielslls/llm-proxy.git
cd llm-proxy

# 安装依赖
npm install
```

### 启动代理
```bash
# 启动代理至 OpenAI
npm start -- --target https://api.openai.com/v1

# 启动代理至其他厂商
npm start -- --target <API地址> --port 8000 --log-payloads --codingplan-limit <num>
```

### 控制台统计功能
在交互式终端中运行时：
- 按 **回车键** 显示全局统计信息（成功/失败请求次数、总token消耗量、总成本、平均响应时间）
- 2秒内再次按 **回车键** 优雅退出程序

注意：在非TTY环境下（Docker、systemd、CI/CD等），统计功能会自动禁用，不影响代理正常运行。

## 📋 使用示例

将你 LLM 客户端（如 OpenCode, LangChain, ChatBox）的 API 端点指向代理地址即可。

### Curl 示例
```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

## 📊 日志格式

### 文本简报 (`logs/requests.log`)
```text
[SUCCESS #1] 2026/3/22 10:30:00 | 127.0.0.1 | gpt-3.5-turbo | Tokens:150+200 | Cost:$0.0004 | Req:1.2KB | Resp:2.5KB | 10:30:02 | 200 | 1.23s | req-id-xyz
```

## 💰 对账与审计

有关如何使用代理日志进行费用对账的详细指引，请参阅：

- [对账与费用审计指引](./RECONCILIATION_GUIDE_zh.md)
- [Reconciliation Guide (English)](./RECONCILIATION_GUIDE.md)

## 🚨 免责声明

本工具仅供技术研究、个人学习以及合规的费用对账使用。用户在使用过程中产生的 API 调用费用及遵守目标商服务条款的责任由用户自行承担。严禁用于任何非法用途。

## 📄 许可证

本项目采用 [MIT 许可证](./LICENSE)。
