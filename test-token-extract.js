// 模拟流式响应中的usage信息提取
function extractUsageFromChunk(chunk) {
  let usage = undefined;
  
  if (chunk.includes('"usage":{')) {
    try {
      // 尝试从chunk中提取完整的usage对象
      const startIndex = chunk.indexOf('"usage":{');
      let endIndex = startIndex;
      let braceCount = 0;
      let foundOpenBrace = false;
      
      for (let i = startIndex; i < chunk.length; i++) {
        if (chunk[i] === '{') {
          braceCount++;
          foundOpenBrace = true;
        } else if (chunk[i] === '}') {
          braceCount--;
          if (foundOpenBrace && braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
      
      if (endIndex > startIndex) {
        const usageStr = chunk.substring(startIndex, endIndex);
        const usageObj = JSON.parse(usageStr.substring(8)); // 跳过 "usage":
        usage = usageObj;
      }
    } catch (e) {
      // 忽略解析错误
      console.error('解析错误:', e);
    }
  }
  
  return usage;
}

// 测试用例
const testChunks = [
  // 测试用例1: 完整的usage信息在一个chunk中
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"target-model","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello!"},"finish_reason":null}]}',
  'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"target-model","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
  'data: {"usage":{"completion_tokens":45,"prompt_tokens":25082,"total_tokens":25127,"prompt_tokens_details":{"cached_tokens":0},"completion_tokens_details":{"reasoning_tokens":34}}}',
  'data: [DONE]'
];

// 测试提取逻辑
testChunks.forEach((chunk, index) => {
  console.log(`\n测试chunk ${index + 1}:`);
  console.log(`Chunk内容: ${chunk}`);
  const usage = extractUsageFromChunk(chunk);
  if (usage) {
    console.log(`提取到的usage信息:`, usage);
    console.log(`Total tokens: ${usage.total_tokens}`);
  } else {
    console.log(`未提取到usage信息`);
  }
});

// 测试用例2: usage信息跨多个chunk
console.log('\n\n测试用例2: usage信息跨多个chunk');
const partialChunk1 = 'data: {"usage":{"completion_tokens":45,"prompt_tokens":25082,';
const partialChunk2 = '"total_tokens":25127,"prompt_tokens_details":{"cached_tokens":0},"completion_tokens_details":{"reasoning_tokens":34}}}';

console.log(`Chunk 1: ${partialChunk1}`);
console.log(`Chunk 2: ${partialChunk2}`);

const combinedChunk = partialChunk1 + partialChunk2;
const usageFromCombined = extractUsageFromChunk(combinedChunk);
if (usageFromCombined) {
  console.log(`从合并后的chunk提取到的usage信息:`, usageFromCombined);
  console.log(`Total tokens: ${usageFromCombined.total_tokens}`);
} else {
  console.log(`未提取到usage信息`);
}
