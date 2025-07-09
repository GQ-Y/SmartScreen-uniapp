<template>
  <view class="player-manager" v-if="isVisible">
    <!-- 网页内容播放器 (content_type: 1) -->
    <web-view
      v-if="currentContent && currentContent.content_type === 1"
      :src="currentContent.content_url"
      class="content-player web-player"
      @load="handleContentLoad"
      @error="handleContentError"
    ></web-view>

    <!-- 图片内容播放器 (content_type: 2) -->
    <view
      v-else-if="currentContent && currentContent.content_type === 2"
      class="content-player image-player"
    >
      <image
        :src="currentContent.content_url"
        class="image-content"
        mode="aspectFit"
        @load="handleContentLoad"
        @error="handleContentError"
      />
      <view class="content-info" v-if="currentContent.title">
        <text class="content-title">{{ currentContent.title }}</text>
      </view>
    </view>

    <!-- 视频内容播放器 (content_type: 3) -->
    <video
      v-else-if="currentContent && currentContent.content_type === 3"
      :src="currentContent.content_url"
      class="content-player video-player"
      :autoplay="true"
      :controls="false"
      :muted="false"
      :loop="isLoopMode"
      @play="handleContentLoad"
      @ended="handleContentEnded"
      @error="handleContentError"
    ></video>

    <!-- 直播流内容播放器 (content_type: 4) -->
    <video
      v-else-if="currentContent && currentContent.content_type === 4"
      :src="currentContent.content_url"
      class="content-player live-player"
      :autoplay="true"
      :controls="false"
      :muted="false"
      :live="true"
      @play="handleContentLoad"
      @error="handleContentError"
    ></video>

    <!-- 音频内容播放器 (content_type: 5) -->
    <view
      v-else-if="currentContent && currentContent.content_type === 5"
      class="content-player audio-player"
    >
      <view class="audio-visual">
        <image
          :src="currentContent.thumbnail || '/static/default-audio.png'"
          class="audio-cover"
          mode="aspectFit"
        />
        <view class="audio-info">
          <text class="audio-title">{{ currentContent.title }}</text>
        </view>
      </view>

      <audio
        :src="currentContent.content_url"
        :autoplay="true"
        :controls="false"
        :loop="isLoopMode"
        @play="handleContentLoad"
        @ended="handleContentEnded"
        @error="handleContentError"
      ></audio>
    </view>

    <!-- 无内容时的默认显示 -->
    <view v-else class="content-player no-content">
      <view class="no-content-message">
        <SvgIcon name="device-inactive" :color="'rgba(255,255,255,0.5)'" :size="120" />
        <text class="no-content-title">暂无播放内容</text>
        <text class="no-content-desc">等待服务器推送内容</text>
      </view>
    </view>

    <!-- 内容切换倒计时 -->
    <view class="countdown-overlay" v-if="showCountdown && countdown > 0">
      <view class="countdown-content">
        <text class="countdown-text">{{ countdown }}秒后切换内容</text>
        <view class="countdown-circle">
          <text class="countdown-number">{{ countdown }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import SvgIcon from './SvgIcon.vue'
import { Logger } from '../common/utils/logger.js'

const logger = Logger.createTaggedLogger('PlayerManager')

export default {
  name: 'PlayerManager',
  components: {
    SvgIcon
  },

  data() {
    return {
      isVisible: true,
      showCountdown: true,

      // 当前播放内容索引
      currentContentIndex: 0,

      // 自动切换相关
      countdown: 0,
      countdownTimer: null,
      autoSwitchTimer: null
    }
  },

  computed: {
    ...mapGetters('websocket', [
      'getContentData',
      'getConnectionStatus'
    ]),

    // 获取内容数据
    contentData() {
      return this.getContentData
    },

    // 根据播放策略获取当前应显示的内容
    currentContent() {
      if (!this.contentData || !this.contentData.data) {
        return null
      }

      const data = this.contentData.data
      const displayMode = data.display_mode

      // 根据播放策略确定播放内容
      let playContents = []

      switch (displayMode) {
        case 1: // 播放列表优先
          playContents = [...(data.playlist_contents || [])]
          if (data.direct_content) {
            playContents.push(data.direct_content)
          }
          break

        case 2: // 直接内容优先
          if (data.direct_content) {
            playContents.push(data.direct_content)
          }
          playContents = playContents.concat(data.playlist_contents || [])
          break

        case 3: // 仅播放列表
          playContents = [...(data.playlist_contents || [])]
          break

        case 4: // 仅直接内容
          if (data.direct_content) {
            playContents.push(data.direct_content)
          }
          break

        default:
          playContents = data.primary_contents || []
          break
      }

      // 返回当前索引对应的内容
      if (playContents.length > 0) {
        return playContents[this.currentContentIndex % playContents.length]
      }

      return null
    },

    // 是否为循环模式
    isLoopMode() {
      if (!this.contentData || !this.contentData.data) return false

      const playContents = this.getPlayContents()
      return playContents.length === 1 && this.currentContent && this.currentContent.duration === 0
    },

    // 获取播放内容列表
    playContents() {
      return this.getPlayContents()
    }
  },
  
  watch: {
    currentContent: {
      handler(newContent, oldContent) {
        if (newContent !== oldContent) {
          this.handleContentChange(newContent, oldContent)
        }
      },
      immediate: true
    },

    contentData: {
      handler(newData) {
        if (newData) {
          logger.info('收到新的内容数据:', newData)
          this.currentContentIndex = 0 // 重置到第一个内容
        }
      },
      immediate: true
    }
  },

  mounted() {
    this.initializePlayer()
  },

  beforeDestroy() {
    this.cleanup()
  },

  methods: {
    ...mapActions('websocket', [
      'getContent'
    ]),

    // 初始化播放器
    initializePlayer() {
      logger.info('初始化播放器管理器')
    },

    // 获取播放内容列表
    getPlayContents() {
      if (!this.contentData || !this.contentData.data) {
        return []
      }

      const data = this.contentData.data
      const displayMode = data.display_mode

      let playContents = []

      switch (displayMode) {
        case 1: // 播放列表优先
          playContents = [...(data.playlist_contents || [])]
          if (data.direct_content) {
            playContents.push(data.direct_content)
          }
          break

        case 2: // 直接内容优先
          if (data.direct_content) {
            playContents.push(data.direct_content)
          }
          playContents = playContents.concat(data.playlist_contents || [])
          break

        case 3: // 仅播放列表
          playContents = [...(data.playlist_contents || [])]
          break

        case 4: // 仅直接内容
          if (data.direct_content) {
            playContents.push(data.direct_content)
          }
          break

        default:
          playContents = data.primary_contents || []
          break
      }

      return playContents
    },
    
    // 处理内容变化
    handleContentChange(newContent, oldContent) {
      if (oldContent) {
        this.stopAutoSwitch()
        logger.info('停止播放上一个内容:', oldContent.title)
      }

      if (newContent) {
        logger.info('开始播放新内容:', newContent.title, '类型:', newContent.content_type)
        this.startContent(newContent)
      }
    },

    // 开始播放内容
    startContent(content) {
      // 如果有播放时长限制且不是循环模式，启动自动切换
      if (content.duration > 0 && !this.isLoopMode) {
        this.startAutoSwitch(content.duration)
      }

      logger.info('开始播放内容:', {
        title: content.title,
        type: content.content_type,
        duration: content.duration,
        url: content.content_url
      })
    },
    
    // 启动自动切换
    startAutoSwitch(duration) {
      this.countdown = duration
      this.showCountdown = true

      this.countdownTimer = setInterval(() => {
        this.countdown--
        if (this.countdown <= 0) {
          this.stopAutoSwitch()
          this.switchToNextContent()
        }
      }, 1000)
    },

    // 停止自动切换
    stopAutoSwitch() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer)
        this.countdownTimer = null
      }
      this.showCountdown = false
      this.countdown = 0
    },

    // 切换到下一个内容
    switchToNextContent() {
      const playContents = this.getPlayContents()
      if (playContents.length > 1) {
        this.currentContentIndex = (this.currentContentIndex + 1) % playContents.length
        logger.info('切换到下一个内容，索引:', this.currentContentIndex)
      } else {
        logger.info('只有一个内容，保持当前显示')
      }
    },
    
    // 事件处理方法
    handleContentLoad() {
      logger.info('内容加载完成:', this.currentContent?.title)
    },

    handleContentError(error) {
      logger.error('内容加载/播放失败:', error)

      uni.showToast({
        title: '内容播放失败',
        icon: 'error',
        duration: 2000
      })

      // 3秒后自动切换到下一个内容
      setTimeout(() => {
        this.switchToNextContent()
      }, 3000)
    },

    handleContentEnded() {
      logger.info('内容播放结束:', this.currentContent?.title)

      // 如果不是循环模式，切换到下一个内容
      if (!this.isLoopMode) {
        this.switchToNextContent()
      }
    },
    
    // 清理资源
    cleanup() {
      this.stopAutoSwitch()
      logger.info('播放器管理器已清理')
    }
  }
}
</script>

