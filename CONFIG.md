# 配置说明

## 命令行参数

```
llm-proxy --target <target-url> [options]
```

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `--target <url>` | ✅ | 无 | 目标 API 地址 |
| `--port <number>` | ❌ | `8000` | 代理服务监听端口 |
| `--log-dir <path>` | ❌ | `./logs` | 日志文件目录 |
| `--help` | ❌ | - | 显示帮助信息 |
| `--version` | ❌ | - | 输出版本号 |

## 示例

```bash
# 基本用法
llm-proxy --target https://api.example.com/v1

# 自定义端口和日志目录
llm-proxy --target https://api.example.com/v1 --port 8080 --log-dir /var/log/llm-proxy
```

## 启动方式

### 前台开发模式
```bash
npm run dev -- --target <your-api-endpoint>
```

### 生产后台模式（PM2）
```bash
pm2 start ecosystem.config.js
```
