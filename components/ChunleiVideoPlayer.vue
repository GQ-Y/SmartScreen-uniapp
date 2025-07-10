<template>
  <view class="chunlei-video-player">
    <video
      ref="videoPlayer"
      id="videoPlayer"
      :src="src"
      :poster="poster"
      :autoplay="autoplay"
      :loop="true"
      :muted="true"
      :controls="showControls"
      :show-progress="showProgress"
      :show-fullscreen-btn="true"
      :show-play-btn="true"
      :show-center-play-btn="true"
      :enable-progress-gesture="true"
      :object-fit="objectFit"
      :direction="orientation ? 90 : 0"
      :initial-time="0"
      :duration="duration"
      :danmu-list="[]"
      :enable-danmu="false"
      :page-gesture="false"
      :show-mute-btn="false"
      :title="title"
      :play-btn-position="'center'"
      :enable-play-gesture="true"
      :auto-pause-if-navigate="true"
      :auto-pause-if-open-native="true"
      :vslide-gesture="false"
      :vslide-gesture-in-fullscreen="true"
      ad-unit-id=""
      poster-for-crawler=""
      :codec="'auto'"
      :http-cache="true"
      :play-strategy="0"
      :header="{}"
      class="video-player"
      @play="handlePlay"
      @pause="handlePause"
      @ended="handleEnded"
      @error="handleError"
      @timeupdate="handleTimeUpdate"
      @loadstart="handleLoadStart"
      @loadeddata="handleLoadedData"
      @loadedmetadata="handleLoadedMetadata"
      @canplay="handleCanPlay"
      @canplaythrough="handleCanPlayThrough"
      @waiting="handleWaiting"
      @seeking="handleSeeking"
      @seeked="handleSeeked"
      @fullscreenchange="handleFullscreenChange"
      @controlstoggle="handleControlsToggle"
    >
      <!-- 自定义控制层 -->
      <cover-view v-if="showCustomControls" class="custom-controls">
        <!-- 播放/暂停按钮 -->
        <cover-view class="play-pause-btn" @click="togglePlayPause">
          <text class="control-icon">{{ isPlaying ? '⏸️' : '▶️' }}</text>
        </cover-view>
        
        <!-- 进度条 -->
        <cover-view class="progress-container" v-if="showProgress">
          <cover-view class="progress-bar">
            <cover-view 
              class="progress-fill" 
              :style="{ width: progressPercentage + '%' }"
            ></cover-view>
          </cover-view>
          <text class="time-display">{{ formatTime(currentTime) }}/{{ formatTime(duration) }}</text>
        </cover-view>
        
        <!-- 全屏按钮 -->
        <cover-view class="fullscreen-btn" @click="toggleFullscreen">
          <text class="control-icon">⛶</text>
        </cover-view>
      </cover-view>
      
      <!-- 加载指示器 -->
      <cover-view v-if="isLoading" class="loading-indicator">
        <text class="loading-text">加载中...</text>
      </cover-view>
      
      <!-- 错误提示 -->
      <cover-view v-if="hasError" class="error-indicator">
        <text class="error-text">播放出错</text>
        <text class="retry-btn" @click="handleRetry">重试</text>
      </cover-view>
      
      <!-- 缓冲指示器 -->
      <cover-view v-if="isBuffering && !isLoading" class="buffering-indicator">
        <text class="buffering-text">缓冲中...</text>
      </cover-view>
      

    </video>
    
    <!-- 调试信息覆盖层 -->
    <view v-if="showDebugInfo" class="debug-overlay">
      <text class="debug-title">播放器状态</text>
      <text class="debug-item">视频源: {{ src }}</text>
      <text class="debug-item">播放状态: {{ isPlaying ? '播放中' : '暂停' }}</text>
      <text class="debug-item">加载状态: {{ isLoading ? '加载中' : '已加载' }}</text>
      <text class="debug-item">错误状态: {{ hasError ? '有错误' : '正常' }}</text>
      <text class="debug-item">播放器就绪: {{ playerReady ? '是' : '否' }}</text>
      <text class="debug-item">当前时间: {{ currentTime.toFixed(2) }}s</text>
      <text class="debug-item">总时长: {{ duration.toFixed(2) }}s</text>
      <text class="debug-item">缓冲状态: {{ isBuffering ? '缓冲中' : '正常' }}</text>
      <text class="debug-item">重试次数: {{ retryCount }}/{{ maxRetryCount }}</text>
      <text class="debug-item">自动播放: {{ autoplay ? '是' : '否' }}</text>
    </view>
  </view>
