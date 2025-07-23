<template>
  <view class="audio-player-container">

    <!-- 音频播放界面 -->
    <view class="audio-player-ui">
      <!-- 背景 -->
      <view class="audio-background">
        <image 
          v-if="backgroundImage" 
          :src="backgroundImage" 
          class="background-image"
          mode="aspectFill"
        />
        <view class="background-overlay"></view>
      </view>

      <!-- 主要内容区域 -->
      <view class="audio-main-content">
        <!-- 封面图片 -->
        <view class="audio-cover-container">
          <view class="audio-cover" :class="{ 'rotating': isPlaying && !hasError }">
            <image 
              v-if="coverImage" 
              :src="coverImage" 
              class="cover-image"
              mode="aspectFit"
              @error="handleCoverError"
            />
            <view v-else class="default-cover">
              <SvgIcon name="music" :color="'#ffffff'" :size="80" />
            </view>
          </view>
          
          <!-- 播放状态指示器 -->
          <view class="play-status-indicator" :class="playStatusClass">
            <SvgIcon :name="playStatusIcon" :color="'#ffffff'" :size="24" />
          </view>
        </view>

        <!-- 音频信息 -->
        <view class="audio-info">
          <text class="audio-title">{{ displayTitle }}</text>
          <text v-if="contentInfo.duration > 0" class="audio-duration">
            时长: {{ formatDuration(contentInfo.duration) }}
          </text>
          <view class="audio-progress" v-if="showProgress">
            <text class="current-time">{{ formatTime(currentTime) }}</text>
            <view class="progress-bar">
              <view class="progress-track"></view>
              <view class="progress-fill" :style="{ width: progressPercentage + '%' }"></view>
            </view>
            <text class="total-time">{{ formatTime(duration) }}</text>
          </view>
        </view>

        <!-- 控制按钮 (可选) -->
        <view v-if="showControls" class="audio-controls">
          <button class="control-btn" @click="handlePlayPause">
            <SvgIcon :name="isPlaying ? 'pause' : 'play'" :color="'#ffffff'" :size="20" />
          </button>
          <button class="control-btn" @click="handleStop">
            <SvgIcon name="stop" :color="'#ffffff'" :size="20" />
          </button>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="isLoading" class="loading-overlay">
        <view class="loading-content">
          <view class="loading-spinner"></view>
          <text class="loading-text">{{ loadingText }}</text>
        </view>
      </view>

      <!-- 错误状态 -->
      <view v-if="hasError" class="error-overlay">
        <view class="error-content">
          <SvgIcon name="warning" :color="'#F44336'" :size="60" />
          <text class="error-title">音频播放失败</text>
          <text class="error-message">{{ errorMessage }}</text>
          <button class="retry-btn" @click="handleRetry">重试</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { Logger } from '../common/utils/logger.js'
import { CONTENT_TYPES } from '../common/constants/constants.js'
import SvgIcon from './SvgIcon.vue'

const logger = Logger.createTaggedLogger('AudioPlayer')

