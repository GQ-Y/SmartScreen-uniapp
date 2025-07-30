<template>
  <view class="smart-screen-container" :class="containerClasses">
    <!-- 主内容区域 -->
    <view class="main-content">
      <!-- 直接显示内容 -->
      <view v-if="currentContent" class="content-display">
        <!-- 网页内容 (content_type: 1) -->
        <web-view
          v-if="currentContent.content_type === CONTENT_TYPES.WEBPAGE"
          :src="currentContent.content_url"
          class="content-webview"
          @load="handleContentLoad"
          @error="handleContentError"
        />

        <!-- 图片内容 (content_type: 2) -->
        <image
          v-else-if="currentContent.content_type === CONTENT_TYPES.IMAGE"
          :src="currentContent.content_url"
          class="content-image"
          mode="aspectFit"
          @load="handleContentLoad"
          @error="handleContentError"
        />

        <!-- 视频内容 (content_type: 3) - 使用Chunlei增强版 -->
        <ChunleiVideoPlayer
          ref="videoPlayer"
          v-else-if="currentContent.content_type === CONTENT_TYPES.VIDEO"
          :src="currentContent.content_url"
          :title="currentContent.title || '视频播放'"
          :poster="currentContent.thumbnail"
          :autoplay="true"
          :show-controls="false"
          :loop="true"
          :muted="false"
          :show-progress="false"
          :show-info="true"
          :show-play-indicator="false"
          :theme-color="'#FF6022'"
          :orientation="deviceInfo.isTV || deviceInfo.isLandscape"
          :show-debug-info="showDebugInfo"
          :content-info="currentContent"
          @play="handleContentLoad"
          @error="handleContentError"
          @ended="handleVideoEnded"
          @retry-failed="handleRetryFailed"
        />

        <!-- 直播流内容 (content_type: 4) - 使用Chunlei增强版 -->
        <ChunleiVideoPlayer
          ref="livePlayer"
          v-else-if="currentContent.content_type === CONTENT_TYPES.LIVE_STREAM"
          :src="currentContent.content_url"
          :title="currentContent.title || '直播流'"
          :poster="currentContent.thumbnail"
          :autoplay="true"
          :show-controls="false"
          :loop="true"
          :muted="false"
          :show-progress="false"
          :show-info="true"
          :show-play-indicator="false"
          :theme-color="'#FF6022'"
          :orientation="deviceInfo.isTV || deviceInfo.isLandscape"
          :show-debug-info="showDebugInfo"
          :content-info="currentContent"
          @play="handleContentLoad"
          @error="handleContentError"
          @retry-failed="handleRetryFailed"
        />

        <!-- 音频内容 (content_type: 5) -->
        <AudioPlayer
          ref="audioPlayer"
          v-else-if="currentContent.content_type === CONTENT_TYPES.AUDIO"
          :src="currentContent.content_url"
          :content-info="currentContent"
          :autoplay="true"
          :loop="false"
          :show-controls="false"
          :show-progress="true"
          :cover-image="currentContent.thumbnail"
          :background-image="currentContent.thumbnail"
          :muted="true"
          @play="handleContentLoad"
          @error="handleContentError"
          @ended="handleAudioEnded"
          @retry-failed="handleRetryFailed"
        />

        <!-- 未知类型内容 -->
        <view v-else class="content-unknown">
          <text class="unknown-content-text">不支持的内容类型</text>
        </view>
      </view>

      <!-- 中央状态显示（当没有内容时显示） -->
      <view v-else class="center-status">
        <text class="main-status-text">{{ mainStatusText }}</text>
      </view>
    </view>

    <!-- 加载遮罩 -->
    <view class="loading-overlay" v-if="isLoading">
      <view class="loading-content">
        <!-- 可选LOGO -->
        <!-- <image class="loading-logo" src="/static/logo.png" mode="aspectFit" /> -->
        <text class="loading-text">{{ loadingText }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { Logger } from '../../common/utils/logger.js'
import { globalKeyHandler, KEYS } from '../../common/utils/keyHandler.js'
import { CONTENT_TYPES } from '../../common/constants/constants.js'
import { DeviceUtils } from '../../common/utils/deviceUtils.js'
import SvgIcon from '../../components/SvgIcon.vue'
import VideoPlayer from '../../components/VideoPlayer.vue'
import ChunleiVideoPlayer from '../../components/ChunleiVideoPlayer.vue'
import AudioPlayer from '../../components/AudioPlayer.vue'

const logger = Logger.createTaggedLogger('IndexPage')

export default {
  name: 'IndexPage',
  components: {
    SvgIcon,
    VideoPlayer,
    ChunleiVideoPlayer,
    AudioPlayer
  },

  data() {
    return {
      currentTime: '',
      timeTimer: null,
      isLoading: false,
      loadingText: '精彩内容马上呈现，请稍候...',

      // 内容类型常量
      CONTENT_TYPES,

      // Duration计时器
      durationTimer: null,
      currentContentIndex: 0,
      contentList: [],
      
      // 自动切换标志
      isAutoSwitching: false,

      // 设备信息
      deviceInfo: {
        screenWidth: 0,
        screenHeight: 0,
        pixelRatio: 1,
        windowWidth: 0,
        windowHeight: 0,
        platform: '',
        brand: '',
        model: '',
        system: '',
        isTV: false,
        screenSize: 'normal'
      },

      // 引导提示
      tips: [
        '1. 确保设备已连接到网络',
        '2. 应用将自动连接到服务器',
        '3. 等待设备激活后即可播放内容',
        '4. 使用遥控器进行操作'
      ]
    }
  },

  computed: {
    ...mapGetters([
      'isAppInitialized',
      'getAppVersion',
      'getAppStatus'
    ]),
    ...mapGetters('device', [
      'getDeviceStatus',
      'isDeviceOnline'
    ]),
    ...mapGetters('websocket', [
      'getConnectionStatus',
      'getContentData'
    ]),

    // 应用版本
    appVersion() {
      return this.getAppVersion
    },

    // 显示调试信息
    showDebugInfo() {
      // 在开发环境或者特定条件下显示调试信息
      return false
    },

    // 网络状态（基于设备在线状态）
    networkStatusClass() {
      const isOnline = this.isDeviceOnline
      return {
        'status-connected': isOnline,
        'status-disconnected': !isOnline
      }
    },

    networkIconName() {
      return this.isDeviceOnline ? 'wifi' : 'network'
    },

    networkIconColor() {
      return this.isDeviceOnline ? '#4CAF50' : '#F44336'
    },

    networkStatusText() {
      return this.isDeviceOnline ? '网络已连接' : '无网络连接'
    },

    // WebSocket状态
    websocketStatusClass() {
      const status = this.getConnectionStatus
      return {
        'status-connected': status.isConnected,
        'status-connecting': status.status === 'connecting',
        'status-disconnected': !status.isConnected
      }
    },

    websocketIconName() {
      const status = this.getConnectionStatus
      if (status.isConnected) return 'websocket-connected'
      if (status.status === 'connecting') return 'websocket-connecting'
      return 'websocket-disconnected'
    },

    websocketIconColor() {
      const status = this.getConnectionStatus
      if (status.isConnected) return '#4CAF50'
      if (status.status === 'connecting') return '#FF9800'
      return '#F44336'
    },

    websocketStatusText() {
      const status = this.getConnectionStatus
      const statusMap = {
        'connected': '已连接',
        'connecting': '连接中',
        'reconnecting': '重连中',
        'disconnected': '未连接',
        'error': '连接错误'
      }
      return statusMap[status.status] || '未知'
    },

    // 主状态
    mainStatusClass() {
      if (!this.isDeviceOnline) return 'status-offline'
      if (!this.getConnectionStatus.isConnected) return 'status-disconnected'
      if (!this.getConnectionStatus.isActive) return 'status-inactive'
      return 'status-active'
    },

    mainStatusIconName() {
      if (!this.isDeviceOnline) return 'device-offline'
      if (!this.getConnectionStatus.isConnected) return 'device-disconnected'
      if (!this.getConnectionStatus.isActive) return 'device-inactive'
      return 'device-ready'
    },

    mainStatusIconColor() {
      if (!this.isDeviceOnline) return '#9E9E9E'
      if (!this.getConnectionStatus.isConnected) return '#F44336'
      if (!this.getConnectionStatus.isActive) return '#FF9800'
      return '#4CAF50'
    },

    mainStatusText() {
      if (!this.isDeviceOnline) return '设备离线'
      if (!this.getConnectionStatus.isConnected) return '服务器未连接'
      if (!this.getConnectionStatus.isActive) return '设备未激活'
      return '设备就绪'
    },

    subStatusText() {
      if (!this.isDeviceOnline) return '请检查网络连接'
      if (!this.getConnectionStatus.isConnected) return '正在尝试连接服务器'
      if (!this.getConnectionStatus.isActive) return '等待管理员激活设备'
      return '可以接收和播放内容'
    },

    // 是否显示引导提示
    showGuideTips() {
      return !this.getConnectionStatus.isActive
    },

    // 引导文本
    guideText() {
      if (!this.isDeviceOnline) return '设备配置指南'
      if (!this.getConnectionStatus.isConnected) return '连接配置指南'
      return '设备激活指南'
    },

    // 是否显示操作按钮
    showActionButtons() {
      return true
    },

    // 是否连接
    isConnected() {
      return this.getConnectionStatus.isConnected
    },

    // 当前要显示的内容
    currentContent() {
      const contentData = this.getContentData
      if (!contentData || !contentData.success || !contentData.data) {
        logger.info('currentContent: contentData无效')
        return null
      }
      const data = contentData.data
      // 只取primary_contents[0]，没有则为null
      if (data.primary_contents && data.primary_contents.length > 0) {
        const content = data.primary_contents[0]
        if (content.content_url) {
          logger.info('currentContent: 返回内容', {
            title: content.title,
            type: content.content_type,
            url: content.content_url
          })
          return content
        } else {
          logger.warn('currentContent: primary_contents[0]缺少content_url', {
            content: content
          })
        }
      } else {
        logger.info('currentContent: primary_contents为空或不存在', {
          hasPrimaryContents: !!data.primary_contents,
          primaryContentsLength: data.primary_contents?.length || 0
        })
      }
      return null
    },

    // 容器样式类
    containerClasses() {
      const classes = []
      
      if (this.deviceInfo.orientation) {
        classes.push(`orientation-${this.deviceInfo.orientation}`)
      }
      
      if (this.deviceInfo.isTV) {
        classes.push('device-tv')
      }
      
      if (this.deviceInfo.screenSize) {
        classes.push(`screen-${this.deviceInfo.screenSize}`)
      }
      
      return classes
    },

    // 动态样式变量
    dynamicStyles() {
      const { screenWidth, screenHeight, isTV, screenSize, pixelRatio } = this.deviceInfo
      
      // 根据屏幕尺寸调整基础单位
      let baseUnit = 1
      let fontScale = 1
      let spacingScale = 1
      let iconScale = 1
      
      // 根据实际分辨率计算缩放比例
      if (screenWidth >= 3840) { // 4K
        baseUnit = 2.5
        fontScale = 2.5
        spacingScale = 2.5
        iconScale = 2.5
      } else if (screenWidth >= 2560) { // 2K
        baseUnit = 2.0
        fontScale = 2.0
        spacingScale = 2.0
        iconScale = 2.0
      } else if (screenWidth >= 1920) { // 1080p
        baseUnit = 1.5
        fontScale = 1.5
        spacingScale = 1.5
        iconScale = 1.5
      } else if (screenWidth >= 1280) { // 720p
        baseUnit = 1.2
        fontScale = 1.2
        spacingScale = 1.2
        iconScale = 1.2
      }

      // TV端特殊处理 - 适当调整字体和间距
      if (isTV) {
        fontScale *= 0.8 // TV端字体缩小20%
        spacingScale *= 1.0 // TV端间距保持不变
        iconScale *= 1.0 // TV端图标保持不变
        baseUnit *= 0.9 // 整体缩小10%
      }
      
      // 高DPI屏幕调整
      if (pixelRatio > 2) {
        fontScale *= 1.1
        iconScale *= 1.1
      }

      return {
        '--base-unit': baseUnit,
        '--screen-width': screenWidth + 'px',
        '--screen-height': screenHeight + 'px',
        '--pixel-ratio': pixelRatio,
        '--is-tv': isTV ? 1 : 0,
        '--font-scale': fontScale,
        '--spacing-scale': spacingScale,
        '--icon-scale': iconScale,
        '--screen-size': screenSize
      }
    }
  },

  watch: {
    // 监听当前内容变化，确保旧内容被正确停止
    currentContent: {
      handler(newContent, oldContent) {
        // 如果是自动切换，跳过handleContentChange，因为已经在switchToNextContent中处理了
        if (this.isAutoSwitching) {
          logger.info('自动切换中，跳过handleContentChange')
          return
        }
        this.handleContentChange(newContent, oldContent)
      },
      immediate: false
    }
  },

  async onLoad() {
    logger.info('主页面加载')

    try {
      this.isLoading = true
      this.loadingText = '正在初始化应用...'

      // 获取设备信息
      await this.getDeviceInfo()

      // 初始化应用
      if (!this.isAppInitialized) {
        await this.initializeApp()
      }

      // 开始时间更新
      this.startTimeUpdate()

      // 设置按键监听
      this.setupKeyListener()

      // 设置事件监听
      this.setupEventListeners()

      // 自动连接WebSocket
      await this.autoConnectWebSocket()

      this.isLoading = false
      logger.info('主页面初始化完成')

    } catch (error) {
      this.isLoading = false
      logger.error('主页面初始化失败:', error)

      uni.showToast({
        title: '初始化失败',
        icon: 'error'
      })
    }
  },

  onUnload() {
    this.stopTimeUpdate()
    this.clearDurationTimer()

    // 清理按键监听器
    globalKeyHandler.removeAllListeners()

    // 清理事件监听器
    this.cleanupEventListeners()

    logger.info('页面卸载，已清理监听器')
  },

  methods: {
    ...mapActions([
      'initializeApp',
      'changePage'
    ]),
    ...mapActions('websocket', [
      'connect',
      'getContent'
    ]),

    // 获取设备信息
    async getDeviceInfo() {
      try {
        const systemInfo = await DeviceUtils.getSystemInfo()
        
        // 判断是否为TV端
        const isTV = this.isTelevision(systemInfo)
        
        // 根据屏幕尺寸分类
        const screenSize = this.getScreenSize(systemInfo.screenWidth, systemInfo.screenHeight)
        
        this.deviceInfo = {
          screenWidth: systemInfo.screenWidth || 0,
          screenHeight: systemInfo.screenHeight || 0,
          pixelRatio: systemInfo.pixelRatio || 1,
          windowWidth: systemInfo.windowWidth || 0,
          windowHeight: systemInfo.windowHeight || 0,
          platform: systemInfo.platform || '',
          brand: systemInfo.brand || '',
          model: systemInfo.model || '',
          system: systemInfo.system || '',
          isTV,
          screenSize
        }
        
        logger.info('设备信息获取成功:', this.deviceInfo)
        
        // 检测最佳应用方向
        await this.detectOptimalAppOrientation()
        
        // 应用动态样式
        this.applyDynamicStyles()
        
      } catch (error) {
        logger.error('获取设备信息失败:', error)
        // 使用默认值
        this.deviceInfo = {
          screenWidth: 1920,
          screenHeight: 1080,
          pixelRatio: 1,
          windowWidth: 1920,
          windowHeight: 1080,
          platform: 'unknown',
          brand: '',
          model: '',
          system: '',
          isTV: true, // 默认假设是TV端
          screenSize: 'large'
        }
        
        // 即使获取失败也要应用默认样式
        this.applyDynamicStyles()
      }
    },

    // 判断是否为电视端
    isTelevision(systemInfo) {
      const { platform, brand, model, screenWidth, screenHeight, system } = systemInfo
      
      // 根据平台判断
      if (platform === 'android') {
        // Android TV的特征
        if (brand && (
          brand.toLowerCase().includes('tv') ||
          brand.toLowerCase().includes('android tv') ||
          brand.toLowerCase().includes('smart tv') ||
          brand.toLowerCase().includes('xiaomi') ||
          brand.toLowerCase().includes('sony') ||
          brand.toLowerCase().includes('samsung') ||
          brand.toLowerCase().includes('lg') ||
          brand.toLowerCase().includes('tcl') ||
          brand.toLowerCase().includes('hisense') ||
          brand.toLowerCase().includes('changhong') ||
          brand.toLowerCase().includes('skyworth')
        )) {
          return true
        }
        
        // 根据型号判断
        if (model && (
          model.toLowerCase().includes('tv') ||
          model.toLowerCase().includes('box') ||
          model.toLowerCase().includes('stick') ||
          model.toLowerCase().includes('cast') ||
          model.toLowerCase().includes('fire') ||
          model.toLowerCase().includes('roku') ||
          model.toLowerCase().includes('apple tv')
        )) {
          return true
        }
        
        // 根据系统版本判断（Android TV通常有特定的系统标识）
        if (system && (
          system.toLowerCase().includes('android tv') ||
          system.toLowerCase().includes('google tv')
        )) {
          return true
        }
      }
      
      // 根据屏幕尺寸判断（大屏幕通常是TV）
      if (screenWidth >= 1280 && screenHeight >= 720) {
        const aspectRatio = screenWidth / screenHeight
        // 常见的TV分辨率比例
        if (Math.abs(aspectRatio - 16/9) < 0.2 || Math.abs(aspectRatio - 4/3) < 0.2) {
          // 如果是常见TV分辨率且屏幕足够大，很可能是TV
          if (screenWidth >= 1920 || screenHeight >= 1080) {
            return true
          }
        }
      }
      
      // 特殊判断：如果屏幕非常大，很可能是TV
      if (screenWidth >= 2560 || screenHeight >= 1440) {
        return true
      }
      
      return false
    },

    // 获取屏幕尺寸分类
    getScreenSize(width, height) {
      if (width >= 3840 || height >= 2160) {
        return 'ultra' // 4K及以上
      } else if (width >= 2560 || height >= 1440) {
        return 'extra-large' // 2K
      } else if (width >= 1920 || height >= 1080) {
        return 'large' // 1080p
      } else if (width >= 1280 || height >= 720) {
        return 'medium' // 720p
      } else {
        return 'small' // 小屏幕
      }
    },

    // 检测最佳应用方向
    async detectOptimalAppOrientation() {
      try {
        logger.info('开始检测最佳应用方向')
        
        // 使用DeviceUtils检测最佳应用方向
        const orientation = await DeviceUtils.detectOptimalAppOrientation()
        
        logger.info('检测到最佳应用方向:', orientation)
        
        // 更新设备信息中的方向信息
        this.deviceInfo.orientation = orientation
        
        // 根据检测结果应用相应的样式类
        this.applyOrientationStyles(orientation)
        
      } catch (error) {
        logger.error('检测最佳应用方向失败:', error)
        // 默认使用横屏布局
        this.deviceInfo.orientation = 'landscape'
        this.applyOrientationStyles('landscape')
      }
    },

    // 应用方向样式
    applyOrientationStyles(orientation) {
      try {
        // 在uni-app中，直接通过Vue组件实例来处理样式
        // 不直接操作DOM，而是通过data属性来控制样式类
        this.deviceInfo.orientation = orientation
        
        logger.info('应用方向样式已应用:', orientation)
        
        // 同时应用动态样式
        this.applyDynamicStyles()
        
      } catch (error) {
        logger.error('应用方向样式失败:', error)
      }
    },

    // 应用动态样式
    applyDynamicStyles() {
      try {
        // 在uni-app中，CSS变量需要通过其他方式设置
        // 这里只记录样式信息，实际样式通过computed属性和class绑定实现
        logger.info('动态样式计算完成:', this.dynamicStyles)
        
        // 可以通过uni.setStorage保存样式信息供其他组件使用
        uni.setStorageSync('dynamicStyles', this.dynamicStyles)
        
      } catch (error) {
        logger.error('应用动态样式失败:', error)
      }
    },

    // 开始时间更新
    startTimeUpdate() {
      this.updateTime()
      this.timeTimer = setInterval(() => {
        this.updateTime()
      }, 1000)
    },

    // 停止时间更新
    stopTimeUpdate() {
      if (this.timeTimer) {
        clearInterval(this.timeTimer)
        this.timeTimer = null
      }
    },

    // 启动duration计时器
    startDurationTimer(content) {
      // 清除之前的计时器
      this.clearDurationTimer()
      
      // 获取完整的播放列表内容
      const contentData = this.getContentData
      if (contentData && contentData.data) {
        // 使用playlist_contents作为完整的内容列表，按content_sort排序
        this.contentList = (contentData.data.playlist_contents || []).sort((a, b) => a.content_sort - b.content_sort)
        
        // 找到当前内容在完整列表中的索引
        this.currentContentIndex = this.contentList.findIndex(item => 
          item.id === content.id || item.content_url === content.content_url
        )
        
        if (this.currentContentIndex === -1) {
          this.currentContentIndex = 0
        }
      }
      
      // 如果duration > 0 且有多个内容，启动计时器
      if (content.duration > 0 && this.contentList.length > 1) {
        logger.info('启动自动切换计时器:', {
          duration: content.duration,
          contentCount: this.contentList.length,
          currentIndex: this.currentContentIndex,
          currentTitle: content.title
        })
        
        this.durationTimer = setTimeout(() => {
          this.switchToNextContent()
        }, content.duration * 1000)
      }
    },

    // 清除duration计时器
    clearDurationTimer() {
      if (this.durationTimer) {
        clearTimeout(this.durationTimer)
        this.durationTimer = null
      }
    },

    // 切换到下一个内容
    switchToNextContent() {
      if (this.contentList.length <= 1) return
      
      // 设置自动切换标志
      this.isAutoSwitching = true
      
      // 获取当前内容（从store中获取，而不是computed属性）
      const currentContentData = this.getContentData
      const currentContent = currentContentData?.data?.primary_contents?.[0]
      
      // 计算下一个内容的索引（循环播放）
      this.currentContentIndex = (this.currentContentIndex + 1) % this.contentList.length
      const nextContent = this.contentList[this.currentContentIndex]
      
      if (nextContent && nextContent.content_url) {
        logger.info('自动切换到下一个内容:', {
          from: currentContent?.title || '无',
          to: nextContent.title || '无',
          type: this.getContentTypeName(nextContent.content_type),
          index: this.currentContentIndex,
          totalCount: this.contentList.length,
          contentUrl: nextContent.content_url
        })
        
        // 直接更新store，避免中间状态
        const contentResponse = {
          ...this.getContentData,
          data: {
            ...this.getContentData.data,
            // 将选中的内容设为primary_contents的第一个
            primary_contents: [nextContent],
            // 保持原始播放列表不变
            playlist_contents: this.contentList
          }
        }
        
        logger.info('准备更新store:', {
          newPrimaryContents: contentResponse.data.primary_contents,
          newContentUrl: nextContent.content_url
        })
        
        // 直接提交，不经过中间清空状态
        this.$store.commit('websocket/SET_CONTENT_DATA', contentResponse)
        
        // 强制更新视图
        this.$nextTick(() => {
          logger.info('store更新完成，强制刷新视图')
          // 手动启动新内容的duration计时器
          this.startDurationTimer(nextContent)
        })
        
        // 延迟重置自动切换标志
        setTimeout(() => {
          this.isAutoSwitching = false
        }, 1000)
        
      } else {
        logger.warn('下一个内容无效，跳过切换:', {
          nextContent: nextContent,
          hasContentUrl: nextContent?.content_url,
          index: this.currentContentIndex
        })
        // 如果当前内容无效，尝试切换到下一个
        if (nextContent && !nextContent.content_url) {
          // 递归调用，跳过无效内容
          setTimeout(() => {
            this.switchToNextContent()
          }, 100)
        }
        // 重置自动切换标志
        this.isAutoSwitching = false
      }
    },

    // 获取内容类型名称
    getContentTypeName(contentType) {
      const typeNames = {
        [this.CONTENT_TYPES.IMAGE]: '图片',
        [this.CONTENT_TYPES.VIDEO]: '视频',
        [this.CONTENT_TYPES.LIVE_STREAM]: '直播',
        [this.CONTENT_TYPES.WEBPAGE]: '网页',
        [this.CONTENT_TYPES.AUDIO]: '音频'
      }
      return typeNames[contentType] || '未知'
    },

    // 检查是否为临时播放内容
    // 已废弃临时播放逻辑，直接返回false
    isTemporaryContent(content) {
      return false
    },

    // 开始临时播放
    // 已废弃临时播放逻辑
    startTemporaryPlayback(content) {
      // 不做任何处理
    },

    // 更新时间
    updateTime() {
      const now = new Date()
      this.currentTime = now.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },

    // 自动连接WebSocket
    async autoConnectWebSocket() {
      try {
        logger.info('开始自动连接WebSocket')
        this.loadingText = '正在连接服务器...'

        // 尝试连接（使用配置文件中的默认地址和端口）
        await this.connect()
        logger.info('WebSocket自动连接成功')

        // 注释掉重复的getContent调用，WebSocketManager会在注册成功后自动获取内容
        // setTimeout(async () => {
        //   try {
        //     await this.getContent()
        //     logger.info('自动获取内容成功')
        //   } catch (error) {
        //     logger.warn('自动获取内容失败:', error)
        //   }
        // }, 1000)

      } catch (error) {
        logger.warn('WebSocket自动连接失败:', error)
        // 自动连接失败不显示错误提示，避免干扰用户体验
        // 用户可以通过状态指示器看到连接状态
      }
    },

    // 处理连接
    async handleConnect() {
      try {
        this.isLoading = true
        this.loadingText = '正在连接服务器...'

        await this.connect()

        uni.showToast({
          title: '连接成功',
          icon: 'success'
        })

      } catch (error) {
        logger.error('连接失败:', error)
        uni.showToast({
          title: '连接失败',
          icon: 'error'
        })
      } finally {
        this.isLoading = false
      }
    },

    // 处理刷新
    async handleRefresh() {
      try {
        this.isLoading = true
        this.loadingText = '正在刷新内容...'

        await this.getContent()

        uni.showToast({
          title: '刷新成功',
          icon: 'success'
        })

      } catch (error) {
        logger.error('刷新失败:', error)
        uni.showToast({
          title: '刷新失败',
          icon: 'error'
        })
      } finally {
        this.isLoading = false
      }
    },



    // 处理内容变化 - 确保旧内容被正确停止
    handleContentChange(newContent, oldContent) {
      // 如果新内容为空，不处理
      if (!newContent) {
        logger.warn('新内容为空，跳过处理')
        return
      }
      
      this.clearDurationTimer()
      // 只判断类型是否相同，强制每次都切换
      const oldType = oldContent?.content_type
      const newType = newContent?.content_type
      const oldUrl = oldContent?.content_url
      const newUrl = newContent?.content_url
      
      logger.info('内容切换:', {
        fromType: oldType,
        toType: newType,
        fromTitle: oldContent?.title || '无',
        toTitle: newContent?.title || '无',
        fromUrl: oldContent?.content_url || '无',
        toUrl: newContent?.content_url || '无'
      })
      
      // 如果类型和URL都相同，跳过处理以避免播放卡住
      if (oldType === newType && oldUrl === newUrl) {
        logger.info('类型和URL均相同，跳过处理:', newContent.title)
        return
      }
      
      // 类型或URL不同，需要重新加载
      if (oldContent) {
        logger.info('类型或URL不同，执行组件销毁重建流程')
        this.stopCurrentContent(oldContent)
        this.isLoading = true
        this.loadingText = '精彩内容马上呈现，请稍候...'
        
        // 先清空内容，强制重绘
        this.$store.commit('websocket/SET_CONTENT_DATA', {
          ...this.getContentData,
          data: {
            ...this.getContentData.data,
            primary_contents: [],
            direct_content: null
          }
        })
        
        setTimeout(async () => {
          await this.$nextTick()
          setTimeout(() => {
            if (newContent) {
              logger.info('开始启动新内容:', newContent.title)
              this.startNewContent(newContent)
            } else {
              logger.warn('新内容为空，无法启动')
              this.isLoading = false
            }
          }, 200)
        }, 100)
      } else {
        if (newContent) {
          logger.info('首次加载内容:', newContent.title)
          this.startNewContent(newContent)
        } else {
          logger.warn('新内容为空，无法启动')
        }
      }
    },

    // 停止当前播放的内容
    stopCurrentContent(content) {
      try {
        // 根据内容类型停止播放
        switch (content.content_type) {
          case this.CONTENT_TYPES.VIDEO:
          case this.CONTENT_TYPES.LIVE_STREAM:
            this.stopVideoContent()
            break
          case this.CONTENT_TYPES.AUDIO:
            this.stopAudioContent()
            break
          case this.CONTENT_TYPES.WEBPAGE:
            this.stopWebContent()
            break
          case this.CONTENT_TYPES.IMAGE:
            this.stopImageContent()
            break
          default:
            logger.warn('未知内容类型，无法停止:', content.content_type)
        }
      } catch (error) {
        logger.error('停止内容时出错:', error)
      }
    },

    // 开始新内容
    startNewContent(content) {
      // 只有在非自动切换的情况下才启动duration计时器
      // 自动切换时，计时器已经在switchToNextContent中启动
      if (!this.isAutoSwitching) {
        this.startDurationTimer(content)
      }
    },

    // 停止视频内容
    stopVideoContent() {
      try {
        // 停止普通视频播放器
        if (this.$refs.videoPlayer) {
          this.$refs.videoPlayer.stop()
          this.$refs.videoPlayer.cleanup()
        }

        // 停止直播流播放器
        if (this.$refs.livePlayer) {
          this.$refs.livePlayer.stop()
          this.$refs.livePlayer.cleanup()
        }

        // 备用方案：查找所有视频播放器组件
        this.findAndStopComponents('VideoPlayer', (player) => {
          if (player.stop) player.stop()
          if (player.cleanup) player.cleanup()
        })
      } catch (error) {
        logger.error('停止视频播放器时出错:', error)
      }
    },

    // 停止音频内容
    stopAudioContent() {
      try {
        // 使用 ref 引用来停止音频播放器
        if (this.$refs.audioPlayer) {
          this.$refs.audioPlayer.stop()
          this.$refs.audioPlayer.cleanup()
        }

        // 备用方案：查找所有音频播放器组件
        this.findAndStopComponents('AudioPlayer', (player) => {
          if (player.stop) player.stop()
          if (player.cleanup) player.cleanup()
        })
      } catch (error) {
        logger.error('停止音频播放器时出错:', error)
      }
    },

    // 查找并停止指定类型的组件
    findAndStopComponents(componentName, stopCallback) {
      const findComponents = (children) => {
        if (!children) return []

        let components = []
        children.forEach(child => {
          if (child.$options.name === componentName) {
            components.push(child)
          }
          // 递归查找子组件
          if (child.$children && child.$children.length > 0) {
            components = components.concat(findComponents(child.$children))
          }
        })
        return components
      }

      const components = findComponents(this.$children)
      components.forEach(component => {
        try {
          stopCallback(component)
        } catch (error) {
          logger.error(`停止${componentName}组件时出错:`, error)
        }
      })
    },

    // 停止网页内容
    stopWebContent() {
      // 网页内容通常不需要特殊停止操作
    },

    // 停止图片内容
    stopImageContent() {
      // 图片内容通常不需要特殊停止操作
    },

    // 处理内容加载成功
    handleContentLoad() {
      // 内容加载成功，关闭加载中遮罩
      this.isLoading = false
      // 内容加载成功，无需打印日志
    },

    // 处理内容加载错误
    handleContentError(error) {
      logger.error('内容加载失败:', error)

      uni.showToast({
        title: '内容加载失败',
        icon: 'error'
      })
    },

    // 处理视频播放结束
    handleVideoEnded() {
      logger.info('视频播放结束')
      
      // 视频播放结束后，如果是单个内容或duration为0，不需要特殊处理
      // 自动切换由duration计时器管理
    },

    // 处理音频播放结束
    handleAudioEnded() {
      logger.info('音频播放结束')
      
      // 音频播放结束后，如果是单个内容或duration为0，不需要特殊处理
      // 自动切换由duration计时器管理
    },

    // 处理播放器重试失败
    handleRetryFailed() {
      logger.error('播放器重试失败，尝试刷新内容')

      uni.showToast({
        title: '播放失败，正在重新获取内容',
        icon: 'error',
        duration: 2000
      })

      // 3秒后自动刷新内容
      setTimeout(async () => {
        try {
          await this.handleRefresh()
          logger.info('因播放器重试失败而刷新内容完成')
        } catch (error) {
          logger.error('刷新内容失败:', error)
          uni.showToast({
            title: '刷新内容失败',
            icon: 'error'
          })
        }
      }, 3000)
    },

    // 设置按键监听
    setupKeyListener() {
      // 设置按键事件处理
      globalKeyHandler.addListener(KEYS.BACK, () => {
        this.handleBack()
      })



      globalKeyHandler.addListener(KEYS.CENTER, () => {
        if (this.isConnected) {
          this.handleRefresh()
        }
      })

      globalKeyHandler.addListener(KEYS.UP, () => {
        this.handleNavigateUp()
      })

      globalKeyHandler.addListener(KEYS.DOWN, () => {
        this.handleNavigateDown()
      })

      globalKeyHandler.addListener(KEYS.LEFT, () => {
        this.handleNavigateLeft()
      })

      globalKeyHandler.addListener(KEYS.RIGHT, () => {
        this.handleNavigateRight()
      })

      // 媒体控制键
      globalKeyHandler.addListener(KEYS.PLAY_PAUSE, () => {
        this.handlePlayPause()
      })

      globalKeyHandler.addListener(KEYS.STOP, () => {
        this.handleStop()
      })

      globalKeyHandler.addListener(KEYS.NEXT, () => {
        this.handleNext()
      })

      globalKeyHandler.addListener(KEYS.PREVIOUS, () => {
        this.handlePrevious()
      })

      // 音量控制
      globalKeyHandler.addListener(KEYS.VOLUME_UP, () => {
        this.handleVolumeUp()
      })

      globalKeyHandler.addListener(KEYS.VOLUME_DOWN, () => {
        this.handleVolumeDown()
      })

      globalKeyHandler.addListener(KEYS.MUTE, () => {
        this.handleMute()
      })

      logger.info('按键监听器已设置')
    },

    // 设置事件监听器
    setupEventListeners() {
      // 监听停止所有播放器的事件
      uni.$on('stopAllPlayers', this.handleStopAllPlayers)
      
      // 监听屏幕方向变化
      this.setupOrientationListener()
      
      logger.info('事件监听器已设置')
    },

    // 设置屏幕方向监听
    setupOrientationListener() {
      // #ifdef APP-PLUS
      // 监听屏幕方向变化
      plus.screen.onOrientationChange = (orientation) => {
        logger.info('屏幕方向发生变化:', orientation)
        this.handleOrientationChange(orientation)
      }
      // #endif
      
      // 监听窗口大小变化（通用方法）
      uni.onWindowResize((res) => {
        logger.info('窗口大小发生变化:', res)
        this.handleWindowResize(res)
      })
    },

    // 处理屏幕方向变化
    handleOrientationChange(orientation) {
      logger.info('处理屏幕方向变化:', orientation)
      
      // 更新设备信息
      this.deviceInfo.orientation = orientation
      
      // 延迟更新屏幕尺寸信息
      setTimeout(async () => {
        try {
          const systemInfo = await DeviceUtils.getSystemInfo()
          this.deviceInfo.screenWidth = systemInfo.screenWidth || this.deviceInfo.screenWidth
          this.deviceInfo.screenHeight = systemInfo.screenHeight || this.deviceInfo.screenHeight
          this.deviceInfo.windowWidth = systemInfo.windowWidth || this.deviceInfo.windowWidth
          this.deviceInfo.windowHeight = systemInfo.windowHeight || this.deviceInfo.windowHeight
          
          // 重新应用动态样式
          this.applyDynamicStyles()
          
          logger.info('屏幕方向变化后设备信息已更新')
        } catch (error) {
          logger.error('屏幕方向变化后更新设备信息失败:', error)
        }
      }, 500)
    },

    // 处理窗口大小变化
    handleWindowResize(res) {
      logger.info('处理窗口大小变化:', res)
      
      // 更新设备信息
      this.deviceInfo.windowWidth = res.size.windowWidth
      this.deviceInfo.windowHeight = res.size.windowHeight
      
      // 判断新的屏幕方向
      const isLandscape = res.size.windowWidth > res.size.windowHeight
      const newOrientation = isLandscape ? 'landscape' : 'portrait'
      
      if (this.deviceInfo.orientation !== newOrientation) {
        this.deviceInfo.orientation = newOrientation
        logger.info('窗口大小变化导致屏幕方向改变:', newOrientation)
        
        // 重新应用动态样式
        this.applyDynamicStyles()
      }
    },

    // 清理事件监听器
    cleanupEventListeners() {
      uni.$off('stopAllPlayers', this.handleStopAllPlayers)
      
      // 清理屏幕方向监听
      // #ifdef APP-PLUS
      if (plus.screen.onOrientationChange) {
        plus.screen.onOrientationChange = null
      }
      // #endif
      
      logger.info('事件监听器已清理')
    },

    // 处理停止所有播放器事件
    handleStopAllPlayers() {
      logger.info('收到stopAllPlayers事件，准备停止所有播放器')
      try {
        // 停止所有类型的内容
        this.stopVideoContent()
        this.stopAudioContent()
        this.stopWebContent()
        this.stopImageContent()
        
        // 清除duration计时器
        this.clearDurationTimer()
        logger.info('所有播放器已停止')
      } catch (error) {
        logger.error('停止播放器时出错:', error)
      }
    },

    // 按键处理方法
    handleBack() {
      // 在主页面，返回键可以用来退出应用或显示确认对话框
      uni.showModal({
        title: '退出应用',
        content: '确认要退出SmartScreen应用吗？',
        success: (res) => {
          if (res.confirm) {
            // #ifdef APP-PLUS
            plus.runtime.quit()
            // #endif
          }
        }
      })
    },

    handleNavigateUp() {
      // 在主页面，上键可以用来切换焦点或滚动
      logger.debug('导航：上')
    },

    handleNavigateDown() {
      // 在主页面，下键可以用来切换焦点或滚动
      logger.debug('导航：下')
    },

    handleNavigateLeft() {
      // 在主页面，左键可以用来切换焦点
      logger.debug('导航：左')
    },

    handleNavigateRight() {
      // 在主页面，右键可以用来切换焦点
      logger.debug('导航：右')
    },

    handlePlayPause() {
      // 播放/暂停控制
      this.$store.dispatch('player/play')
      logger.debug('媒体控制：播放/暂停')
    },

    handleStop() {
      // 停止播放
      this.$store.dispatch('player/stop')
      logger.debug('媒体控制：停止')
    },

    handleNext() {
      // 下一个内容
      this.$store.dispatch('player/next')
      logger.debug('媒体控制：下一个')
    },

    handlePrevious() {
      // 上一个内容
      this.$store.dispatch('player/previous')
      logger.debug('媒体控制：上一个')
    },

    handleVolumeUp() {
      // 音量增加
      const currentVolume = this.$store.getters['player/getPlayProgress'].volume
      const newVolume = Math.min(1.0, currentVolume + 0.1)
      this.$store.dispatch('player/setVolume', newVolume)
      logger.debug('音量控制：增加')
    },

    handleVolumeDown() {
      // 音量减少
      const currentVolume = this.$store.getters['player/getPlayProgress'].volume
      const newVolume = Math.max(0.0, currentVolume - 0.1)
      this.$store.dispatch('player/setVolume', newVolume)
      logger.debug('音量控制：减少')
    },

    handleMute() {
      // 静音切换
      const currentVolume = this.$store.getters['player/getPlayProgress'].volume
      const newVolume = currentVolume > 0 ? 0 : 1.0
      this.$store.dispatch('player/setVolume', newVolume)
      logger.debug('音量控制：静音切换')
    }
  }
}
</script>

<style scoped>
.smart-screen-container {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  display: flex;
  flex-direction: column;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  min-height: 0;
}

/* 中央状态显示 */
.center-status {
  text-align: center;
  width: 100%;
  padding: 60px;
}

.main-status-text {
  font-size: 36px;
  font-weight: 600;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  margin: 0;
}

/* 内容显示样式 */
.content-display {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
  overflow: hidden;
}

/* 网页内容 */
.content-webview {
  width: 100%;
  height: 100%;
  border: none;
  background: #000;
}

/* 图片内容 */
.content-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-width: 100%;
  max-height: 100%;
}

