/**
 * 内容数据模型
 */

import { CONTENT_TYPES, SUPPORTED_FORMATS } from '../common/constants/constants.js'

/**
 * 内容基础模型
 */
export class ContentModel {
  constructor(data = {}) {
    this.id = data.id || 0
    this.title = data.title || ''
    this.content_type = data.content_type || CONTENT_TYPES.WEBPAGE
    this.content_url = data.content_url || ''
    this.thumbnail = data.thumbnail || ''
    this.duration = data.duration || 0
    this.file_size = data.file_size || 0
    this.created_at = data.created_at || ''
    this.updated_at = data.updated_at || ''
    
    // 播放列表相关字段
    this.playlist_id = data.playlist_id || null
    this.playlist_name = data.playlist_name || ''
    this.play_mode = data.play_mode || 1
    this.playlist_sort = data.playlist_sort || 0
    this.content_sort = data.content_sort || 0
    
    // 扩展字段
    this.description = data.description || ''
    this.tags = data.tags || []
    this.metadata = data.metadata || {}
    
    // 播放状态
    this.is_playing = false
    this.current_time = 0
    this.load_progress = 0
    this.error_message = ''
  }
  
  /**
   * 获取内容类型名称
   */
  getContentTypeName() {
    const typeNames = {
      [CONTENT_TYPES.WEBPAGE]: '网页',
      [CONTENT_TYPES.IMAGE]: '图片',
      [CONTENT_TYPES.VIDEO]: '视频',
      [CONTENT_TYPES.LIVE_STREAM]: '直播流',
      [CONTENT_TYPES.AUDIO]: '音频'
    }
    return typeNames[this.content_type] || '未知'
  }
  
  /**
   * 检查是否为媒体文件
   */
  isMediaFile() {
    return [
      CONTENT_TYPES.VIDEO,
      CONTENT_TYPES.AUDIO,
      CONTENT_TYPES.IMAGE
    ].includes(this.content_type)
  }
  
  /**
   * 检查是否为视频
   */
  isVideo() {
    return this.content_type === CONTENT_TYPES.VIDEO
  }
  
  /**
   * 检查是否为音频
   */
  isAudio() {
    return this.content_type === CONTENT_TYPES.AUDIO
  }
  
  /**
   * 检查是否为图片
   */
  isImage() {
    return this.content_type === CONTENT_TYPES.IMAGE
  }
  
  /**
   * 检查是否为网页
   */
  isWebpage() {
    return this.content_type === CONTENT_TYPES.WEBPAGE
  }
  
  /**
   * 检查是否为直播流
   */
  isLiveStream() {
    return this.content_type === CONTENT_TYPES.LIVE_STREAM
  }
  
  /**
   * 获取文件扩展名
   */
  getFileExtension() {
    if (!this.content_url) return ''
    
    const url = this.content_url.split('?')[0] // 移除查询参数
    const parts = url.split('.')
    return parts.length > 1 ? parts.pop().toLowerCase() : ''
  }
  
  /**
   * 检查文件格式是否支持
   */
  isFormatSupported() {
    const extension = this.getFileExtension()
    if (!extension) return true // 网页等无扩展名的内容默认支持
    
    const allFormats = [
      ...SUPPORTED_FORMATS.VIDEO,
      ...SUPPORTED_FORMATS.AUDIO,
      ...SUPPORTED_FORMATS.IMAGE,
      ...SUPPORTED_FORMATS.LIVE_STREAM
    ]
    
    return allFormats.includes(extension)
  }
  
  /**
   * 格式化持续时间
   */
  getFormattedDuration() {
    if (!this.duration || this.duration <= 0) return '--'
    
    const hours = Math.floor(this.duration / 3600)
    const minutes = Math.floor((this.duration % 3600) / 60)
    const seconds = Math.floor(this.duration % 60)
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
  }
  
  /**
   * 格式化文件大小
   */
  getFormattedFileSize() {
    if (!this.file_size || this.file_size <= 0) return '--'
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = this.file_size
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }
  
  /**
   * 获取缩略图URL
   */
  getThumbnailUrl() {
    if (this.thumbnail) {
      return this.thumbnail
    }
    
    // 为不同类型提供默认缩略图
    switch (this.content_type) {
      case CONTENT_TYPES.VIDEO:
        return '/static/icons/video-default.png'
      case CONTENT_TYPES.AUDIO:
        return '/static/icons/audio-default.png'
      case CONTENT_TYPES.IMAGE:
        return this.content_url // 图片本身就是缩略图
      case CONTENT_TYPES.WEBPAGE:
        return '/static/icons/webpage-default.png'
      case CONTENT_TYPES.LIVE_STREAM:
        return '/static/icons/live-default.png'
      default:
        return '/static/icons/content-default.png'
    }
  }
  
  /**
   * 验证内容数据
   */
  validate() {
    const errors = []
    
    if (!this.content_url) {
      errors.push('内容URL不能为空')
    }
    
    if (!Object.values(CONTENT_TYPES).includes(this.content_type)) {
      errors.push('无效的内容类型')
    }
    
    if (this.duration < 0) {
      errors.push('持续时间不能为负数')
    }
    
    if (this.file_size < 0) {
      errors.push('文件大小不能为负数')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * 转换为JSON对象
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content_type: this.content_type,
      content_url: this.content_url,
      thumbnail: this.thumbnail,
      duration: this.duration,
      file_size: this.file_size,
      created_at: this.created_at,
      updated_at: this.updated_at,
      playlist_id: this.playlist_id,
      playlist_name: this.playlist_name,
      play_mode: this.play_mode,
      playlist_sort: this.playlist_sort,
      content_sort: this.content_sort,
      description: this.description,
      tags: this.tags,
      metadata: this.metadata
    }
  }
  
  /**
   * 从JSON创建实例
   */
  static fromJSON(json) {
    return new ContentModel(json)
  }
  
  /**
   * 克隆内容对象
   */
  clone() {
    return new ContentModel(this.toJSON())
  }
  
  /**
   * 更新内容数据
   */
  update(data) {
    Object.keys(data).forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key] = data[key]
      }
    })
  }
  
  /**
   * 重置播放状态
   */
  resetPlayState() {
    this.is_playing = false
    this.current_time = 0
    this.load_progress = 0
    this.error_message = ''
  }
  
  /**
   * 设置播放状态
   */
  setPlayState(isPlaying, currentTime = 0, loadProgress = 0) {
    this.is_playing = isPlaying
    this.current_time = currentTime
    this.load_progress = loadProgress
  }
  
  /**
   * 设置错误信息
   */
  setError(message) {
    this.error_message = message
    this.is_playing = false
  }
  
  /**
   * 清除错误信息
   */
  clearError() {
    this.error_message = ''
  }
  
  /**
   * 检查是否有错误
   */
  hasError() {
    return !!this.error_message
  }
}
