/**
 * 消息数据模型
 */

import { MESSAGE_TYPES } from '../common/constants/constants.js'
import { ContentModel } from './contentModel.js'

/**
 * 消息基础模型
 */
export class MessageModel {
  constructor(data = {}) {
    this.id = data.id || this.generateId()
    this.type = data.type || ''
    this.timestamp = data.timestamp || Date.now()
    this.data = data.data || {}
    this.status = data.status || 'pending' // pending, sent, received, processed, error
    this.error = data.error || null
    this.retry_count = data.retry_count || 0
    this.max_retries = data.max_retries || 3
  }
  
  /**
   * 生成消息ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }
  
  /**
   * 获取消息类型名称
   */
  getTypeName() {
    const typeNames = {
      [MESSAGE_TYPES.REGISTER]: '设备注册',
      [MESSAGE_TYPES.REGISTER_ACK]: '注册响应',
      [MESSAGE_TYPES.HEARTBEAT]: '心跳',
      [MESSAGE_TYPES.HEARTBEAT_ACK]: '心跳响应',
      [MESSAGE_TYPES.GET_CONTENT]: '获取内容',
      [MESSAGE_TYPES.CONTENT_RESPONSE]: '内容响应',
      [MESSAGE_TYPES.ACTIVE_STATUS]: '激活状态',
      [MESSAGE_TYPES.PUSH_CONTENT]: '推送内容',
      [MESSAGE_TYPES.DISPLAY_MODE_CHANGE]: '播放策略变更',
      [MESSAGE_TYPES.TEMP_CONTENT]: '临时内容',
      [MESSAGE_TYPES.BATCH_CONTROL]: '批量控制',
      [MESSAGE_TYPES.REFRESH]: '刷新指令',
      [MESSAGE_TYPES.ERROR]: '错误消息'
    }
    return typeNames[this.type] || this.type
  }
  
  /**
   * 获取状态名称
   */
  getStatusName() {
    const statusNames = {
      'pending': '待发送',
      'sent': '已发送',
      'received': '已接收',
      'processed': '已处理',
      'error': '错误'
    }
    return statusNames[this.status] || this.status
  }
  
  /**
   * 检查是否为客户端发送的消息
   */
  isClientMessage() {
    return [
      MESSAGE_TYPES.REGISTER,
      MESSAGE_TYPES.HEARTBEAT,
      MESSAGE_TYPES.GET_CONTENT
    ].includes(this.type)
  }
  
  /**
   * 检查是否为服务端响应消息
   */
  isServerResponse() {
    return [
      MESSAGE_TYPES.REGISTER_ACK,
      MESSAGE_TYPES.HEARTBEAT_ACK,
      MESSAGE_TYPES.CONTENT_RESPONSE
    ].includes(this.type)
  }
  
  /**
   * 检查是否为服务端推送消息
   */
  isServerPush() {
    return [
      MESSAGE_TYPES.ACTIVE_STATUS,
      MESSAGE_TYPES.PUSH_CONTENT,
      MESSAGE_TYPES.DISPLAY_MODE_CHANGE,
      MESSAGE_TYPES.TEMP_CONTENT,
      MESSAGE_TYPES.BATCH_CONTROL,
      MESSAGE_TYPES.REFRESH
    ].includes(this.type)
  }
  
  /**
   * 检查是否为错误消息
   */
  isError() {
    return this.type === MESSAGE_TYPES.ERROR || this.status === 'error'
  }
  
  /**
   * 检查是否需要重试
   */
  needsRetry() {
    return this.status === 'error' && this.retry_count < this.max_retries
  }
  
  /**
   * 增加重试次数
   */
  incrementRetry() {
    this.retry_count++
  }
  
  /**
   * 重置重试次数
   */
  resetRetry() {
    this.retry_count = 0
  }
  
  /**
   * 设置状态
   */
  setStatus(status, error = null) {
    this.status = status
    this.error = error
    if (status !== 'error') {
      this.error = null
    }
  }
  
  /**
   * 设置错误
   */
  setError(error) {
    this.status = 'error'
    this.error = error
  }
  
  /**
   * 清除错误
   */
  clearError() {
    this.error = null
    if (this.status === 'error') {
      this.status = 'pending'
    }
  }
  
  /**
   * 获取格式化时间
   */
  getFormattedTime() {
    return new Date(this.timestamp).toLocaleString()
  }
  
  /**
   * 获取消息摘要
   */
  getSummary() {
    return {
      id: this.id,
      type: this.getTypeName(),
      status: this.getStatusName(),
      time: this.getFormattedTime(),
      hasError: this.isError(),
      retryCount: this.retry_count
    }
  }
  
  /**
   * 转换为JSON对象
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      data: this.data,
      status: this.status,
      error: this.error,
      retry_count: this.retry_count,
      max_retries: this.max_retries
    }
  }
  
  /**
   * 从JSON创建实例
   */
  static fromJSON(json) {
    return new MessageModel(json)
  }
  
  /**
   * 克隆消息对象
   */
  clone() {
    return new MessageModel(this.toJSON())
  }
}

/**
 * 内容响应数据模型
 */
