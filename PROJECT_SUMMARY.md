# LLM Proxy - 项目完整记录

## 项目概述

用于拦截并记录 OpenCode 与目标厂商 API 之间的完整交互过程，研究 OpenCode 与大语言模型之间交互的底层原理。

---

## 1. 需求背景

### 问题
- OpenCode 的 SQLite 数据库缺少 LLM 调用的追踪 ID
- 无法与厂商的账单进行对账
- 需要获取目标厂商 API 返回的请求/追踪 ID

### 用户需求
- "oc有没有从底层进行完整跟踪调用的机制 或者自己打个补丁"
- "我的本意是指 api厂商那边会给请求一个编号 那个号可以与他们对账"
- 需要记录的是**厂商返回的 ID**，不是自己生成的

---

## 2. 研究过程

### 2.1 OpenCode 架构调研

#### 发现
- OpenCode 使用 SQLite 数据库：`~/.local/share/opencode/opencode.db`
- `message` 表结构：
  ```sql
  CREATE TABLE `message` (
    `id` text PRIMARY KEY,
    `session_id` text NOT NULL,
    `time_created` integer NOT NULL,
    `time_updated` integer NOT NULL,
    `data` text NOT NULL,  -- JSON 格式
    ...
  );
  ```
- 数据存储在 JSON 字段中，不是独立列
- OpenCode 有完整的日志系统：`~/.local/share/opencode/log/`

#### 结论
- 修改 OpenCode 数据库有风险
- 不需要修改 OpenCode 核心代码

### 2.2 目标厂商 API 调研

#### 发现
- 使用 OpenAI 兼容 API 格式
- 端点：`https://api.example-provider.com/v1`
- 响应头包含追踪 ID：
  - `X-Request-ID`: 厂商请求 ID
  - 其他可能的头：`X-Trace-ID`

#### 其他厂商
- 其他厂商如百度、讯飞、cucloud 等也都是 OpenAI 兼容格式
- 响应头格式类似

---

## 3. 方案设计

### 3.1 方案选型

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **A. 日志聚合** | 解析现有 OpenCode 日志 | 简单 | 信息不完整 |
| **B. SDK Hook** | 修改 @opencode-ai/sdk | 深度集成 | 需要维护 fork |
| **C. 数据库补丁** | 修改 OpenCode 数据库 | 数据统一 | 风险高，复杂 |
| **D. 外部代理** | 拦截 API 调用 | 安全，简单，不碰 OpenCode | 需要运行额外服务 |

### 3.2 最终方案：外部代理

**选择理由**：
- 不修改 OpenCode 任何代码或数据
- 安全可靠，易于维护
- 可以轻松扩展支持其他厂商
- 完全透明，厂商侧看不出区别

---

## 4. 系统架构

### 4.1 架构图

```
┌─────────────┐
│   OpenCode  │
└──────┬──────┘
       │ HTTP 请求
       ↓
┌─────────────────────────┐
│   LLM Proxy (Port 8000) │
│  - 提取厂商追踪 ID      │
│  - 记录 JSONL 日志      │
└──────┬──────────────────┘
       │ 原样转发
       ↓
┌─────────────────────────┐
│  目标厂商 API          │
│  (返回追踪 ID)         │
└─────────────────────────┘
```

### 4.2 组件说明

| 组件 | 文件 | 职责 |
|------|------|------|
| 代理核心 | `src/proxy.ts` | 拦截请求，提取追踪 ID |
| 日志记录 | `src/logger.ts` | 写入 JSONL 日志 |
| 入口 | `src/index.ts` | 启动服务 |
| 配置切换 | `scripts/switch-config.sh` | 切换 OpenCode 配置 |

---

## 5. 开发过程

### 5.1 项目结构

```
llm-proxy/
├── src/
│   ├── index.ts        # 入口文件
│   ├── proxy.ts        # 代理核心逻辑
│   ├── logger.ts       # 日志记录
│   └── types.ts        # TypeScript 类型
├── scripts/
│   └── switch-config.sh # 配置切换脚本
├── logs/               # 日志目录
├── package.json
├── tsconfig.json
├── README.md
├── PROJECT_SUMMARY.md  # 本文档
└── proxy.out          # 代理输出
```

### 5.2 核心功能实现

#### 追踪 ID 提取逻辑

```typescript
private extractVendorIds(fetchResponse: Response) {
  const vendorHeaders: Record<string, string> = {};
  let vendorTraceId: string | undefined;
  let vendorRequestId: string | undefined;

  for (const [key, value] of fetchResponse.headers.entries()) {
    vendorHeaders[key] = value;
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes("trace-id") || lowerKey.includes("trace_id")) {
      vendorTraceId = value;
    }
    if (lowerKey.includes("request-id") || lowerKey.includes("request_id")) {
      vendorRequestId = value;
    }
  }

  return { vendorTraceId, vendorRequestId, vendorHeaders };
}
```

### 5.3 关键技术决策

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| 运行时 | Bun vs Node.js | Node.js + tsx | 兼容性更好 |
| 日志格式 | JSON vs JSONL | JSONL | 便于流式写入和分析 |
| API Key 处理 | 环境变量 vs 转发 | 直接转发 | 更安全，不处理密钥 |
| 存储位置 | 数据库 vs 文件 | 文件 | 不破坏 OpenCode 数据 |

### 5.4 开发中的问题和解决

#### 问题 1：401 认证错误
**现象**：代理启动后，请求返回 401
**原因**：代理覆盖了 Authorization header
**解决**：移除覆盖代码，直接转发所有请求头

---

## 6. 测试验证

### 6.1 功能测试

