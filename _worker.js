const TELEGRAPH_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
let LOGFLARE_API_KEY = 'OX9_n1kPX8_p';
let LOGFLARE_SOURCE_ID = 'fd15aaf1-8dec-4c6a-bd44-56e57b0c93e2';

export default {
  async fetch(request, env) {
      const NewResponse = await handleRequest(request)
      return NewResponse
  },
};

// addEventListener('fetch', event => {
//   try {
//     event.respondWith(handleRequest(event.request))
//   } catch (e) {
//     if (DEBUG) {
//       return event.respondWith(
//         new Response(e.message || e.toString(), {
//           status: 500,
//         }),
//       )
//     }
//     event.respondWith(new Response('亲爱的用户，内部服务器错误', { status: 500 }))
//   }
// })

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
      event_message: logData,
    }),
  };

  await fetch(url, init);
};

async function handleRequest(request) {
  const headers_Origin = request.headers.get("Access-Control-Allow-Origin") || "*"
  const newURL = TELEGRAPH_URL;

  // 等待获取请求体，并将其作为参数传递给sendLogToLogflare
  const body = await request.json();
  await sendLogToLogflare(body);

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
