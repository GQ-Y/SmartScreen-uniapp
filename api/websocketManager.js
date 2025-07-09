/**
 * WebSocket管理器
 * 基于uni.connectSocket实现WebSocket连接管理
 */

import {
  WEBSOCKET_CONFIG,
  MESSAGE_TYPES,
  CONNECTION_STATUS
} from '../common/constants/constants.js'
import {
  MessageFactory,
  RegisterMessage,
  HeartbeatMessage,
  GetContentMessage
} from '../common/types/messageTypes.js'
import { DeviceUtils } from '../common/utils/deviceUtils.js'
import { Logger } from '../common/utils/logger.js'
import { WEBSOCKET_CONFIG as WS_CONFIG } from './config.js'

export class WebSocketManager {
  constructor() {
    this.socket = null
    this.connectionStatus = CONNECTION_STATUS.DISCONNECTED
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.connectionTimer = null

    // 设备信息
    this.deviceInfo = null
    this.isRegistered = false
    this.isActive = false
    
    // 事件监听器
    this.eventListeners = {
      onConnect: [],
      onDisconnect: [],
      onMessage: [],
      onError: [],
      onStatusChange: []
    }
    
    // 消息队列
    this.messageQueue = []
    this.isProcessingQueue = false
    
    this.logger = Logger.createTaggedLogger('WebSocket')
    
    // 初始化
    this.init()
  }
  
  /**
   * 初始化
   */
  async init() {
    try {
      this.deviceInfo = await DeviceUtils.getDeviceInfo()
      this.logger.info('WebSocket管理器初始化完成', this.deviceInfo)
    } catch (error) {
      this.logger.error('WebSocket管理器初始化失败', error)
    }
  }
  
  /**
   * 连接WebSocket
   */
  connect(url = null) {
    if (this.connectionStatus === CONNECTION_STATUS.CONNECTING || 
        this.connectionStatus === CONNECTION_STATUS.CONNECTED) {
      this.logger.warn('WebSocket已连接或正在连接中')
      return
    }
    
    const wsUrl = url || this.getWebSocketUrl()
    this.logger.info('开始连接WebSocket', wsUrl)
    
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTING)
    
