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
    <VideoPlayer
      v-else-if="currentContent && currentContent.content_type === 3"
      :src="currentContent.content_url"
      :content-info="currentContent"
      :autoplay="true"
      :show-controls="false"
      :loop="isLoopMode"
      :muted="false"
      :show-progress="false"
      :poster="currentContent.thumbnail"
      :show-info="true"
      :show-play-indicator="false"
      @play="handleContentLoad"
      @ended="handleContentEnded"
      @error="handleContentError"
      @retry-failed="handleRetryFailed"
      class="content-player video-player"
    />

    <!-- 直播流内容播放器 (content_type: 4) -->
    <VideoPlayer
      v-else-if="currentContent && currentContent.content_type === 4"
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
      class="content-player live-player"
    />

    <!-- 音频内容播放器 (content_type: 5) -->
    <AudioPlayer
      v-else-if="currentContent && currentContent.content_type === 5"
      :src="currentContent.content_url"
      :content-info="currentContent"
      :autoplay="true"
      :loop="isLoopMode"
      :show-controls="false"
      :show-progress="true"
      :cover-image="currentContent.thumbnail"
      :background-image="currentContent.thumbnail"
      @play="handleContentLoad"
      @error="handleContentError"
      @ended="handleContentEnded"
      @retry-failed="handleRetryFailed"
      class="content-player audio-player"
    />

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
import AudioPlayer from './AudioPlayer.vue'
import VideoPlayer from './VideoPlayer.vue'
import { Logger } from '../common/utils/logger.js'

const logger = Logger.createTaggedLogger('PlayerManager')