</template>

<script>
import { Logger } from '../common/utils/logger.js'

const logger = Logger.createTaggedLogger('ChunleiVideoPlayer')

export default {
  name: 'ChunleiVideoPlayer',
  
  props: {
    // 视频源地址
    src: {
      type: String,
      required: true
    },
    
    // 视频标题
    title: {
      type: String,
      default: ''
    },
    
    // 海报图片
    poster: {
      type: String,
      default: ''
    },
    
    // 自动播放
    autoplay: {
      type: Boolean,
      default: false
    },
    
    // 循环播放
    loop: {
      type: Boolean,
      default: false
    },
    
    // 静音
    muted: {
      type: Boolean,
      default: false
    },
    
    // 显示控制条
    showControls: {
      type: Boolean,
      default: true
    },
    
    // 显示进度条
    showProgress: {
      type: Boolean,
      default: true
    },
    
    // 显示信息
    showInfo: {
      type: Boolean,
      default: true
    },
    
    // 显示播放指示器
    showPlayIndicator: {
      type: Boolean,
      default: true
    },
    
    // 主题颜色
    themeColor: {
      type: String,
      default: '#FF6022'
    },
    
    // 全屏时旋转
    orientation: {
      type: Boolean,
      default: false
    },
    
    // 视频适配模式
    objectFit: {
      type: String,
      default: 'contain' // contain, fill, cover
    },
    
    // 显示调试信息
    showDebugInfo: {
      type: Boolean,
      default: false
    },
    
    // 内容信息（用于TV端显示）
    contentInfo: {
      type: Object,
      default: () => ({})
    },
    
    // 显示自定义控制条
    showCustomControls: {
      type: Boolean,
      default: false
    }
  },
  
  data() {
    return {
      // 播放状态
      isPlaying: false,
      isLoading: true, // 初始设为true，等待canplay事件
      hasError: false,
      isBuffering: false,
      
      // 播放进度
      currentTime: 0,
      duration: 0,
      
      // 重试相关
      retryCount: 0,
      maxRetryCount: 3,
      retryTimer: null,
      
      // 状态管理
      playerReady: false,
      lastPlayTime: 0,
      
      // 控制相关
      controlsVisible: true,
      controlsTimer: null,
      
      // 全屏状态
      isFullscreen: false,
      
      // 超时处理
      loadingTimeout: null,
      maxLoadingTime: 10000 // 10秒超时
    }
  },
  
  computed: {
    // 进度百分比
    progressPercentage() {
      if (this.duration === 0) return 0
      return (this.currentTime / this.duration) * 100
    }
  },
  
  watch: {
    // 监听src变化
    src: {
      handler(newSrc, oldSrc) {
        if (newSrc !== oldSrc && newSrc) {
          this.handleSrcChange(newSrc)
        }
      },
      immediate: false
    }
  },
  
  mounted() {
    logger.info('ChunleiVideoPlayer组件已挂载', {
      src: this.src,
      title: this.title,
      autoplay: this.autoplay
    })
    
    // 初始化播放器
    this.initializePlayer()
  },
  
  beforeDestroy() {
    // 清理资源
    this.cleanup()
  },
  
  methods: {
    // 初始化播放器
    initializePlayer() {
      try {
        // 重置状态
        this.resetPlayerState()
        
        // 如果有视频源，开始加载
        if (this.src) {
          this.isLoading = true
          logger.info('开始初始化播放器', { src: this.src })
          
          // 不立即尝试播放，等待canplay事件
          logger.info('等待视频准备就绪...')
        }
        
      } catch (error) {
        logger.error('初始化播放器失败:', error)
        this.handleError(error)
      }
    },
    
    // 处理视频源变化
    handleSrcChange(newSrc) {
      logger.info('视频源发生变化:', { from: this.src, to: newSrc })
      
      try {
        // 先停止当前播放
        this.stop()
        
        // 重置状态
        this.resetPlayerState()
        
        // 重新初始化
        this.isLoading = true
        
      } catch (error) {
        logger.error('切换视频源失败:', error)
        this.handleError(error)
      }
    },
    
    // 重置播放器状态
    resetPlayerState() {
      this.isPlaying = false
      this.isLoading = true  // 重置时设为加载中
      this.hasError = false
      this.isBuffering = false
      this.currentTime = 0
      this.duration = 0
      this.retryCount = 0
      this.playerReady = false
      this.clearRetryTimer()
    },
    
    // 播放
    play() {
      try {
        // 使用uni.createVideoContext来控制播放
        const videoContext = uni.createVideoContext('videoPlayer', this)
        if (videoContext) {
          const playPromise = videoContext.play()
          
          // 处理播放Promise（如果返回的话）
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(() => {
              logger.info('视频播放成功')
            }).catch((error) => {
              logger.warn('自动播放被阻止:', error.message)
              // 自动播放被阻止时不算错误，只是等待用户交互
              if (error.name === 'NotAllowedError') {
                logger.info('等待用户交互后播放')
                this.isLoading = false
                // 不调用handleError，因为这不是真正的错误
              } else {
                this.handleError(error)
              }
            })
          } else {
            logger.info('开始播放视频')
          }
        }
      } catch (error) {
        logger.error('播放视频失败:', error)
        this.handleError(error)
      }
    },
    
    // 暂停
    pause() {
      try {
        // 使用uni.createVideoContext来控制暂停
        const videoContext = uni.createVideoContext('videoPlayer', this)
        if (videoContext) {
          videoContext.pause()
          logger.info('暂停播放视频')
        }
      } catch (error) {
        logger.error('暂停视频失败:', error)
        this.handleError(error)
      }
    },
    
    // 停止
    stop() {
      try {
        if (this.isPlaying) {
          this.pause()
        }
        this.currentTime = 0
        this.isPlaying = false
        logger.info('停止播放视频')
      } catch (error) {
        logger.error('停止视频失败:', error)
      }
    },
    
    // 切换播放/暂停
    togglePlayPause() {
      if (this.isPlaying) {
        this.pause()
      } else {
        this.play()
      }
    },
    
    // 切换全屏
    toggleFullscreen() {
      try {
        const videoContext = uni.createVideoContext('videoPlayer', this)
        if (videoContext) {
          if (this.isFullscreen) {
            videoContext.exitFullScreen()
          } else {
            videoContext.requestFullScreen()
          }
        }
      } catch (error) {
        logger.error('切换全屏失败:', error)
      }
    },
    
    // 跳转到指定时间
    seek(time) {
      try {
        const videoContext = uni.createVideoContext('videoPlayer', this)
        if (videoContext) {
          videoContext.seek(time)
          logger.info('跳转到时间:', time)
        }
      } catch (error) {
        logger.error('跳转失败:', error)
      }
    },
    
    // 清理资源
    cleanup() {
      try {
        this.stop()
        this.clearRetryTimer()
        this.clearControlsTimer()
        this.clearLoadingTimeout()
        logger.info('清理播放器资源')
      } catch (error) {
        logger.error('清理播放器资源失败:', error)
      }
    },
    
    // 格式化时间
    formatTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return '00:00'
      
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      
      if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      } else {
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
    },
    
    // 页面显示时的处理
    onPageShow() {
      try {
        // 恢复播放状态
        logger.info('页面显示，恢复播放状态')
      } catch (error) {
        logger.error('页面显示处理失败:', error)
      }
    },
    
    // 页面隐藏时的处理
    onPageHide() {
      try {
        // 暂停播放
        if (this.isPlaying) {
          this.pause()
        }
        logger.info('页面隐藏，暂停播放')
      } catch (error) {
        logger.error('页面隐藏处理失败:', error)
      }
    },
    
    // 事件处理方法
    handlePlay() {
      this.isPlaying = true
      this.isLoading = false
      this.hasError = false
      this.isBuffering = false
      this.retryCount = 0
      this.playerReady = true
      this.clearLoadingTimeout()
      
      logger.info('视频开始播放')
      this.$emit('play')
    },
    
    handlePause() {
      this.isPlaying = false
      logger.info('视频暂停播放')
      this.$emit('pause')
    },
    
    handleEnded() {
      logger.info('视频播放结束，准备循环播放')
      
      // 重置播放状态
      this.currentTime = 0
      
      // 自动重新播放（循环）
      setTimeout(() => {
        logger.info('开始循环播放')
        this.play()
      }, 100)
      
      this.$emit('ended')
    },
    
    handleError(error) {
      this.hasError = true
      this.isLoading = false
      this.isPlaying = false
      this.isBuffering = false
      
      logger.error('视频播放错误:', error)
      
      // 尝试重试
      if (this.retryCount < this.maxRetryCount) {
        this.retryCount++
        logger.info(`准备重试播放，第${this.retryCount}次重试`)
        
        this.retryTimer = setTimeout(() => {
          this.handleRetry()
        }, 2000 * this.retryCount) // 递增延迟重试
      } else {
        logger.error('达到最大重试次数，停止重试')
        this.$emit('retry-failed', error)
      }
      
      this.$emit('error', error)
    },
    
    handleTimeUpdate(event) {
      if (event && event.detail) {
        this.currentTime = event.detail.currentTime || 0
        this.duration = event.detail.duration || 0
      }
      this.$emit('timeupdate', event)
    },
    
    handleLoadStart() {
      this.isLoading = true
      this.hasError = false
      this.isBuffering = false
      logger.info('开始加载视频:', this.src)
      
      // 设置加载超时
      this.clearLoadingTimeout()
      this.loadingTimeout = setTimeout(() => {
        if (this.isLoading && !this.hasError) {
          logger.warn('视频加载超时，尝试重试')
          this.handleError(new Error('视频加载超时'))
        }
      }, this.maxLoadingTime)
      
      this.$emit('loadstart')
    },
    
    handleLoadedData() {
      logger.info('视频数据加载完成')
      this.$emit('loadeddata')
    },
    
    handleLoadedMetadata() {
      logger.info('视频元数据加载完成')
      this.$emit('loadedmetadata')
    },
    
    handleCanPlay() {
      this.isLoading = false
      this.playerReady = true
      this.hasError = false
      this.isBuffering = false
      this.clearLoadingTimeout()
      logger.info('视频可以播放，准备就绪')
      this.$emit('canplay')
      
      // 如果设置了自动播放但还没开始播放，尝试播放
      if (this.autoplay && !this.isPlaying) {
        // 延迟更长时间，给浏览器更多时间处理
        setTimeout(() => {
          logger.info('尝试自动播放视频')
          this.attemptAutoPlay()
        }, 1000)
      }
    },
    
    handleCanPlayThrough() {
      this.isLoading = false
      this.isBuffering = false
      this.clearLoadingTimeout()
      logger.info('视频可以流畅播放')
      this.$emit('canplaythrough')
    },
    
    handleWaiting() {
      if (this.playerReady) {
        this.isBuffering = true
        logger.info('视频缓冲中')
      }
      this.$emit('waiting')
    },
    
    handleSeeking() {
      this.isBuffering = true
      logger.info('视频跳转中')
      this.$emit('seeking')
    },
    
    handleSeeked() {
      this.isBuffering = false
      logger.info('视频跳转完成')
      this.$emit('seeked')
    },
    
    handleFullscreenChange(event) {
      this.isFullscreen = event.detail.fullScreen
      logger.info('全屏状态变化:', this.isFullscreen)
      this.$emit('fullscreenchange', event)
    },
    
    handleControlsToggle(event) {
      this.controlsVisible = event.detail.show
      logger.info('控制条显示状态:', this.controlsVisible)
      this.$emit('controlstoggle', event)
    },
    
    // 重试播放
    handleRetry() {
      try {
        logger.info(`开始重试播放 (第${this.retryCount + 1}次)`)
        this.hasError = false
        this.isLoading = true
        this.isBuffering = false
        
        // 重新初始化播放器
        this.$nextTick(() => {
          // 直接尝试播放，不修改src属性
          setTimeout(() => {
            this.play()
          }, 100)
        })
        
      } catch (error) {
        logger.error('重试播放失败:', error)
        this.handleError(error)
      }
    },
    
    // 清除重试定时器
    clearRetryTimer() {
      if (this.retryTimer) {
        clearTimeout(this.retryTimer)
        this.retryTimer = null
      }
    },
    
    // 清除控制条定时器
    clearControlsTimer() {
      if (this.controlsTimer) {
        clearTimeout(this.controlsTimer)
        this.controlsTimer = null
      }
    },
    
    // 清除加载超时定时器
    clearLoadingTimeout() {
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout)
        this.loadingTimeout = null
      }
    },
    
    // 尝试自动播放
    attemptAutoPlay() {
      try {
        logger.info('尝试自动播放...')
        
        // 使用uni.createVideoContext来控制播放
        const videoContext = uni.createVideoContext('videoPlayer', this)
        if (videoContext) {
          const playPromise = videoContext.play()
          
          // 处理播放Promise
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(() => {
              logger.info('自动播放成功')
              // 播放成功会触发handlePlay事件
            }).catch((error) => {
              if (error.name === 'NotAllowedError') {
                logger.info('浏览器阻止了自动播放，等待用户交互')
                this.isLoading = false
                // 显示播放按钮，等待用户点击
                this.showPlayButtonHint()
              } else {
                logger.error('自动播放失败:', error)
                this.handleError(error)
              }
            })
          }
        }
      } catch (error) {
        logger.error('自动播放尝试失败:', error)
        this.isLoading = false
      }
    },
    
    // 显示播放按钮提示
    showPlayButtonHint() {
      // 自动播放被阻止时，直接设置为静音并重试
      logger.info('自动播放被阻止，尝试静音播放')
      this.$emit('autoplay-blocked')
      
      // 尝试静音播放
      setTimeout(() => {
        this.retryWithMuted()
      }, 1000)
    },
    
    // 静音重试播放
    retryWithMuted() {
      try {
        logger.info('尝试静音播放')
        const videoContext = uni.createVideoContext('videoPlayer', this)
        if (videoContext) {
          const playPromise = videoContext.play()
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(() => {
              logger.info('静音播放成功')
            }).catch((error) => {
              logger.warn('静音播放也失败了:', error.message)
              // 如果静音播放也失败，就等待用户交互
              this.isLoading = false
            })
          }
        }
      } catch (error) {
        logger.error('静音播放尝试失败:', error)
        this.isLoading = false
      }
    }
  }
}
</script>

