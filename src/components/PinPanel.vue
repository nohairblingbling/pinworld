<template>
  <Transition name="slide">
    <div v-if="pin" class="pin-panel" @click.stop>
      <!-- 头部 -->
      <div class="panel-header">
        <n-button circle quaternary @click="close">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </n-icon>
          </template>
        </n-button>
        <n-button v-if="!isEditing" circle quaternary @click="startEdit">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </n-icon>
          </template>
        </n-button>
        <n-button v-if="!isNew" circle quaternary type="error" @click="confirmDelete">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"></path>
              </svg>
            </n-icon>
          </template>
        </n-button>
      </div>

      <!-- 编辑模式 -->
      <div v-if="isEditing" class="panel-content" ref="formContent">
        <div class="form-group">
          <label class="form-label">
            <n-icon :size="18" class="label-icon"><LocationOutline /></n-icon>
            <span>当前位置</span>
          </label>
          <div class="location-display glass-effect">
            <span v-if="pin.location?.city" class="location-text">
              {{ pin.location.city }}{{ pin.location.country ? ` · ${pin.location.country}` : '' }}
            </span>
            <span v-else class="location-placeholder">正在获取位置...</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            <n-icon :size="18" class="label-icon"><AirplaneOutline /></n-icon>
            <span>旅行名称</span>
          </label>
          <n-input 
            v-model:value="form.title" 
            placeholder="给这次旅行起个名字"
            size="large"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <n-icon :size="18" class="label-icon"><CalendarOutline /></n-icon>
            <span>日期</span>
          </label>
          <n-date-picker 
            v-model:formatted-value="form.date"
            type="date"
            value-format="yyyy-MM-dd"
            size="large"
            style="width: 100%"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <n-icon :size="18" class="label-icon"><CreateOutline /></n-icon>
            <span>旅行回忆</span>
          </label>
          <n-input 
            v-model:value="form.description" 
            type="textarea"
            placeholder=" "
            :rows="4"
            :autosize="{ minRows: 3, maxRows: 6 }"
            style="border-radius: 12px;"
          />
        </div>

        <!-- 图片上传 -->
        <div class="form-group">
          <label class="form-label">
            <n-icon :size="18" class="label-icon"><CameraOutline /></n-icon>
            <span>照片</span>
          </label>
          <div class="image-section">
            <label class="upload-btn">
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                @change="handleImageSelect"
                :disabled="uploading"
              >
              <n-icon :size="24">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </n-icon>
              <span>{{ uploading ? '上传中...' : '添加照片' }}</span>
            </label>
            
            <!-- 图片预览 -->
            <div v-for="(img, idx) in form.images" :key="idx" class="preview-item">
              <img :src="img" alt="">
              <n-button circle size="tiny" type="error" class="remove-img" @click="removeImage(idx)">
                <template #icon>
                  <n-icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></n-icon>
                </template>
              </n-button>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <n-button @click="cancelEdit">取消</n-button>
          <n-button type="primary" @click="save" :disabled="!form.title || saving || uploading" :loading="saving || uploading">
            {{ uploading ? '图片上传中...' : '保存' }}
          </n-button>
        </div>
      </div>

      <!-- 查看模式 -->
      <div v-else class="panel-content">
        <h2 class="pin-title">{{ pin.title }}</h2>
        
        <div class="pin-meta-row">
          <div v-if="pin.location?.city" class="meta-tag location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            {{ pin.location.city }}{{ pin.location.country ? ` · ${pin.location.country}` : '' }}
          </div>
          <div class="meta-tag date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
            </svg>
            {{ formatDate(pin.date) }}
          </div>
        </div>
        
        <p v-if="pin.description" class="pin-description">{{ pin.description }}</p>
        
        <!-- 图片画廊 -->
        <div v-if="pin.images?.length" class="pin-gallery">
          <div 
            v-for="(img, idx) in pin.images" 
            :key="idx" 
            class="gallery-item"
            @click="openLightbox(idx)"
          >
            <img :src="img" alt="">
          </div>
        </div>
      </div>

      <!-- 灯箱 -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="lightboxOpen" class="lightbox" @click="closeLightbox">
            <button class="lightbox-close" @click="closeLightbox">×</button>
            <button v-if="pin.images?.length > 1" class="lightbox-prev" @click.stop="prevImage">‹</button>
            <img :src="pin.images[lightboxIndex]" alt="" @click.stop>
            <button v-if="pin.images?.length > 1" class="lightbox-next" @click.stop="nextImage">›</button>
          </div>
        </Transition>
      </Teleport>
    </div>
  </Transition>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted, nextTick } from 'vue'
import { NButton, NIcon, NInput, NDatePicker } from 'naive-ui'
import { 
  LocationOutline, 
  AirplaneOutline, 
  CalendarOutline, 
  CreateOutline, 
  CameraOutline 
} from '@vicons/ionicons5'
import { animate } from 'animejs'
import { useGitHub } from '../composables/useGitHub'

const props = defineProps({
  pin: {
    type: Object,
    default: null
  },
  isNew: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'save', 'delete'])

const { uploadImage, uploading } = useGitHub()

const isEditing = ref(false)
const saving = ref(false)
const formContent = ref(null)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const form = reactive({
  title: '',
  date: '',
  description: '',
  images: []
})