<style scoped>
.player-manager {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: #000000;
  overflow: hidden;
}

/* 内容播放器通用样式 */
.content-player {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

/* 网页播放器 */
.web-player {
  border: none;
}

/* 图片播放器 */
.image-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000000;
}

.image-content {
  max-width: 100%;
  max-height: 90%;
  object-fit: contain;
}

.content-info {
  position: absolute;
  bottom: 100rpx;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 20rpx 40rpx;
  border-radius: 10rpx;
  backdrop-filter: blur(10rpx);
}

.content-title {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 500;
}

/* 视频播放器 */
.video-player,
.live-player {
  object-fit: contain;
}

/* 音频播放器 */
.audio-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.audio-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 60rpx;
}

.audio-cover {
  width: 400rpx;
  height: 400rpx;
  border-radius: 20rpx;
  box-shadow: 0 20rpx 40rpx rgba(0, 0, 0, 0.3);
}

.audio-info {
  text-align: center;
  color: #ffffff;
}

.audio-title {
  font-size: 48rpx;
  font-weight: 600;
  display: block;
}

/* 无内容显示 */
.no-content {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

.no-content-message {
  text-align: center;
  color: #ffffff;
}

.no-content-title {
  font-size: 48rpx;
  font-weight: 600;
  margin: 40rpx 0 20rpx;
  display: block;
}

.no-content-desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
}

/* 倒计时覆盖层 */
.countdown-overlay {
  position: absolute;
  top: 40rpx;
  right: 40rpx;
  z-index: 1000;
}

.countdown-content {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: rgba(0, 0, 0, 0.8);
  padding: 20rpx 30rpx;
  border-radius: 15rpx;
  backdrop-filter: blur(10rpx);
}

.countdown-text {
  color: #ffffff;
  font-size: 24rpx;
}

.countdown-circle {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(255, 193, 7, 0.2);
  border: 2px solid #FFC107;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 1s infinite;
}

.countdown-number {
  color: #FFC107;
  font-size: 24rpx;
  font-weight: 600;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* 响应式设计 */
@media screen and (max-width: 750px) {
  .audio-cover {
    width: 300rpx;
    height: 300rpx;
  }

  .audio-title {
    font-size: 36rpx;
  }

  .no-content-title {
    font-size: 36rpx;
  }

  .no-content-desc {
    font-size: 24rpx;
  }
}
</style>
