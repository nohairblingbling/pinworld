<template>
  <div class="world-map" ref="mapContainer">
    <!-- 加载状态 -->
    <div v-if="!mapLoaded" class="map-loading">
      <div class="loading-spinner"></div>
      <p>正在加载地图...</p>
    </div>

    <!-- 聚合标记 (低缩放级别) - 地图钉样式 -->
    <div 
      v-for="cluster in visibleClusters" 
      :key="cluster.id"
      class="cluster-marker"
      :style="getClusterStyle(cluster)"
      @click.stop="zoomToCluster(cluster)"
    >
      <!-- 地图钉形状 -->
      <div class="pin-shape">
        <div class="pin-head">
          <span class="pin-count">{{ cluster.count }}</span>
        </div>
        <div class="pin-tail"></div>
      </div>
      <!-- 标签显示在地图钉下方 -->
      <div class="pin-label">{{ cluster.label }}</div>
    </div>

    <!-- 独立标记 (高缩放级别) -->
    <div 
      v-for="pin in visiblePins" 
      :key="pin.id"
      class="custom-marker"
      :class="{ active: selectedPin?.id === pin.id }"
      :style="getMarkerStyle(pin)"
      @click.stop="selectPin(pin)"
    >
      <div class="marker-pulse"></div>
      <div class="marker-dot"></div>
    </div>

    <!-- 全球视图按钮 (底部中间) -->
    <button class="globe-btn" @click="resetToGlobalView" title="返回世界视图">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import mapboxgl from 'mapbox-gl'
import gsap from 'gsap'

