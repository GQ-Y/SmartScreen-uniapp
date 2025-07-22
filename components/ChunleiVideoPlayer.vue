<template>
  <view class="chunlei-video-player">
    <video
      ref="videoPlayer"
      id="videoPlayer"
      :src="src"
      :poster="poster"
      :autoplay="autoplay"
      :loop="true"
      :muted="!isSoundReady"
      :controls="false"
      :show-progress="false"
      :show-fullscreen-btn="false"
      :show-play-btn="false"
      :show-center-play-btn="false"
      :enable-progress-gesture="false"
      :object-fit="objectFit"
      :direction="orientation ? 90 : 0"
      :initial-time="0"
      :duration="duration"
      :page-gesture="false"
      :show-mute-btn="false"
      :enable-play-gesture="false"
      :auto-pause-if-navigate="true"
      :auto-pause-if-open-native="true"
      :vslide-gesture="false"
      :vslide-gesture-in-fullscreen="false"
      class="video-player"
      @play="handlePlay"
      @pause="handlePause"
      @ended="handleEnded"
      @error="handleError"
      @timeupdate="handleTimeUpdate"
      @loadstart="handleLoadStart"
      @canplay="handleCanPlay"
      @waiting="handleWaiting"
      @seeking="handleSeeking"
      @seeked="handleSeeked"
    >
    </video>
  </view>
</template>

<script>
import { Logger } from '../common/utils/logger.js'

const logger = Logger.createTaggedLogger('ChunleiVideoPlayer')

export default {
  name: 'ChunleiVideoPlayer',
  
  props: {
    src: {
      type: String,
      required: true
    },
    poster: {
      type: String,
      default: ''
    },
    autoplay: {
      type: Boolean,
      default: false
    },
    loop: {
      type: Boolean,
      default: false
    },
    muted: {
      type: Boolean,
      default: false
    },
    orientation: {
      type: Boolean,
      default: false
    },
    objectFit: {
      type: String,
      default: 'contain'
    }
  },
  
  data() {
    return {
      isPlaying: false,
      isLoading: true,
      hasError: false,
      isBuffering: false,
      isSoundReady: false,
      currentTime: 0,
      duration: 0,
      retryCount: 0,
      maxRetryCount: 3,
      retryTimer: null,
      playerReady: false,
      loadingTimeout: null,
      maxLoadingTime: 10000
    }
  },
  
  watch: {
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
      autoplay: this.autoplay
    })
    this.initializePlayer()
  },
  
  beforeDestroy() {
    this._isBeingDestroyed = true
    this.cleanup()
    logger.info('ChunleiVideoPlayer组件即将销毁')
  },

  methods: {
    initializePlayer() {
      this.resetPlayerState()
      if (this.src) {
        this.isLoading = true
        logger.info('开始初始化播放器', { src: this.src })
      }
    },
    
    handleSrcChange(newSrc) {
      logger.info('视频源发生变化:', { from: this.src, to: newSrc })
      this.stop()
      this.resetPlayerState()
      this.isLoading = true
    },
    
    resetPlayerState() {
      this.isPlaying = false
      this.isLoading = true
      this.hasError = false
      this.isBuffering = false
      this.isSoundReady = false;
      this.currentTime = 0
      this.duration = 0
      this.retryCount = 0
      this.playerReady = false
      this.clearRetryTimer()
    },
    
    play() {
      if (this._isBeingDestroyed) return
      this.$nextTick(() => {
        if (this._isBeingDestroyed) return
        const videoContext = uni.createVideoContext('videoPlayer', this)
        if (videoContext) {
          videoContext.play().catch(error => {
            if (!this._isBeingDestroyed) {
              logger.warn('播放被阻止:', error.message)
              if (error.name !== 'NotAllowedError') {
                this.handleError(error)
              }
            }
          })
        }
      })
    },
    
    pause() {
      const videoContext = uni.createVideoContext('videoPlayer', this)
      if (videoContext) {
        videoContext.pause()
      }
    },
    
    stop() {
      if (this.isPlaying) {
        this.pause()
      }
      this.currentTime = 0
      this.isPlaying = false
    },
    
    cleanup() {
      this.stop()
      this.clearRetryTimer()
      this.clearLoadingTimeout()
    },
    
    handlePlay() {
      this.isPlaying = true
      this.isLoading = false
      this.hasError = false
      this.isBuffering = false
      this.retryCount = 0
      this.playerReady = true
      this.clearLoadingTimeout()
      this.$emit('play')

      if (!this.isSoundReady) {
        this.isSoundReady = true;
      }
    },
    
    handlePause() {
      this.isPlaying = false
      this.$emit('pause')
    },
    
    handleEnded() {
      this.currentTime = 0
      this.$nextTick(() => {
        setTimeout(() => {
          if (!this._isBeingDestroyed) {
            this.play()
          }
        }, 300)
      })
      this.$emit('ended')
    },
    
    handleError(error) {
      this.hasError = true
      this.isLoading = false
      this.isPlaying = false
      this.isBuffering = false
      logger.error('视频播放错误:', error)
      
      if (this.retryCount < this.maxRetryCount) {
        this.retryCount++
        this.retryTimer = setTimeout(() => this.handleRetry(), 2000 * this.retryCount)
      } else {
        this.$emit('retry-failed', error)
      }
      this.$emit('error', error)
    },
    
    handleTimeUpdate(event) {
      if (event.detail) {
        this.currentTime = event.detail.currentTime || 0
        this.duration = event.detail.duration || 0
      }
      this.$emit('timeupdate', event)
    },
    
    handleLoadStart() {
      this.isLoading = true
      this.hasError = false
      this.isBuffering = false
      this.clearLoadingTimeout()
      this.loadingTimeout = setTimeout(() => {
        if (this.isLoading && !this.hasError) {
          this.handleError(new Error('视频加载超时'))
        }
      }, this.maxLoadingTime)
      this.$emit('loadstart')
    },
    
    handleCanPlay() {
      this.isLoading = false
      this.playerReady = true
      this.hasError = false
      this.isBuffering = false
      this.clearLoadingTimeout()
      this.$emit('canplay')
      
      if (this.autoplay && !this.isPlaying) {
        setTimeout(() => this.attemptAutoPlay(), 1000)
      }
    },
    
    handleWaiting() {
      if (this.playerReady) {
        this.isBuffering = true
      }
      this.$emit('waiting')
    },
    
    handleSeeking() {
      this.isBuffering = true
      this.$emit('seeking')
    },
    
    handleSeeked() {
      this.isBuffering = false
      this.$emit('seeked')
    },
    
    handleRetry() {
      this.hasError = false
      this.isLoading = true
      this.isBuffering = false
      this.$nextTick(() => {
        setTimeout(() => this.play(), 100)
      })
    },
    
    clearRetryTimer() {
      if (this.retryTimer) {
        clearTimeout(this.retryTimer)
        this.retryTimer = null
      }
    },
    
    clearLoadingTimeout() {
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout)
        this.loadingTimeout = null
      }
    },
    
    attemptAutoPlay() {
      const videoContext = uni.createVideoContext('videoPlayer', this)
      if (videoContext) {
        videoContext.play().catch(error => {
          if (error.name === 'NotAllowedError') {
            this.isLoading = false
            this.$emit('autoplay-blocked')
          } else {
            this.handleError(error)
          }
        })
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
</style>
