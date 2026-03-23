# LLM Proxy

![CI Status](https://github.com/gabrielslls/llm-proxy/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/github/license/gabrielslls/llm-proxy)

[English](./README.md) | [简体中文](./README_zh.md)

A lightweight, neutral, open-source LLM proxy tool designed for transparent token statistics and cost auditing.

纯轻量、中立的开源 LLM 代理工具，专注于透明化 Token 统计与费用审计。

---

## ✨ Features / 核心特性

- 🔌 **Universal Forwarding**: Compatible with any OpenAI-compatible APIs. (通用转发：兼容所有 OpenAI 协议厂商)
- 📊 **Real-time Stats**: Track input/output tokens and latency. (实时统计：追踪输入/输出 Token 及耗时)
- 📝 **Local Logging**: Durable JSONL and readable text logs for cost auditing. (本地日志：JSONL 格式及可读文本日志，便于费用审计)
- 🛡️ **Privacy Focused**: No data sent to 3rd parties; pure observation only. (隐私保护：无第三方数据传输，仅做纯观测用途)
- 🚫 **Vendor Neutral**: No hardcoded endpoints or bypasses. (厂商中立：不包含硬编码的接口，无绕过或破解行为)

## 🚀 Quick Start / 快速开始

### Prerequisites / 前提条件
- Node.js >= 18

### Installation / 安装
```bash
# Clone the repository
git clone https://github.com/your-username/llm-proxy.git
cd llm-proxy

# Install dependencies
npm install
```

### Usage / 使用方法
```bash
# Basic usage / 基本用法
npm start -- --target https://api.openai.com/v1

# Full options / 完整参数
npm start -- --target <target-endpoint> --port 8000 --log-dir ./logs
```

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
Detailed machine-readable records for each request.
针对每个请求的详细机器可读记录。

### 2. Text Summary (`logs/requests.log`)
Human-readable monitoring format.
便于实时监控的人类可读格式。

```text
[SUCCESS #1] 2026/3/22 10:30:00 | 127.0.0.1 | gpt-3.5-turbo | Req:1.2KB | Resp:2.5KB | 10:30:02 | 200 | 1.23s | req-id-xyz
```

## 🚨 Disclaimer / 免责声明

This tool is for personal/educational use only. Users are responsible for their own API usage and compliance with target providers' terms of service.
本工具仅用于个人或教育用途。用户对其 API 使用及遵守目标服务商的服务条款负有全部责任。

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
