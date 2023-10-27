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
      metadata: {'gateway': 'cloudflare', 'app': 'qwen'},
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
  
  // 我们直接使用TELEGRAPH_URL， 不再需要 URL(request.url)
  const newURL = TELEGRAPH_URL;

  // 创建一个新的 Headers 对象复制原来的 headers，然后添加你的 Authorization
  // const newHeaders = new Headers(request.headers);
  // newHeaders.set('Authorization', 'Bearer sk-ad7cf22cf6b146099f59735c85ec7d33'); 

  const bodyStr = await request.text();
  const myStr = 'test string'
  await sendLogToLogflare(myStr);

  const modifiedRequest = new Request(newURL, {
    headers: request.headers,
    method: request.method,
    body: request.body,
    redirect: 'follow'
  });
  const response = await fetch(modifiedRequest);
  const modifiedResponse = new Response(response.body, response);
  // 添加允许跨域访问的响应头
  modifiedResponse.headers.set('Access-Control-Allow-Origin', headers_Origin);
  return modifiedResponse;
}