export default {
  name: 'AudioPlayer',
  components: {
    SvgIcon
  },

  props: {
    // 音频源地址
    src: {
      type: String,
      required: true
    },
    // 内容信息
    contentInfo: {
      type: Object,
      default: () => ({})
    },
    // 是否自动播放
    autoplay: {
      type: Boolean,
      default: true
    },
    // 是否循环播放
    loop: {
      type: Boolean,
      default: false
    },
    // 是否显示控制按钮
    showControls: {
      type: Boolean,
      default: false
    },
    // 是否显示进度条
    showProgress: {
      type: Boolean,
      default: true
    },
    // 封面图片
    coverImage: {
      type: String,
      default: ''
    },
    // 背景图片
    backgroundImage: {
      type: String,
      default: ''
    }
  },

  data() {
    return {
      audioContext: null,
      isLoading: true,
      loadingText: '正在加载音频...',
      hasError: false,
      errorMessage: '',
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      retryCount: 0,
      maxRetries: 3,
      coverLoadError: false,
      timeUpdateTimer: null
    }
  },

  computed: {
    // 显示标题
    displayTitle() {
      return this.contentInfo.title || '音频播放中'
    },

    // 播放状态图标
    playStatusIcon() {
      if (this.hasError) return 'warning'
      if (this.isLoading) return 'loading'
      return this.isPlaying ? 'pause' : 'play'
    },

    // 播放状态样式类
    playStatusClass() {
      return {
        'playing': this.isPlaying && !this.hasError,
        'error': this.hasError,
        'loading': this.isLoading
      }
    },

    // 进度百分比
    progressPercentage() {
      if (!this.duration || this.duration <= 0) return 0
      return Math.min(100, (this.currentTime / this.duration) * 100)
    },

    // 实际使用的封面图片
    actualCoverImage() {
      if (this.coverLoadError) return ''
      return this.coverImage || this.contentInfo.thumbnail || ''
    },

    // 实际使用的背景图片
    actualBackgroundImage() {
      return this.backgroundImage || this.actualCoverImage
    }
  },

  watch: {
    // 监听音频源变化，重新初始化播放器
    src: {
      handler(newSrc, oldSrc) {
        if (newSrc !== oldSrc) {
          logger.info('🎵 音频源变化:', { oldSrc, newSrc })
          this.handleSrcChange(newSrc, oldSrc)
        }
      },
      immediate: false
    }
  },

  mounted() {
    logger.info('🎵 音频播放器组件已挂载:', {
      src: this.src,
      contentInfo: this.contentInfo,
      autoplay: this.autoplay
    })

    // 使用nextTick确保DOM完全初始化后再初始化音频上下文
    this.$nextTick(() => {
      this.initAudioContext()
    })

    // 监听停止播放事件
    uni.$on('stopAudioPlayers', this.handleStopEvent)
    uni.$on('stopAllPlayers', this.handleStopEvent)
  },

  beforeDestroy() {
    this.cleanup()
    
    // 移除事件监听器
    uni.$off('stopAudioPlayers', this.handleStopEvent)
    uni.$off('stopAllPlayers', this.handleStopEvent)
  },

  methods: {
    // 处理音频源变化
    handleSrcChange(newSrc, oldSrc) {
      if (oldSrc) {
        logger.info('🎵 停止旧音频:', oldSrc)
        this.cleanup()
      }

      if (newSrc) {
        logger.info('🎵 开始新音频:', newSrc)
        this.$nextTick(() => {
          this.initAudioContext()
        })
      }
    },

    // 初始化音频上下文
    initAudioContext() {
      try {
        // 重置状态
        this.isLoading = true
        this.hasError = false
        this.retryCount = 0
        this.loadingText = '正在加载音频...'

        // 创建音频上下文
        this.audioContext = uni.createInnerAudioContext && uni.createInnerAudioContext()

        if (!this.audioContext) {
          throw new Error('无法创建音频上下文')
        }

        // 设置音频源
        this.audioContext.src = this.src
        this.audioContext.autoplay = this.autoplay
        this.audioContext.loop = this.loop

        // 绑定事件监听器
        this.audioContext.onPlay(() => {
          this.handlePlay()
        })

        this.audioContext.onPause(() => {
          this.handlePause()
        })

        this.audioContext.onStop(() => {
          this.handleAudioStopped()
        })

        this.audioContext.onEnded(() => {
          this.handleEnded()
        })

        this.audioContext.onError((error) => {
          this.handleError(error)
        })

        this.audioContext.onCanplay(() => {
          this.handleCanPlay()
        })

        this.audioContext.onWaiting(() => {
          this.handleWaiting()
        })

        // 监听音频加载状态
        this.audioContext.onLoadStart = () => {
          this.handleLoadStart()
        }

        // 开始时间更新定时器
        this.startTimeUpdate()

        // 如果是自动播放模式，确保播放开始
        if (this.autoplay) {
          // 延迟一下确保音频上下文完全初始化
          setTimeout(() => {
            if (this.audioContext && !this.isPlaying && !this.hasError) {
              try {
                this.audioContext.play()
                logger.info('🎵 初始化后触发自动播放')
              } catch (error) {
                logger.warn('🎵 初始化后自动播放失败:', error)
              }
            }
          }, 500)
        }

        logger.info('🎵 音频上下文初始化成功')

      } catch (error) {
        logger.error('🎵 音频上下文初始化失败:', error)
        this.handleError(error)
      }
    },

    // 开始时间更新
    startTimeUpdate() {
      if (this.timeUpdateTimer) {
        clearInterval(this.timeUpdateTimer)
      }

      this.timeUpdateTimer = setInterval(() => {
        if (this.audioContext && this.isPlaying) {
          this.currentTime = this.audioContext.currentTime || 0
          this.duration = this.audioContext.duration || 0
          this.$emit('timeupdate', {
            detail: {
              currentTime: this.currentTime,
              duration: this.duration
            }
          })
        }
      }, 1000)
    },

    // 停止时间更新
    stopTimeUpdate() {
      if (this.timeUpdateTimer) {
        clearInterval(this.timeUpdateTimer)
        this.timeUpdateTimer = null
      }
    },

    // 处理加载开始
    handleLoadStart() {
      logger.info('🎵 音频开始加载')
      this.isLoading = true
      this.hasError = false
      this.loadingText = '正在加载音频...'
      this.$emit('loadstart')
    },

    // 处理数据加载完成
    handleLoadedData() {
      logger.info('🎵 音频数据加载完成')
      this.isLoading = false
      this.$emit('loadeddata')
    },

    // 处理可以播放
    handleCanPlay() {
      logger.info('🎵 音频可以播放')
      this.isLoading = false
      
      // 如果设置了自动播放且当前没有播放，则手动触发播放
      if (this.autoplay && !this.isPlaying && this.audioContext) {
        this.$nextTick(() => {
          try {
            this.audioContext.play()
            logger.info('🎵 触发自动播放')
          } catch (error) {
            logger.warn('🎵 自动播放失败:', error)
          }
        })
      }
      
      this.$emit('canplay')
    },

    // 处理播放开始
    handlePlay() {
      logger.info('🎵 音频开始播放')
      this.isPlaying = true
      this.hasError = false
      this.$emit('play')
    },

    // 处理播放暂停
    handlePause() {
      logger.info('🎵 音频暂停播放')
      this.isPlaying = false
      this.$emit('pause')
    },

    // 处理播放结束
    handleEnded() {
      logger.info('🎵 音频播放结束')
      this.isPlaying = false
      this.$emit('ended')
    },

    // 处理播放错误
    handleError(event) {
      logger.error('🎵 音频播放错误:', event)
      this.isLoading = false
      this.hasError = true
      this.isPlaying = false
      this.errorMessage = this.getErrorMessage(event)
      this.$emit('error', event)
    },

    // 处理时间更新
    handleTimeUpdate(event) {
      if (event && event.detail) {
        this.currentTime = event.detail.currentTime || 0
        this.duration = event.detail.duration || this.duration
      }
      this.$emit('timeupdate', event)
    },

    // 处理等待缓冲
    handleWaiting() {
      logger.debug('🎵 音频等待缓冲')
      this.loadingText = '正在缓冲...'
      this.$emit('waiting')
    },

    // 处理封面图片加载错误
    handleCoverError() {
      logger.warn('🎵 封面图片加载失败')
      this.coverLoadError = true
    },

    // 处理播放/暂停按钮
    handlePlayPause() {
      if (this.audioContext) {
        if (this.isPlaying) {
          this.audioContext.pause()
        } else {
          this.audioContext.play()
        }
      }
    },

    // 处理停止按钮
    handleStop() {
      if (this.audioContext) {
        this.audioContext.stop()
      }
      this.isPlaying = false
      this.currentTime = 0
    },

    // 处理音频停止事件（避免递归调用）
    handleAudioStopped() {
      this.isPlaying = false
      this.currentTime = 0
    },

    // 重试播放
    handleRetry() {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++
        logger.info(`🎵 重试播放音频 (${this.retryCount}/${this.maxRetries})`)
        this.hasError = false
        this.isLoading = true
        this.loadingText = '正在重试...'

        // 重新初始化音频上下文
        this.cleanup()
        this.$nextTick(() => {
          this.initAudioContext()
        })
      } else {
        logger.error('🎵 音频重试次数已达上限')
        this.$emit('retry-failed')
      }
    },

    // 获取错误信息
    getErrorMessage(event) {
      const errorCode = event?.detail?.errMsg || event?.detail?.code || 'unknown'
      const errorMap = {
        'network': '网络连接错误',
        'decode': '音频解码错误',
        'src_not_supported': '不支持的音频格式',
        'unknown': '未知错误'
      }
      
      return errorMap[errorCode] || `播放错误: ${errorCode}`
    },

    // 格式化时长
    formatDuration(seconds) {
      if (!seconds || seconds <= 0) return '未知'
      return this.formatTime(seconds)
    },

    // 格式化时间
    formatTime(seconds) {
      if (!seconds || seconds <= 0) return '00:00'
      
      const minutes = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    },

    // 处理停止事件
    handleStopEvent() {
      if (this.audioContext) {
        this.stop()
      }
    },

    // 清理资源
    cleanup() {
      // 防止重复清理
      if (!this.audioContext) {
        return
      }

      try {
        // 停止时间更新
        this.stopTimeUpdate()

        // 停止并销毁音频上下文
        if (this.audioContext) {
          this.audioContext.stop()
          this.audioContext.destroy()
          this.audioContext = null
        }

        // 重置状态
        this.isPlaying = false
        this.isLoading = false
        this.hasError = false
        this.currentTime = 0
        this.duration = 0
        this.retryCount = 0

      } catch (error) {
        logger.warn('清理音频上下文时出错:', error)
      }
    },

    // 公共方法：播放
    play() {
      if (this.audioContext && typeof this.audioContext.play === 'function') {
        this.audioContext.play()
      }
    },

    // 公共方法：暂停
    pause() {
      if (this.audioContext && typeof this.audioContext.pause === 'function') {
        this.audioContext.pause()
      }
    },

    // 公共方法：停止
    stop() {
      if (this.audioContext && typeof this.audioContext.stop === 'function') {
        try {
          this.audioContext.stop()
          this.isPlaying = false
          this.currentTime = 0
        } catch (error) {
          logger.warn('停止音频播放时出错:', error)
        }
      }
    },

    // 公共方法：跳转到指定时间
    seek(time) {
      if (this.audioContext && typeof this.audioContext.seek === 'function') {
        this.audioContext.seek(time)
      }
    }
  }
}
</script>

