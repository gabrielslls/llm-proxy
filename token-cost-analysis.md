# 讯飞/百度 Chat API Token/Cost 字段分析报告

> 测试日期：2026-03-26

---

## 1. 测试模型

### 讯飞星辰 MaaS

| Provider | Model ID | 实际模型 | Base URL |
|----------|----------|----------|----------|
| astroncodingplan | `astron-code-latest` | Deepseek-v3.2 | `maas-coding-api.cn-huabei-1.xf-yun.com/v2` |
| astroncodingplan2 | `astron-code-latest` | GLM-5.0 | `maas-coding-api.cn-huabei-1.xf-yun.com/v2` |
| xfyun-maas | `xop3qwencodernext` | Qwen3-Coder-Next-FP8 | `maas-api.cn-huabei-1.xf-yun.com/v2` |

### 百度千帆 Coding

| Provider | Model ID | 实际模型 | Base URL |
|----------|----------|----------|----------|
| baidu | `kimi-k2.5` | Kimi K2.5 | `qianfan.baidubce.com/v2/coding` |
| baidu | `qianfan-code-latest` | Deepseek V3.2 | `qianfan.baidubce.com/v2/coding` |
| baidu | `glm-5` | GLM-5 | `qianfan.baidubce.com/v2/coding` |
| baidu | `minimax-m2.5` | MiniMax M2.5 | `qianfan.baidubce.com/v2/coding` |

---

## 2. Token 计算公式

### 基础公式

```
total_tokens = prompt_tokens + completion_tokens
```

### 详细分解

```
prompt_tokens = 输入文本 token 数（含 system prompt + 所有历史消息）

completion_tokens = 实际输出 token 数 + reasoning_tokens（思维链 token）
```

### 费用计算

```
费用 = prompt_tokens × 输入单价 + completion_tokens × 输出单价
```

> **重要**：`reasoning_tokens` 已包含在 `completion_tokens` 中，不会重复计费。

---

## 3. 响应结构

### 3.1 非流式响应

```json
{
  "id": "cht000bd5d1@dx19d29518b86b8aa700",
  "model": "astron-code-latest",
  "object": "chat.completion",
  "created": 1774514707,
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "回答内容...",
        "reasoning_content": "思维链内容（部分模型支持）",
        "plugins_content": null
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 18,
    "completion_tokens": 92,
    "total_tokens": 110,
    "prompt_tokens_details": {
      "cached_tokens": 0
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0
    }
  }
}
```

### 3.2 流式响应

**请求参数：**
```json
{
  "model": "astron-code-latest",
  "messages": [{"role": "user", "content": "..."}],
  "stream": true,
  "stream_options": {"include_usage": true}
}
```

**响应结构（百度 Kimi K2.5）：**
```json
// 1. 先输出 reasoning_content（思维链）
{"delta": {"reasoning_content": "用户要求..."}, "usage": {"total_tokens": 0}}

// 2. 最后输出 content
{"delta": {"content": "7"}, "finish_reason": "stop"}

// 3. 最后一个 chunk 包含完整 usage
{
  "delta": {"content": ""},
  "finish_reason": "stop",
  "usage": {
    "prompt_tokens": 11,
    "completion_tokens": 146,
    "total_tokens": 157,
    "completion_tokens_details": {"reasoning_tokens": 143}
  }
}

// 4. 结束标记
data: [DONE]
```

---

## 4. Usage 字段详解

| 字段 | 类型 | 讯飞 | 百度 | 说明 |
|------|------|:----:|:----:|------|
| `prompt_tokens` | int | ✅ | ✅ | 输入 token 数（含 system + 历史消息） |
| `completion_tokens` | int | ✅ | ✅ | 输出 token 数（含 reasoning_tokens） |
| `total_tokens` | int | ✅ | ✅ | 总计 = prompt + completion |
| `prompt_tokens_details.cached_tokens` | int | ✅ | ❌ | 缓存命中的 token 数 |
| `completion_tokens_details.reasoning_tokens` | int | ✅ | ✅ | 思维链推理 token 数 |

---

## 5. 思维链支持情况

| 平台 | 模型 | reasoning_content | reasoning_tokens |
|------|------|-------------------|------------------|
| 讯飞 | Deepseek-v3.2 | 空 | 0 |
| 讯飞 | GLM-5.0 | 空 | 0 |
| 讯飞 | Qwen3-Coder-Next | 空 | 0 |
| 百度 | Kimi K2.5 | ✅ 有内容 | ✅ 有值 |
| 百度 | Deepseek V3.2 | 空 | 无字段 |
| 百度 | MiniMax M2.5 | ✅ 有内容 | ✅ 有值 |

> **结论**：百度的 Kimi K2.5 和 MiniMax M2.5 支持思维链，会输出 `reasoning_content` 并记录 `reasoning_tokens`。

---

## 6. 缓存机制

| 平台 | cached_tokens 字段 | 实测结果 |
|------|-------------------|----------|
| 讯飞 | ✅ 存在 | 始终为 0（未触发缓存） |
| 百度 | ❌ 无此字段 | 不支持 |

