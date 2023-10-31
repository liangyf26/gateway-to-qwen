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
  event.waitUntil(handleErrors(event))
})


async function handleErrors(event) {
  try {
    await event.passThroughOnException()
  } catch (error) {
    // 在这里你可以发送错误信息到一些日志服务
    // 或者发送到你的邮箱，或者使用你喜欢的错误追踪工具
    sendLogToLogflare('Caught an error:', error)
  }
}


async function handleRequest(request) {
  const headers_Origin = request.headers.get("Access-Control-Allow-Origin") || "*"
  const newURL = TELEGRAPH_URL;

  // 创建一个新的 Headers 对象复制原来的 headers，然后添加你的 Authorization
  // const newHeaders = await new Headers(request.headers);

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
  let newbodyStr = JSON.stringify(newBody)
  // await sendLogToLogflare(newbodyStr);

  const modifiedRequest = new Request(newURL, {
    headers: request.headers,
    method: request.method,
    body: newbodyStr,
    redirect: 'follow'
  });
  const response = await fetch(modifiedRequest);
  let newResposeBody = response.body
  if (!("choices" in newResposeBody)) {
    newResposeBody = {
        "id": newResposeBody.request_id,
        "object": "chat.completion",
        "model": newBody.model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": newResposeBody.output.text
                },
                "finish_reason": newResposeBody.output.finish_reason
            }
        ],
        "usage": {
            "prompt_tokens": newResposeBody.usage.input_tokens,
            "completion_tokens": newResposeBody.usage.output_tokens,
            "total_tokens": newResposeBody.usage.total_tokens
        }
    };
  }
  const modifiedResponse = new Response(newResposeBody, response);
  // 添加允许跨域访问的响应头
  modifiedResponse.headers.set('Access-Control-Allow-Origin', headers_Origin);
  return modifiedResponse;
}
