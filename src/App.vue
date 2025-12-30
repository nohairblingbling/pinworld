<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div class="app">
          <!-- 顶部浮动栏 -->
          <div class="top-bar">
            <!-- 搜索栏 (带毛玻璃效果) -->
            <div class="search-container glass-bar">
              <img src="@/assets/logo.png" alt="Logo" class="search-logo" />
              <div class="search-divider"></div>
              <n-input
                v-model:value="searchQuery"
                placeholder="搜索城市或回忆..."
                size="large"
                round
                clearable
                :on-keydown="onSearchKeydown"
                class="search-input"
              >
                <template #prefix>
                  <n-icon :size="18" color="#888">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </n-icon>
                </template>
              </n-input>
              
              <!-- 搜索结果下拉 -->
              <div v-if="searchResults.length" class="search-results">
                <div 
                  v-for="(result, idx) in searchResults" 
                  :key="idx" 
                  class="result-item"
                  @click="selectSearchResult(result)"
                >
                  <n-icon :size="16" style="margin-right: 12px;">
                    <svg v-if="result.type === 'pin'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                  </n-icon>
                  <div class="result-info">
                    <span class="result-title">{{ result.title }}</span>
                    <span class="result-subtitle">{{ result.subtitle }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 足迹按钮 (搜索栏之后) -->
            <n-button 
              type="primary"
              size="large"
              round
              @click="toggleDrawer"
              class="stats-btn glass-btn"
            >
              <template #icon>
                <n-icon :size="18">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </n-icon>
              </template>
              {{ pins.length }} 足迹
            </n-button>
          </div>
          
          <!-- 右上角：登录状态 -->
          <div class="auth-status">
            <n-button v-if="!user" circle size="large" @click="showAuthModal = true">
              <template #icon>
                <n-icon :size="18">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </n-icon>
              </template>
            </n-button>
            <n-button v-else circle size="large" type="success" @click="handleLogout" title="退出登录">
              <template #icon>
                <n-icon :size="18">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </n-icon>
              </template>
            </n-button>
          </div>

          <!-- 左侧足迹抽屉 -->
          <n-drawer v-model:show="showDrawer" :width="380" placement="left">
            <PinList 
              :pins="pins"
              @select-pin="handlePinListSelect"
              @add-new="handleAddFromList"
              @close="showDrawer = false"
            />
          </n-drawer>

          <!-- 地图 -->
          <WorldMap 
            ref="mapRef"
            :pins="pins"
            :selected-pin="selectedPin"
            @select-pin="handleSelectPin"
            @map-click="handleMapClick"
          />

          <!-- 详情面板 -->
          <PinPanel 
            :pin="panelPin"
            :is-new="isNewPin"
            :user="user"
            @close="closePanel"
            @save="handleSave"
            @delete="handleDelete"
          />

          <!-- 加载状态 -->
          <div v-if="loading" class="loading-overlay">
            <n-spin size="large" />
          </div>

          <!-- 认证模态框 (Naive UI) -->
          <n-modal v-model:show="showAuthModal" preset="dialog" title="身份验证">
            <template #default>
              <p style="margin-bottom: 16px;">请输入访问代码以解锁编辑权限</p>
              <n-input 
                v-model:value="authCode" 
                type="password" 
                placeholder="请输入代码..."
                :on-keydown="onAuthKeydown"
                ref="authInputRef"
              />
            </template>
            <template #action>
              <n-button type="primary" @click="handleAuth" :loading="authLoading">
                解锁
              </n-button>
            </template>
          </n-modal>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { 
  NConfigProvider, NMessageProvider, NDialogProvider,
  NInput, NButton, NIcon, NTag, NDrawer, NDrawerContent, 
  NModal, NSpin
} from 'naive-ui'
import mapboxgl from 'mapbox-gl'
import WorldMap from './components/WorldMap.vue'
import PinPanel from './components/PinPanel.vue'
import PinList from './components/PinList.vue'
import { useFirebase } from './composables/useFirebase'

// Naive UI Theme Overrides - Blue Ocean Palette
const themeOverrides = {
  common: {
    primaryColor: '#257EAA',
    primaryColorHover: '#4C9AC0',
    primaryColorPressed: '#005F89',
    primaryColorSuppl: '#257EAA',
    infoColor: '#4C9AC0',
    infoColorHover: '#7BB8D4',
    successColor: '#27AE60',
    successColorHover: '#2ECC71',
    warningColor: '#E6A23C',
    warningColorHover: '#EEBE77',
    errorColor: '#E74C3C',
    errorColorHover: '#EC7063',
    borderRadius: '12px',
    borderRadiusSmall: '8px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  Button: {
    borderRadiusMedium: '9999px',
    borderRadiusSmall: '9999px',
    fontSizeLarge: '15px',
    paddingLarge: '0 24px'
  },
  Input: {
    borderRadius: '9999px',
    heightLarge: '44px'
  },
  Drawer: {
    bodyPadding: '0',
    color: 'rgba(60, 70, 79, 0.95)'
  }
}

const { pins, user, login, logout, loading, addPin, updatePin, deletePin } = useFirebase()

const mapRef = ref(null)
const selectedPin = ref(null)
const panelPin = ref(null)
const isNewPin = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const showAuthModal = ref(false)
const authCode = ref('')
const authLoading = ref(false)
const authInputRef = ref(null)
const showDrawer = ref(false)

// Refs for layout
const floatingSearch = ref(null)
const statsBtn = ref(null)

// 键盘事件处理 - NInput 需要使用 on-keydown prop
function onSearchKeydown(e) {
  if (e.key === 'Enter') {
    handleSearch()
  }
}

function onAuthKeydown(e) {
  if (e.key === 'Enter') {
    handleAuth()
  }
}

// 切换抽屉
function toggleDrawer() {
  showDrawer.value = !showDrawer.value
}

// 自动聚焦
watch(showAuthModal, (val) => {
  if (val) {
    nextTick(() => authInputRef.value?.focus())
  } else {
    authCode.value = ''
  }
})

// 认证处理
async function handleAuth() {
  if (!authCode.value) return
  
  if (authCode.value !== 'aini') {
    showToast('访问代码错误', 'error')
    authCode.value = ''
    return
  }
  
  authLoading.value = true
  try {
    // 使用预设账号登录
    await login('xydr@jyz.travel', 'woaixydr')
    showToast('✨ 编辑权限已解锁')
    showAuthModal.value = false
  } catch (err) {
    showToast('认证服务连接失败', 'error')
    console.error(err)
  } finally {
    authLoading.value = false
  }
}

// 退出登录
async function handleLogout() {
  try {
    await logout()
    showToast('已退出编辑模式')
  } catch (err) {
    showToast('退出失败', 'error')
    console.error(err)
  }
}

// 搜索逻辑
watch(searchQuery, async (query) => {
  if (!query || query.length < 2) {
    searchResults.value = []
    return
  }

  const results = []

  // 1. 搜索现有地图钉
  const matchedPins = pins.value.filter(p => 
    p.title.toLowerCase().includes(query.toLowerCase()) || 
    p.location?.city?.toLowerCase().includes(query.toLowerCase())
  )
  
  matchedPins.forEach(pin => {
    results.push({
      type: 'pin',
      title: pin.title,
      subtitle: pin.location.city || formatDate(pin.date),
      data: pin
    })
  })

  // 2. 搜索 Mapbox Geocoding (限制为城市)
  if (results.length < 5) {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&types=place,country&language=zh`
      )
      const data = await response.json()
      
      data.features?.forEach(feature => {
        results.push({
          type: 'place',
          title: feature.text,
          subtitle: feature.place_name,
          data: feature
        })
      })
    } catch (err) {
      console.error('Search error:', err)
    }
  }

  searchResults.value = results
})

// 选择搜索结果
function selectSearchResult(result) {
  if (result.type === 'pin') {
    handleSelectPin(result.data)
  } else {
    // 飞到该地点
    const [lng, lat] = result.data.center
    mapRef.value?.flyTo(lng, lat, 12)
    
    // 检查权限
    if (!user.value) {
      showToast('🔒 请先解锁编辑权限', 'info')
      showAuthModal.value = true
      return
    }

    // 自动触发添加模式
    createNewPin({ lng, lat })
    // 自动填充城市名
    if (panelPin.value) {
      panelPin.value.title = result.title + '之旅' // 智能建议标题
      panelPin.value.location.city = result.data.text
      // 提取国家
      const countryCtx = result.data.context?.find(c => c.id.startsWith('country'))
      if (countryCtx) panelPin.value.location.country = countryCtx.text
    }
  }
  searchQuery.value = ''
  searchResults.value = []
}

// 选中地图钉
function handleSelectPin(pin) {
  selectedPin.value = pin
  panelPin.value = pin
  isNewPin.value = false
}

// 从列表选中Pin
function handlePinListSelect(pin) {
  handleSelectPin(pin)
  // 让地图飞到该位置
  if (mapRef.value && pin.location) {
    mapRef.value.flyTo(pin.location.lng, pin.location.lat, 12)
  }
}

// 从列表添加新Pin
function handleAddFromList() {
  if (!user.value) {
    showToast('🔒 请先解锁编辑权限', 'info')
    showAuthModal.value = true
    return
  }
  showToast('☝️ 点击地图选择位置', 'info')
}

// 点击地图
function handleMapClick(location) {
  if (panelPin.value) {
    closePanel()
    return
  }
  if (!user.value) {
    showToast('🔒 请先解锁编辑权限', 'info')
    showAuthModal.value = true
    return
  }
  createNewPin(location)
}

function createNewPin(location) {
  const newPin = {
    id: null,
    title: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    images: [],
    location: {
      lat: location.lat,
      lng: location.lng,
      city: '',
      country: ''
    }
  }
  
  panelPin.value = newPin
  isNewPin.value = true
  selectedPin.value = null
  
  // 如果不是搜索来的，才需要反向地理编码
  if (!newPin.location.city) {
    reverseGeocode(location.lat, location.lng)
  }
}

async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=zh`
    )
    const data = await response.json()
    if (data.features?.length) {
      const place = data.features[0]
      let city = ''
      let country = ''
      place.context?.forEach(ctx => {
        if (ctx.id.startsWith('place')) city = ctx.text
        else if (ctx.id.startsWith('country')) country = ctx.text
      })
      if (!city && place.text) city = place.text
      
      if (panelPin.value) {
        panelPin.value.location.city = city
        panelPin.value.location.country = country
      }
    }
  } catch (err) {
    console.error('Geocoding error:', err)
  }
}

async function handleSave(pinData) {
  if (!user.value) return
  
  try {
    // 优先根据 id 判断：没 id 就是新建，有 id 就是更新
    if (!pinData.id || isNewPin.value) {
      await addPin(pinData)
      showToast('足迹已添加')
    } else {
      await updatePin(pinData.id, pinData)
      showToast('已更新')
    }
    closePanel()
  } catch (err) {
    showToast('保存失败', 'error')
  }
}

async function handleDelete(id) {
  if (!user.value) return

  try {
    await deletePin(id)
    showToast('已删除')
    closePanel()
  } catch (err) {
    showToast('删除失败', 'error')
  }
}

function closePanel() {
  panelPin.value = null
  selectedPin.value = null
  isNewPin.value = false
}

// 简化的 toast 函数，使用 window.alert 作为临时方案
function showToast(message, type = 'success') {
  console.log(`[${type}] ${message}`)
  // 在实际组件中，这里应该使用 Naive UI 的 useMessage
  // 但因为 useMessage 需要在组件树内调用，我们暂时保持简单实现
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
/* Naive UI providers 需要全高度 */
:deep(.n-config-provider),
:deep(.n-message-provider),
:deep(.n-dialog-provider) {
  height: 100%;
}

.app {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

/* 顶部浮动栏 - 居中 */
.top-bar {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0;
  /* 统一的毛玻璃背景 - 使用主题色 */
  background: rgba(37, 126, 170, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 9999px;
  padding: 6px;
  box-shadow: 0 4px 24px rgba(0, 95, 137, 0.25);
  border: 1px solid rgba(76, 154, 192, 0.4);
}

/* 搜索容器 - 不需要单独背景 */
.search-container {
  display: flex;
  align-items: center;
  padding: 4px 16px;
  gap: 10px;
  position: relative;
  background: transparent;
  border: none;
  box-shadow: none;
}

.search-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.search-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 180px;
}

/* 搜索输入框样式覆盖 */
.search-input :deep(.n-input) {
  --n-color: transparent !important;
  --n-color-focus: transparent !important;
  --n-border: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
}

.search-input :deep(.n-input__input-el) {
  color: #333 !important;
}

.search-input :deep(.n-input__input-el::placeholder) {
  color: rgba(0, 0, 0, 0.4) !important;
}

.search-input :deep(.n-input__prefix) {
  color: rgba(0, 0, 0, 0.5) !important;
}

/* 足迹按钮 - 与搜索栏统一风格 */
.stats-btn {
  flex-shrink: 0;
  font-weight: 500;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
  padding: 0 16px !important;
  height: 36px !important;
  margin-left: 8px;
}

.stats-btn:hover {
  background: rgba(255, 255, 255, 0.25) !important;
}

/* 认证状态 - 移到右上角 */
.auth-status {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
}

.auth-status .n-button {
  background: rgba(37, 126, 170, 0.85) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(76, 154, 192, 0.4) !important;
  color: #fff !important;
}

.clear-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
  padding: 0 4px;
  cursor: pointer;
  line-height: 1;
}

.clear-btn:hover {
  color: var(--text-primary);
}

/* 搜索栏内的对钩 */
.auth-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--green);
  color: white;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: auto;
}