const props = defineProps({
  pins: {
    type: Array,
    default: () => []
  },
  selectedPin: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select-pin', 'add-pin', 'map-click'])

// Mapbox Token
mapboxgl.accessToken = 'pk.eyJ1IjoiZGFib2NhaSIsImEiOiJjbWpxdTR2bmswenpnM2ZzYzg0dWQ5c3NnIn0.D3NB4MJMfUAhwwiUyw_q_A'

const mapContainer = ref(null)
// 性能优化关键：使用 shallowRef 存储 Mapbox 实例，避免深度响应式代理
const map = shallowRef(null)
const mapLoaded = ref(false)
const markerPositions = ref({})
const clusterPositions = ref({})
const currentZoom = ref(3)

// 聚合阈值
const COUNTRY_ZOOM_THRESHOLD = 5  // zoom < 5 按国家聚合
const CITY_ZOOM_THRESHOLD = 9     // zoom < 9 按城市聚合

// 计算当前应该显示的聚合标记
const visibleClusters = computed(() => {
  if (!mapLoaded.value) return []
  
  const zoom = currentZoom.value
  
  // zoom >= 9 不显示聚合
  if (zoom >= CITY_ZOOM_THRESHOLD) return []
  
  // zoom < 5 按国家聚合
  if (zoom < COUNTRY_ZOOM_THRESHOLD) {
    return getCountryClusters()
  }
  
  // 5 <= zoom < 9 按城市聚合
  return getCityClusters()
})

// 计算当前应该显示的独立标记
const visiblePins = computed(() => {
  if (!mapLoaded.value) return []
  
  const zoom = currentZoom.value
  
  // 只有 zoom >= 9 才显示独立标记
  if (zoom < CITY_ZOOM_THRESHOLD) return []
  
  return props.pins
})

// 按国家聚合 - 使用国家中心坐标
function getCountryClusters() {
  const countryGroups = {}
  
  props.pins.forEach(pin => {
    if (!pin.location) return
    const country = pin.location.country || '未知'
    
    if (!countryGroups[country]) {
      // 获取国家中心坐标
      const center = getCountryCenter(country)
      
      countryGroups[country] = {
        id: `country-${country}`,
        label: country,
        count: 0,
        pins: [],
        lng: center?.lng || pin.location.lng,
        lat: center?.lat || pin.location.lat
      }
    }
    
    countryGroups[country].count++
    countryGroups[country].pins.push(pin)
  })
  
  return Object.values(countryGroups)
}

// 按城市聚合 - 使用城市中心坐标
function getCityClusters() {
  const cityGroups = {}
  
  props.pins.forEach(pin => {
    if (!pin.location) return
    const city = pin.location.city || '未知'
    const country = pin.location.country || ''
    const key = `${city}-${country}`
    
    if (!cityGroups[key]) {
      // 获取城市中心坐标
      const center = getCityCenter(city, country)
      
      cityGroups[key] = {
        id: `city-${key}`,
        label: city,
        count: 0,
        pins: [],
        lng: center?.lng || pin.location.lng,
        lat: center?.lat || pin.location.lat
      }
    }
    
    cityGroups[key].count++
    cityGroups[key].pins.push(pin)
  })
  
  return Object.values(cityGroups)
}

// 国家中心坐标查找表
const COUNTRY_CENTERS = {
  '中国': { lng: 104.195, lat: 35.862 },
  '日本': { lng: 138.252, lat: 36.205 },
  '韩国': { lng: 127.767, lat: 35.908 },
  '美国': { lng: -95.713, lat: 37.091 },
  '英国': { lng: -3.436, lat: 55.378 },
  '法国': { lng: 2.214, lat: 46.228 },
  '德国': { lng: 10.451, lat: 51.166 },
  '意大利': { lng: 12.567, lat: 41.872 },
  '西班牙': { lng: -3.750, lat: 40.464 },
  '澳大利亚': { lng: 133.775, lat: -25.274 },
  '加拿大': { lng: -106.347, lat: 56.130 },
  '泰国': { lng: 100.993, lat: 15.870 },
  '新加坡': { lng: 103.820, lat: 1.352 },
  '马来西亚': { lng: 101.976, lat: 4.210 },
  '印度尼西亚': { lng: 113.921, lat: -0.790 },
  '越南': { lng: 108.277, lat: 14.058 },
  '俄罗斯': { lng: 105.319, lat: 61.524 },
  '巴西': { lng: -51.926, lat: -14.235 },
  '墨西哥': { lng: -102.553, lat: 23.635 },
  '印度': { lng: 78.963, lat: 20.594 },
  '阿联酋': { lng: 53.848, lat: 23.424 },
  '土耳其': { lng: 35.244, lat: 38.964 },
  '希腊': { lng: 21.824, lat: 39.074 },
  '埃及': { lng: 30.803, lat: 26.821 },
  '南非': { lng: 22.938, lat: -30.559 },
  '新西兰': { lng: 174.886, lat: -40.901 },
  '瑞士': { lng: 8.228, lat: 46.818 },
  '荷兰': { lng: 5.291, lat: 52.133 },
  '比利时': { lng: 4.470, lat: 50.504 },
  '奥地利': { lng: 14.550, lat: 47.516 },
  '瑞典': { lng: 18.643, lat: 60.128 },
  '挪威': { lng: 8.469, lat: 60.472 },
  '丹麦': { lng: 9.502, lat: 56.264 },
  '芬兰': { lng: 25.749, lat: 61.924 },
  '波兰': { lng: 19.145, lat: 51.920 },
  '捷克': { lng: 15.473, lat: 49.818 },
  '匈牙利': { lng: 19.503, lat: 47.162 },
  '葡萄牙': { lng: -8.224, lat: 39.400 },
  '爱尔兰': { lng: -8.244, lat: 53.413 },
  '菲律宾': { lng: 121.774, lat: 12.879 },
  '台湾': { lng: 120.960, lat: 23.698 },
  '香港': { lng: 114.110, lat: 22.396 },
  '澳门': { lng: 113.544, lat: 22.199 }
}

// 城市中心坐标查找表
const CITY_CENTERS = {
  '北京': { lng: 116.407, lat: 39.904 },
  '上海': { lng: 121.474, lat: 31.230 },
  '广州': { lng: 113.265, lat: 23.108 },
  '深圳': { lng: 114.086, lat: 22.547 },
  '杭州': { lng: 120.154, lat: 30.274 },
  '成都': { lng: 104.066, lat: 30.573 },
  '重庆': { lng: 106.505, lat: 29.533 },
  '西安': { lng: 108.940, lat: 34.342 },
  '武汉': { lng: 114.298, lat: 30.584 },
  '南京': { lng: 118.797, lat: 32.061 },
  '苏州': { lng: 120.620, lat: 31.299 },
  '天津': { lng: 117.190, lat: 39.126 },
  '青岛': { lng: 120.382, lat: 36.067 },
  '大连': { lng: 121.619, lat: 38.914 },
  '厦门': { lng: 118.089, lat: 24.479 },
  '三亚': { lng: 109.508, lat: 18.248 },
  '丽江': { lng: 100.234, lat: 26.872 },
  '拉萨': { lng: 91.133, lat: 29.660 },
  '香港': { lng: 114.173, lat: 22.320 },
  '澳门': { lng: 113.549, lat: 22.199 },
  '台北': { lng: 121.565, lat: 25.033 },
  '东京': { lng: 139.691, lat: 35.690 },
  '大阪': { lng: 135.502, lat: 34.694 },
  '京都': { lng: 135.768, lat: 35.012 },
  '首尔': { lng: 126.978, lat: 37.567 },
  '釜山': { lng: 129.076, lat: 35.180 },
  '曼谷': { lng: 100.502, lat: 13.756 },
  '新加坡': { lng: 103.820, lat: 1.352 },
  '吉隆坡': { lng: 101.687, lat: 3.139 },
  '巴厘岛': { lng: 115.093, lat: -8.341 },
  '雅加达': { lng: 106.845, lat: -6.208 },
  '胡志明市': { lng: 106.630, lat: 10.823 },
  '河内': { lng: 105.834, lat: 21.028 },
  '纽约': { lng: -74.006, lat: 40.713 },
  '洛杉矶': { lng: -118.244, lat: 34.052 },
  '旧金山': { lng: -122.420, lat: 37.775 },
  '拉斯维加斯': { lng: -115.140, lat: 36.170 },
  '迈阿密': { lng: -80.191, lat: 25.762 },
  '芝加哥': { lng: -87.630, lat: 41.878 },
  '波士顿': { lng: -71.059, lat: 42.360 },
  '西雅图': { lng: -122.332, lat: 47.606 },
  '夏威夷': { lng: -155.584, lat: 19.897 },
  '伦敦': { lng: -0.128, lat: 51.507 },
  '巴黎': { lng: 2.352, lat: 48.857 },
  '罗马': { lng: 12.496, lat: 41.903 },
  '米兰': { lng: 9.190, lat: 45.464 },
  '威尼斯': { lng: 12.316, lat: 45.440 },
  '佛罗伦萨': { lng: 11.255, lat: 43.770 },
  '巴塞罗那': { lng: 2.173, lat: 41.386 },
  '马德里': { lng: -3.704, lat: 40.417 },
  '柏林': { lng: 13.405, lat: 52.520 },
  '慕尼黑': { lng: 11.582, lat: 48.135 },
  '阿姆斯特丹': { lng: 4.900, lat: 52.367 },
  '布鲁塞尔': { lng: 4.352, lat: 50.847 },
  '维也纳': { lng: 16.374, lat: 48.209 },
  '布拉格': { lng: 14.438, lat: 50.076 },
  '布达佩斯': { lng: 19.040, lat: 47.498 },
  '雅典': { lng: 23.728, lat: 37.984 },
  '伊斯坦布尔': { lng: 28.979, lat: 41.008 },
  '迪拜': { lng: 55.271, lat: 25.205 },
  '开罗': { lng: 31.236, lat: 30.044 },
  '悉尼': { lng: 151.209, lat: -33.868 },
  '墨尔本': { lng: 144.963, lat: -37.814 },
  '奥克兰': { lng: 174.763, lat: -36.848 },
  '莫斯科': { lng: 37.618, lat: 55.756 },
  '圣彼得堡': { lng: 30.316, lat: 59.939 }
}

function getCountryCenter(country) {
  return COUNTRY_CENTERS[country] || null
}

function getCityCenter(city, country) {
  return CITY_CENTERS[city] || null
}

// 获取聚合标记样式
function getClusterStyle(cluster) {
  const pos = clusterPositions.value[cluster.id]
  if (!pos) return { display: 'none' }
  
  // 调整位置使地图钉尖端指向坐标点
  return {
    transform: `translate(${pos.x - 18}px, ${pos.y - 60}px)`,
    display: 'flex'
  }
}

// 点击聚合时放大到该区域
function zoomToCluster(cluster) {
  if (!map.value) return
  
  // 计算边界框
  const lngs = cluster.pins.map(p => p.location.lng)
  const lats = cluster.pins.map(p => p.location.lat)
  
  const bounds = new mapboxgl.LngLatBounds(
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)]
  )
  
  // 添加一些padding
  map.value.fitBounds(bounds, {
    padding: 100,
    maxZoom: 12,
    duration: 1000
  })
}