<style scoped>
.audio-player-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.audio-player-ui {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 背景 */
.audio-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.background-image {
  width: 100%;
  height: 100%;
  filter: blur(20rpx);
  opacity: 0.3;
}

.background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, 
    rgba(30, 60, 114, 0.8) 0%, 
    rgba(42, 82, 152, 0.8) 100%);
}

/* 主要内容 */
.audio-main-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 600rpx;
  padding: 40rpx;
}

/* 封面容器 */
.audio-cover-container {
  position: relative;
  margin-bottom: 40rpx;
}

.audio-cover {
  width: 300rpx;
  height: 300rpx;
  border-radius: 20rpx;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}

.audio-cover.rotating {
  animation: rotate 10s linear infinite;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.default-cover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
}

/* 播放状态指示器 */
.play-status-indicator {
  position: absolute;
  bottom: -10rpx;
  right: -10rpx;
  width: 60rpx;
  height: 60rpx;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #ffffff;
}

.play-status-indicator.playing {
  background-color: #4CAF50;
}

.play-status-indicator.error {
  background-color: #F44336;
}

.play-status-indicator.loading {
  background-color: #FF9800;
}

/* 音频信息 */
.audio-info {
  width: 100%;
  margin-bottom: 30rpx;
}

.audio-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 20rpx;
  display: block;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
}