<style scoped>
.chunlei-video-player {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #000;
}

.video-player {
  width: 100%;
  height: 100%;
}

/* 自定义控制层 */
.custom-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  display: flex;
  align-items: center;
  padding: 20rpx;
  z-index: 100;
}

.play-pause-btn {
  margin-right: 20rpx;
}

.control-icon {
  color: #fff;
  font-size: 32rpx;
}

.progress-container {
  flex: 1;
  display: flex;
  align-items: center;
  margin-right: 20rpx;
}

.progress-bar {
  flex: 1;
  height: 8rpx;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 4rpx;
  margin-right: 20rpx;
  position: relative;
}

.progress-fill {
  height: 100%;
  background-color: #FF6022;
  border-radius: 4rpx;
  transition: width 0.1s ease;
}

.time-display {
  color: #fff;
  font-size: 24rpx;
  min-width: 120rpx;
  text-align: center;
}

.fullscreen-btn {
  margin-left: 20rpx;
}

/* 加载指示器 */
.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  border-radius: 10rpx;
  padding: 20rpx 40rpx;
  z-index: 200;
}

.loading-text {
  color: #fff;
  font-size: 28rpx;
}

/* 错误指示器 */
.error-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 0, 0, 0.8);
  border-radius: 10rpx;
  padding: 20rpx 40rpx;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.error-text {
  color: #fff;
  font-size: 28rpx;
  margin-bottom: 20rpx;
}

