// GitHub 图床上传
import { ref } from 'vue'

// 从环境变量获取 token，需要在 .env 文件中配置 VITE_GITHUB_TOKEN
// 或者在部署时通过环境变量注入
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || ''
const GITHUB_REPO = 'nohairblingbling/pinworld'
const GITHUB_BRANCH = 'main'
const IMAGE_PATH = 'uploads/images'

export function useGitHub() {
  const uploading = ref(false)
  const uploadError = ref(null)

  // 读取文件为 Base64 (不包含 Data URI 前缀)
  function readFileFilterPrefix(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        // 移除 "data:image/png;base64," 前缀
        const base64 = e.target.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function generateFileName(originalName) {
    const timestamp = new Date().getTime()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = originalName.split('.').pop()
    return `${timestamp}-${random}.${ext}`
  }

  async function uploadImage(file) {
    uploading.value = true
    uploadError.value = null
    
    // 超时控制器
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60秒超时
    
    try {
      const fileName = generateFileName(file.name)
      const content = await readFileFilterPrefix(file)
      const path = `${IMAGE_PATH}/${fileName}`
      
      // GitHub Pages 部署时直接调用 GitHub API
      const baseUrl = 'https://api.github.com'
      
      console.log(`[useGitHub] Uploading to: ${GITHUB_REPO}/${path}`)
      
      const url = `${baseUrl}/repos/${GITHUB_REPO}/contents/${path}`
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `upload ${fileName} via PinWorld`,
          content: content,
          branch: GITHUB_BRANCH
        }),
        signal: controller.signal // 超时信号
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'GitHub Upload Failed')
      }

      const data = await response.json()
      console.log('[useGitHub] Upload success:', data.content?.path)
      
      // 使用 raw.githubusercontent.com（即时可用，无 CDN 延迟）
      return `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`
      
    } catch (err) {
      clearTimeout(timeoutId)
      
      if (err.name === 'AbortError') {
        console.error('[useGitHub] Upload timeout')
        uploadError.value = '上传超时，请检查网络'
      } else {
        console.error('[useGitHub] Upload error:', err)
        uploadError.value = err.message
      }
      throw err
    } finally {
      // 无论成功失败，都重置上传状态
      uploading.value = false
    }
  }
  
  async function uploadImages(files) {
    const urls = []
    for (const file of files) {
      const url = await uploadImage(file)
      urls.push(url)
    }
    return urls
  }

  return {
    uploading,
    uploadError,
    uploadImage,
    uploadImages
  }
}