    try {
      this.socket = uni.connectSocket({
        url: wsUrl,
        success: () => {
          this.logger.info('WebSocket连接请求发送成功')
        },
        fail: (error) => {
          this.logger.error('WebSocket连接请求失败', error)
          this.handleConnectionError(error)
        }
      })
      
      this.setupSocketEventHandlers()
      this.startConnectionTimeout()
      
    } catch (error) {
      this.logger.error('创建WebSocket连接失败', error)
      this.handleConnectionError(error)
    }
  }
  
  /**
   * 设置Socket事件处理器
   */
  setupSocketEventHandlers() {
    if (!this.socket) return
    
    // 连接打开
    this.socket.onOpen(() => {
      this.logger.info('WebSocket连接已建立')
      this.clearConnectionTimeout()
      this.setConnectionStatus(CONNECTION_STATUS.CONNECTED)
      this.reconnectAttempts = 0
      this.triggerEvent('onConnect')
      
      // 发送注册消息
      this.register()
      
      // 开始心跳
      this.startHeartbeat()
      
      // 处理消息队列
      this.processMessageQueue()
    })
    
    // 接收消息
    this.socket.onMessage((res) => {
      this.handleMessage(res.data)
    })
    
    // 连接关闭
    this.socket.onClose((res) => {
      this.handleDisconnection()
    })
    
    // 连接错误
    this.socket.onError((error) => {
      this.handleConnectionError(error)
    })
  }
  
  /**
   * 处理消息
   */
  handleMessage(data) {
    try {

      const message = MessageFactory.parseMessage(data)
      this.logger.info('解析后的WebSocket消息:', JSON.stringify(message, null, 2))
      this.triggerEvent('onMessage', message)
      
      // 处理特定消息类型
      switch (message.type) {
        case MESSAGE_TYPES.REGISTER_ACK:
          this.handleRegisterAck(message)
          break
        case MESSAGE_TYPES.HEARTBEAT_ACK:
          this.handleHeartbeatAck(message)
          break
        case MESSAGE_TYPES.ACTIVE_STATUS:
          this.handleActiveStatus(message)
          break
        case MESSAGE_TYPES.CONTENT_RESPONSE:
        case MESSAGE_TYPES.PUSH_CONTENT:
        case MESSAGE_TYPES.DISPLAY_MODE_CHANGE:
        case MESSAGE_TYPES.TEMP_CONTENT:
        case MESSAGE_TYPES.BATCH_CONTROL:
        case MESSAGE_TYPES.REFRESH:
          // 这些消息由外部处理
          break
        case MESSAGE_TYPES.ERROR:
          this.logger.error('服务器错误消息', message)
          break
        default:
          this.logger.warn('未知消息类型', message)
      }
      
    } catch (error) {
      this.logger.error('处理WebSocket消息失败', error)
    }
  }
  
  /**
   * 发送消息
   */
  sendMessage(message) {
    if (this.connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      this.logger.warn('WebSocket未连接，消息加入队列:', JSON.stringify(message, null, 2))
      this.messageQueue.push(message)
      return false
    }

    try {
      const data = JSON.stringify(message)

      this.socket.send({
        data,
        success: () => {
          this.logger.info('消息发送成功')
        },
        fail: (error) => {
          this.logger.error('消息发送失败:', error)
          this.logger.error('失败的消息内容:', JSON.stringify(message, null, 2))
          // 重新加入队列
          this.messageQueue.unshift(message)
        }
      })
      return true
    } catch (error) {
      this.logger.error('序列化消息失败', error)
      return false
    }
  }
  
  /**
   * 设备注册
   */
  register() {
    if (!this.deviceInfo) {
      this.logger.error('设备信息未初始化，无法注册')
      return
    }
    
    const message = new RegisterMessage(
      this.deviceInfo.mac,
      this.deviceInfo.deviceName
    )
    
    this.sendMessage(message)
  }
  
  /**
   * 处理注册响应
   */
  handleRegisterAck(message) {

    if (message.success) {
      this.isRegistered = true
      this.isActive = message.active
      
      // 保存设备ID
      if (message.device_id) {
        const config = DeviceUtils.getDeviceConfig()
        config.deviceId = message.device_id
        DeviceUtils.saveDeviceConfig(config)
      }
      
      this.logger.info(`设备注册成功，激活状态: ${this.isActive}`)
      
      // 如果已激活，获取内容
      if (this.isActive) {
        this.getContent()
      }
    } else {
      this.logger.error('设备注册失败', message.msg)
    }
  }
  
  /**
   * 发送心跳
   */
  sendHeartbeat() {
    if (!this.deviceInfo || !this.isRegistered) {
      return
    }
    
    const message = new HeartbeatMessage(this.deviceInfo.mac)
    this.sendMessage(message)
  }
  
  /**
   * 处理心跳响应
   */
  handleHeartbeatAck(message) {

    if (message.success) {
      this.isActive = message.active
    } else {
    }
  }
  
  /**
   * 处理激活状态变更
   */
  handleActiveStatus(message) {
    this.isActive = message.active

    if (this.isActive) {
      this.getContent()
    } else {
      this.logger.warn('设备已禁用')
    }
  }
  
  /**
   * 获取内容
   */
  getContent() {
    if (!this.deviceInfo || !this.isRegistered) {
      return
    }
    
    const message = new GetContentMessage(this.deviceInfo.mac)
    this.sendMessage(message)
  }
  
  /**
   * 开始心跳
   */
  startHeartbeat() {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
    }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL)
    
  }
  
  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * 处理断开连接
   */
  handleDisconnection() {
    this.setConnectionStatus(CONNECTION_STATUS.DISCONNECTED)
    this.stopHeartbeat()
    this.clearConnectionTimeout()
    this.isRegistered = false
    this.isActive = false

    this.triggerEvent('onDisconnect')

    // 自动重连
    this.scheduleReconnect()
  }

  /**
   * 处理连接错误
   */
  handleConnectionError(error) {
    this.setConnectionStatus(CONNECTION_STATUS.ERROR)
    this.stopHeartbeat()
    this.clearConnectionTimeout()

    this.triggerEvent('onError', error)

    // 自动重连
    this.scheduleReconnect()
  }

  /**
   * 安排重连
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('达到最大重连次数，停止重连')
      return
    }

    this.reconnectAttempts++
    this.setConnectionStatus(CONNECTION_STATUS.RECONNECTING)

    const delay = Math.min(
      WEBSOCKET_CONFIG.RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts - 1),
      30000
    )

    this.logger.info(`${delay}ms后进行第${this.reconnectAttempts}次重连`)

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.logger.info('主动断开WebSocket连接')

    this.stopReconnect()
    this.stopHeartbeat()
    this.clearConnectionTimeout()

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    this.setConnectionStatus(CONNECTION_STATUS.DISCONNECTED)
    this.isRegistered = false
    this.isActive = false
  }

  /**
   * 停止重连
   */
  stopReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = 0
  }

  /**
   * 开始连接超时
   */
  startConnectionTimeout() {
    this.clearConnectionTimeout()

    this.connectionTimer = setTimeout(() => {
      this.logger.error('WebSocket连接超时')
      this.handleConnectionError(new Error('连接超时'))
    }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT)
  }

  /**
   * 清除连接超时
   */
  clearConnectionTimeout() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = null
    }
  }

  /**
   * 设置连接状态
   */
  setConnectionStatus(status) {
    if (this.connectionStatus !== status) {
      const oldStatus = this.connectionStatus
      this.connectionStatus = status
      this.logger.info(`连接状态变更: ${oldStatus} -> ${status}`)
      this.triggerEvent('onStatusChange', { oldStatus, newStatus: status })
    }
  }

  /**
   * 处理消息队列
   */
  async processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true
    this.logger.info(`开始处理消息队列，共${this.messageQueue.length}条消息`)

    while (this.messageQueue.length > 0 &&
           this.connectionStatus === CONNECTION_STATUS.CONNECTED) {
      const message = this.messageQueue.shift()
      this.sendMessage(message)

      // 避免发送过快
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.isProcessingQueue = false
    this.logger.info('消息队列处理完成')
  }

  /**
   * 获取WebSocket URL
   */
  getWebSocketUrl() {
    // 使用配置文件中的地址和端口
    return WS_CONFIG.getUrl()
  }



  /**
   * 添加事件监听器
   */
  addEventListener(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback)
    }
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(event, callback) {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(callback)
      if (index > -1) {
        this.eventListeners[event].splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  triggerEvent(event, data = null) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          this.logger.error(`事件回调执行失败: ${event}`, error)
        }
      })
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      isConnected: this.connectionStatus === CONNECTION_STATUS.CONNECTED,
      isRegistered: this.isRegistered,
      isActive: this.isActive,
      reconnectAttempts: this.reconnectAttempts,
      queueLength: this.messageQueue.length
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      connectionStatus: this.connectionStatus,
      isRegistered: this.isRegistered,
      isActive: this.isActive,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      messageQueueLength: this.messageQueue.length,
      deviceInfo: this.deviceInfo
    }
  }

  /**
   * 重置连接
   */
  reset() {
    this.logger.info('重置WebSocket连接')
    this.disconnect()
    this.reconnectAttempts = 0
    this.messageQueue = []
  }

  /**
   * 销毁实例
   */
  destroy() {
    this.logger.info('销毁WebSocket管理器')
    this.disconnect()
    this.eventListeners = {
      onConnect: [],
      onDisconnect: [],
      onMessage: [],
      onError: [],
      onStatusChange: []
    }
    this.messageQueue = []
  }
}
