/**
 * 设备数据模型
 */

import { DEVICE_STATUS, CONNECTION_STATUS } from '../common/constants/constants.js'

/**
 * 设备信息模型
 */
export class DeviceModel {
  constructor(data = {}) {
    // 基础设备信息
    this.id = data.id || 0
    this.mac = data.mac || ''
    this.device_name = data.device_name || ''
    this.platform = data.platform || ''
    this.system = data.system || ''
    this.version = data.version || ''
    this.model = data.model || ''
    this.brand = data.brand || ''
    
    // 屏幕信息
    this.screen_width = data.screen_width || 0
    this.screen_height = data.screen_height || 0
    this.pixel_ratio = data.pixel_ratio || 1
    this.window_width = data.window_width || 0
    this.window_height = data.window_height || 0
    this.status_bar_height = data.status_bar_height || 0
    
    // 网络信息
    this.network_type = data.network_type || 'none'
    this.is_connected = data.is_connected || false
    
    // 设备状态
    this.status = data.status || DEVICE_STATUS.OFFLINE
    this.is_active = data.is_active || false
    this.last_online_time = data.last_online_time || ''
    this.last_heartbeat_time = data.last_heartbeat_time || ''
    
    // 连接状态
    this.connection_status = data.connection_status || CONNECTION_STATUS.DISCONNECTED
    this.websocket_url = data.websocket_url || ''
    this.reconnect_attempts = data.reconnect_attempts || 0
    
    // 应用信息
    this.app_version = data.app_version || '1.0.0'
    this.language = data.language || 'zh-CN'
    
    // 扩展信息
    this.metadata = data.metadata || {}
    this.capabilities = data.capabilities || []
    
    // 统计信息
    this.total_play_time = data.total_play_time || 0
    this.content_count = data.content_count || 0
    this.error_count = data.error_count || 0
  }
  
  /**
   * 获取设备状态名称
   */
  getStatusName() {
    const statusNames = {
      [DEVICE_STATUS.OFFLINE]: '离线',
      [DEVICE_STATUS.ONLINE]: '在线'
    }
    return statusNames[this.status] || '未知'
  }
  
  /**
   * 获取激活状态名称
   */
  getActiveStatusName() {
    return this.is_active ? '已激活' : '未激活'
  }
  
  /**
   * 获取连接状态名称
   */
  getConnectionStatusName() {
    const statusNames = {
      [CONNECTION_STATUS.DISCONNECTED]: '已断开',
      [CONNECTION_STATUS.CONNECTING]: '连接中',
      [CONNECTION_STATUS.CONNECTED]: '已连接',
      [CONNECTION_STATUS.RECONNECTING]: '重连中',
      [CONNECTION_STATUS.ERROR]: '连接错误'
    }
    return statusNames[this.connection_status] || '未知'
  }
  
  /**
   * 获取网络类型名称
   */
  getNetworkTypeName() {
    const typeNames = {
      'wifi': 'WiFi',
      '2g': '2G',
      '3g': '3G',
      '4g': '4G',
      '5g': '5G',
      'ethernet': '以太网',
      'unknown': '未知',
      'none': '无网络'
    }
    return typeNames[this.network_type] || this.network_type
  }
  
  /**
   * 获取屏幕分辨率字符串
   */
  getScreenResolution() {
    return `${this.screen_width}x${this.screen_height}`
  }
  
  /**
   * 获取窗口尺寸字符串
   */
  getWindowSize() {
    return `${this.window_width}x${this.window_height}`
  }
  
  /**
   * 检查是否在线
   */
  isOnline() {
    return this.status === DEVICE_STATUS.ONLINE
  }
  
  /**
   * 检查是否已连接
   */
  isConnected() {
    return this.connection_status === CONNECTION_STATUS.CONNECTED
  }
  
  /**
   * 检查网络是否可用
   */
  hasNetwork() {
    return this.is_connected && this.network_type !== 'none'
  }
  
  /**
   * 更新设备状态
   */
  updateStatus(status) {
    this.status = status
    if (status === DEVICE_STATUS.ONLINE) {
      this.last_online_time = new Date().toISOString()
    }
  }
  
  /**
   * 更新连接状态
   */
  updateConnectionStatus(status) {
    this.connection_status = status
  }
  
  /**
   * 更新网络信息
   */
  updateNetworkInfo(networkType, isConnected) {
    this.network_type = networkType
    this.is_connected = isConnected
  }
  
  /**
   * 更新激活状态
   */
  updateActiveStatus(isActive) {
    this.is_active = isActive
  }
  
  /**
   * 记录心跳时间
   */
  recordHeartbeat() {
    this.last_heartbeat_time = new Date().toISOString()
  }
  
