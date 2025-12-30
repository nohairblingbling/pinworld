# Cloudflare Worker 配置指南

## 📋 配置步骤

### 步骤 1：注册 Cloudflare（如果没有账号）

1. 访问 https://dash.cloudflare.com/sign-up
2. 使用邮箱注册（免费）
3. 验证邮箱

---

### 步骤 2：创建 Worker

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单点击 **Workers & Pages**
3. 点击 **Create application** → **Create Worker**
4. 给 Worker 起个名字，比如 `pinworld-api`
5. 点击 **Deploy**（先用默认代码部署）

---

### 步骤 3：编辑 Worker 代码

1. 部署后点击 **Edit code**
2. 删除所有默认代码
3. 复制 `cloudflare-worker.js` 文件中的全部内容粘贴进去
4. 点击 **Save and deploy**

---

### 步骤 4：添加环境变量（重要！）

1. 回到 Worker 详情页
2. 点击 **Settings** 标签
3. 向下滚动找到 **Environment Variables**
4. 点击 **Add variable**
5. 添加：
   - **Variable name**: `GITHUB_TOKEN`
   - **Value**: `你的 GitHub Personal Access Token`
6. 点击 **Encrypt** 加密（推荐）
7. 点击 **Save and deploy**

---

### 步骤 5：获取 Worker URL

部署后，你会得到一个 URL，格式如：
```
https://pinworld-api.你的用户名.workers.dev
```

---

### 步骤 6：更新前端代码

编辑 `src/composables/useGitHub.js`，找到第 6 行：

```javascript
const WORKER_URL = 'https://pinworld-api.your-subdomain.workers.dev'
```

替换为你的实际 Worker URL：

```javascript
const WORKER_URL = 'https://pinworld-api.你的用户名.workers.dev'
```

---

### 步骤 7：重新部署 GitHub Pages

```bash
npm run build
npx gh-pages -d dist -r github-nohairblingbling:nohairblingbling/pinworld.git -f
```

---

## ✅ 验证

1. 访问 https://nohairblingbling.github.io/pinworld/
2. 登录后尝试上传图片
3. 检查图片是否正常显示

---

## 🔧 调试

如果上传失败，可以：

1. 打开浏览器开发者工具 (F12)
2. 切换到 Network 标签
3. 查看请求是否发送到 Worker
4. 检查响应内容

Worker 日志可以在 Cloudflare Dashboard → Worker → Logs 中查看。