// 监听 pin 变化，初始化表单
watch(() => props.pin, (newPin) => {
  if (newPin) {
    form.title = newPin.title || ''
    form.date = newPin.date || new Date().toISOString().split('T')[0]
    form.description = newPin.description || ''
    form.images = newPin.images ? [...newPin.images] : []
    
    // 新建时自动进入编辑模式
    isEditing.value = props.isNew
  }
}, { immediate: true })

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// 开始编辑
function startEdit() {
  isEditing.value = true
}

// 取消编辑
function cancelEdit() {
  if (props.isNew) {
    close()
  } else {
    // 重置表单
    form.title = props.pin.title || ''
    form.date = props.pin.date || ''
    form.description = props.pin.description || ''
    form.images = props.pin.images ? [...props.pin.images] : []
    isEditing.value = false
  }
}

// 处理图片选择
async function handleImageSelect(e) {
  const files = Array.from(e.target.files)
  if (!files.length) return

  for (const file of files) {
    try {
      const url = await uploadImage(file)
      form.images.push(url)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('图片上传失败，请重试')
    }
  }
  
  // 清空 input
  e.target.value = ''
}

// 移除图片
function removeImage(idx) {
  form.images.splice(idx, 1)
}

// 保存
async function save() {
  if (!form.title) return
  
  console.log('[PinPanel] Saving pin:', props.pin?.id, 'isNew:', props.isNew)
  
  saving.value = true
  try {
    emit('save', {
      id: props.pin?.id,
      title: form.title,
      date: form.date,
      description: form.description,
      images: form.images,
      location: props.pin?.location
    })
    isEditing.value = false
  } finally {
    saving.value = false
  }
}

// 确认删除
function confirmDelete() {
  console.log('[PinPanel] Deleting pin:', props.pin?.id, props.pin)
  if (!props.pin?.id) {
    alert('无法删除：数据不完整')
    return
  }
  if (confirm('确定要删除这个地点吗？')) {
    emit('delete', props.pin.id)
  }
}

// 关闭面板
function close() {
  emit('close')
}

// 灯箱操作
function openLightbox(idx) {
  lightboxIndex.value = idx
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
}

function prevImage() {
  if (lightboxIndex.value > 0) {
    lightboxIndex.value--
  } else {
    lightboxIndex.value = props.pin.images.length - 1
  }
}

function nextImage() {
  if (lightboxIndex.value < props.pin.images.length - 1) {
    lightboxIndex.value++
  } else {
    lightboxIndex.value = 0
  }
}
</script>

<style scoped>
.pin-panel {
  position: absolute;
  top: 24px;
  right: 24px;
  bottom: 24px;
  width: 420px;
  max-width: calc(100% - 48px);
  /* Glassmorphism effect */
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px; /* More square */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.panel-header {
  padding: 24px 32px 16px; /* 增加内边距 */
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-bottom: none; /* 移除分割线，更干净 */
}

.close-btn {
  margin-right: auto;
}

.delete-btn:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
}

/* 表单样式 */
.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.label-icon {
  color: var(--accent);
}

/* Glass effect for components */
.glass-effect {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.location-display {
  padding: 14px 18px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.location-text {
  color: var(--accent);
  font-weight: 500;
  font-size: 15px;
}

.location-placeholder {
  color: var(--text-muted);
  font-style: italic;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.form-actions .btn {
  flex: 1;
}

/* 图片上传区域 */
.image-section {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100px;
  height: 100px;
  padding: 16px;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.upload-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.upload-btn input {
  display: none;
}

.upload-btn span {
  font-size: 12px;
  text-align: center;
}

.preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-img {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.location-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
  color: var(--accent-light);
  font-weight: 500;
  font-size: 14px;
}

.location-placeholder {
  color: var(--text-muted);
  font-style: italic;
}

/* 查看模式 */
.pin-title {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 16px;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--text-primary); /* 使用实色 */
}

.pin-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
}

.meta-tag.location {
  background: var(--accent-glow);
  color: var(--accent-dark, #5d402b);
  border: 1px solid rgba(155, 127, 96, 0.2);
}

.meta-tag.date {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.pin-description {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: 20px;
  white-space: pre-wrap;
}

/* 图片画廊 */
.pin-gallery {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.gallery-item {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.gallery-item:hover {
  transform: scale(1.02);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 灯箱 */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.lightbox img {
  max-width: 90%;
  max-height: 90vh;
  object-fit: contain;
}

.lightbox-close,
.lightbox-prev,
.lightbox-next {
  position: absolute;
  background: none;
  border: none;
  color: white;
  font-size: 48px;
  cursor: pointer;
  padding: 20px;
  opacity: 0.7;
  transition: opacity var(--transition-fast);
}

.lightbox-close:hover,
.lightbox-prev:hover,
.lightbox-next:hover {
  opacity: 1;
}

.lightbox-close {
  top: 0;
  right: 0;
}

.lightbox-prev {
  left: 0;
}

.lightbox-next {
  right: 0;
}

/* 动画 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .pin-panel {
    width: 100%;
    top: auto;
    bottom: 0;
    max-height: 80vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  
  .slide-enter-from,
  .slide-leave-to {
    transform: translateY(100%);
  }
}
</style>