/* 搜索结果下拉 */
.search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 400px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  padding: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.result-item:hover {
  background: var(--bg-primary);
}

.result-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.result-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.result-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 右上角控制区域 */
.floating-controls {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 统计按钮 */
.stats-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--bg-dark);
  color: var(--text-light);
  border: none;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
}

.stats-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stats-btn.active {
  background: var(--accent);
}

.stats-count {
  font-size: 18px;
  font-weight: 700;
  font-family: var(--font-serif);
  color: var(--gold);
}

.stats-label {
  color: var(--text-muted);
}

.stats-btn svg {
  color: var(--gold);
}

/* 登录状态 */
.auth-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--bg-secondary);
  color: var(--green);
  border-radius: 50%;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.btn-unlock {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-fast);
}

.btn-unlock:hover {
  background: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent);
}

/* 抽屉遮罩和面板 */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 200;
}

.drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  max-width: 100%;
  background: var(--bg-dark);
  box-shadow: var(--shadow-lg);
}

/* 抽屉动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}

/* 加载遮罩 */
.loading-overlay {
  position: absolute;
  inset: 0;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 认证模态框 */
.auth-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 500;
}

.auth-content {
  width: 90%;
  max-width: 360px;
  padding: 32px 24px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.auth-content h3 {
  font-family: var(--font-serif);
  font-size: 24px;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.auth-content p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
}

.auth-input-wrapper {
  display: flex;
  gap: 8px;
}

.auth-input-wrapper .input {
  text-align: center;
  letter-spacing: 4px;
  font-weight: 600;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 28px;
  background: var(--bg-dark);
  color: var(--text-light);
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
  box-shadow: var(--shadow-lg);
  z-index: 400;
}

.toast.success { 
  background: var(--green);
}

.toast.error { 
  background: var(--danger);
}

.toast.info { 
  background: var(--accent);
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active { 
  transition: opacity 0.2s; 
}

.fade-enter-from, .fade-leave-to { 
  opacity: 0; 
}

.toast-enter-active, .toast-leave-active { 
  transition: all 0.3s; 
}

.toast-enter-from, .toast-leave-to { 
  opacity: 0; 
  transform: translate(-50%, 20px); 
}

/* 响应式 */
@media (max-width: 768px) {
  .floating-logo {
    top: 16px;
    left: 16px;
    padding: 8px;
  }
  
  .logo-img {
    width: 28px;
    height: 28px;
  }
  
  .floating-search {
    top: 16px;
    width: calc(100% - 180px);
    max-width: none;
    left: 80px;
    transform: none;
    padding: 10px 16px;
  }
  
  .floating-controls {
    top: 16px;
    right: 16px;
  }
  
  .stats-btn {
    padding: 10px 14px;
  }
  
  .stats-label {
    display: none;
  }
  
  .drawer-panel {
    width: 100%;
  }
}
</style>
