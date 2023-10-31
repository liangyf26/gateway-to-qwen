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

async function handleRequest(request) {
    const headers_Origin = request.headers.get("Access-Control-Allow-Origin") || "*"
    const newURL = TELEGRAPH_URL;
  
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
  
    const modifiedRequest = new Request(newURL, {
      headers: request.headers,
      method: request.method,
      body: newbodyStr,
      redirect: 'follow'
    });
    const response = await fetch(modifiedRequest);
    let newResposeBody = response.body;
  
    const modifiedResponse = new Response(newResposeBody, response);
    
    modifiedResponse.headers.set('Access-Control-Allow-Origin', headers_Origin);
    return modifiedResponse;
}
  