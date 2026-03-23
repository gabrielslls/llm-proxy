import axios from 'axios';

async function testDebug() {
  try {
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
        'Authorization': 'Bearer your-api-key',
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
  }
}

testDebug();