// 更新聚合标记位置
function updateClusterPositions() {
  if (!map.value) return
  
  const positions = {}
  
  visibleClusters.value.forEach(cluster => {
    const point = map.value.project([cluster.lng, cluster.lat])
    positions[cluster.id] = { x: point.x, y: point.y }
  })
  
  clusterPositions.value = positions
}

// 重置到全球视图
function resetToGlobalView() {
  if (!map.value) return
  
  map.value.flyTo({
    center: [104.1954, 35.8617], // 中国中心
    zoom: 3,
    duration: 1500,
    essential: true
  })
}

// 初始化地图
onMounted(() => {
  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    // 使用 light 样式，更干净柔和
    style: 'mapbox://styles/mapbox/light-v11',
    center: [104.1954, 35.8617], // 中国中心
    zoom: 3,
    minZoom: 1,
    maxZoom: 18,
    // 使用平面投影提高性能
    projection: 'mercator',
    attributionControl: false // 移除右下角水印
  })

  // 添加导航控件
  map.value.addControl(
    new mapboxgl.NavigationControl({ showCompass: false }),
    'bottom-right'
  )

  // 地图加载完成
  map.value.on('load', () => {
    mapLoaded.value = true
    currentZoom.value = map.value.getZoom()
    
    // 简化地图样式：隐藏不必要的图层
    simplifyMapStyle()
    
    updateMarkerPositions()
    updateClusterPositions()
    
    // 入场动画
    gsap.from(mapContainer.value, {
      opacity: 0,
      duration: 1,
      ease: 'power2.out'
    })
  })

  // 地图移动/缩放时更新标记位置
  const onMapUpdate = () => {
    currentZoom.value = map.value.getZoom()
    updateMarkerPositions()
    updateClusterPositions()
  }
  
  map.value.on('move', onMapUpdate)
  map.value.on('zoom', onMapUpdate)
  map.value.on('pitch', onMapUpdate)
  map.value.on('rotate', onMapUpdate)

  // 点击地图添加新点
  map.value.on('click', (e) => {
    emit('map-click', {
      lng: e.lngLat.lng,
      lat: e.lngLat.lat
    })
  })
})