export default {
  name: 'PlayerManager',
  components: {
    SvgIcon,
    AudioPlayer,
    VideoPlayer
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
      autoSwitchTimer: null,

      // 播放状态追踪
      isPlayingContent: false,
      lastContentType: null,

      // 内容切换历史
      playHistory: [],
      maxHistorySize: 10
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
        logger.info('🎬 PlayerManager: 没有内容数据')
        return null
      }

      const data = this.contentData.data
      const displayMode = data.display_mode

      logger.info('🎬 PlayerManager: 处理内容数据:', {
        displayMode,
        displayModeName: data.display_mode_name,
        hasDirectContent: data.has_direct_content,
        hasPlaylistContents: data.has_playlist_contents,
        totalContents: data.total_contents,
        currentIndex: this.currentContentIndex
      })

      // 获取按播放策略排序的内容列表
      const playContents = this.getPlayContents()

      // 返回当前索引对应的内容
      if (playContents.length > 0) {
        // 确保索引在有效范围内
        const validIndex = this.currentContentIndex % playContents.length
        const content = playContents[validIndex]
        
        logger.info('🎬 PlayerManager: 当前播放内容:', {
          index: validIndex,
          total: playContents.length,
          contentType: content.content_type,
          title: content.title,
          duration: content.duration
        })
        
        return content
      }

      logger.info('🎬 PlayerManager: 没有可播放的内容')
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
      handler(newData, oldData) {
        if (newData) {
          logger.info('📨 收到新的内容数据:', {
            hasOldData: !!oldData,
            displayMode: newData.data?.display_mode,
            totalContents: newData.data?.total_contents
          })
          this.currentContentIndex = 0 // 重置到第一个内容
          
          // 如果之前有内容在播放，需要先停止
          if (oldData && this.isPlayingContent) {
            this.stopAllContent()
          }
        }
      },
      immediate: true
    }
  },

  mounted() {
    logger.info('🎬 PlayerManager组件已挂载')
    this.initializePlayer()

    // 检查初始内容数据
    logger.info('🎬 PlayerManager初始状态:', {
      hasContentData: !!this.contentData,
      currentContent: this.currentContent
    })
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
      logger.info('🔄 内容变化:', {
        oldContentTitle: oldContent?.title,
        oldContentType: oldContent?.content_type,
        newContentTitle: newContent?.title,
        newContentType: newContent?.content_type,
        isSwitch: !!(oldContent && newContent)
      })
      
      // 如果有旧内容，先停止
      if (oldContent && this.isPlayingContent) {
        this.stopCurrentContent(oldContent)
      }
      
      // 开始新内容
      if (newContent) {
        // 记录播放历史
        this.addToPlayHistory(newContent)
        
        // 使用nextTick确保DOM更新后开始播放
        this.$nextTick(() => {
          this.startContent(newContent)
        })
      }
    },

    // 停止所有内容播放
    stopAllContent() {
      logger.info('🛑 停止所有内容播放')
      
      try {
        // 停止自动切换定时器
        this.stopAutoSwitch()
        
        // 通过事件通知所有播放器停止
        uni.$emit('stopAllPlayers')
        
        // 根据上一个内容类型进行特定清理
        if (this.lastContentType) {
          this.performContentSpecificCleanup(this.lastContentType)
        }
        
        // 重置播放状态
        this.isPlayingContent = false
        this.lastContentType = null
        
        logger.info('🛑 所有内容已停止')
      } catch (error) {
        logger.error('🛑 停止所有内容时出错:', error)
      }
    },

    // 执行特定内容类型的清理
    performContentSpecificCleanup(contentType) {
      switch (contentType) {
        case 1: // 网页
          this.cleanupWebContent()
          break
        case 2: // 图片
          this.cleanupImageContent()
          break
        case 3: // 视频
        case 4: // 直播流
          this.cleanupVideoContent()
          break
        case 5: // 音频
          this.cleanupAudioContent()
          break
      }
    },

    // 清理网页内容
    cleanupWebContent() {
      logger.debug('🌐 清理网页内容资源')
      // 网页内容的特殊清理逻辑
    },

    // 清理图片内容
    cleanupImageContent() {
      logger.debug('🖼️ 清理图片内容资源')
      // 图片内容的特殊清理逻辑
    },

    // 清理视频内容
    cleanupVideoContent() {
      logger.debug('🎬 清理视频内容资源')
      // 发送特定的视频停止事件
      uni.$emit('forceStopVideo')
    },

    // 清理音频内容
    cleanupAudioContent() {
      logger.debug('🎵 清理音频内容资源')
      // 发送特定的音频停止事件
      uni.$emit('forceStopAudio')
    },

    // 停止当前播放的内容
    stopCurrentContent(content) {
      try {
        this.isPlayingContent = false
        
        logger.info('🛑 开始停止内容:', {
          type: content.content_type,
          title: content.title,
          typeDesc: this.getContentTypeDescription(content.content_type)
        })
        
        // 根据内容类型执行相应的停止操作
        switch (content.content_type) {
          case 1: // 网页
            this.stopWebContent()
            break
          case 2: // 图片
            this.stopImageContent()
            break
          case 3: // 视频
          case 4: // 直播流
            this.stopVideoContent()
            break
          case 5: // 音频
            this.stopAudioContent()
            break
        }
        
        // 执行通用清理
        this.performContentSpecificCleanup(content.content_type)
        
        logger.info('🛑 内容停止完成:', {
          type: content.content_type,
          title: content.title
        })
      } catch (error) {
        logger.error('🛑 停止内容时出错:', error)
      }
    },

    // 停止视频内容
    stopVideoContent() {
      // 发送停止事件给所有视频播放器
      uni.$emit('stopVideoPlayers')
    },

    // 停止音频内容
    stopAudioContent() {
      // 发送停止事件给所有音频播放器
      uni.$emit('stopAudioPlayers')
    },

    // 停止网页内容
    stopWebContent() {
      // 网页内容无需特殊停止操作
      logger.info('🛑 网页内容已停止')
    },

    // 停止图片内容
    stopImageContent() {
      // 图片内容无需特殊停止操作
      logger.info('🛑 图片内容已停止')
    },

    // 开始播放内容
    startContent(content) {
      this.isPlayingContent = true
      this.lastContentType = content.content_type

      // 根据duration和内容类型决定是否启动自动切换
      this.handleContentDuration(content)

      logger.info('🎬 开始播放内容:', {
        title: content.title,
        type: content.content_type,
        duration: content.duration,
        url: content.content_url,
        autoSwitch: content.duration > 0,
        contentTypeDesc: this.getContentTypeDescription(content.content_type)
      })
    },

    // 处理内容播放时长逻辑
    handleContentDuration(content) {
      const { content_type, duration } = content

      if (duration > 0 && !this.isLoopMode) {
        // 有指定duration的内容，启动自动切换定时器
        this.startAutoSwitch(duration)
        logger.info('🕒 启动定时切换:', {
          duration: duration,
          type: content_type,
          nextSwitchTime: new Date(Date.now() + duration * 1000).toLocaleTimeString()
        })
      } else if (duration === 0) {
        // duration为0表示永久显示，不自动切换
        logger.info('🔄 内容设置为永久显示模式:', {
          type: content_type,
          title: content.title
        })
      } else {
        // 对于直播流等特殊内容类型的处理
        switch (content_type) {
          case 4: // 直播流
            if (duration > 0) {
              // 直播流的duration表示观看时长限制
              this.startAutoSwitch(duration)
              logger.info('📺 直播流观看时长限制:', duration + '秒')
            } else {
              logger.info('📺 直播流无时长限制，持续播放')
            }
            break
          case 1: // 网页
            if (duration > 0) {
              this.startAutoSwitch(duration)
              logger.info('🌐 网页显示时长:', duration + '秒')
            } else {
              logger.info('🌐 网页持续显示')
            }
            break
          case 2: // 图片
            if (duration > 0) {
              this.startAutoSwitch(duration)
              logger.info('🖼️ 图片显示时长:', duration + '秒')
            } else {
              logger.info('🖼️ 图片持续显示')
            }
            break
        }
      }
    },

    // 获取内容类型描述
    getContentTypeDescription(contentType) {
      const typeMap = {
        1: '网页内容',
        2: '图片内容', 
        3: '视频内容',
        4: '直播流',
        5: '音频内容'
      }
      return typeMap[contentType] || '未知类型'
    },
    
    // 启动自动切换
    startAutoSwitch(duration) {
      // 清理之前的定时器
      this.stopAutoSwitch()
      
      this.countdown = duration
      this.showCountdown = true

      logger.info('⏰ 启动自动切换定时器:', {
        duration: duration,
        showCountdown: this.showCountdown
      })

      this.countdownTimer = setInterval(() => {
        this.countdown--
        
        // 倒计时结束，切换内容
        if (this.countdown <= 0) {
          this.stopAutoSwitch()
          this.handleAutoSwitchTimeout()
        }
        
        // 在最后5秒显示更明显的提示
        if (this.countdown <= 5 && this.countdown > 0) {
          logger.debug('🔔 即将切换内容:', this.countdown + '秒')
        }
      }, 1000)
    },

    // 处理自动切换超时
    handleAutoSwitchTimeout() {
      logger.info('⏰ 自动切换触发')
      
      const currentContent = this.currentContent
      if (currentContent) {
        logger.info('🔄 当前内容播放时间已到:', {
          title: currentContent.title,
          type: currentContent.content_type,
          duration: currentContent.duration
        })
      }
      
      this.switchToNextContent()
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

    // 处理内容播放列表切换
    switchToNextContent() {
      this.stopAutoSwitch()
      
      if (!this.contentData || !this.contentData.data) {
        logger.warn('❌ 没有内容数据，无法切换')
        return
      }

      const data = this.contentData.data
      const { display_mode, contents } = data

      logger.info('🔄 准备切换到下一个内容:', {
        currentIndex: this.currentContentIndex,
        totalContents: contents.length,
        displayMode: display_mode,
        displayModeName: data.display_mode_name
      })

      // 根据播放模式处理切换逻辑
      switch (display_mode) {
        case 1: // 按顺序播放
          this.switchBySequence(contents)
          break
        case 2: // 随机播放
          this.switchByRandom(contents)
          break
        case 3: // 单曲循环
          this.switchByLoop(contents)
          break
        default:
          logger.warn('⚠️ 未知的播放模式:', display_mode)
          this.switchBySequence(contents) // 默认按顺序播放
      }
    },

    // 按顺序切换
    switchBySequence(contents) {
      if (this.currentContentIndex < contents.length - 1) {
        this.currentContentIndex++
      } else {
        // 到达末尾，重新开始
        this.currentContentIndex = 0
      }
      
      logger.info('📋 按顺序切换:', {
        newIndex: this.currentContentIndex,
        totalContents: contents.length,
        newContent: contents[this.currentContentIndex]?.title
      })
    },

    // 随机切换
    switchByRandom(contents) {
      if (contents.length <= 1) {
        logger.info('📋 内容数量不足，无法随机切换')
        return
      }
      
      let newIndex
      do {
        newIndex = Math.floor(Math.random() * contents.length)
      } while (newIndex === this.currentContentIndex && contents.length > 1)
      
      this.currentContentIndex = newIndex
      
      logger.info('🎲 随机切换:', {
        newIndex: this.currentContentIndex,
        totalContents: contents.length,
        newContent: contents[this.currentContentIndex]?.title
      })
    },

    // 单曲循环
    switchByLoop(contents) {
      // 单曲循环不改变索引，重新播放当前内容
      logger.info('🔂 单曲循环:', {
        index: this.currentContentIndex,
        content: contents[this.currentContentIndex]?.title
      })
    },

    // 切换到上一个内容
    switchToPreviousContent() {
      const playContents = this.getPlayContents()
      
      if (playContents.length <= 1) {
        logger.info('🎬 只有一个或没有内容，无法切换')
        return
      }

      const oldIndex = this.currentContentIndex
      this.currentContentIndex = this.currentContentIndex === 0 
        ? playContents.length - 1 
        : this.currentContentIndex - 1
      
      logger.info('🎬 切换到上一个内容:', {
        oldIndex,
        newIndex: this.currentContentIndex,
        totalContents: playContents.length,
        newContent: {
          type: playContents[this.currentContentIndex].content_type,
          title: playContents[this.currentContentIndex].title
        }
      })
    },

    // 切换到指定索引的内容
    switchToContentIndex(index) {
      const playContents = this.getPlayContents()
      
      if (index < 0 || index >= playContents.length) {
        logger.warn('🎬 无效的内容索引:', index)
        return
      }

      if (index === this.currentContentIndex) {
        logger.info('🎬 已经是当前内容，无需切换')
        return
      }

      const oldIndex = this.currentContentIndex
      this.currentContentIndex = index
      
      logger.info('🎬 切换到指定内容:', {
        oldIndex,
        newIndex: this.currentContentIndex,
        totalContents: playContents.length,
        targetContent: {
          type: playContents[this.currentContentIndex].content_type,
          title: playContents[this.currentContentIndex].title
        }
      })
    },

    // 添加到播放历史
    addToPlayHistory(content) {
      const historyItem = {
        ...content,
        playTime: new Date().toISOString(),
        index: this.currentContentIndex
      }
      
      this.playHistory.unshift(historyItem)
      
      // 限制历史记录数量
      if (this.playHistory.length > this.maxHistorySize) {
        this.playHistory = this.playHistory.slice(0, this.maxHistorySize)
      }
      
      logger.debug('📝 添加播放历史:', {
        title: content.title,
        type: content.content_type,
        historySize: this.playHistory.length
      })
    },

    // 获取播放统计信息
    getPlayStats() {
      const playContents = this.getPlayContents()
      return {
        totalContents: playContents.length,
        currentIndex: this.currentContentIndex,
        isPlaying: this.isPlayingContent,
        playHistory: this.playHistory,
        currentContent: this.currentContent,
        displayMode: this.contentData?.data?.display_mode,
        displayModeName: this.contentData?.data?.display_mode_name
      }
    },
    
    // 事件处理方法
    handleContentLoad() {
      logger.info('✅ 内容加载完成:', {
        title: this.currentContent?.title,
        type: this.currentContent?.content_type,
        url: this.currentContent?.content_url
      })
    },

    handleContentError(error) {
      logger.error('❌ 内容加载/播放失败:', {
        title: this.currentContent?.title,
        type: this.currentContent?.content_type,
        error: error
      })

      uni.showToast({
        title: '内容播放失败',
        icon: 'error',
        duration: 2000
      })

      // 3秒后自动切换到下一个内容
      setTimeout(() => {
        logger.info('🔄 由于错误自动切换到下一个内容')
        this.switchToNextContent()
      }, 3000)
    },

    handleContentEnded() {
      logger.info('🏁 内容播放结束:', {
        title: this.currentContent?.title,
        type: this.currentContent?.content_type
      })

      // 对于有自然结束的内容（如视频、音频），立即切换到下一个
      if (!this.isLoopMode) {
        logger.info('🔄 内容自然结束，切换到下一个')
        this.switchToNextContent()
      }
    },

    handleRetryFailed() {
      logger.error('🚫 内容重试失败，切换到下一个内容')

      uni.showToast({
        title: '播放失败，切换内容',
        icon: 'error',
        duration: 2000
      })

      // 延迟切换到下一个内容
      setTimeout(() => {
        this.switchToNextContent()
      }, 2000)
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
