<template>
  <view class="video-player-container">
    <!-- 视频播放器 -->
    <video
      :id="videoId"
      :src="src"
      class="video-player"
      :autoplay="autoplay"
      :controls="showControls"
      :loop="loop"
      :muted="muted"
      :show-center-play-btn="false"
      :show-fullscreen-btn="false"
      :show-play-btn="false"
      :show-progress="showProgress"
      :enable-progress-gesture="false"
      :poster="poster"
      :object-fit="objectFit"
      @loadstart="handleLoadStart"
      @loadeddata="handleLoadedData"
      @loadedmetadata="handleLoadedMetadata"
      @canplay="handleCanPlay"
      @play="handlePlay"
      @pause="handlePause"
      @ended="handleEnded"
      @error="handleError"
      @timeupdate="handleTimeUpdate"
      @waiting="handleWaiting"
      @progress="handleProgress"
    />

    <!-- 加载状态覆盖层 -->
    <view v-if="isLoading" class="loading-overlay">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-text">{{ loadingText }}</text>
      </view>
    </view>

    <!-- 错误状态覆盖层 -->
    <view v-if="hasError" class="error-overlay">
      <view class="error-content">
        <SvgIcon name="warning" :color="'#F44336'" :size="60" />
        <text class="error-title">视频加载失败</text>
        <text class="error-message">{{ errorMessage }}</text>
        <button class="retry-btn" @click="handleRetry">重试</button>
      </view>
    </view>

    <!-- 视频信息覆盖层 -->
    <view v-if="showInfo && contentInfo" class="info-overlay">
      <view class="info-content">
        <text class="video-title">{{ contentInfo.title }}</text>
        <text v-if="contentInfo.duration > 0" class="video-duration">
          时长: {{ formatDuration(contentInfo.duration) }}
        </text>
      </view>
    </view>

    <!-- 播放状态指示器 -->
    <view v-if="showPlayIndicator" class="play-indicator">
      <SvgIcon 
        :name="isPlaying ? 'pause' : 'play'" 
        :color="'rgba(255,255,255,0.8)'" 
        :size="40" 
      />
    </view>
  </view>
</template>

<script>
import { Logger } from '../common/utils/logger.js'
import { CONTENT_TYPES } from '../common/constants/constants.js'
import SvgIcon from './SvgIcon.vue'

const logger = Logger.createTaggedLogger('VideoPlayer')

