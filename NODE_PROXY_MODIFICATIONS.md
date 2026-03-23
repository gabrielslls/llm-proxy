# LLM Proxy (Node.js) 修改建议

## 1. 简化配置

| 原配置 | 新配置 | 原因 |
|--------|--------|------|
| `port: 8443` | `port: 8000` | 8000 是常见默认端口，8443 通常保留给 HTTPS |
| `targetBaseUrl` | `target` | 简化命名 |
| `apiKeyEnv: "LLM_API_KEY"` | 删除 | 代理透传请求头，不需要知道 key |
| `logFile: "../logs/calls.jsonl"` | `logDir: "./logs"` | 改为目录，代理自动创建日志文件 |

## 2. 命令行参数支持

原版本硬编码在 `src/index.ts`，改为命令行参数：

```bash
# 最小用法
llm-proxy --target https://api.openai.com

# 完整用法
llm-proxy --target https://api.openai.com --port 8001 --log-dir /var/log/llm-proxy

# 帮助
llm-proxy --help
```

## 3. 删除多 provider 支持

原版本设计为支持多个 provider，简化为：
- 一个代理实例只代理一个 endpoint
- 如需代理多个 provider，启动多个实例

```bash
# 同时代理多个 provider
llm-proxy --port 8000 --target https://api.openai.com
llm-proxy --port 8001 --target https://api.anthropic.com
```

## 4. 配置类型简化

```typescript
// 原版
interface ProxyConfig {
  port: number;
  targetBaseUrl: string;
  apiKeyEnv: string;  // 删除
  logFile: string;
}

// 新版
interface ProxyConfig {
  port: number;       // 默认 8000
  target: string;     // 必填
  logDir: string;     // 默认 ./logs
}
```

## 5. 参数说明

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `--target` | ✅ | 无 | 目标 API 地址 |
| `--port` | ❌ | 8000 | 监听端口 |
| `--log-dir` | ❌ | `./logs` | 日志目录 |

## 6. 影响的文件

| 文件 | 修改内容 |
|------|----------|
| `src/index.ts` | 移除硬编码配置，改为命令行参数解析 |
| `src/types.ts` | 简化 `ProxyConfig` 接口 |
| `package.json` | 添加 `bin` 字段，支持全局安装 |
| 新增 `README.md` | 更新使用说明 |

## 7. 其他建议

- 添加 `--help` 命令输出用法说明
- 支持 `--version` 输出版本号
- 考虑添加 `--log-level` 参数控制日志详细程度（可选）
