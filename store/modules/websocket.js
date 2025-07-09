/**
 * WebSocket 状态管理模块
 */

import { WebSocketManager } from '../../api/websocketManager.js'
import { CONNECTION_STATUS, MESSAGE_TYPES } from '../../common/constants/constants.js'
import { Logger } from '../../common/utils/logger.js'
// import { MediaCacheManager } from '../../common/utils/cacheManager.js' // 已注释掉缓存系统

const logger = Logger.createTaggedLogger('WebSocketStore')

const state = {
  // WebSocket管理器实例
  manager: null,
  
  // 连接状态
  connectionStatus: CONNECTION_STATUS.DISCONNECTED,
  isConnected: false,
  isRegistered: false,
  isActive: false,
  

  
  // 连接统计
  reconnectAttempts: 0,
  lastConnectTime: null,
  lastDisconnectTime: null,
  totalConnectTime: 0,
  
  // 消息统计
  messagesSent: 0,
  messagesReceived: 0,
  lastMessage: null,
  messageQueue: [],
  
  // 错误信息
  lastError: null,
  errorHistory: []
}

const getters = {
  // 获取连接状态
  getConnectionStatus: state => ({
    status: state.connectionStatus,
    isConnected: state.isConnected,
    isRegistered: state.isRegistered,
    isActive: state.isActive,
    reconnectAttempts: state.reconnectAttempts
  }),
  

  
  // 检查是否可以发送消息
  canSendMessage: state => {
    return state.isConnected && state.isRegistered
  },
  
  // 获取统计信息
  getStats: state => ({
    connectionStatus: state.connectionStatus,
    isConnected: state.isConnected,
    isRegistered: state.isRegistered,
    isActive: state.isActive,
    reconnectAttempts: state.reconnectAttempts,
    messagesSent: state.messagesSent,
    messagesReceived: state.messagesReceived,
    queueLength: state.messageQueue.length,
    lastConnectTime: state.lastConnectTime,
    lastDisconnectTime: state.lastDisconnectTime,
    totalConnectTime: state.totalConnectTime,
    errorCount: state.errorHistory.length
  }),
  
  // 获取最后的错误
  getLastError: state => state.lastError,
  
  // 获取错误历史
  getErrorHistory: state => [...state.errorHistory],
  
  // 获取最后的消息
  getLastMessage: state => state.lastMessage,
  
  // 获取消息队列
  getMessageQueue: state => [...state.messageQueue],

  // 获取内容数据
  getContentData: state => state.contentData,

  // 获取最后内容更新时间
  getLastContentUpdate: state => state.lastContentUpdate,

  // 检查是否有内容
  hasContent: state => {
    const hasData = state.contentData &&
                   state.contentData.success &&
                   state.contentData.data &&
                   state.contentData.data.total_contents > 0

    logger.info('hasContent检查:', {
      hasContentData: !!state.contentData,
      success: state.contentData?.success,
      hasData: !!state.contentData?.data,
      totalContents: state.contentData?.data?.total_contents,
      result: hasData
    })

    return hasData
  }
}