export default {
  name: 'VideoPlayer',
  components: {
    SvgIcon
  },

  props: {
    // 视频源地址
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
    // 是否显示控制栏
    showControls: {
      type: Boolean,
      default: false
    },
    // 是否循环播放
    loop: {
      type: Boolean,
      default: false
    },
    // 是否静音
    muted: {
      type: Boolean,
      default: false
    },
    // 是否显示进度条
    showProgress: {
      type: Boolean,
      default: false
    },
    // 封面图
    poster: {
      type: String,
      default: ''
    },
    // 视频适配模式
    objectFit: {
      type: String,
      default: 'contain' // contain, fill, cover
    },
    // 是否显示信息覆盖层
    showInfo: {
      type: Boolean,
      default: true
    },
    // 是否显示播放指示器
    showPlayIndicator: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      videoId: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isLoading: true,
      loadingText: '正在加载视频...',
      hasError: false,
      errorMessage: '',
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      retryCount: 0,
      maxRetries: 3
    }
  },

  watch: {
    // 监听视频源变化，停止旧视频
    src: {
      handler(newSrc, oldSrc) {
        if (newSrc !== oldSrc && oldSrc) {
          logger.info('🎬 视频源变化:', { oldSrc, newSrc })
          this.handleSrcChange(newSrc, oldSrc)
        }
      },
      immediate: false
    }
  },

  mounted() {
    logger.info('🎬 视频播放器组件已挂载:', {
      src: this.src,
      contentInfo: this.contentInfo,
      autoplay: this.autoplay
    })

    // 监听停止播放事件
    uni.$on('stopVideoPlayers', this.handleStopEvent)
    uni.$on('stopAllPlayers', this.handleStopEvent)
  },

  beforeDestroy() {
    this.cleanup()
    
    // 移除事件监听器
    uni.$off('stopVideoPlayers', this.handleStopEvent)
    uni.$off('stopAllPlayers', this.handleStopEvent)
  },

  methods: {
    // 处理视频源变化
    handleSrcChange(newSrc, oldSrc) {
      if (oldSrc) {
        logger.info('🎬 停止旧视频:', oldSrc)
        this.stop()
      }

      if (newSrc) {
        logger.info('🎬 准备播放新视频:', newSrc)
        // 重置状态
        this.isLoading = true
        this.hasError = false
        this.retryCount = 0
      }
    },

    // 处理加载开始
    handleLoadStart() {
      logger.info('🎬 视频开始加载')
      this.isLoading = true
      this.hasError = false
      this.loadingText = '正在加载视频...'
      this.$emit('loadstart')
    },

    // 处理数据加载完成
    handleLoadedData() {
      logger.info('🎬 视频数据加载完成')
      // 数据加载完成但还不能播放，保持加载状态
      this.loadingText = '准备播放...'
      this.$emit('loadeddata')
    },

    // 处理元数据加载完成
    handleLoadedMetadata(event) {
      logger.info('🎬 视频元数据加载完成')
      this.duration = event.detail.duration || 0
      this.loadingText = '准备播放...'
      this.$emit('loadedmetadata', event)
    },

    // 处理可以播放
    handleCanPlay() {
      logger.info('🎬 视频可以播放')
      this.isLoading = false
      this.$emit('canplay')
    },

    // 处理播放开始
    handlePlay() {
      logger.info('🎬 视频开始播放')
      this.isPlaying = true
      this.hasError = false
      this.$emit('play')
    },

    // 处理播放暂停
    handlePause() {
      logger.info('🎬 视频暂停播放')
      this.isPlaying = false
      this.$emit('pause')
    },

    // 处理播放结束
    handleEnded() {
      logger.info('🎬 视频播放结束')
      this.isPlaying = false
      this.$emit('ended')
    },

    // 处理播放错误
    handleError(event) {
      logger.error('🎬 视频播放错误:', event)
      this.isLoading = false
      this.hasError = true
      this.isPlaying = false
      this.errorMessage = this.getErrorMessage(event)
      this.$emit('error', event)
    },

    // 处理时间更新
    handleTimeUpdate(event) {
      this.currentTime = event.detail.currentTime || 0
      this.$emit('timeupdate', event)
    },

    // 处理等待缓冲
    handleWaiting() {
      logger.debug('🎬 视频等待缓冲')
      this.loadingText = '正在缓冲...'
      this.$emit('waiting')
    },

    // 处理缓冲进度
    handleProgress(event) {
      this.buffered = event.detail.buffered || 0
      this.$emit('progress', event)
    },

    // 重试播放
    handleRetry() {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++
        logger.info(`🎬 重试播放视频 (${this.retryCount}/${this.maxRetries})`)
        this.hasError = false
        this.isLoading = true
        this.loadingText = '正在重试...'
        
        // 重新设置视频源
        this.$nextTick(() => {
          const videoContext = uni.createVideoContext(this.videoId, this)
          if (videoContext) {
            videoContext.play()
          }
        })
      } else {
        logger.error('🎬 视频重试次数已达上限')
        this.$emit('retry-failed')
      }
    },

    // 获取错误信息
    getErrorMessage(event) {
      const errorCode = event?.detail?.errMsg || event?.detail?.code || 'unknown'
      const errorMap = {
        'network': '网络连接错误',
        'decode': '视频解码错误', 
        'src_not_supported': '不支持的视频格式',
        'unknown': '未知错误'
      }
      
      return errorMap[errorCode] || `播放错误: ${errorCode}`
    },

    // 格式化时长
    formatDuration(seconds) {
      if (!seconds || seconds <= 0) return '未知'
      
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`
      }
    },

    // 处理停止事件
    handleStopEvent() {
      logger.info('🎬 收到停止播放事件')
      this.stop()
      this.cleanup()
    },

    // 清理资源
    cleanup() {
      logger.info('🎬 清理视频播放器资源')

      // 停止视频播放
      this.stop()

      // 重置状态
      this.isPlaying = false
      this.isLoading = false
      this.hasError = false
      this.currentTime = 0
      this.duration = 0
      this.retryCount = 0

      logger.info('🎬 视频播放器资源清理完成')
    },

    // 公共方法：播放
    play() {
      const videoContext = uni.createVideoContext(this.videoId, this)
      if (videoContext) {
        videoContext.play()
      }
    },

    // 公共方法：暂停
    pause() {
      const videoContext = uni.createVideoContext(this.videoId, this)
      if (videoContext) {
        videoContext.pause()
      }
    },

    // 公共方法：停止
    stop() {
      try {
        const videoContext = uni.createVideoContext(this.videoId, this)
        if (videoContext) {
          videoContext.stop()
          logger.info('🎬 视频播放已停止')
        }
      } catch (error) {
        logger.warn('🎬 停止视频播放时出错:', error)
      }

      // 更新状态
      this.isPlaying = false
      this.currentTime = 0
    },

    // 公共方法：跳转到指定时间
    seek(time) {
      const videoContext = uni.createVideoContext(this.videoId, this)
      if (videoContext) {
        videoContext.seek(time)
      }
    }
  }
}
</script>

<style scoped>
.video-player-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #000;
}

.video-player {
  width: 100%;
  height: 100%;
}

/* 加载覆盖层 */
.loading-overlay {
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

.loading-content {
  text-align: center;
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

/* 错误覆盖层 */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.error-content {
  text-align: center;
  max-width: 600rpx;
  padding: 40rpx;
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

/* 信息覆盖层 */
.info-overlay {
  position: absolute;
  bottom: 40rpx;
  left: 40rpx;
  right: 40rpx;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 10rpx;
  padding: 20rpx 30rpx;
  z-index: 5;
}

.info-content {
  text-align: center;
}

.video-title {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 500;
  display: block;
  margin-bottom: 10rpx;
}

.video-duration {
  color: rgba(255, 255, 255, 0.8);
  font-size: 24rpx;
  display: block;
}

/* 播放指示器 */
.play-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100rpx;
  height: 100rpx;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15;
  opacity: 0;
  animation: fadeInOut 2s ease-in-out;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
}
</style>
