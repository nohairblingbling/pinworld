<template>
  <div class="pin-list">
    <!-- 抽屉头部 -->
    <div class="drawer-header">
      <div class="drawer-title">
        <span class="stat-number">{{ pins.length }}</span>
        <span class="stat-text">个足迹</span>
      </div>
      <button class="close-btn" @click="$emit('close')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    
    <!-- 视图切换 -->
    <div class="view-tabs">
      <button 
        v-for="view in ['country', 'time']" 
        :key="view"
        :class="['tab-btn', { active: groupBy === view }]"
        @click="groupBy = view"
      >
        <svg v-if="view === 'country'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>{{ view === 'country' ? '按国家' : '按时间' }}</span>
      </button>
    </div>

    <!-- 列表区域 -->
      <div class="list-body">
        <!-- 按国家分组 -->
        <template v-if="groupBy === 'country'">
          <div 
            v-for="(cities, country) in groupedByCountry" 
            :key="country"
            class="group-section"
          >
            <div class="group-header" @click="toggleGroup(country)">
              <span class="group-title">{{ country }}</span>
              <span class="group-count">{{ getCountryTotal(cities) }}</span>
              <svg 
                class="chevron" 
                :class="{ expanded: expandedGroups.includes(country) }"
                width="16" height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            
            <Transition name="expand">
              <div v-if="expandedGroups.includes(country)" class="group-content">
                <div 
                  v-for="(cityPins, city) in cities" 
                  :key="city"
                  class="city-group"
                >
                  <div class="city-header" @click="toggleCity(country, city)">
                    <span class="city-name">{{ city }}</span>
                    <span class="city-count">{{ cityPins.length }}</span>
                    <svg 
                      v-if="cityPins.length > 1"
                      class="chevron-small" 
                      :class="{ expanded: expandedCities.includes(`${country}-${city}`) }"
                      width="14" height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      stroke-width="2"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                  
                  <!-- 如果只有一个，直接显示；多个则可展开 -->
                  <div v-if="cityPins.length === 1" class="pin-item" @click="selectPin(cityPins[0])">
                    <span class="pin-title">{{ cityPins[0].title }}</span>
                    <span class="pin-date">{{ formatShortDate(cityPins[0].date) }}</span>
                  </div>
                  
                  <Transition name="expand">
                    <div v-if="cityPins.length > 1 && expandedCities.includes(`${country}-${city}`)" class="city-pins">
                      <div 
                        v-for="pin in cityPins" 
                        :key="pin.id"
                        class="pin-item"
                        @click="selectPin(pin)"
                      >
                        <span class="pin-title">{{ pin.title }}</span>
                        <span class="pin-date">{{ formatShortDate(pin.date) }}</span>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </Transition>
          </div>
        </template>

        <!-- 按时间分组 -->
        <template v-else>
          <div 
            v-for="(yearPins, year) in groupedByTime" 
            :key="year"
            class="group-section"
          >
            <div class="group-header" @click="toggleGroup(year)">
              <span class="group-title">{{ year }}</span>
              <span class="group-count">{{ yearPins.length }}</span>
              <svg 
                class="chevron" 
                :class="{ expanded: expandedGroups.includes(year) }"
                width="16" height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            
            <Transition name="expand">
              <div v-if="expandedGroups.includes(year)" class="group-content">
                <div 
                  v-for="pin in yearPins" 
                  :key="pin.id"
                  class="pin-item"
                  @click="selectPin(pin)"
                >
                  <span class="pin-title">{{ pin.title }}</span>
                  <span class="pin-location">{{ pin.location?.city || '未知' }}</span>
                </div>
              </div>
            </Transition>
          </div>
        </template>
      </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  pins: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select-pin', 'add-new', 'close'])

const groupBy = ref('country') // 'country' | 'time'
const expandedGroups = ref([])
const expandedCities = ref([])

// 按国家分组
const groupedByCountry = computed(() => {
  const groups = {}
  props.pins.forEach(pin => {
    const country = pin.location?.country || '未知国家'
    const city = pin.location?.city || '未知城市'
    
    if (!groups[country]) groups[country] = {}
    if (!groups[country][city]) groups[country][city] = []
    
    groups[country][city].push(pin)
  })
  return groups
})

// 按时间分组（年份）
const groupedByTime = computed(() => {
  const groups = {}
  props.pins.forEach(pin => {
    const year = pin.date ? new Date(pin.date).getFullYear().toString() : '未知年份'
    if (!groups[year]) groups[year] = []
    groups[year].push(pin)
  })
  
  // 按年份降序排序
  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .reduce((acc, year) => {
      acc[year] = groups[year].sort((a, b) => new Date(b.date) - new Date(a.date))
      return acc
    }, {})
})