// 简化地图样式
function simplifyMapStyle() {
  if (!map.value) return
  
  const style = map.value.getStyle()
  if (!style || !style.layers) return
  
  // 定义要隐藏的图层类型关键词
  const layersToHide = [
    'road',           // 道路
    'bridge',         // 桥梁
    'tunnel',         // 隧道
    'building',       // 建筑
    'poi',            // 兴趣点
    'transit',        // 交通
    'airport',        // 机场
    'ferry',          // 渡轮
    'path',           // 小路
    'pedestrian',     // 人行道
    'hillshade',      // 地形阴影（可选，如果觉得太杂）
    'contour',        // 等高线
    'landuse',        // 土地使用（公园等细节）
  ]
  
  // 遍历所有图层，隐藏匹配的
  style.layers.forEach(layer => {
    const layerId = layer.id.toLowerCase()
    const shouldHide = layersToHide.some(keyword => layerId.includes(keyword))
    
    if (shouldHide) {
      map.value.setLayoutProperty(layer.id, 'visibility', 'none')
    }
  })
  
  // 只保留 place-label 中的重要地名（国家、州、城市）
  style.layers.forEach(layer => {
    if (layer.id.includes('place-label') || layer.id.includes('settlement')) {
      // 可以进一步过滤，只显示 rank 较高的
      // 这里保留默认，因为 Mapbox 的 place-label 已经做了合理分级
    }
  })
}

// 更新所有标记的屏幕位置
function updateMarkerPositions() {
  if (!map.value) return
  
  const positions = {}
  const transform = map.value.transform
  
  props.pins.forEach(pin => {
    if (pin.location) {
      const lngLat = [pin.location.lng, pin.location.lat]
      const point = map.value.project(lngLat)
      
      // 检测是否在地球背面（仅在 globe 投影时有效）
      let isVisible = true
      
      if (map.value.getProjection().name === 'globe') {
        try {
          // 使用 MercatorCoordinate 计算点的 3D 位置
          const mercatorCoord = mapboxgl.MercatorCoordinate.fromLngLat(lngLat)
          // 简单的背面检测：检查投影点是否在视口内
          // 如果点在屏幕外很远，可能在背面
          const bounds = map.value.getBounds()
          const cameraBearing = map.value.getBearing()
          
          // 更准确的方法：检查点与相机的相对角度
          // 这里用简化版本：如果投影点的坐标超出合理范围，则隐藏
          if (point.x < -100 || point.x > map.value.getCanvas().width + 100 ||
              point.y < -100 || point.y > map.value.getCanvas().height + 100) {
            // 进一步检查：旋转角度导致的背面
            const center = map.value.getCenter()
            const deltaLng = Math.abs(lngLat[0] - center.lng)
            if (deltaLng > 90 && deltaLng < 270) {
              isVisible = false
            }
          }
        } catch (e) {
          // 如果检测失败，默认显示
          isVisible = true
        }
      }
      
      positions[pin.id] = { 
        x: point.x, 
        y: point.y,
        visible: isVisible
      }
    }
  })
  markerPositions.value = positions
}

// 获取标记样式
function getMarkerStyle(pin) {
  const pos = markerPositions.value[pin.id]
  if (!pos || !pos.visible) return { display: 'none' }
  
  return {
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    display: 'block'
  }
}