const mutations = {
  // 设置WebSocket管理器
  SET_MANAGER(state, manager) {
    // 使用Object.defineProperty确保manager不被Vue响应式系统监听
    Object.defineProperty(state, 'manager', {
      value: manager,
      writable: true,
      enumerable: false, // 不可枚举，避免被Vue监听
      configurable: true
    })
  },
  
  // 设置连接状态
  SET_CONNECTION_STATUS(state, status) {
    const oldStatus = state.connectionStatus
    state.connectionStatus = status
    state.isConnected = status === CONNECTION_STATUS.CONNECTED
    
    if (status === CONNECTION_STATUS.CONNECTED && oldStatus !== CONNECTION_STATUS.CONNECTED) {
      state.lastConnectTime = Date.now()
    } else if (status === CONNECTION_STATUS.DISCONNECTED && oldStatus === CONNECTION_STATUS.CONNECTED) {
      state.lastDisconnectTime = Date.now()
      if (state.lastConnectTime) {
        state.totalConnectTime += Date.now() - state.lastConnectTime
      }
    }
    
    logger.info(`WebSocket状态变更: ${oldStatus} -> ${status}`)
  },
  
  // 设置注册状态
  SET_REGISTERED(state, isRegistered) {
    state.isRegistered = isRegistered
    logger.info(`设备注册状态: ${isRegistered}`)
  },
  
  // 设置激活状态
  SET_ACTIVE(state, isActive) {
    state.isActive = isActive
    logger.info(`设备激活状态: ${isActive}`)
  },
  

  
  // 设置重连次数
  SET_RECONNECT_ATTEMPTS(state, attempts) {
    state.reconnectAttempts = attempts
  },
  
  // 增加消息发送计数
  INCREMENT_MESSAGES_SENT(state) {
    state.messagesSent++
  },
  
  // 增加消息接收计数
  INCREMENT_MESSAGES_RECEIVED(state) {
    state.messagesReceived++
  },
  
  // 设置最后的消息
  SET_LAST_MESSAGE(state, message) {
    state.lastMessage = message
  },
  
  // 添加到消息队列
  ADD_TO_MESSAGE_QUEUE(state, message) {
    state.messageQueue.push(message)
    
    // 限制队列长度
    if (state.messageQueue.length > 100) {
      state.messageQueue = state.messageQueue.slice(-100)
    }
  },
  
  // 清空消息队列
  CLEAR_MESSAGE_QUEUE(state) {
    state.messageQueue = []
  },
  
  // 设置错误
  SET_ERROR(state, error) {
    state.lastError = error
    if (error) {
      state.errorHistory.unshift({
        error,
        timestamp: Date.now(),
        connectionStatus: state.connectionStatus
      })
      
      // 限制错误历史数量
      if (state.errorHistory.length > 20) {
        state.errorHistory = state.errorHistory.slice(0, 20)
      }
    }
  },
  
  // 清除错误
  CLEAR_ERROR(state) {
    state.lastError = null
  },

  // 设置内容数据
  SET_CONTENT_DATA(state, contentData) {
    state.contentData = contentData
    state.lastContentUpdate = new Date().toISOString()
    
    // 已注释掉缓存系统 - 不对内容进行缓存
    // if (contentData && contentData.data) {
    //   const deviceId = contentData.data.device_id
    //   // 使用setTimeout确保缓存操作完全异步
    //   setTimeout(() => {
    //     MediaCacheManager.cacheContentMedia(contentData, deviceId).then(result => {
    //       if (result.success && result.total > 0) {
    //         logger.info(`媒体文件缓存完成: ${result.cached}/${result.total}`)
    //       }
    //     }).catch(error => {
    //       // 缓存失败不影响播放，静默处理
    //     })
    //   }, 100) // 延迟100ms开始缓存，确保内容已开始播放
    // }
  },

  // 清除内容数据
  CLEAR_CONTENT_DATA(state) {
    state.contentData = null
    state.lastContentUpdate = null
  },
  
  // 重置统计
  RESET_STATS(state) {
    state.messagesSent = 0
    state.messagesReceived = 0
    state.reconnectAttempts = 0
    state.totalConnectTime = 0
    state.errorHistory = []
    state.messageQueue = []
  }
}