**测试方法**：连续发送相同请求 5 次，`cached_tokens` 始终为 0。

---

## 7. 实际示例

### 示例 1：百度 Kimi K2.5（带思维链）

**请求：**
```
用户: 1+1等于几？
```

**响应：**
```json
{
  "choices": [{
    "message": {
      "content": "**2**\n\n(In standard base-10 arithmetic, one plus one equals two.)",
      "reasoning_content": "The user is asking a simple math question: \"1+1=?\"\n\nThis is a straightforward arithmetic problem. The answer is 2.\n\nI should provide the answer clearly and concisely..."
    }
  }],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 106,
    "total_tokens": 118,
    "completion_tokens_details": {
      "reasoning_tokens": 88
    }
  }
}
```

**Token 分析：**
- 输入：12 tokens
- 输出：106 tokens = 88 tokens 思维链 + 18 tokens 实际回答
- 总计：118 tokens

### 示例 2：讯飞 Deepseek-v3.2（无思维链）

**请求：**
```
用户: 1+1等于几？
```

**响应：**
```json
{
  "choices": [{
    "message": {
      "content": "我们先一步步思考：\n\n1. 1 是一个自然数。\n2. 加法运算中，1 + 1 表示在自然数序列中，从 1 开始再往后数 1 个数。\n3. 自然数序列：1, 2, 3, …\n4. 从 1 往后数 1 个，得到 2。\n\n所以答案是：**2**。",
      "reasoning_content": ""
    }
  }],
  "usage": {
    "prompt_tokens": 18,
    "completion_tokens": 92,
    "total_tokens": 110,
    "prompt_tokens_details": {"cached_tokens": 0},
    "completion_tokens_details": {"reasoning_tokens": 0}
  }
}
```

**Token 分析：**
- 输入：18 tokens
- 输出：92 tokens（无思维链，推理内容直接在 content 中）
- 总计：110 tokens

---

## 8. 代码示例

### Python 解析 Usage

```python
import requests

response = requests.post(
    "https://maas-api.cn-huabei-1.xf-yun.com/v2/chat/completions",
    json={
        "model": "xop3qwencodernext",
        "messages": [{"role": "user", "content": "你好"}]
    },
    headers={"Authorization": f"Bearer {api_key}:{api_secret}"}
)

result = response.json()
usage = result["usage"]

# 基础 token 统计
prompt_tokens = usage["prompt_tokens"]
completion_tokens = usage["completion_tokens"]
total_tokens = usage["total_tokens"]

# 思维链 token（如果存在）
reasoning_tokens = usage.get("completion_tokens_details", {}).get("reasoning_tokens", 0)

# 缓存 token（如果存在）
cached_tokens = usage.get("prompt_tokens_details", {}).get("cached_tokens", 0)

# 实际输出 token（不含思维链）
actual_output_tokens = completion_tokens - reasoning_tokens

print(f"输入: {prompt_tokens} tokens")
print(f"输出: {completion_tokens} tokens (思维链: {reasoning_tokens}, 实际: {actual_output_tokens})")
print(f"总计: {total_tokens} tokens")
print(f"缓存命中: {cached_tokens} tokens")
```

### 流式输出解析

```python
response = requests.post(
    url,
    json={
        "model": "kimi-k2.5",
        "messages": [{"role": "user", "content": "你好"}],
        "stream": True,
        "stream_options": {"include_usage": True}
    },
    headers={"Authorization": f"Bearer {api_key}"},
    stream=True
)

reasoning_content = []
content = []
final_usage = None

for line in response.iter_lines():
    if line:
        line = line.decode("utf-8")
        if line.startswith("data: "):
            data = line[6:]
            if data == "[DONE]":
                break
            chunk = json.loads(data)
            delta = chunk["choices"][0]["delta"]
            
            # 收集思维链内容
            if delta.get("reasoning_content"):
                reasoning_content.append(delta["reasoning_content"])
            
            # 收集输出内容
            if delta.get("content"):
                content.append(delta["content"])
            
            # 获取最终 usage
            if "usage" in chunk and chunk["usage"].get("total_tokens", 0) > 0:
                final_usage = chunk["usage"]

print("思维链:", "".join(reasoning_content))
print("回答:", "".join(content))
print("Usage:", final_usage)
```

---

## 9. 注意事项

1. **流式输出必须设置 `stream_options: {include_usage: true}`** 才能获取 usage 信息

2. **思维链 token 已包含在 completion_tokens 中**，计算费用时不需要额外加

3. **缓存功能实测未生效**，`cached_tokens` 始终为 0

4. **API 响应中不包含 cost/price 字段**，费用需根据 token 数和单价自行计算

5. **不同平台字段略有差异**，代码中应使用 `.get()` 方法安全获取可选字段

---

## 10. 参考文档

- [讯飞星辰 MaaS API 文档](https://www.xfyun.cn/doc/spark/推理服务-http.html)
- [百度千帆 Coding API 文档](https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html)
