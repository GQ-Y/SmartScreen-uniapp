<template>
  <view class="smart-screen-container">
    <!-- 顶部状态栏 -->
    <view class="top-bar" style="display: none;">
      <!-- 左上角Logo -->
      <view class="logo-section">
        <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
        <text class="app-name">SmartScreen</text>
      </view>

      <!-- 右上角状态区域 -->
      <view class="status-section">
        <!-- 网络状态 -->
        <view class="status-indicator" :class="networkStatusClass">
          <view class="status-icon-wrapper">
            <SvgIcon :name="networkIconName" :color="networkIconColor" :size="18" />
          </view>
          <text class="status-label">{{ networkStatusText }}</text>
        </view>

        <!-- WebSocket连接状态 -->
        <view class="status-indicator" :class="websocketStatusClass">
          <view class="status-icon-wrapper">
            <SvgIcon :name="websocketIconName" :color="websocketIconColor" :size="18" />
          </view>
          <text class="status-label">{{ websocketStatusText }}</text>
        </view>

        <!-- 时间显示 -->
        <view class="time-display">
          <SvgIcon name="time" :color="'rgba(255,255,255,0.8)'" :size="16" />
          <text class="time-text">{{ currentTime }}</text>
        </view>
      </view>
    </view>

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

        <!-- 视频内容 (content_type: 3) -->
        <VideoPlayer
          ref="videoPlayer"
          v-else-if="currentContent.content_type === CONTENT_TYPES.VIDEO"
          :src="currentContent.content_url"
          :content-info="currentContent"
          :autoplay="true"
          :show-controls="false"
          :loop="false"
          :muted="false"
          :show-progress="false"
          :poster="currentContent.thumbnail"
          :show-info="true"
          :show-play-indicator="false"
          @play="handleContentLoad"
          @error="handleContentError"
          @ended="handleVideoEnded"
          @retry-failed="handleRetryFailed"
        />

        <!-- 直播流内容 (content_type: 4) -->
        <VideoPlayer
          ref="livePlayer"
          v-else-if="currentContent.content_type === CONTENT_TYPES.LIVE_STREAM"
          :src="currentContent.content_url"
          :content-info="currentContent"
          :autoplay="true"
          :show-controls="false"
          :loop="false"
          :muted="false"
          :show-progress="false"
          :poster="currentContent.thumbnail"
          :show-info="true"
          :show-play-indicator="false"
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
          @play="handleContentLoad"
          @error="handleContentError"
          @ended="handleAudioEnded"
          @retry-failed="handleRetryFailed"
        />

        <!-- 未知类型内容 -->
        <view v-else class="content-unknown">
          <view class="unknown-content-info">
            <SvgIcon name="warning" :color="'#FF9800'" :size="60" />
            <text class="unknown-content-text">不支持的内容类型: {{ currentContent.content_type }}</text>
            <text class="unknown-content-url">{{ currentContent.content_url }}</text>
          </view>
        </view>

        <!-- 内容标题覆盖层 -->
        <view class="content-title-overlay" v-if="currentContent.title && currentContent.content_type !== CONTENT_TYPES.AUDIO">
          <text class="content-title-text">{{ currentContent.title }}</text>
        </view>
      </view>

      <!-- 中央状态显示（当没有内容时显示） -->
      <view v-else class="center-status">
        <view class="status-icon-large" :class="mainStatusClass">
          <SvgIcon :name="mainStatusIconName" :color="mainStatusIconColor" :size="80" />
        </view>

        <view class="status-text-area">
          <text class="main-status-text">{{ mainStatusText }}</text>
          <text class="sub-status-text">{{ subStatusText }}</text>
        </view>

        <!-- 引导提示 -->
        <view class="guide-tips" v-if="showGuideTips">
          <text class="guide-text">{{ guideText }}</text>
          <view class="tips-list">
            <text class="tip-item" v-for="(tip, index) in tips" :key="index">{{ tip }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="action-buttons" v-if="showActionButtons">
          <button class="action-btn" @click="handleRefresh" v-if="isConnected">
            刷新内容
          </button>
        </view>
      </view>


    </view>

    <!-- 底部版权信息 -->
    <view class="footer" style="display: none;">
      <text class="copyright">© 2024 SmartScreen Team. All rights reserved.</text>
      <text class="version">版本 {{ appVersion }}</text>
    </view>

    <!-- 加载遮罩 -->
    <view class="loading-overlay" v-if="isLoading">
      <view class="loading-content">
        <text class="loading-icon">⟳</text>
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
import SvgIcon from '../../components/SvgIcon.vue'
import VideoPlayer from '../../components/VideoPlayer.vue'
import AudioPlayer from '../../components/AudioPlayer.vue'

const logger = Logger.createTaggedLogger('IndexPage')

export default {
  name: 'IndexPage',
  components: {
    SvgIcon,
    VideoPlayer,
    AudioPlayer
  },

  data() {
    return {
      currentTime: '',
      timeTimer: null,
      isLoading: false,
      loadingText: '正在初始化...',

      // 内容类型常量
      CONTENT_TYPES,

      // Duration计时器
      durationTimer: null,
      currentContentIndex: 0,
      contentList: [],

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
        return null
      }

      const data = contentData.data

      // 直接返回direct_content，最简单
      if (data.direct_content && data.direct_content.content_url) {
        return data.direct_content
      }

      // 如果没有direct_content，尝试primary_contents
      if (data.primary_contents && data.primary_contents.length > 0) {
        const content = data.primary_contents[0]
        if (content.content_url) {
          return content
        }
      }

      return null
    },


  },

  watch: {
    // 监听当前内容变化，确保旧内容被正确停止
    currentContent: {
      handler(newContent, oldContent) {
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
      
      // 计算下一个内容的索引（循环播放）
      this.currentContentIndex = (this.currentContentIndex + 1) % this.contentList.length
      const nextContent = this.contentList[this.currentContentIndex]
      
      if (nextContent) {
        logger.info('自动切换到下一个内容:', {
          from: this.currentContent?.title || '无',
          to: nextContent.title || '无',
          type: this.getContentTypeName(nextContent.content_type),
          index: this.currentContentIndex,
          totalCount: this.contentList.length
        })
        
        // 重新构造内容响应，将下一个内容设为主要内容
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
        
        this.$store.commit('websocket/SET_CONTENT_DATA', contentResponse)
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

        // 连接成功后立即获取内容
        setTimeout(async () => {
          try {
            await this.getContent()
            logger.info('自动获取内容成功')
          } catch (error) {
            logger.warn('自动获取内容失败:', error)
          }
        }, 1000)

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
      // 先清除之前的计时器
      this.clearDurationTimer()
      
      // 只在真正有内容变化时打印日志
      if (newContent !== oldContent) {
        logger.info('内容切换:', {
          from: oldContent?.title || '无',
          to: newContent?.title || '无',
          duration: newContent?.duration || 0
        })
      }

      // 如果有旧内容，先停止它
      if (oldContent) {
        this.stopCurrentContent(oldContent)
      }

      // 如果有新内容，开始播放
      if (newContent) {
        this.startNewContent(newContent)
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
      // 这里可以添加新内容开始前的准备工作
      // 比如重置状态、清理缓存等
      
      // 启动duration计时器（如果需要自动切换）
      this.startDurationTimer(content)
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
      // 视频播放结束后，如果是单个内容或duration为0，不需要特殊处理
      // 自动切换由duration计时器管理
    },

    // 处理音频播放结束
    handleAudioEnded() {
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
      logger.info('事件监听器已设置')
    },

    // 清理事件监听器
    cleanupEventListeners() {
      uni.$off('stopAllPlayers', this.handleStopAllPlayers)
      logger.info('事件监听器已清理')
    },

    // 处理停止所有播放器事件
    handleStopAllPlayers() {
      try {
        // 停止所有类型的内容
        this.stopVideoContent()
        this.stopAudioContent()
        this.stopWebContent()
        this.stopImageContent()
        
        // 清除duration计时器
        this.clearDurationTimer()
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
}

/* 顶部状态栏 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40rpx 60rpx;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.logo {
  width: 80rpx;
  height: 80rpx;
}

.app-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8rpx);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: all 0.3s ease;
  min-width: 80rpx;
}

.status-indicator.status-connected {
  background: rgba(76, 175, 80, 0.15);
  border-color: rgba(76, 175, 80, 0.3);
}

.status-indicator.status-disconnected {
  background: rgba(244, 67, 54, 0.15);
  border-color: rgba(244, 67, 54, 0.3);
}

.status-indicator.status-connecting {
  background: rgba(255, 193, 7, 0.15);
  border-color: rgba(255, 193, 7, 0.3);
}

.status-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24rpx;
  height: 24rpx;
}

.status-label {
  font-size: 22rpx;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
}

.time-display {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8rpx);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16rpx;
}

.time-text {
  font-size: 24rpx;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: rgba(255, 255, 255, 0.9);
}

/* 主内容区域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60rpx;
  position: relative;
}

.center-status {
  text-align: center;
  max-width: 800rpx;
}

.status-icon-large {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 40rpx;
  transition: all 0.3s ease;
}

.status-icon-large.status-active {
  background: rgba(76, 175, 80, 0.2);
  border: 3px solid rgba(76, 175, 80, 0.5);
  box-shadow: 0 0 30rpx rgba(76, 175, 80, 0.3);
}

.status-icon-large.status-inactive {
  background: rgba(255, 193, 7, 0.2);
  border: 3px solid rgba(255, 193, 7, 0.5);
  box-shadow: 0 0 30rpx rgba(255, 193, 7, 0.3);
}

.status-icon-large.status-disconnected {
  background: rgba(244, 67, 54, 0.2);
  border: 3px solid rgba(244, 67, 54, 0.5);
  box-shadow: 0 0 30rpx rgba(244, 67, 54, 0.3);
}

.status-icon-large.status-offline {
  background: rgba(158, 158, 158, 0.2);
  border: 3px solid rgba(158, 158, 158, 0.5);
  box-shadow: 0 0 30rpx rgba(158, 158, 158, 0.3);
}

/* 移除large-icon样式，现在使用SVG图标 */

.status-text-area {
  margin-bottom: 60rpx;
}

.main-status-text {
  font-size: 48rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  display: block;
}

.sub-status-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
}

/* 引导提示 */
.guide-tips {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 60rpx;
  backdrop-filter: blur(10px);
}

.guide-text {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 30rpx;
  display: block;
}

.tips-list {
  text-align: left;
}

.tip-item {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 15rpx;
  line-height: 1.5;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 30rpx;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  padding: 20rpx 40rpx;
  border-radius: 25rpx;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 500;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2rpx);
}

.action-btn.primary {
  background: rgba(33, 150, 243, 0.8);
  border-color: rgba(33, 150, 243, 1);
}

.action-btn.primary:hover {
  background: rgba(33, 150, 243, 1);
}

/* 调试信息 */
.debug-info {
  position: absolute;
  bottom: 20rpx;
  left: 20rpx;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 10rpx;
  padding: 20rpx;
  max-width: 400rpx;
  font-size: 20rpx;
}

.debug-title {
  font-weight: 600;
  margin-bottom: 10rpx;
  display: block;
  color: #4CAF50;
}

.debug-item {
  display: flex;
  margin-bottom: 5rpx;
}

.debug-key {
  color: #FFC107;
  margin-right: 10rpx;
  min-width: 120rpx;
}

.debug-value {
  color: #ffffff;
}

/* 底部版权信息 */
.footer {
  text-align: center;
  padding: 30rpx;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.copyright {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  display: block;
  margin-bottom: 10rpx;
}

.version {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.5);
  display: block;
}

/* 加载遮罩 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 60rpx;
  backdrop-filter: blur(10px);
}

.loading-icon {
  font-size: 60rpx;
  display: block;
  margin-bottom: 20rpx;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 28rpx;
  color: #ffffff;
  display: block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media screen and (max-width: 750px) {
  .top-bar {
    padding: 20rpx 30rpx;
  }

  .status-section {
    gap: 12rpx;
  }

  .status-indicator {
    padding: 6rpx 12rpx;
    min-width: 60rpx;
  }

  .status-label {
    font-size: 20rpx;
  }

  .time-display {
    padding: 6rpx 12rpx;
  }

  .time-text {
    font-size: 22rpx;
  }

  .main-content {
    padding: 40rpx 30rpx;
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }

  .action-btn {
    width: 200rpx;
  }
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
}

/* 网页内容 */
.content-webview {
  width: 100%;
  height: 100%;
}

/* 图片内容 */
.content-image {
  width: 100%;
  height: 100%;
}

/* 视频内容 */
.content-video {
  width: 100%;
  height: 100%;
}

/* 音频内容 */
.content-audio {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

.audio-player-ui {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 600rpx;
}

.audio-cover {
  width: 300rpx;
  height: 300rpx;
  border-radius: 20rpx;
  overflow: hidden;
  margin-bottom: 40rpx;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-thumbnail {
  width: 100%;
  height: 100%;
}

.audio-default-cover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
}

.audio-info {
  width: 100%;
}

.audio-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 20rpx;
  display: block;
}

.audio-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.audio-status {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
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

.unknown-content-info {
  text-align: center;
  max-width: 600rpx;
  padding: 40rpx;
}

.unknown-content-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FF9800;
  margin: 20rpx 0;
  display: block;
}

.unknown-content-url {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  word-break: break-all;
  display: block;
}

.content-title-overlay {
  position: absolute;
  bottom: 40rpx;
  left: 40rpx;
  right: 40rpx;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 20rpx 30rpx;
  border-radius: 10rpx;
}

.content-title-text {
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  text-align: center;
}
</style>