// 选中地图钉
function selectPin(pin) {
  emit('select-pin', pin)
  
  // 飞到该位置
  if (map.value && pin.location) {
    map.value.flyTo({
      center: [pin.location.lng, pin.location.lat],
      zoom: Math.max(map.value.getZoom(), 10),
      duration: 1000
    })
  }
}

// 监听 pins 变化
watch(() => props.pins, () => {
  nextTick(updateMarkerPositions)
}, { deep: true })

// 监听选中变化，飞到位置
watch(() => props.selectedPin, (newPin) => {
  if (newPin && map.value) {
    map.value.flyTo({
      center: [newPin.location.lng, newPin.location.lat],
      zoom: Math.max(map.value.getZoom(), 10),
      duration: 1200
    })
  }
})

// 清理
onUnmounted(() => {
  if (map.value) {
    map.value.remove()
  }
})

// 暴露方法
defineExpose({
  flyTo: (lng, lat, zoom = 10) => {
    if (map.value) {
      map.value.flyTo({ center: [lng, lat], zoom, duration: 1200 })
    }
  }
})
</script>

<style scoped>
.world-map {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
}

/* 加载状态 */
.map-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-tertiary);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.map-loading p {
  color: var(--text-secondary);
  font-size: 14px;
}

/* 自定义标记 */
.custom-marker {
  position: absolute;
  top: 0;
  left: 0;
  width: 24px;
  height: 24px;
  margin-left: -12px;
  margin-top: -12px;
  cursor: pointer;
  z-index: 5;
  pointer-events: auto;
}

.marker-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  background: #257EAA; /* Ocean Blue - Primary */
  border: 2px solid #4C9AC0; /* Sky Blue border */
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: all var(--transition-fast, 150ms);
  box-shadow: 0 2px 8px rgba(37, 126, 170, 0.4);
}

.marker-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  background: rgba(37, 126, 170, 0.3); /* Blue glow */
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 2s ease-out infinite;
}

.custom-marker:hover .marker-dot,
.custom-marker.active .marker-dot {
  width: 16px;
  height: 16px;
  background: #4C9AC0; /* Lighter Blue */
  box-shadow: 0 0 20px rgba(37, 126, 170, 0.5);
}

.custom-marker.active .marker-pulse {
  animation: glow 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

@keyframes glow {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.4;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0.2;
  }
}

/* 导航控件样式覆盖 */
:deep(.mapboxgl-ctrl-group) {
  background: var(--bg-dark, #1d1c18) !important;
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-dark, rgba(255,255,255,0.1)) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: var(--shadow-md) !important;
}

:deep(.mapboxgl-ctrl-group button) {
  background: transparent !important;
  border: none !important;
}

:deep(.mapboxgl-ctrl-group button:hover) {
  background: rgba(255, 255, 255, 0.1) !important;
}

:deep(.mapboxgl-ctrl-group button + button) {
  border-top: 1px solid var(--border-dark, rgba(255,255,255,0.1)) !important;
}

:deep(.mapboxgl-ctrl-icon) {
  filter: invert(1);
}

/* 聚合标记样式 - 地图钉设计 */
.cluster-marker {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  pointer-events: auto;
  transition: transform 0.2s ease;
}

.cluster-marker:hover {
  transform: scale(1.1);
}

/* 地图钉形状 */
.pin-shape {
  display: flex;
  flex-direction: column;
  align-items: center;
  filter: drop-shadow(0 4px 8px rgba(0, 95, 137, 0.4));
}

.pin-head {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #4C9AC0 0%, #257EAA 50%, #005F89 100%);
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.4);
}

.pin-count {
  transform: rotate(45deg);
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.pin-tail {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 10px solid #005F89;
  margin-top: -4px;
}

.pin-label {
  margin-top: 4px;
  padding: 2px 8px;
  background: rgba(37, 126, 170, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 10px;
  font-size: 11px;
  color: #fff;
  white-space: nowrap;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 全球视图按钮 */
.globe-btn {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 48px;
  background: rgba(37, 126, 170, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 2px solid rgba(76, 154, 192, 0.5);
  border-radius: 50%;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 95, 137, 0.35);
  transition: all 0.2s ease;
}

.globe-btn:hover {
  background: rgba(37, 126, 170, 1);
  transform: translateX(-50%) scale(1.1);
  box-shadow: 0 6px 28px rgba(0, 95, 137, 0.45);
}

.globe-btn svg {
  width: 24px;
  height: 24px;
  color: #fff;
}
</style>