const actions = {
  // 初始化WebSocket
  async initialize({ commit, dispatch }) {
    try {

      // 创建WebSocket管理器
      const manager = new WebSocketManager()
      commit('SET_MANAGER', manager)

      // 设置事件监听器
      manager.addEventListener('onConnect', () => {
        commit('SET_CONNECTION_STATUS', CONNECTION_STATUS.CONNECTED)
        commit('SET_RECONNECT_ATTEMPTS', 0)
        commit('CLEAR_ERROR')
      })

      manager.addEventListener('onDisconnect', () => {
        commit('SET_CONNECTION_STATUS', CONNECTION_STATUS.DISCONNECTED)
        commit('SET_REGISTERED', false)
        commit('SET_ACTIVE', false)
      })

      manager.addEventListener('onError', (error) => {
        commit('SET_ERROR', error)
        commit('SET_CONNECTION_STATUS', CONNECTION_STATUS.ERROR)
      })

      manager.addEventListener('onStatusChange', ({ newStatus }) => {
        commit('SET_CONNECTION_STATUS', newStatus)
        if (newStatus === CONNECTION_STATUS.RECONNECTING) {
          // 直接访问reconnectAttempts属性，避免调用getStats()
          commit('SET_RECONNECT_ATTEMPTS', manager.reconnectAttempts)
        }
      })

      manager.addEventListener('onMessage', (message) => {
        commit('INCREMENT_MESSAGES_RECEIVED')
        commit('SET_LAST_MESSAGE', message)
        dispatch('handleMessage', message)
      })

      return true
    } catch (error) {
      commit('SET_ERROR', error)
      throw error
    }
  },
  
  // 连接WebSocket
  async connect({ state, commit, dispatch }) {
    try {
      // 如果管理器未初始化，先初始化
      if (!state.manager) {
        await dispatch('initialize')
      }


      commit('SET_CONNECTION_STATUS', CONNECTION_STATUS.CONNECTING)
      commit('CLEAR_ERROR')

      state.manager.connect()

      return true
    } catch (error) {
      commit('SET_ERROR', error)
      throw error
    }
  },
  
  // 断开WebSocket连接
  async disconnect({ state, commit }) {
    try {
      if (state.manager) {
        state.manager.disconnect()
      }
      
      commit('SET_CONNECTION_STATUS', CONNECTION_STATUS.DISCONNECTED)
      commit('SET_REGISTERED', false)
      commit('SET_ACTIVE', false)
      commit('CLEAR_ERROR')
      
      return true
    } catch (error) {
      commit('SET_ERROR', error)
      throw error
    }
  },
  
  // 发送消息
  async sendMessage({ state, commit }, message) {
    try {
      if (!state.manager) {
        throw new Error('WebSocket管理器未初始化')
      }
      
      const success = state.manager.sendMessage(message)
      if (success) {
        commit('INCREMENT_MESSAGES_SENT')
      } else {
        commit('ADD_TO_MESSAGE_QUEUE', message)
      }
      
      return success
    } catch (error) {
      commit('SET_ERROR', error)
      throw error
    }
  },
  
  // 处理接收到的消息
  handleMessage({ commit, dispatch }, message) {
    try {
      
      switch (message.type) {
        case MESSAGE_TYPES.REGISTER_ACK:
          commit('SET_REGISTERED', message.success)
          if (message.success) {
            commit('SET_ACTIVE', message.active)
          }
          break
          
        case MESSAGE_TYPES.HEARTBEAT_ACK:
          if (message.success) {
            commit('SET_ACTIVE', message.active)
          }
          break
          
        case MESSAGE_TYPES.ACTIVE_STATUS:
          commit('SET_ACTIVE', message.active)
          break
          
        case MESSAGE_TYPES.CONTENT_RESPONSE:
          // 先停止当前播放的内容，再设置新内容
          dispatch('stopCurrentContent')
          // 处理内容响应
          commit('SET_CONTENT_DATA', message)
          break

        case MESSAGE_TYPES.PUSH_CONTENT:
          // 先停止当前播放的内容，再处理推送内容
          dispatch('stopCurrentContent')
          dispatch('handlePushContent', message)
          break

        case MESSAGE_TYPES.TEMP_CONTENT:
          // 先停止当前播放的内容，再处理临时内容
          dispatch('stopCurrentContent')
          dispatch('handleTempContent', message)
          break
          
        case MESSAGE_TYPES.DISPLAY_MODE_CHANGE:
          // 转发给播放器模块处理
          dispatch('player/handleDisplayModeChange', message, { root: true })
          break
          
        case MESSAGE_TYPES.BATCH_CONTROL:
        case MESSAGE_TYPES.REFRESH:
          // 转发给播放器模块处理
          dispatch('player/handleControl', message, { root: true })
          break
          
        case MESSAGE_TYPES.ERROR:
          commit('SET_ERROR', new Error(message.msg))
          break
      }
    } catch (error) {
      logger.error('处理WebSocket消息失败:', error)
      commit('SET_ERROR', error)
    }
  },
  

  
  // 获取内容
  async getContent({ state }) {
    try {
      if (state.manager && state.isRegistered) {
        state.manager.getContent()
        return true
      }
      return false
    } catch (error) {
      logger.error('获取内容失败:', error)
      throw error
    }
  },
  
  // 处理推送内容
  async handlePushContent({ commit }, message) {

    // 将推送内容转换为内容响应格式
    const contentResponse = {
      type: 'content_response',
      success: true,
      msg: '收到推送内容',
      data: {
        device_id: null,
        display_mode: 4, // 仅直接内容
        display_mode_name: '推送内容',
        direct_content: message.data,
        playlist_contents: [],
        has_direct_content: true,
        has_playlist_contents: false,
        primary_contents: [message.data],
        secondary_contents: [],
        total_contents: 1
      }
    }

    commit('SET_CONTENT_DATA', contentResponse)
  },

  // 处理临时内容
  async handleTempContent({ commit }, message) {

    // 临时内容优先显示
    const contentResponse = {
      type: 'content_response',
      success: true,
      msg: '收到临时内容',
      data: {
        device_id: null,
        display_mode: 4, // 仅直接内容
        display_mode_name: '临时内容',
        direct_content: message.data,
        playlist_contents: [],
        has_direct_content: true,
        has_playlist_contents: false,
        primary_contents: [message.data],
        secondary_contents: [],
        total_contents: 1
      }
    }

    commit('SET_CONTENT_DATA', contentResponse)
  },

  // 停止当前播放的内容
  stopCurrentContent({ state }) {
    try {
      const currentContentData = state.contentData
      if (currentContentData && currentContentData.data) {

        // 通过事件总线通知所有播放器停止
        uni.$emit('stopAllPlayers')

        // 也可以通过 player 模块停止
        // dispatch('player/stop', null, { root: true })
      }
    } catch (error) {
      logger.error('停止当前内容时出错:', error)
    }
  },

  // 处理批量控制
  async handleBatchControl({ dispatch }, message) {

    switch (message.action) {
      case 'refresh':
        logger.info('执行刷新操作')
        await dispatch('getContent')
        break
      case 'restart':
        logger.info('执行重启操作')
        uni.showModal({
          title: '系统通知',
          content: message.message || '系统将重启',
          showCancel: false,
          success: () => {
            location.reload()
          }
        })
        break
      case 'shutdown':
        logger.info('执行关闭操作')
        uni.showModal({
          title: '系统通知',
          content: message.message || '系统将关闭',
          showCancel: false
        })
        break
      default:
        logger.warn('未知的批量控制操作:', message.action)
    }
  },

  // 重置WebSocket
  async reset({ commit, dispatch }) {
    try {

      await dispatch('disconnect')
      commit('RESET_STATS')
      commit('CLEAR_ERROR')
      commit('CLEAR_CONTENT_DATA')

      return true
    } catch (error) {
      throw error
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
