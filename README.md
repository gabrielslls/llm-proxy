# LLM Proxy

![CI Status](https://github.com/gabrielslls/llm-proxy/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/github/license/gabrielslls/llm-proxy)

[English](./README.md) | [简体中文](./README_zh.md)

A lightweight, neutral, open-source LLM proxy tool designed for transparent token statistics.

纯轻量、中立的开源 LLM 代理工具，专注于透明化 Token 统计。

---

## ✨ Features / 核心特性

- 🔌 **Universal Forwarding**: Compatible with any OpenAI-compatible APIs. (通用转发：兼容所有 OpenAI 协议厂商)
- 📊 **Real-time Stats**: Track input/output tokens and latency. (实时统计：追踪输入/输出 Token 及耗时)
- 📝 **Local Logging**: Human-readable text logs for monitoring. Optional full payload logging (JSONL) for deep auditing. (本地日志：人类可读的监控日志。可选的完整报文日志 JSONL，用于深度审计)
- 🛡️ **Privacy Focused**: No data sent to 3rd parties; pure observation only. (隐私保护：无第三方数据传输，仅做纯观测用途)
- 🚫 **Vendor Neutral**: No hardcoded endpoints or bypasses. (厂商中立：不包含硬编码的接口，无绕过或破解行为)
- 🤝 **AI Software Ready**: Optimized for OpenClaw, OpenCode, and other AI agents. (协作友好：适配 OpenClaw、OpenCode 等主流 AI 软件)
- ⌨️ **Interactive Console**: Press Enter to view global statistics, press Enter again within 2 seconds to exit.

## 🤝 Compatibility / 软件适配

### OpenClaw / OpenCode / Cline / Continue
Simply set the `baseURL` or `OPENAI_BASE_URL` to your proxy address:
只需将 `baseURL` 或 `OPENAI_BASE_URL` 设置为你的代理地址：

```text
http://localhost:8000/v1
```

## 🚀 Quick Start / 快速开始

### Prerequisites / 前提条件
- Node.js >= 18

### Installation / 安装
```bash
# Clone the repository
git clone https://github.com/gabrielslls/llm-proxy.git
cd llm-proxy

# Install dependencies
npm install
```

### Usage / 使用方法
```bash
# Basic usage / 基本用法
npm start -- --target https://api.openai.com/v1

# Full options / 完整参数
npm start -- --target <target-endpoint> --port 8000 --log-dir ./logs --log-payloads --codingplan-limit <num>
```

### Console Statistics
When running in an interactive terminal, press **Enter** to view real-time global statistics:

```
┌─────────────────────────────────────────┐
│Global Statistics (since 2026-03-26 ...) │
├─────────────────────────────────────────┤
│Success requests:      342               │
│Failed requests:        0                │
│Total tokens consumed: 12,345            │
│Average response time: 234ms             │
└─────────────────────────────────────────┘

⚠️  Note: Token counts are for reference only
```

**Interactive Controls:**
- Press **Enter** → Display global statistics (success/failure counts, total tokens, average response time)
- Press **Enter** again within 2 seconds → Exit the program gracefully
- Wait >2 seconds → Next Enter shows updated statistics

**With CodingPlan Limit:**
```
┌─────────────────────────────────────────┐
│Global Statistics (since 2026-03-26 ...) │
├─────────────────────────────────────────┤
│Success requests:      342               │
│Failed requests:        0                │
│Total tokens consumed: 12,345            │
│Average response time: 234ms             │
├─────────────────────────────────────────┤
│CodingPlan limit:     1,200              │
│Used:                  342               │
│Remaining:             858               │
│Usage:                28.5%              │
└─────────────────────────────────────────┘
```

Note: The statistics feature is automatically disabled in non-TTY environments (Docker, systemd, CI/CD, etc.) without affecting normal proxy operation.

## 📋 Usage Example / 使用示例

Set the proxy address in your LLM client:
在你的 LLM 客户端中设置代理地址：

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## 📊 Log Format / 日志格式

### 1. JSONL Log (`logs/calls.jsonl`)
Detailed machine-readable records (including request/response bodies). **Disabled by default, use `--log-payloads` to enable.**
针对每个请求的详细机器可读记录（包含请求/响应体）。**默认关闭，使用 `--log-payloads` 开启。**

### 2. Text Summary (`logs/requests.log`)
Human-readable monitoring format with tokens.
包含 Token 的实时监控日志。

```text
[SUCCESS #1] 2026/3/22 10:30:00 | 127.0.0.1 | gpt-3.5-turbo | Tokens:150+200 | Req:1.2KB | Resp:2.5KB | 10:30:02 | 200 | 1.23s | req-id-xyz
```

## 💰 Reconciliation / 对账审计

For a detailed guide on how to audit your costs and reconcile usage with provider bills, see:
有关如何审计费用并与厂商账单进行对账的详细指引，请参阅：

- [English Guide](./RECONCILIATION_GUIDE.md)
- [中文指引](./RECONCILIATION_GUIDE_zh.md)

## 🚨 Disclaimer / 免责声明

This tool is for personal/educational use only. Users are responsible for their own API usage and compliance with target providers' terms of service.
本工具仅用于个人或教育用途。用户对其 API 使用及遵守目标服务商的服务条款负有全部责任。

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