.retry-btn {
  color: #fff;
  font-size: 24rpx;
  padding: 10rpx 20rpx;
  border: 2rpx solid #fff;
  border-radius: 6rpx;
}

/* 缓冲指示器 */
.buffering-indicator {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 10rpx;
  padding: 10rpx 20rpx;
  z-index: 200;
}

.buffering-text {
  color: #fff;
  font-size: 24rpx;
}



/* 调试信息覆盖层 */
.debug-overlay {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 10rpx;
  padding: 20rpx;
  z-index: 1000;
  max-width: 400rpx;
}

.debug-title {
  color: #4CAF50;
  font-size: 24rpx;
  font-weight: 600;
  margin-bottom: 10rpx;
  display: block;
}

.debug-item {
  color: #ffffff;
  font-size: 20rpx;
  margin-bottom: 5rpx;
  display: block;
  line-height: 1.4;
}

/* TV端优化 */
@media screen and (min-width: 1280px) {
  .debug-overlay {
    top: 30rpx;
    left: 30rpx;
    padding: 30rpx;
  }
  
  .debug-title {
    font-size: 28rpx;
  }
  
  .debug-item {
    font-size: 24rpx;
  }
  
  .custom-controls {
    padding: 30rpx;
  }
  
  .control-icon {
    font-size: 40rpx;
  }
  
  .time-display {
    font-size: 28rpx;
  }
  
  .loading-text {
    font-size: 32rpx;
  }
  
  .error-text {
    font-size: 32rpx;
  }
}
</style> 