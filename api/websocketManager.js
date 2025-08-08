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
import { NetworkUtils } from '../common/utils/networkUtils.js'
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
    this.networkListener = null

    // 设备信息
    this.deviceInfo = null
    this.isRegistered = false
    this.isActive = false
    
    // 网络状态
    this.isNetworkAvailable = true
    this.lastNetworkCheck = 0
    
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
      
      // 设置网络状态监听
      this.setupNetworkListener()
      
      // 初始检查网络状态
      await this.checkNetworkStatus()
      
    } catch (error) {
      this.logger.error('WebSocket管理器初始化失败:', error)
    }
  }
  
  /**
   * 设置网络状态监听
   */
  setupNetworkListener() {
    try {
      // 监听网络状态变化
      this.networkListener = (networkInfo) => {
        const wasAvailable = this.isNetworkAvailable
        this.isNetworkAvailable = networkInfo.isConnected
        
        this.logger.info('网络状态变化:', {
          wasAvailable,
          isAvailable: this.isNetworkAvailable,
          networkType: networkInfo.networkType
        })
        
        // 如果网络从不可用变为可用，尝试重连
        if (!wasAvailable && this.isNetworkAvailable) {
          this.logger.info('网络恢复，尝试重新连接')
          this.handleNetworkRecovery()
        }
        
        // 如果网络变为不可用，标记连接状态
        if (wasAvailable && !this.isNetworkAvailable) {
          this.logger.warn('网络断开，等待网络恢复')
          this.setConnectionStatus(CONNECTION_STATUS.ERROR)
        }
      }
      
      NetworkUtils.onNetworkStatusChange(this.networkListener)
      this.logger.info('网络状态监听器已设置')
      
    } catch (error) {
      this.logger.error('设置网络状态监听器失败:', error)
    }
  }
  
  /**
   * 检查网络状态
   */
  async checkNetworkStatus() {
    try {
      const networkInfo = await NetworkUtils.checkConnection()
      this.isNetworkAvailable = networkInfo.isConnected
      this.lastNetworkCheck = Date.now()
      
      this.logger.info('网络状态检查:', {
        isConnected: networkInfo.isConnected,
        networkType: networkInfo.networkType
      })
      
      return networkInfo.isConnected
    } catch (error) {
      this.logger.error('检查网络状态失败:', error)
      this.isNetworkAvailable = false
      return false
    }
  }
  
  /**
   * 处理网络恢复
   */
  handleNetworkRecovery() {
    // 如果当前未连接，尝试重连
    if (this.connectionStatus !== CONNECTION_STATUS.CONNECTED && 
        this.connectionStatus !== CONNECTION_STATUS.CONNECTING) {
      this.logger.info('网络恢复，开始重连')
      this.scheduleReconnect(0) // 立即重连
    }
  }
  
  /**
   * 连接WebSocket
   */
  connect(url = null) {
    if (this.connectionStatus === CONNECTION_STATUS.CONNECTING || 
        this.connectionStatus === CONNECTION_STATUS.CONNECTED) {
      this.logger.info('WebSocket已在连接中或已连接，跳过连接请求')
      return
    }
    
    // 检查网络状态
    if (!this.isNetworkAvailable) {
      this.logger.warn('网络不可用，延迟连接')
      this.scheduleReconnect(5000) // 5秒后重试
      return
    }
    
    const wsUrl = url || this.getWebSocketUrl()
    
    this.setConnectionStatus(CONNECTION_STATUS.CONNECTING)
    this.logger.info('开始连接WebSocket:', wsUrl)
    
    try {
      this.socket = uni.connectSocket({
        url: wsUrl,
        success: () => {
          this.logger.info('WebSocket连接请求已发送')
        },
        fail: (error) => {
          this.logger.error('WebSocket连接请求失败:', error)
          this.handleConnectionError(error)
        }
      })
      
      this.setupSocketEventHandlers()
      this.startConnectionTimeout()
      
    } catch (error) {
      this.logger.error('创建WebSocket连接失败:', error)
      this.handleConnectionError(error)
    }
  }
  
  /**
   * 设置Socket事件处理器
   */
  setupSocketEventHandlers() {
    if (!this.socket) {
      this.logger.error('Socket对象不存在，无法设置事件处理器')
      return
    }
    
    // 连接打开
    this.socket.onOpen(() => {
      this.clearConnectionTimeout()
      this.setConnectionStatus(CONNECTION_STATUS.CONNECTED)
      this.reconnectAttempts = 0
      this.logger.info('WebSocket连接已建立')
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
      this.logger.info('WebSocket连接已关闭:', res)
      this.handleDisconnection()
    })
    
    // 连接错误
    this.socket.onError((error) => {
      this.logger.error('WebSocket连接错误:', error)
      this.handleConnectionError(error)
    })
    
    this.logger.info('WebSocket事件处理器已设置')
  }
  
  /**
   * 处理消息
   */
  handleMessage(data) {
    try {
      const message = MessageFactory.parseMessage(data)
      this.logger.info('收到WebSocket消息:', message.type)
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
          this.logger.error('服务器错误消息:', message)
          break
        default:
          this.logger.warn('未知消息类型:', message.type)
      }
      
    } catch (error) {
      this.logger.error('处理WebSocket消息失败:', error)
    }
  }
  
  /**
   * 发送消息
   */
  sendMessage(message) {
    if (this.connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      this.messageQueue.push(message)
      this.logger.info('连接未建立，消息已加入队列，当前队列长度:', this.messageQueue.length)
      return false
    }

    try {
      const data = JSON.stringify(message)
      
      this.socket.send({
        data,
        success: () => {
          this.logger.debug('消息发送成功:', message.type)
        },
        fail: (error) => {
          this.logger.error('消息发送失败:', error)
          // 重新加入队列
          this.messageQueue.unshift(message)
        }
      })
      return true
    } catch (error) {
      this.logger.error('序列化消息失败:', error)
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
    
    this.logger.info('发送设备注册消息:', {
      mac: this.deviceInfo.mac,
      deviceName: this.deviceInfo.deviceName
    })
    
    this.sendMessage(message)
  }
  
  /**
   * 处理注册响应
   */
  handleRegisterAck(message) {
    this.logger.info('收到注册响应:', {
      success: message.success,
      active: message.active,
      deviceId: message.device_id,
      isNewDevice: message.is_new_device
    })

    if (message.success) {
      this.isRegistered = true
      this.isActive = message.active
      
      // 保存设备ID
      if (message.device_id) {
        const config = DeviceUtils.getDeviceConfig()
        config.deviceId = message.device_id
        DeviceUtils.saveDeviceConfig(config)
      }
      
      this.logger.info('设备注册成功:', {
        isActive: this.isActive,
        deviceId: message.device_id
      })
      
      // 如果已激活，获取内容
      if (this.isActive) {
        this.getContent()
      }
    } else {
      this.logger.error('设备注册失败:', message.msg)
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
    this.logger.debug('收到心跳响应:', {
      success: message.success,
      active: message.active
    })

    if (message.success) {
      this.isActive = message.active
    } else {
      this.logger.warn('心跳响应失败:', message.msg)
    }
  }
  
  /**
   * 处理激活状态变更
   */
  handleActiveStatus(message) {
    this.isActive = message.active
    this.logger.info('设备激活状态变更:', {
      active: this.isActive,
      message: message.msg
    })

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
      this.logger.warn('设备未注册，无法获取内容')
      return
    }
    
    const message = new GetContentMessage(this.deviceInfo.mac)
    this.logger.info('发送获取内容请求')
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
    
    this.logger.info('心跳定时器已启动，间隔:', WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL)
  }
  
  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
      this.logger.info('心跳定时器已停止')
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

    this.logger.info('WebSocket连接已断开，准备重连')
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

    this.logger.error('WebSocket连接错误，准备重连:', error)
    this.triggerEvent('onError', error)

    // 自动重连
    this.scheduleReconnect()
  }

  /**
   * 安排重连
   */
  scheduleReconnect(immediateDelay = null) {
    // 如果网络不可用，延迟重连
    if (!this.isNetworkAvailable) {
      this.logger.warn('网络不可用，延迟重连')
      this.reconnectTimer = setTimeout(() => {
        this.scheduleReconnect()
      }, 10000) // 10秒后重试
      return
    }
    
    // 移除最大重连次数限制，始终保持重连
    // 但在超过一定次数后使用更长的重连间隔
    this.reconnectAttempts++
    this.setConnectionStatus(CONNECTION_STATUS.RECONNECTING)

    // 计算重连延迟 - 使用智能退避策略
    let delay
    if (immediateDelay !== null) {
      delay = immediateDelay
    } else if (this.reconnectAttempts <= 10) {
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
      this.logger.warn('WebSocket连接超时')
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
    this.logger.info('开始处理消息队列，队列长度:', this.messageQueue.length)

    while (this.messageQueue.length > 0 &&
           this.connectionStatus === CONNECTION_STATUS.CONNECTED) {
      const message = this.messageQueue.shift()
      this.sendMessage(message)

      // 避免发送过快
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.isProcessingQueue = false
    this.logger.info('消息队列处理完成，剩余队列长度:', this.messageQueue.length)
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
      queueLength: this.messageQueue.length,
      isNetworkAvailable: this.isNetworkAvailable
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
      isNetworkAvailable: this.isNetworkAvailable,
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
    
    // 清理网络监听器
    if (this.networkListener) {
      // 注意：uni.onNetworkStatusChange没有对应的off方法
      // 这里只是标记清理
      this.networkListener = null
    }
    
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
