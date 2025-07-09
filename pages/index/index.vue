<template>
  <view class="smart-screen-container">
    <!-- 顶部状态栏 -->
    <view class="top-bar">
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
      <!-- 中央状态显示 -->
      <view class="center-status">
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
          <button class="action-btn primary" @click="handleConnect" v-if="!isConnected">
            连接服务器
          </button>
          <button class="action-btn" @click="handleRefresh" v-if="isConnected">
            刷新内容
          </button>
          <button class="action-btn" @click="handleSettings">
            设置
          </button>
        </view>
      </view>

      <!-- 调试信息 -->
      <view class="debug-info" v-if="showDebugInfo">
        <text class="debug-title">调试信息</text>
        <view class="debug-item" v-for="(item, key) in debugData" :key="key">
          <text class="debug-key">{{ key }}:</text>
          <text class="debug-value">{{ item }}</text>
        </view>
      </view>
    </view>

    <!-- 底部版权信息 -->
    <view class="footer">
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
import SvgIcon from '../../components/SvgIcon.vue'

const logger = Logger.createTaggedLogger('IndexPage')

export default {
  name: 'IndexPage',
  components: {
    SvgIcon
  },

  data() {
    return {
      currentTime: '',
      timeTimer: null,
      isLoading: false,
      loadingText: '正在初始化...',

      // 引导提示
      tips: [
        '1. 确保设备已连接到网络',
        '2. 在设置中配置服务器地址',
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
      'getNetworkStatus',
      'isDeviceOnline'
    ]),
    ...mapGetters('websocket', [
      'getConnectionStatus'
    ]),
    ...mapGetters('settings', [
      'getDisplayConfig'
    ]),

    // 应用版本
    appVersion() {
      return this.getAppVersion
    },

    // 网络状态
    networkStatusClass() {
      const status = this.getNetworkStatus
      return {
        'status-connected': status.isConnected,
        'status-disconnected': !status.isConnected
      }
    },

    networkIconName() {
      const status = this.getNetworkStatus
      if (!status.isConnected) return 'network'

      switch (status.type) {
        case 'wifi': return 'wifi'
        case '4g':
        case '5g': return 'cellular'
        case 'ethernet': return 'ethernet'
        default: return 'network'
      }
    },

    networkIconColor() {
      const status = this.getNetworkStatus
      return status.isConnected ? '#4CAF50' : '#F44336'
    },

    networkStatusText() {
      const status = this.getNetworkStatus
      if (!status.isConnected) return '无网络'

      const typeMap = {
        'wifi': 'WiFi',
        '4g': '4G',
        '5g': '5G',
        'ethernet': '以太网'
      }
      return typeMap[status.type] || status.type
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
      if (!this.getConnectionStatus.isConnected) return '请检查服务器配置'
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

    // 是否显示调试信息
    showDebugInfo() {
      return this.getDisplayConfig.showDebugInfo
    },

    // 调试数据
    debugData() {
      const deviceStatus = this.getDeviceStatus
      const wsStatus = this.getConnectionStatus

      return {
        '设备状态': deviceStatus.status === 1 ? '在线' : '离线',
        '网络类型': this.networkStatusText,
        'WebSocket': this.websocketStatusText,
        '注册状态': wsStatus.isRegistered ? '已注册' : '未注册',
        '激活状态': wsStatus.isActive ? '已激活' : '未激活',
        '重连次数': wsStatus.reconnectAttempts
      }
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

      // 自动连接WebSocket
      await this.autoConnectWebSocket()

      // 开始时间更新
      this.startTimeUpdate()

      // 设置按键监听
      this.setupKeyListener()

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

    // 清理按键监听器
    globalKeyHandler.removeAllListeners()
    logger.info('页面卸载，已清理按键监听器')
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

    // 自动连接WebSocket
    async autoConnectWebSocket() {
      try {
        logger.info('开始自动连接WebSocket')
        this.loadingText = '正在连接服务器...'

        // 检查网络状态
        if (!this.isDeviceOnline) {
          logger.warn('设备离线，跳过WebSocket连接')
          return
        }

        // 连接WebSocket
        await this.connect()

        logger.info('WebSocket自动连接成功')

        // 连接成功后，等待一下再尝试获取内容
        setTimeout(async () => {
          try {
            const status = this.getConnectionStatus
            if (status.isConnected && status.isRegistered && status.isActive) {
              logger.info('设备已激活，自动获取内容')
              await this.getContent()
            } else {
              logger.info('设备未激活或未注册，等待激活')
            }
          } catch (error) {
            logger.warn('自动获取内容失败:', error)
          }
        }, 2000)

      } catch (error) {
        logger.error('WebSocket自动连接失败:', error)
        // 自动连接失败不显示错误提示，避免干扰用户
        // 用户可以手动点击连接按钮
      }
    },

    // 处理手动连接
    async handleConnect() {
      try {
        logger.info('用户手动连接WebSocket')
        this.isLoading = true
        this.loadingText = '正在连接服务器...'

        await this.connect()

        uni.showToast({
          title: '连接成功',
          icon: 'success'
        })

        // 连接成功后尝试获取内容
        setTimeout(async () => {
          try {
            await this.getContent()
          } catch (error) {
            logger.warn('获取内容失败:', error)
          }
        }, 1000)

      } catch (error) {
        logger.error('手动连接失败:', error)
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

    // 处理获取内容
    async handleGetContent() {
      try {
        logger.info('用户点击获取内容按钮')
        await this.getContent()

        uni.showToast({
          title: '正在获取内容',
          icon: 'loading',
          duration: 1500
        })
      } catch (error) {
        logger.error('获取内容失败:', error)
        uni.showToast({
          title: '获取内容失败',
          icon: 'error'
        })
      }
    },

    // 处理设置
    handleSettings() {
      this.changePage('settings')
      uni.navigateTo({
        url: '/pages/settings/settings'
      })
    },

    // 设置按键监听
    setupKeyListener() {
      // 设置按键事件处理
      globalKeyHandler.addListener(KEYS.BACK, () => {
        this.handleBack()
      })

      globalKeyHandler.addListener(KEYS.MENU, () => {
        this.handleSettings()
      })

      globalKeyHandler.addListener(KEYS.CENTER, () => {
        if (!this.isConnected) {
          this.handleConnect()
        } else {
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
</style>
