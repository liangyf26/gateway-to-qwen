const TELEGRAPH_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
let LOGFLARE_API_KEY = 'OX9_n1kPX8_p';
let LOGFLARE_SOURCE_ID = 'fd15aaf1-8dec-4c6a-bd44-56e57b0c93e2';

export default {
  async fetch(request, env) {
      const NewResponse = await handleRequest(request)
      return NewResponse
  },
};


async function sendLogToLogflare(logData) {
  const url = new URL('https://api.logflare.app/logs');
  url.searchParams.append('source', LOGFLARE_SOURCE_ID);

  let init = {
    method: 'POST',
    headers: {
      'X-API-KEY': LOGFLARE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      metadata: {'gateway': 'cloudflare', 'app': 'aliyun'},
      event_message: logData
    }),
  };

  await fetch(url, init);
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))

  // 用event捕获函数简洁优雅地处理异常情况
  event.passThroughOnException()  // 这里就是告诉Cloudflare，出了岔子也继续代理请求，不要放弃哦
 
})


async function handleRequest(request) {
  const headers_Origin = request.headers.get("Access-Control-Allow-Origin") || "*"
  const newURL = TELEGRAPH_URL;

  try {
    const clientIP = request.headers.get('CF-Connecting-IP') || "Oops, 没有找到客户端IP！";
    const IPCountry = request.headers.get('CF-IPCountry') || "Oops, 没有找到客户端国家！";
    await sendLogToLogflare(`客户地址: ${clientIP} (${IPCountry})`);
    const headers_Auth = request.headers.get("Authorization") || "Ops,没有找到授权信息!"
    await sendLogToLogflare(`授权信息: ${headers_Auth}`);
    const bodyStr = await request.text();
    await sendLogToLogflare(`请求内容: ${bodyStr}`);
    
    let newBody = JSON.parse(bodyStr);
    if (!("input" in newBody)) {
      newBody = {
        model: newBody.model,
        input: {
          messages: newBody.messages
        }
      };
    }
  
 
    if (newBody.input && Array.isArray(newBody.input.messages)) {
      newBody.input.messages.forEach(message => {
        // 如果信息的角色是system且内容为空，则填上咱们的神秘咒语
        if (message.role === 'system' && message.content === '') {
          message.content = 'You are a helpful assistant.';
        }
      });
    }
  
    var newbodyStr = JSON.stringify(newBody)
    await sendLogToLogflare(`修改请求: ${newbodyStr}`);
  } catch (error) {
    await sendLogToLogflare('BuildRequest:'+ error.message + '; Stack Trace: ' + error.stack)
    return new Response('Oops! 构造请求内容时出错.', { status: 501 })
  }

  try {
    const modifiedRequest = new Request(newURL, {
        headers: request.headers,
        method: request.method,
        body: newbodyStr,
        redirect: 'follow'
      });
  } catch (error) {
    await sendLogToLogflare('SendRequest:' + error.message + '; Stack Trace: ' + error.stack)
    return new Response('Oops! 发送请求时出错啦~~', { status: 502 })
  }

  try {
    const response = await fetch(modifiedRequest);
    // 把body转换为JSON格式
    let responseBody = await response.json();
    await sendLogToLogflare(`返回内容: ${JSON.stringify(responseBody)}`);
  } catch (error) {
    await sendLogToLogflare('handleRequest:'+ error.message + '; Stack Trace: ' + error.stack)
    return new Response('Oops! 接收响应内容时出错.', { status: 503 })
  }

  try {
    // 添加"choices"字段
    if (!("choices" in responseBody)) {
        responseBody = {
        "id": responseBody.request_id,
        "object": "chat.completion",
        "model": newBody.model,
        "choices": [
            {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": responseBody.output.text
            },
            "finish_reason": responseBody.output.finish_reason
            }
        ],
        "usage": {
            "prompt_tokens": responseBody.usage.input_tokens,
            "completion_tokens": responseBody.usage.output_tokens,
            "total_tokens": responseBody.usage.total_tokens
        }

        }
    };
    await sendLogToLogflare(`修改返回: ${JSON.stringify(responseBody)}`);
    // 创建新的Response，用JSON.stringify()将新的body转换为字符串
    const modifiedResponse = new Response(JSON.stringify(responseBody), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    });
    
    // const modifiedResponse = new Response(response.body, response);
    // 添加允许跨域访问的响应头
    modifiedResponse.headers.set('Access-Control-Allow-Origin', headers_Origin);
  } catch (error) {
    await sendLogToLogflare('SendResponse:'+ error.message + '; Stack Trace: ' + error.stack)
    return new Response('Oops! 构造响应返回内容时出错.', { status: 504 })
  }
  
  return modifiedResponse;
}