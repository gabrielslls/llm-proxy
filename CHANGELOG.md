# Changelog

## [Unreleased]

### 2026-03-26 (限流检测与CodingPlan限额修复)

#### 新增
- **限流请求单独统计** (`src/proxy.ts`, `src/statistics.ts`):
  - HTTP 429 (Too Many Requests) 状态码从错误中分离，单独归类为"重试"
  - 控制台日志输出从 `[ERROR #N]` 改为 `[RETRY #N]`
  - 新增 `rateLimitCount` 内部统计（不显示在控制台统计表格中）
  - 限流不计入失败请求统计，更准确反映服务状态

#### 修复
- **CodingPlan 限额计算修正** (`src/statistics.ts`, `src/console.ts`):
  - 限额计算现在只统计**成功请求**，不再包含失败请求
  - "已使用"显示改用 `successCount` 替代 `totalRequests`
  - 避免因重试机制导致的限额虚高

#### 修复
- **成功判定逻辑修正** (`src/statistics.ts`):
  - 移除对 `record.error` 的依赖，只根据 HTTP status (200-299) 判断成功
  - 解决因日志记录时添加 `error` 字段导致的误判问题

---

### 2026-03-25 (codingplan 限额参数)

#### 新增
- **`--codingplan-limit <num>` 命令行参数** (`src/index.ts`, `src/types.ts`, `src/statistics.ts`, `src/console.ts`):
  - 可选参数，设置 CodingPlan 请求次数限额
  - 不设置参数时保持原有行为不变
  - 在控制台统计表格中新增显示：限额总数、已使用次数、剩余可用、使用率百分比
  - 使用率达到 100% 后显示醒目的 ⚠️ 警告提示
  - 统计包含所有请求（成功 + 失败），不拦截请求，仅做统计显示

---

### 2026-03-25 (全局统计功能)

#### 新增
- **交互式控制台统计功能** (`src/statistics.ts`, `src/console.ts`, `src/proxy.ts`, `src/index.ts`, `src/types.ts`):
  - 新增 `StatisticsTracker` 类，内存统计跟踪请求成功/失败次数、总token、总成本、平均响应时间
  - 新增 `ConsoleStats` 类，控制台交互支持：按回车显示统计，再次按回车退出
  - 支持100ms按键防抖，避免快速按键重复触发
  - 非TTY环境自动禁用，不影响服务正常启动
  - 统计数据仅保存在内存中，服务重启自动清空
  - 服务启动时显示操作提示和token未测试警告
  - 统计显示采用对齐的ASCII表格格式，附带"token数量未经测试，仅供参考"提示

#### 文档
- 更新 `README.md` / `README_zh.md` - 添加交互式控制台统计功能说明
- 新增 `TESTING.md` - 统计功能手动测试步骤文档

---

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
