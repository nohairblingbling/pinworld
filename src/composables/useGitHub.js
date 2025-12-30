// GitHub 图床上传 - 使用 Cloudflare Worker 代理
import { ref } from 'vue'

// Cloudflare Worker URL
const WORKER_URL = 'https://morning-frost-be96.duskandwine.workers.dev'

// 仓库配置（图床仓库，Worker 中也需要同步配置）
const GITHUB_REPO = 'tracker-xydr/worldweb'
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
      
      console.log(`[useGitHub] Uploading: ${path}`)
      
      // 通过 Cloudflare Worker 代理上传
      const response = await fetch(WORKER_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: path,
          content: content,
          message: `upload ${fileName} via PinWorld`
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Upload Failed')
      }

      const data = await response.json()
      console.log('[useGitHub] Upload success:', data.content?.path)
      
      // 返回图片 URL
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