| 测试项 | 结果 |
|--------|------|
| 代理启动 | ✅ 成功 |
| 请求转发 | ✅ 正常 |
| 响应返回 | ✅ 正常 |
| 追踪 ID 提取 | ✅ 成功 |
| 日志记录 | ✅ 完整 |

### 6.2 实际测试结果

测试场景：用户发送一条消息

**调用统计**：4 次 LLM 调用

**追踪 ID 记录**：
```
1. 021773494623696fdfd2e3c33d5b6eddad55ac385080e72c78ba9
2. 021773494640946fdfd2e3c33d5b6eddad55ac385080e72e55371
3. 0217734946559144087c9e55f8b322b82cd17f72450d06e6c148e
4. 0217734946687404087c9e55f8b322b82cd17f72450d06eae729f
```

---

## 7. 使用指南

### 7.1 安装

```bash
cd /home/sunlei/projects/llm-proxy
npm install
```

### 7.2 启动代理

```bash
# 前台运行
npm start

# 后台运行
nohup npm start > proxy.out 2>&1 &
```

### 7.3 切换 OpenCode 配置

```bash
# 启用代理
./scripts/switch-config.sh on

# 禁用代理
./scripts/switch-config.sh off

# 查看状态
./scripts/switch-config.sh status
```

### 7.4 查看日志

```bash
# 实时查看
tail -f logs/calls.jsonl

# 提取追踪 ID
grep -o '"vendorRequestId":"[^"]*"' logs/calls.jsonl

# 统计调用次数
wc -l logs/calls.jsonl
```

---

## 8. 日志格式

### JSONL 记录字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | 本地追踪 ID |
| `timestamp` | string | 请求开始 ISO 时间戳 |
| `responseTimestamp` | string | 响应完成 ISO 时间戳 |
| `clientIp` | string | 客户端 IP 地址 |
| `request.method` | string | HTTP 方法 |
| `request.path` | string | API 路径 |
| `request.body` | object | 请求体 |
| `response.status` | number | HTTP 状态码 |
| `response.body` | object | 响应体 |
| `response.vendorRequestId` | string | 厂商请求 ID（用于对账） |
| `response.vendorTraceId` | string | 厂商追踪 ID |
| `response.vendorHeaders` | object | 完整响应头 |
| `durationMs` | number | 请求耗时（毫秒） |

### 简洁文本日志 (`logs/requests.log`)

便于 `tail -f` 实时查看的格式：

```
日期 时间 | IP地址 | 模型 | Req:XX.XKB | Resp:XX.XKB | 响应时间 | 状态码 | 耗时 | 请求ID
```

 字段说明：
- `日期 时间`: 请求开始时间
- `IP地址`: 客户端 IP 地址（优先从 X-Forwarded-For 获取，其次 X-Real-IP，最后 req.ip）
- `模型`: 使用的模型
- `Req:XX.XKB`: 请求体大小
- `Resp:XX.XKB`: 响应体大小
- `响应时间`: 响应返回的时间（HH:MM:SS，流式响应在流完成后记录）
- `状态码`: HTTP 状态码
- `耗时`: 请求耗时（秒）
- `请求ID`: 厂商返回的请求 ID

**更新日志**:
- 2026-03-21:
  - 新增客户端 IP 地址列
  - 去掉 Token 数列（信息在厂商返回的请求 ID 中可查）
- 2026-03-15 (最新):
  - 去掉 Agent 名称列（无意义）
- 2026-03-15:
  - Agent 名称匹配不到时写 `unknown`
  - 修复响应时间记录，使用实际响应时间
  - 流式响应在流完成后记录日志
- 2026-03-15:
  - 新增响应时间列
  - 去掉 "Tokens:" 前缀，直接显示数字
  - 优化 Agent 名称提取逻辑

---

## 9. 扩展支持其他厂商

### 9.1 支持多厂商

由于所有厂商都使用 OpenAI 兼容格式，扩展很简单：

1. 修改配置，添加多个目标 URL
2. 根据请求路径或 Host 头区分厂商
3. 追踪 ID 提取逻辑通用

### 9.2 已测试的厂商

| 厂商 | 端点 | 状态 |
|------|------|------|
| 目标厂商 | `https://api.example-provider.com/v1` | ✅ 已测试 |
| 百度 | `https://qianfan.baidubce.com/v2/coding` | OpenAI 兼容 |
| 讯飞 | `https://maas-api.cn-huabei-1.xf-yun.com/v2` | OpenAI 兼容 |
| cucloud | `https://aigw-gzgy2.cucloud.cn:8443/v1` | OpenAI 兼容 |

---

## 10. 项目文件索引

| 文件 | 说明 |
|------|------|
| `src/index.ts` | 入口点，配置和启动 |
| `src/proxy.ts` | 代理核心，请求/响应处理 |
| `src/logger.ts` | JSONL 日志写入 |
| `src/types.ts` | TypeScript 类型定义 |
| `scripts/switch-config.sh` | OpenCode 配置切换 |
| `logs/calls.jsonl` | 调用记录日志 |
| `proxy.out` | 代理运行输出 |
| `README.md` | 快速使用指南 |
| `PROJECT_SUMMARY.md` | 本文档（完整记录） |

---

## 11. 总结

### 达成目标
- ✅ 捕获目标厂商 API 返回的追踪 ID
- ✅ 不修改 OpenCode 任何代码或数据
- ✅ 完全透明，厂商侧看不出区别
- ✅ 完整的日志记录，便于对账

### 技术亮点
- 简洁的外部代理方案
- 灵活的追踪 ID 提取（支持多种响应头格式）
- 易于扩展支持其他 OpenAI 兼容厂商
- JSONL 日志格式，便于后续分析

---

**项目完成日期**: 2026-03-14
**项目状态**: ✅ 完成并测试通过
