import axios from 'axios';

async function testRealAPI() {
  try {
    // 从环境变量中读取API KEY
    const apiKey = process.env.LLM_API_KEY || 'your-real-api-key';
    
    const response = await axios.post('http://localhost:8000/chat/completions', {
      model: 'target-model',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant'
        },
        {
          role: 'user',
          content: 'Hello, how are you?'
        }
      ],
      max_tokens: 100,
      stream: true
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    let fullResponse = '';
    for await (const chunk of response.data) {
      const chunkStr = chunk.toString();
      fullResponse += chunkStr;
      console.log(chunkStr);
    }

    console.log('\nFull response:', fullResponse);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
}

testRealAPI();