  /**
   * 增加重连次数
   */
  incrementReconnectAttempts() {
    this.reconnect_attempts++
  }
  
  /**
   * 重置重连次数
   */
  resetReconnectAttempts() {
    this.reconnect_attempts = 0
  }
  
  /**
   * 增加错误计数
   */
  incrementErrorCount() {
    this.error_count++
  }
  
  /**
   * 重置错误计数
   */
  resetErrorCount() {
    this.error_count = 0
  }
  
  /**
   * 添加播放时间
   */
  addPlayTime(seconds) {
    this.total_play_time += seconds
  }
  
  /**
   * 更新内容计数
   */
  updateContentCount(count) {
    this.content_count = count
  }
  
  /**
   * 获取设备能力
   */
  getCapabilities() {
    return [...this.capabilities]
  }
  
  /**
   * 添加设备能力
   */
  addCapability(capability) {
    if (!this.capabilities.includes(capability)) {
      this.capabilities.push(capability)
    }
  }
  
  /**
   * 移除设备能力
   */
  removeCapability(capability) {
    const index = this.capabilities.indexOf(capability)
    if (index > -1) {
      this.capabilities.splice(index, 1)
    }
  }
  
  /**
   * 检查是否支持某个能力
   */
  hasCapability(capability) {
    return this.capabilities.includes(capability)
  }
  
  /**
   * 获取设备摘要信息
   */
  getSummary() {
    return {
      name: this.device_name,
      mac: this.mac,
      platform: this.platform,
      model: this.model,
      status: this.getStatusName(),
      activeStatus: this.getActiveStatusName(),
      connectionStatus: this.getConnectionStatusName(),
      networkType: this.getNetworkTypeName(),
      resolution: this.getScreenResolution(),
      lastOnline: this.last_online_time,
      lastHeartbeat: this.last_heartbeat_time
    }
  }
  
  /**
   * 获取详细信息用于显示
   */
  getDetailedInfo() {
    return {
      '设备名称': this.device_name,
      'MAC地址': this.mac,
      '设备ID': this.id || '未分配',
      '平台': this.platform,
      '系统': this.system,
      '版本': this.version,
      '型号': this.model,
      '品牌': this.brand,
      '屏幕分辨率': this.getScreenResolution(),
      '像素比': this.pixel_ratio,
      '窗口尺寸': this.getWindowSize(),
      '状态栏高度': this.status_bar_height,
      '语言': this.language,
      '应用版本': this.app_version,
      '设备状态': this.getStatusName(),
      '激活状态': this.getActiveStatusName(),
      '连接状态': this.getConnectionStatusName(),
      '网络类型': this.getNetworkTypeName(),
      '网络连接': this.is_connected ? '已连接' : '未连接',
      '最后在线': this.last_online_time || '从未在线',
      '最后心跳': this.last_heartbeat_time || '无',
      '重连次数': this.reconnect_attempts,
      '总播放时长': `${Math.floor(this.total_play_time / 60)}分钟`,
      '内容数量': this.content_count,
      '错误次数': this.error_count,
      '设备能力': this.capabilities.join(', ') || '无'
    }
  }
  
  /**
   * 验证设备数据
   */
  validate() {
    const errors = []
    
    if (!this.mac) {
      errors.push('MAC地址不能为空')
    }
    
    if (!this.device_name) {
      errors.push('设备名称不能为空')
    }
    
    if (this.screen_width <= 0 || this.screen_height <= 0) {
      errors.push('屏幕尺寸必须大于0')
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
      mac: this.mac,
      device_name: this.device_name,
      platform: this.platform,
      system: this.system,
      version: this.version,
      model: this.model,
      brand: this.brand,
      screen_width: this.screen_width,
      screen_height: this.screen_height,
      pixel_ratio: this.pixel_ratio,
      window_width: this.window_width,
      window_height: this.window_height,
      status_bar_height: this.status_bar_height,
      network_type: this.network_type,
      is_connected: this.is_connected,
      status: this.status,
      is_active: this.is_active,
      last_online_time: this.last_online_time,
      last_heartbeat_time: this.last_heartbeat_time,
      connection_status: this.connection_status,
      websocket_url: this.websocket_url,
      reconnect_attempts: this.reconnect_attempts,
      app_version: this.app_version,
      language: this.language,
      metadata: this.metadata,
      capabilities: this.capabilities,
      total_play_time: this.total_play_time,
      content_count: this.content_count,
      error_count: this.error_count
    }
  }
  
  /**
   * 从JSON创建实例
   */
  static fromJSON(json) {
    return new DeviceModel(json)
  }
  
  /**
   * 克隆设备对象
   */
  clone() {
    return new DeviceModel(this.toJSON())
  }
}