export class ContentResponseModel {
  constructor(data = {}) {
    this.device_id = data.device_id || 0
    this.display_mode = data.display_mode || 1
    this.display_mode_name = data.display_mode_name || ''
    this.has_direct_content = data.has_direct_content || false
    this.has_playlist_contents = data.has_playlist_contents || false
    this.total_contents = data.total_contents || 0
    
    // 内容数据
    this.direct_content = data.direct_content ? 
      new ContentModel(data.direct_content) : null
    this.playlist_contents = (data.playlist_contents || [])
      .map(item => new ContentModel(item))
    this.primary_contents = (data.primary_contents || [])
      .map(item => new ContentModel(item))
    this.secondary_contents = (data.secondary_contents || [])
      .map(item => new ContentModel(item))
  }
  
  /**
   * 获取所有内容
   */
  getAllContents() {
    const contents = []
    
    if (this.direct_content) {
      contents.push(this.direct_content)
    }
    
    contents.push(...this.playlist_contents)
    contents.push(...this.primary_contents)
    contents.push(...this.secondary_contents)
    
    return contents
  }
  
  /**
   * 获取主要播放内容
   */
  getPrimaryContents() {
    switch (this.display_mode) {
      case 1: // 播放列表优先
        return this.playlist_contents.length > 0 ? 
          this.playlist_contents : 
          (this.direct_content ? [this.direct_content] : [])
      case 2: // 直接内容优先
        return this.direct_content ? 
          [this.direct_content] : 
          this.playlist_contents
      case 3: // 仅播放列表
        return this.playlist_contents
      case 4: // 仅直接内容
        return this.direct_content ? [this.direct_content] : []
      default:
        return this.primary_contents
    }
  }
  
  /**
   * 获取次要播放内容
   */
  getSecondaryContents() {
    return this.secondary_contents
  }
  
  /**
   * 检查是否有内容
   */
  hasContent() {
    return this.total_contents > 0 || 
           this.has_direct_content || 
           this.has_playlist_contents
  }
  
  /**
   * 检查是否有直接内容
   */
  hasDirectContent() {
    return this.has_direct_content && this.direct_content !== null
  }
  
  /**
   * 检查是否有播放列表内容
   */
  hasPlaylistContent() {
    return this.has_playlist_contents && this.playlist_contents.length > 0
  }
  
  /**
   * 获取内容统计
   */
  getContentStats() {
    return {
      total: this.total_contents,
      direct: this.hasDirectContent() ? 1 : 0,
      playlist: this.playlist_contents.length,
      primary: this.primary_contents.length,
      secondary: this.secondary_contents.length
    }
  }
  
  /**
   * 按类型分组内容
   */
  getContentsByType() {
    const contentsByType = {}
    const allContents = this.getAllContents()
    
    allContents.forEach(content => {
      const typeName = content.getContentTypeName()
      if (!contentsByType[typeName]) {
        contentsByType[typeName] = []
      }
      contentsByType[typeName].push(content)
    })
    
    return contentsByType
  }
  
  /**
   * 转换为JSON对象
   */
  toJSON() {
    return {
      device_id: this.device_id,
      display_mode: this.display_mode,
      display_mode_name: this.display_mode_name,
      has_direct_content: this.has_direct_content,
      has_playlist_contents: this.has_playlist_contents,
      total_contents: this.total_contents,
      direct_content: this.direct_content ? this.direct_content.toJSON() : null,
      playlist_contents: this.playlist_contents.map(item => item.toJSON()),
      primary_contents: this.primary_contents.map(item => item.toJSON()),
      secondary_contents: this.secondary_contents.map(item => item.toJSON())
    }
  }
  
  /**
   * 从JSON创建实例
   */
  static fromJSON(json) {
    return new ContentResponseModel(json)
  }
}

/**
 * 消息历史管理器
 */
export class MessageHistoryManager {
  constructor(maxSize = 1000) {
    this.messages = []
    this.maxSize = maxSize
  }
  
  /**
   * 添加消息
   */
  addMessage(message) {
    this.messages.push(message)
    
    // 限制消息数量
    if (this.messages.length > this.maxSize) {
      this.messages = this.messages.slice(-this.maxSize)
    }
  }
  
  /**
   * 获取所有消息
   */
  getAllMessages() {
    return [...this.messages]
  }
  
  /**
   * 按类型获取消息
   */
  getMessagesByType(type) {
    return this.messages.filter(msg => msg.type === type)
  }
  
  /**
   * 按状态获取消息
   */
  getMessagesByStatus(status) {
    return this.messages.filter(msg => msg.status === status)
  }
  
  /**
   * 获取错误消息
   */
  getErrorMessages() {
    return this.messages.filter(msg => msg.isError())
  }
  
  /**
   * 获取最近的消息
   */
  getRecentMessages(count = 50) {
    return this.messages.slice(-count)
  }
  
  /**
   * 清空消息历史
   */
  clear() {
    this.messages = []
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {
      total: this.messages.length,
      byType: {},
      byStatus: {},
      errorCount: 0
    }
    
    this.messages.forEach(msg => {
      // 按类型统计
      const typeName = msg.getTypeName()
      stats.byType[typeName] = (stats.byType[typeName] || 0) + 1
      
      // 按状态统计
      const statusName = msg.getStatusName()
      stats.byStatus[statusName] = (stats.byStatus[statusName] || 0) + 1
      
      // 错误统计
      if (msg.isError()) {
        stats.errorCount++
      }
    })
    
    return stats
  }
}
