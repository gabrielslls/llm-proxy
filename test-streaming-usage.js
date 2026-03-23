// 模拟OpenAI格式的流式响应
const mockStreamingResponse = [
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"target-model","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello!"},"finish_reason":null}]}',
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"target-model","choices":[{"index":0,"delta":{"content":" How can I help you today?"},"finish_reason":null}]}',
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"target-model","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
  'data: {"usage":{"completion_tokens":15,"prompt_tokens":10,"total_tokens":25,"prompt_tokens_details":{"cached_tokens":0},"completion_tokens_details":{"reasoning_tokens":0}}}',
  'data: [DONE]'
];

// 模拟proxy.ts中的提取逻辑
function extractUsageFromStream(chunks) {
  let usage = undefined;
  let fullContent = '';
  
  for (const chunk of chunks) {
    fullContent += chunk + '\n';
    
    // 尝试从chunk中提取usage信息
    try {
      // 首先尝试解析整个chunk作为JSON
      if (chunk.startsWith('data: ')) {
        const jsonStr = chunk.substring(6); // 跳过 "data: "
        if (jsonStr !== '[DONE]') {
          const chunkData = JSON.parse(jsonStr);
          if (chunkData.usage) {
            usage = chunkData.usage;
            console.log('从chunk中提取到usage:', usage);
          }
        }
      }
    } catch (e) {
      // 忽略解析错误
      console.error('解析chunk错误:', e);
    }
    
    // 也尝试从完整内容中提取usage信息
    if (!usage) {
      try {
        // 查找包含usage的行
        const lines = fullContent.split('\n');
        for (const line of lines) {
          if (line.includes('"usage":{')) {
            const jsonStr = line.startsWith('data: ') ? line.substring(6) : line;
            if (jsonStr !== '[DONE]') {
              const chunkData = JSON.parse(jsonStr);
              if (chunkData.usage) {
                usage = chunkData.usage;
                console.log('从完整内容中提取到usage:', usage);
                break;
              }
            }
          }
        }
      } catch (e) {
        // 忽略解析错误
        console.error('解析完整内容错误:', e);
      }
    }
  }
  
  return usage;
}

// 测试提取逻辑
console.log('开始测试流式响应中的usage提取');
console.log('=================================');

const extractedUsage = extractUsageFromStream(mockStreamingResponse);

console.log('=================================');
if (extractedUsage) {
  console.log('成功提取到usage信息:');
  console.log(`  Prompt tokens: ${extractedUsage.prompt_tokens}`);
  console.log(`  Completion tokens: ${extractedUsage.completion_tokens}`);
  console.log(`  Total tokens: ${extractedUsage.total_tokens}`);
} else {
  console.log('未提取到usage信息');
}
