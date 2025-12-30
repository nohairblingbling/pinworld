/**
 * PinWorld GitHub Image Upload Proxy
 * Cloudflare Worker - 代理 GitHub API 请求
 * 
 * 部署步骤：
 * 1. 登录 Cloudflare Dashboard
 * 2. 进入 Workers & Pages
 * 3. 创建 Worker
 * 4. 粘贴此代码
 * 5. 添加环境变量 GITHUB_TOKEN
 * 6. 部署
 */

// 允许的来源域名（防止滥用）
const ALLOWED_ORIGINS = [
  'https://nohairblingbling.github.io',
  'https://yuzhuojia.fun',
  'https://www.yuzhuojia.fun',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

// GitHub 仓库配置（图床仓库）
const GITHUB_REPO = 'tracker-xydr/worldweb';
const GITHUB_BRANCH = 'main';

export default {
  async fetch(request, env) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handleCORS(request);
    }

    // 验证来源
    const origin = request.headers.get('Origin');
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    // 只允许 PUT 请求（上传文件）
    if (request.method !== 'PUT') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // 解析请求体
      const body = await request.json();
      const { path, content, message } = body;

      if (!path || !content) {
        return new Response('Missing path or content', { status: 400 });
      }

      // 从环境变量获取 token
      const token = env.GITHUB_TOKEN;
      if (!token) {
        return new Response('Server configuration error', { status: 500 });
      }

      // 调用 GitHub API
      const githubUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
      
      const githubResponse = await fetch(githubUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PinWorld-CloudflareWorker'
        },
        body: JSON.stringify({
          message: message || `upload via PinWorld`,
          content: content,
          branch: GITHUB_BRANCH
        })
      });

      const data = await githubResponse.json();

      // 返回结果
      return new Response(JSON.stringify(data), {
        status: githubResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin
        }
      });
    }
  }
};

// 处理 CORS 预检请求
function handleCORS(request) {
  const origin = request.headers.get('Origin');
  
  if (ALLOWED_ORIGINS.includes(origin)) {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  return new Response('Forbidden', { status: 403 });
}
