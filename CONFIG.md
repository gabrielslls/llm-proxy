# Configuration / 配置说明

## Command Line Parameters / 命令行参数

```
llm-proxy --target <target-url> [options]
```

| Parameter / 参数 | Required / 必需 | Default / 默认值 | Description / 说明 |
|------------------|-----------------|------------------|--------------------|
| `--target <url>` | ✅ | 无 | Target API endpoint / 目标 API 地址 |
| `--port <number>` | ❌ | `8000` | Proxy service port / 代理服务监听端口 |
| `--log-dir <path>` | ❌ | `./logs` | Log directory / 日志文件目录 |
| `--log-payloads` | ❌ | `false` | Log full API payloads in JSONL format / 记录完整 API 请求和响应报文 (JSONL 格式) |
| `--plan` | ❌ | - | Launch interactive CodingPlan configuration / 启动交互式 CodingPlan 配置 |
| `--codingplan-limit <number>` | ❌ | - | Shortcut for requests mode with starting count 0. See Interactive Plan Configuration below. / 快捷方式，等效于次数记账模式且起始计数为 0。详见下方交互式配置说明 |
| `--help` | ❌ | - | Show help / 显示帮助信息 |
| `--version` | ❌ | - | Show version / 输出版本号 |

## Interactive Plan Configuration / 交互式计划配置

The `--plan` parameter launches an interactive wizard to configure usage tracking with flexible options.

使用 `--plan` 参数启动交互式向导，灵活配置使用量追踪。

### What `--plan` Does / `--plan` 功能说明

When you specify `--plan`, the proxy will prompt you to configure:

指定 `--plan` 后，代理将引导你完成以下配置：

1. **Counting Mode / 记账模式**: Choose how to track usage / 选择追踪方式
2. **Total Limit / 总限额**: Set the maximum allowed usage / 设置最大允许使用量
3. **Starting Count / 起始计数**: Set the initial usage offset / 设置初始使用量偏移

### Counting Modes / 记账模式

| Mode / 模式 | Description / 说明 | Use Case / 适用场景 |
|-------------|--------------------|---------------------|
| **Requests** / 次数记账 | Counts successful API requests / 统计成功的 API 请求数 | When you have a request-based quota / 当按请求数计费时 |
| **Tokens** / Token 记账 | Counts total tokens consumed (input + output) / 统计消耗的 Token 总数（输入+输出） | When you have a token-based budget / 当按 Token 量计费时 |

### Starting Count / 起始计数

You can specify the starting count in two ways:

起始计数支持两种输入方式：

- **Absolute Number** / 绝对值: e.g. / 例如 `100`, `0`, `1500`
- **Percentage** / 百分比: e.g. / 例如 `1.6%`, `50%`, `10.5%`

When using percentage, the starting count is calculated as:

使用百分比时，起始计数按以下公式计算：

```
startingCount = totalLimit × (percentage / 100)
```

**Example** / **示例**: With a total limit of 1200 and starting count of 1.6% / 总限额 1200，起始计数 1.6%：
```
startingCount = 1200 × 0.016 = 19.2
```

### Important Notes / 重要说明

- **Configuration is NOT persisted** / **配置不会保存**: You must use `--plan` each time you start the proxy. / 每次启动代理都需要重新配置。
- Percentage values preserve decimal precision / 百分比值保留小数精度
- Both modes track from the starting count toward the total limit / 两种模式都从起始计数开始，向总限额累计

## Examples / 示例

```bash
# Basic usage / 基本用法
llm-proxy --target https://api.example.com/v1

# Custom port and log directory / 自定义端口和日志目录
llm-proxy --target https://api.example.com/v1 --port 8080 --log-dir /var/log/llm-proxy

# Interactive plan configuration / 交互式计划配置
llm-proxy --target https://api.example.com/v1 --plan
# Then follow the prompts:
# 1. Select "Tokens" mode for token-based tracking
# 2. Enter total limit: 1000000
# 3. Enter starting count: 50000 (or 5%)

# Legacy shortcut for requests mode (equivalent to --plan with requests mode and 0 starting count)
# 旧版快捷方式（等效于使用 --plan 选择次数记账模式且起始计数为 0）
llm-proxy --target https://api.example.com/v1 --codingplan-limit 1200
```

## Environment Variables / 环境变量适配

For many AI software (e.g., OpenClaw, OpenCode), you can configure the proxy via environment variables:

对于许多 AI 软件（如 OpenClaw, OpenCode），可以通过环境变量设置代理：

```bash
export OPENAI_BASE_URL=http://localhost:8000/v1
export OPENAI_API_KEY=your-actual-api-key
```

## Startup Methods / 启动方式

### Development Mode / 前台开发模式
```bash
npm run dev -- --target <your-api-endpoint>
```

### Production Mode (PM2) / 生产后台模式（PM2）
```bash
pm2 start ecosystem.config.js
```
