// 测试agent名称提取逻辑
function testAgentExtraction() {
  // 测试不同格式的system prompt
  const testPrompts = [
    // 标准格式（应该能提取到）
    '<Role>\nYou are "Sisyphus" - Powerful AI Agent with orchestration capabilities from OhMyOpenCode.\n...',
    
    // 没有双引号的格式（现在可能无法提取）
    '<Role>\nYou are Sisyphus - Powerful AI Agent with orchestration capabilities from OhMyOpenCode.\n...',
    
    // 其他可能的格式
    'You are a helpful assistant named Sisyphus',
    'Role: Sisyphus',
    'Name: Sisyphus',
    'Agent: Sisyphus',
    'I am Sisyphus',
    'This is Sisyphus',
  ];
  
  // 当前的提取逻辑
  function currentExtract(systemContent) {
    const agentInfo: any = {};
    
    // 提取 Agent 名称
    const nameMatch = systemContent.match(/You are "([^"]+)"/i);
    if (nameMatch) {
      agentInfo.name = nameMatch[1];
    }
    
    return agentInfo;
  }
  
  // 更灵活的提取逻辑
  function improvedExtract(systemContent) {
    const agentInfo: any = {};
    
    // 尝试多种格式
    const patterns = [
      /You are "([^"]+)"/i,           // You are "AgentName"
      /You are ([A-Z][a-zA-Z]+)/i,       // You are AgentName (不带引号)
      /Role:?\s*([A-Z][a-zA-Z]+)/i,       // Role: AgentName
      /Name:?\s*([A-Z][a-zA-Z]+)/i,       // Name: AgentName
      /Agent:?\s*([A-Z][a-zA-Z]+)/i,      // Agent: AgentName
      /I am ([A-Z][a-zA-Z]+)/i,          // I am AgentName
      /This is ([A-Z][a-zA-Z]+)/i,       // This is AgentName
    ];
    
    for (const pattern of patterns) {
      const match = systemContent.match(pattern);
      if (match) {
        agentInfo.name = match[1];
        break;
      }
    }
    
    return agentInfo;
  }
  
  console.log('=== 测试当前提取逻辑 ===');
  testPrompts.forEach((prompt, i) => {
    const result = currentExtract(prompt);
    console.log(`测试 ${i + 1}:`);
    console.log(`  输入: ${prompt.substring(0, 50)}...`);
    console.log(`  提取结果:`, result);
    console.log();
  });
  
  console.log('\n=== 测试改进的提取逻辑 ===');
  testPrompts.forEach((prompt, i) => {
    const result = improvedExtract(prompt);
    console.log(`测试 ${i + 1}:`);
    console.log(`  输入: ${prompt.substring(0, 50)}...`);
    console.log(`  提取结果:`, result);
    console.log();
  });
}

testAgentExtraction();
