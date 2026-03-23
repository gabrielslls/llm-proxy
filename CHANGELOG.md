# Changelog

## [Unreleased]

### 2026-03-21 (新增 IP 地址记录)

#### 新增
- **客户端 IP 记录** (`src/proxy.ts`, `src/types.ts`, `src/logger.ts`):
  - 新增 `clientIp` 字段到 `CallRecord` 类型
  - 添加 `getClientIp()` 方法，优先从 `X-Forwarded-For`、`X-Real-IP` 获取，最后使用 `req.ip`
  - 在控制台日志中显示客户端 IP：`[PROXY] traceId=xxx ip=192.168.1.100 ...`
  - 在 `requests.log` 中加入 IP 地址列

#### 优化
- **启动日志格式统一** (`src/proxy.ts`):
  - 同时显示 `calls.jsonl` 和 `requests.log` 两个日志文件路径

#### 文档
- 更新 `README.md` - 添加 `clientIp` 字段说明和 IP 地址特性

---

### 2026-03-15 (稳定性修复)

#### 修复
- **进程稳定性修复** (`src/index.ts`):
  - 添加 `uncaughtException` 和 `unhandledRejection` 全局异常处理器
  - 防止未处理异常导致进程崩溃

- **空指针修复** (`src/proxy.ts:209`):
  - 添加 null 检查，避免 `fetchResponse.body` 为 null 时崩溃

- **日志队列修复** (`src/logger.ts`):
  - 在 `processQueue()` 中添加 `finally` 块，确保 `isWriting` 标志始终被重置
  - 在构造函数中添加 `.catch()` 处理 `ensureLogDirectory()` 的异常
  - 防止队列卡死和内存泄漏

#### 新增
- **pm2 配置** (`ecosystem.config.js`):
  - 添加 pm2 进程管理器配置
  - 支持自动重启和日志管理

#### 文档
- 更新 `README.md` - 添加 pm2 使用说明
- 更新 `CHANGELOG.md` - 添加稳定性修复记录

---

### 2026-03-15 (最新)

#### 优化
- **日志格式优化** (`src/logger.ts`):
  - 修改 Agent 名称提取逻辑：匹配不到时写 `unknown`（而非前两个词）
  - 新增 `responseTimestamp` 字段到 `CallRecord` 类型
  - 修复响应时间记录：使用实际响应时间而非请求时间
  - 流式响应在流完成后记录日志

#### 文档
- 更新 `README.md` - 更新简洁文本日志格式说明
- 更新 `CHANGELOG.md` - 添加最新变更记录
- 更新 `PROJECT_SUMMARY.md` - 更新日志格式相关说明

---

### 2026-03-15

#### 优化
- **日志格式优化** (`src/logger.ts`):
  - 新增响应时间列（HH:MM:SS）
  - 去掉 "Tokens:" 前缀，直接显示数字
  - 优化 Agent 名称提取逻辑：匹配不到时取提示词前两个词

#### 文档
- 新增 `CONFIG.md` - 配置说明文档
- 新增 `CHANGELOG.md` - 变更记录文档
- 更新 `README.md` - 添加简洁文本日志格式说明
- 更新 `PROJECT_SUMMARY.md` - 添加日志格式更新记录

---

## [1.0.0] - 2026-03-14

### 新增
- 初始版本
- 代理核心功能，拦截 OpenCode 与 LLM API 交互
- JSONL 日志记录，包含提供商追踪 ID
- 简洁文本日志 (`logs/requests.log`)
- 配置切换脚本 (`scripts/switch-config.sh`)
