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
    } catch (error) {
    }
  }
  
  /**
   * 连接WebSocket
   */
  connect(url = null) {
    if (this.connectionStatus === CONNECTION_STATUS.CONNECTING || 
        this.connectionStatus === CONNECTION_STATUS.CONNECTED) {
      return
    }
    
    const wsUrl = url || this.getWebSocketUrl()
    
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTING)
    
    try {
      this.socket = uni.connectSocket({
        url: wsUrl,
        success: () => {
        },
        fail: (error) => {
          this.handleConnectionError(error)
        }
      })
      
      this.setupSocketEventHandlers()
      this.startConnectionTimeout()
      
    } catch (error) {
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
      
      
      // 如果已激活，获取内容
      if (this.isActive) {
        this.getContent()
      }
    } else {
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
    // 移除最大重连次数限制，始终保持重连
    // 但在超过一定次数后使用更长的重连间隔
    this.reconnectAttempts++
    this.setConnectionStatus(CONNECTION_STATUS.RECONNECTING)

    // 计算重连延迟 - 使用智能退避策略
    let delay
    if (this.reconnectAttempts <= 10) {
      // 前10次使用指数退避策略，最大30秒
      delay = Math.min(
        WEBSOCKET_CONFIG.RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts - 1),
        30000
      )
    } else if (this.reconnectAttempts <= 20) {
      // 11-20次使用1分钟间隔
      delay = 60000
    } else if (this.reconnectAttempts <= 50) {
      // 21-50次使用3分钟间隔
      delay = 180000
    } else {
      // 超过50次使用5分钟间隔，但永不停止重连
      delay = 300000
    }

    // 根据重连次数提供不同级别的日志信息
    if (this.reconnectAttempts <= 10) {
      this.logger.info(`${delay}ms后进行第${this.reconnectAttempts}次重连`)
    } else if (this.reconnectAttempts <= 20) {
      this.logger.warn(`网络可能存在问题，${delay}ms后进行第${this.reconnectAttempts}次重连`)
    } else if (this.reconnectAttempts === 21) {
      this.logger.warn(`长时间无法连接服务器，已尝试${this.reconnectAttempts}次，将使用更长间隔继续重连`)
    } else if (this.reconnectAttempts % 10 === 0) {
      // 每10次记录一次日志，避免日志过多
      this.logger.warn(`持续重连中，已尝试${this.reconnectAttempts}次，${delay}ms后继续`)
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * 断开连接
   */
  disconnect() {

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
   * @param {boolean} resetCounter - 是否重置重连计数器，默认为true
   */
  stopReconnect(resetCounter = true) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    // 只有在主动断开连接时才重置计数器
    // 重连失败时不重置，保持重连策略的延迟递增
    if (resetCounter) {
      this.reconnectAttempts = 0
      this.logger.info('重连计数器已重置')
    } else {
      this.logger.info('停止重连但保持计数器状态')
    }
  }

  /**
   * 开始连接超时
   */
  startConnectionTimeout() {
    this.clearConnectionTimeout()

    this.connectionTimer = setTimeout(() => {
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
      maxReconnectAttempts: this.maxReconnectAttempts, // 保留用于向后兼容
      perpetualReconnect: true, // 新增：标识启用了永久重连
      messageQueueLength: this.messageQueue.length,
      deviceInfo: this.deviceInfo,
      nextReconnectDelay: this.getNextReconnectDelay() // 新增：下次重连延迟
    }
  }

  /**
   * 获取下次重连延迟时间
   */
  getNextReconnectDelay() {
    const attempts = this.reconnectAttempts
    if (attempts <= 10) {
      return Math.min(
        WEBSOCKET_CONFIG.RECONNECT_INTERVAL * Math.pow(2, attempts),
        30000
      )
    } else if (attempts <= 20) {
      return 60000
    } else if (attempts <= 50) {
      return 180000
    } else {
      return 300000
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