/* 未知内容类型 */
.content-unknown {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

.unknown-content-text {
  font-size: 32px;
  font-weight: 600;
  color: #FF9800;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  text-align: center;
}

/* 加载遮罩 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  /* 更鲜明的双色渐变 */
  background: linear-gradient(135deg, #4f8cff 0%, #a259ff 100%);
  /* 可选：加模糊 */
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: background 0.3s;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 可选LOGO/icon */
.loading-logo {
  width: 80px;
  height: 80px;
  margin-bottom: 32px;
  opacity: 0.92;
}

.loading-text {
  font-size: 28px;
  color: #fff;
  font-weight: 500;
  letter-spacing: 1px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.18);
  margin-top: 8px;
  margin-bottom: 0;
  text-align: center;
}

/* 电视端特殊优化 */
@media screen and (min-width: 1280px) {
  .main-status-text {
    font-size: 42px;
  }
  .loading-text {
    font-size: 44px;
  }
  .unknown-content-text {
    font-size: 36px;
  }
}

/* 4K分辨率优化 */
@media screen and (min-width: 3840px) {
  .main-status-text {
    font-size: 48px;
  }
  .loading-text {
    font-size: 52px;
  }
  .unknown-content-text {
    font-size: 42px;
  }
  .center-status {
    padding: 80px;
  }
}

/* 8K分辨率优化 */
@media screen and (min-width: 7680px) {
  .main-status-text {
    font-size: 56px;
  }
  .loading-text {
    font-size: 60px;
  }
  .unknown-content-text {
    font-size: 48px;
  }
  .center-status {
    padding: 100px;
  }
}
</style>
