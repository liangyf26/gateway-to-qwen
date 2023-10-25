
const TELEGRAPH_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';


export default {
  async fetch(request, env) {
      const NewResponse = await handleRequest(request)
      return NewResponse
  },

};

async function handleRequest(request) {
  const url = new URL(request.url);
  const headers_Origin = request.headers.get("Access-Control-Allow-Origin") || "*"
  // url.host = TELEGRAPH_URL.replace(/^https?:\/\//, '');
  url.host = TELEGRAPH_URL;

  // 创建一个新的 Headers 对象复制原来的 headers，然后添加你的 Authorization
  const newHeaders = new Headers(request.headers);
  newHeaders.set('Authorization', 'Bearer sk-ad7cf22cf6b146099f59735c85ec7d33'); 

  const modifiedRequest = new Request(url.toString(), {
    headers: newHeaders,
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