.audio-duration {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-bottom: 20rpx;
}

/* 进度条 */
.audio-progress {
  display: flex;
  align-items: center;
  gap: 20rpx;
  width: 100%;
}

.current-time,
.total-time {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  font-family: monospace;
  min-width: 80rpx;
}

.progress-bar {
  flex: 1;
  height: 6rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3rpx;
  position: relative;
  overflow: hidden;
}

.progress-track {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.1);
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  border-radius: 3rpx;
  transition: width 0.3s ease;
}

/* 控制按钮 */
.audio-controls {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.control-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.control-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

/* 加载和错误覆盖层 */
.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-content,
.error-content {
  text-align: center;
  max-width: 400rpx;
  padding: 40rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top: 4rpx solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20rpx;
}

.loading-text {
  color: #ffffff;
  font-size: 28rpx;
  display: block;
}

.error-title {
  color: #F44336;
  font-size: 36rpx;
  font-weight: 600;
  margin: 20rpx 0;
  display: block;
}

.error-message {
  color: rgba(255, 255, 255, 0.8);
  font-size: 28rpx;
  margin-bottom: 40rpx;
  display: block;
}

.retry-btn {
  background-color: #2196F3;
  color: #ffffff;
  border: none;
  border-radius: 25rpx;
  padding: 20rpx 40rpx;
  font-size: 28rpx;
  font-weight: 500;
}

/* 动画 */
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