// 获取国家总数
function getCountryTotal(cities) {
  return Object.values(cities).reduce((sum, pins) => sum + pins.length, 0)
}

// 切换分组展开/收起
function toggleGroup(groupKey) {
  const index = expandedGroups.value.indexOf(groupKey)
  if (index > -1) {
    expandedGroups.value.splice(index, 1)
  } else {
    expandedGroups.value.push(groupKey)
  }
}

// 切换城市展开/收起
function toggleCity(country, city) {
  const key = `${country}-${city}`
  const index = expandedCities.value.indexOf(key)
  if (index > -1) {
    expandedCities.value.splice(index, 1)
  } else {
    expandedCities.value.push(key)
  }
}

// 选中Pin
function selectPin(pin) {
  emit('select-pin', pin)
}

// 格式化日期（简短）
function formatShortDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 默认展开第一个分组
watch(() => props.pins, () => {
  if (groupBy.value === 'country') {
    const firstCountry = Object.keys(groupedByCountry.value)[0]
    if (firstCountry && !expandedGroups.value.includes(firstCountry)) {
      expandedGroups.value = [firstCountry]
    }
  } else {
    const firstYear = Object.keys(groupedByTime.value)[0]
    if (firstYear && !expandedGroups.value.includes(firstYear)) {
      expandedGroups.value = [firstYear]
    }
  }
}, { immediate: true })

// 切换视图时重置展开状态
watch(groupBy, () => {
  expandedGroups.value = []
  expandedCities.value = []
})
</script>

<style scoped>
.pin-list {
  height: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  color: #fff;
}

/* 抽屉头部 */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.drawer-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.stat-number {
  font-size: 42px;
  font-weight: 700;
  font-family: var(--font-serif);
  color: var(--accent-light);
  line-height: 1;
}

.stat-text {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-light);
}

/* 视图标签 */
.view-tabs {
  display: flex;
  padding: 16px 24px;
  gap: 8px;
  border-bottom: 1px solid var(--border-dark);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: 1px solid var(--border-dark);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-light);
}

.tab-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--text-light);
}

/* 列表主体 */
.list-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 滚动条样式 */
.list-body::-webkit-scrollbar {
  width: 4px;
}

.list-body::-webkit-scrollbar-track {
  background: transparent;
}

.list-body::-webkit-scrollbar-thumb {
  background: var(--border-dark);
  border-radius: 2px;
}

.group-section {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg-dark-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.group-header:hover {
  background: rgba(255, 255, 255, 0.08);
}

.group-title {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-light);
  letter-spacing: 0.02em;
}

.group-count {
  font-size: 12px;
  color: var(--accent);
  background: var(--accent-glow);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.chevron {
  color: var(--text-muted);
  transition: transform var(--transition-fast);
}

.chevron.expanded {
  transform: rotate(180deg);
}

.group-content {
  padding: 4px 0 4px 12px;
}

/* 城市组 */
.city-group {
  margin-bottom: 4px;
}

.city-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.city-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.city-name {
  flex: 1;
  font-size: 13px;
  color: var(--accent-light);
  font-weight: 500;
}

.city-count {
  font-size: 11px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.chevron-small {
  color: var(--text-muted);
  transition: transform var(--transition-fast);
}

.chevron-small.expanded {
  transform: rotate(180deg);
}

.city-pins {
  padding-left: 12px;
}

/* Pin 项 */
.pin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  margin: 2px 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-left: 2px solid transparent;
}

.pin-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-left-color: var(--accent);
}

.pin-title {
  flex: 1;
  font-size: 13px;
  color: var(--text-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pin-date,
.pin-location {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* 底部添加按钮 */
.list-footer {
  padding: 16px;
  border-top: 1px solid var(--border-dark);
}

.btn-add {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: var(--accent);
  color: var(--text-light);
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-add:hover {
  background: var(--accent-light);
}

/* 展开/收起动画 */
.expand-enter-active,
.expand-leave-active {
  overflow: hidden;
  transition: all var(--transition-normal);
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 1000px;
  opacity: 1;
}

/* 响应式 */
@media (max-width: 768px) {
  .pin-list {
    width: 100%;
    max-width: 320px;
  }
  
  .pin-list.collapsed {
    transform: translateX(-100%);
  }
}
</style>
