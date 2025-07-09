<template>
  <view class="svg-icon" :style="iconStyle">
    <!-- 网络图标 -->
    <svg v-if="name === 'network'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="2" :fill="color"/>
      <path d="M16.24 7.76C18.32 9.84 18.32 13.16 16.24 15.24M7.76 16.24C5.68 14.16 5.68 10.84 7.76 8.76M19.07 4.93C22.31 8.17 22.31 13.83 19.07 17.07M4.93 19.07C1.69 15.83 1.69 8.17 4.93 4.93" :stroke="color" stroke-width="1.5" stroke-linecap="round"/>
    </svg>

    <!-- WiFi图标 -->
    <svg v-else-if="name === 'wifi'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20H12.01" :stroke="color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M8.5 16.5C9.8 15.2 11.3 14.5 12 14.5C12.7 14.5 14.2 15.2 15.5 16.5" :stroke="color" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 13C7.5 10.5 9.7 9.5 12 9.5C14.3 9.5 16.5 10.5 19 13" :stroke="color" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M1.5 9.5C5.3 5.7 8.6 4 12 4C15.4 4 18.7 5.7 22.5 9.5" :stroke="color" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>

    <!-- 4G/5G图标 -->
    <svg v-else-if="name === 'cellular'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="17" width="2.5" height="5" rx="0.5" :fill="color"/>
      <rect x="6" y="14" width="2.5" height="8" rx="0.5" :fill="color"/>
      <rect x="10" y="11" width="2.5" height="11" rx="0.5" :fill="color"/>
      <rect x="14" y="8" width="2.5" height="14" rx="0.5" :fill="color"/>
      <rect x="18" y="5" width="2.5" height="17" rx="0.5" :fill="color"/>
    </svg>
    
    <!-- 以太网图标 -->
    <svg v-else-if="name === 'ethernet'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="8" width="20" height="8" rx="2" :stroke="color" stroke-width="2" :fill="color" fill-opacity="0.2"/>
      <circle cx="6" cy="12" r="1" :fill="color"/>
      <circle cx="10" cy="12" r="1" :fill="color"/>
      <circle cx="14" cy="12" r="1" :fill="color"/>
      <circle cx="18" cy="12" r="1" :fill="color"/>
    </svg>
    
    <!-- WebSocket连接图标 -->
    <svg v-else-if="name === 'websocket-connected'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" :stroke="color" stroke-width="1.5" :fill="color" fill-opacity="0.1"/>
      <path d="M9 12L11 14L15 10" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>

    <!-- WebSocket连接中图标 -->
    <svg v-else-if="name === 'websocket-connecting'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" :stroke="color" stroke-width="1.5" :fill="color" fill-opacity="0.1"/>
      <path d="M12 7V12L15 14" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>

    <!-- WebSocket断开图标 -->
    <svg v-else-if="name === 'websocket-disconnected'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" :stroke="color" stroke-width="1.5" :fill="color" fill-opacity="0.1"/>
      <path d="M15 9L9 15" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 9L15 15" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    
    <!-- 设备离线图标 -->
    <svg v-else-if="name === 'device-offline'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="12" rx="2" :stroke="color" stroke-width="2" :fill="color" fill-opacity="0.1"/>
      <path d="M8 20H16" :stroke="color" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 16V20" :stroke="color" stroke-width="2" stroke-linecap="round"/>
      <path d="M8 8L16 12M16 8L8 12" :stroke="color" stroke-width="2" stroke-linecap="round"/>
    </svg>
    
    <!-- 设备未激活图标 -->
    <svg v-else-if="name === 'device-inactive'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="12" rx="2" :stroke="color" stroke-width="2" :fill="color" fill-opacity="0.1"/>
      <path d="M8 20H16" :stroke="color" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 16V20" :stroke="color" stroke-width="2" stroke-linecap="round"/>
      <path d="M10 10H14" :stroke="color" stroke-width="2" stroke-linecap="round"/>
      <path d="M10 12H14" :stroke="color" stroke-width="2" stroke-linecap="round"/>
    </svg>
    
    <!-- 设备就绪图标 -->
    <svg v-else-if="name === 'device-ready'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="12" rx="2" :stroke="color" stroke-width="2" :fill="color" fill-opacity="0.1"/>
      <path d="M8 20H16" :stroke="color" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 16V20" :stroke="color" stroke-width="2" stroke-linecap="round"/>
      <path d="M9 10L11 12L15 8" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    
    <!-- 设备断开图标 -->
    <svg v-else-if="name === 'device-disconnected'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="12" rx="2" :stroke="color" stroke-width="2" :fill="color" fill-opacity="0.1"/>
      <path d="M8 20H16" :stroke="color" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 16V20" :stroke="color" stroke-width="2" stroke-linecap="round"/>
      <circle cx="12" cy="10" r="2" :fill="color"/>
    </svg>
    
    <!-- 时间图标 -->
    <svg v-else-if="name === 'time'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" :stroke="color" stroke-width="2"/>
      <path d="M12 7V12L15 15" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    
    <!-- 设置图标 -->
    <svg v-else-if="name === 'settings'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.22 2H11.78C11.2496 2 10.8 2.44772 10.8 3V4.18C10.8 4.47928 10.5793 4.7 10.28 4.7C9.98072 4.7 9.76 4.47928 9.76 4.18V3C9.76 1.89543 10.6754 1 11.78 1H12.22C13.3246 1 14.24 1.89543 14.24 3V4.18C14.24 4.47928 14.0193 4.7 13.72 4.7C13.4207 4.7 13.2 4.47928 13.2 4.18V3C13.2 2.44772 12.7504 2 12.22 2Z" :fill="color"/>
      <path d="M19.78 10.22V11.78C19.78 12.3046 19.3323 12.75 18.8077 12.75H17.6277C17.3284 12.75 17.1077 12.9707 17.1077 13.27C17.1077 13.5693 17.3284 13.79 17.6277 13.79H18.8077C19.8846 13.79 20.78 12.8946 20.78 11.78V10.22C20.78 9.10543 19.8846 8.21 18.8077 8.21H17.6277C17.3284 8.21 17.1077 8.43072 17.1077 8.73C17.1077 9.02928 17.3284 9.25 17.6277 9.25H18.8077C19.3323 9.25 19.78 9.69772 19.78 10.22Z" :fill="color"/>
      <circle cx="12" cy="12" r="3" :stroke="color" stroke-width="2"/>
    </svg>
    
    <!-- 刷新图标 -->
    <svg v-else-if="name === 'refresh'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" :stroke="color" stroke-width="2"/>
      <path d="M8 12L12 8L16 12" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    
    <!-- 连接图标 -->
    <svg v-else-if="name === 'connect'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 17L18 12L13 7" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M6 12H18" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>

    <!-- 播放图标 -->
    <svg v-else-if="name === 'play'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="5,3 19,12 5,21" :fill="color"/>
    </svg>

    <!-- 暂停图标 -->
    <svg v-else-if="name === 'pause'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="4" height="16" :fill="color"/>
      <rect x="14" y="4" width="4" height="16" :fill="color"/>
    </svg>

    <!-- 停止图标 -->
    <svg v-else-if="name === 'stop'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="12" height="12" :fill="color"/>
    </svg>

    <!-- 上一个图标 -->
    <svg v-else-if="name === 'previous'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="19,20 9,12 19,4" :fill="color"/>
      <line x1="5" y1="19" x2="5" y2="5" :stroke="color" stroke-width="2" stroke-linecap="round"/>
    </svg>

    <!-- 下一个图标 -->
    <svg v-else-if="name === 'next'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="5,4 15,12 5,20" :fill="color"/>
      <line x1="19" y1="5" x2="19" y2="19" :stroke="color" stroke-width="2" stroke-linecap="round"/>
    </svg>

    <!-- 音量开启图标 -->
    <svg v-else-if="name === 'volume-on'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" :fill="color"/>
      <path d="M19.07 4.93C21.31 7.17 21.31 10.83 19.07 13.07M15.54 8.46C16.32 9.24 16.32 10.76 15.54 11.54" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>

    <!-- 音量关闭图标 -->
    <svg v-else-if="name === 'volume-off'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" :fill="color"/>
      <line x1="23" y1="9" x2="17" y2="15" :stroke="color" stroke-width="2" stroke-linecap="round"/>
      <line x1="17" y1="9" x2="23" y2="15" :stroke="color" stroke-width="2" stroke-linecap="round"/>
    </svg>

    <!-- 全屏图标 -->
    <svg v-else-if="name === 'fullscreen'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M21 8V5C21 3.89543 20.1046 3 19 3H16" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 21H19C20.1046 21 21 20.1046 21 19V16" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3 16V19C3 20.1046 3.89543 21 5 21H8" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>

    <!-- 默认图标 -->
    <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" :stroke="color" stroke-width="2"/>
      <path d="M12 8V12L15 15" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </view>
</template>

<script>
export default {
  name: 'SvgIcon',
  props: {
    name: {
      type: String,
      required: true
    },
    size: {
      type: [String, Number],
      default: 24
    },
    color: {
      type: String,
      default: '#ffffff'
    }
  },
  computed: {
    iconStyle() {
      const size = typeof this.size === 'number' ? `${this.size}rpx` : this.size
      return {
        width: size,
        height: size,
        display: 'inline-block'
      }
    }
  }
}
</script>

<style scoped>
.svg-icon {
  display: inline-block;
  vertical-align: middle;
}

.svg-icon svg {
  width: 100%;
  height: 100%;
}
</style>
