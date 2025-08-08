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
  errorHistory: [],
  
  // 状态同步定时器
  statusSyncTimer: null
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
  },

  // 获取重连状态详情
  getReconnectInfo: state => {
    if (!state.manager) {
      return {
        enabled: false,
        attempts: 0,
        perpetual: false,
        nextDelay: 0
      }
    }

    const stats = state.manager.getStats()
    return {
      enabled: state.connectionStatus === CONNECTION_STATUS.RECONNECTING,
      attempts: state.reconnectAttempts,
      perpetual: stats.perpetualReconnect || false,
      nextDelay: stats.nextReconnectDelay || 0,
      phase: state.reconnectAttempts <= 10 ? 'initial' : 
             state.reconnectAttempts <= 20 ? 'medium' : 
             state.reconnectAttempts <= 50 ? 'extended' : 'long-term'
    }
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
    // 直接保存错误对象，不做复杂处理
    state.lastError = error
    if (error) {
      state.errorHistory.unshift({
        error: error,
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
  },
  
  // 设置状态同步定时器
  SET_STATUS_SYNC_TIMER(state, timer) {
    state.statusSyncTimer = timer
  },

  // 清除错误历史
  CLEAR_ERROR_HISTORY(state) {
    state.errorHistory = []
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
        // 更新重连次数
        if (manager.reconnectAttempts !== undefined) {
          commit('SET_RECONNECT_ATTEMPTS', manager.reconnectAttempts)
        }
      })

      manager.addEventListener('onMessage', (message) => {
        commit('INCREMENT_MESSAGES_RECEIVED')
        commit('SET_LAST_MESSAGE', message)
        dispatch('handleMessage', message)
      })

      // 启动状态同步定时器
      dispatch('startStatusSync')

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
  async disconnect({ state, commit, dispatch }) {
    try {
      if (state.manager) {
        state.manager.disconnect()
      }
      
      // 停止状态同步定时器
      dispatch('stopStatusSync')
      
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
          // 检查是否有实际的内容变化，避免无谓的停止操作
          const currentContentData = state.contentData
          
          // 比较关键字段而不是整个对象，避免时间戳等无关字段影响比较结果
          const hasContentChanged = !currentContentData || 
            !currentContentData.data || 
            !currentContentData.data.primary_contents || 
            !message.data.primary_contents ||
            currentContentData.data.primary_contents.length !== message.data.primary_contents.length ||
            currentContentData.data.primary_contents[0]?.content_type !== message.data.primary_contents[0]?.content_type ||
            currentContentData.data.primary_contents[0]?.content_url !== message.data.primary_contents[0]?.content_url ||
            currentContentData.data.primary_contents[0]?.title !== message.data.primary_contents[0]?.title
          
          // 只有在内容真正发生变化时才停止当前播放的内容
          if (hasContentChanged) {
            dispatch('stopCurrentContent')
          }
          
          // 处理内容响应
          commit('SET_CONTENT_DATA', message)
          break

        case MESSAGE_TYPES.PUSH_CONTENT:
          logger.info('收到推送内容消息，准备处理')
          // 检查推送的内容是否与当前播放内容相同
          const currentPushContent = state.contentData?.data?.primary_contents?.[0]
          const newPushContent = message.data
          
          const isSamePushContent = currentPushContent && 
            currentPushContent.content_type === newPushContent.content_type &&
            currentPushContent.content_url === newPushContent.content_url &&
            currentPushContent.title === newPushContent.title
          
          // 只有推送内容与当前播放内容不同时才停止播放
          if (!isSamePushContent) {
            logger.info('推送内容与当前播放内容不同，停止当前播放')
            dispatch('stopCurrentContent')
          } else {
            logger.info('推送内容与当前播放内容相同，跳过停止操作')
          }
          
          dispatch('handlePushContent', message)
          break

        case MESSAGE_TYPES.TEMP_CONTENT:
          logger.info('收到临时内容消息，准备处理')
          // 检查临时内容是否与当前播放内容相同
          const currentTempContent = state.contentData?.data?.primary_contents?.[0]
          const newTempContent = message.data
          
          const isSameTempContent = currentTempContent && 
            currentTempContent.content_type === newTempContent.content_type &&
            currentTempContent.content_url === newTempContent.content_url &&
            currentTempContent.title === newTempContent.title
          
          // 只有临时内容与当前播放内容不同时才停止播放
          if (!isSameTempContent) {
            logger.info('临时内容与当前播放内容不同，停止当前播放')
            dispatch('stopCurrentContent')
          } else {
            logger.info('临时内容与当前播放内容相同，跳过停止操作')
          }
          
          dispatch('handleTempContent', message)
          break
          
        case MESSAGE_TYPES.DISPLAY_MODE_CHANGE:
          // 处理播放策略变更
          dispatch('handleDisplayModeChange', message)
          break
          
        case MESSAGE_TYPES.BATCH_CONTROL:
          // 处理批量控制指令
          dispatch('handleBatchControl', message)
          break
          
        case MESSAGE_TYPES.REFRESH:
          // 处理刷新指令
          dispatch('handleRefresh', message)
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
  stopCurrentContent({ state, rootGetters }) {
    try {
      const currentContentData = state.contentData
      if (currentContentData && currentContentData.data) {
        logger.info('准备停止当前播放内容')
        // 通过事件总线通知所有播放器停止
        uni.$emit('stopAllPlayers')
        logger.info('已发送stopAllPlayers事件')

        // 也可以通过 player 模块停止
        // dispatch('player/stop', null, { root: true })
      }
    } catch (error) {
      logger.error('停止当前内容时出错:', error)
    }
  },

  // 处理批量控制
  async handleBatchControl({ dispatch }, message) {
    logger.info('处理批量控制指令:', message)

    try {
      switch (message.action) {
        case 'refresh':
          logger.info('执行刷新操作')
          
          // 显示刷新提示
          if (message.message) {
            uni.showToast({
              title: message.message,
              icon: 'none',
              duration: 2000
            })
          }
          
          // 先停止当前播放的内容
          dispatch('stopCurrentContent')
          
          // 延迟后重新获取内容
          setTimeout(async () => {
            try {
              await dispatch('getContent')
              uni.showToast({
                title: '内容已刷新',
                icon: 'success',
                duration: 1500
              })
            } catch (error) {
              logger.error('批量刷新失败:', error)
              uni.showToast({
                title: '刷新失败',
                icon: 'error',
                duration: 2000
              })
            }
          }, 500)
          break
          
        case 'restart':
          logger.info('执行重启操作（APP端执行刷新）')
          
          // 显示简单的Toast提示（如果有消息）
          if (message.message) {
            uni.showToast({
              title: message.message,
              icon: 'none',
              duration: 2000
            })
          }
          
          // APP无法真正重启设备，直接执行刷新操作
          dispatch('stopCurrentContent')
          
          setTimeout(async () => {
            try {
              await dispatch('getContent')
              uni.showToast({
                title: '内容已刷新',
                icon: 'success',
                duration: 1500
              })
            } catch (error) {
              logger.error('重启刷新失败:', error)
              uni.showToast({
                title: '刷新失败',
                icon: 'error',
                duration: 2000
              })
            }
          }, 1000)
          break
          
        case 'shutdown':
          logger.info('执行关闭操作')
          uni.showModal({
            title: '系统通知',
            content: message.message || '收到关闭指令',
            showCancel: false,
            success: () => {
              // 停止所有播放内容
              dispatch('stopCurrentContent')
              
              // 可选：断开WebSocket连接
              // dispatch('disconnect')
              
              logger.info('设备已响应关闭指令')
            }
          })
          break
          
        case 'activate':
          logger.info('执行激活操作')
          uni.showToast({
            title: message.message || '设备已激活',
            icon: 'success',
            duration: 2000
          })
          
          // 激活后重新获取内容
          setTimeout(async () => {
            await dispatch('getContent')
          }, 1000)
          break
          
        case 'deactivate':
          logger.info('执行禁用操作')
          uni.showToast({
            title: message.message || '设备已禁用',
            icon: 'none',
            duration: 2000
          })
          
          // 禁用后停止播放
          dispatch('stopCurrentContent')
          break
          
        default:
          logger.warn('未知的批量控制操作:', message.action)
          uni.showToast({
            title: '未知的控制指令',
            icon: 'none',
            duration: 2000
          })
      }
    } catch (error) {
      logger.error('处理批量控制指令失败:', error)
      uni.showToast({
        title: '指令执行失败',
        icon: 'error',
        duration: 2000
      })
    }
  },

  // 处理播放策略变更
  async handleDisplayModeChange({ dispatch }, message) {
    logger.info('处理播放策略变更:', message)
    
    try {
      // 先停止当前播放的内容
      dispatch('stopCurrentContent')
      
      // 播放策略变更后，重新获取内容
      await dispatch('getContent')
      
      logger.info('播放策略变更处理完成:', {
        newMode: message.mode,
        newModeName: message.mode_name
      })
      
    } catch (error) {
      logger.error('处理播放策略变更失败:', error)
    }
  },

  // 处理刷新指令
  async handleRefresh({ dispatch }, message) {
    logger.info('处理刷新指令:', message)
    
    try {
      // 显示刷新提示
      if (message.message) {
        uni.showToast({
          title: message.message,
          icon: 'none',
          duration: 2000
        })
      }
      
      // 先停止当前播放的内容
      dispatch('stopCurrentContent')
      
      // 延迟一下再获取内容，确保停止操作完成
      setTimeout(async () => {
        try {
          // 重新获取内容
          await dispatch('getContent')
          logger.info('刷新指令处理完成')
          
          // 显示刷新成功提示
          uni.showToast({
            title: '内容已刷新',
            icon: 'success',
            duration: 1500
          })
        } catch (error) {
          logger.error('刷新内容失败:', error)
          uni.showToast({
            title: '刷新失败',
            icon: 'error',
            duration: 2000
          })
        }
      }, 500)
      
    } catch (error) {
      logger.error('处理刷新指令失败:', error)
      uni.showToast({
        title: '刷新失败',
        icon: 'error',
        duration: 2000
      })
    }
  },

  // 重置WebSocket
  async reset({ commit, dispatch }) {
    try {
      logger.info('重置WebSocket状态')

      // 停止状态同步定时器
      dispatch('stopStatusSync')
      
      await dispatch('disconnect')
      commit('RESET_STATS')
      commit('CLEAR_ERROR')
      commit('CLEAR_CONTENT_DATA')

      return true
    } catch (error) {
      throw error
    }
  },
  
  // 启动状态同步定时器
  startStatusSync({ state, commit, dispatch }) {
    // 清除现有定时器
    if (state.statusSyncTimer) {
      clearInterval(state.statusSyncTimer)
    }
    
    // 创建新的定时器，每5秒同步一次状态
    const timer = setInterval(() => {
      if (state.manager) {
        const managerStatus = state.manager.getConnectionStatus()
        const managerStats = state.manager.getStats()
        
        // 同步连接状态
        if (managerStatus.status !== state.connectionStatus) {
          commit('SET_CONNECTION_STATUS', managerStatus.status)
        }
        
        // 同步重连次数
        if (managerStats.reconnectAttempts !== state.reconnectAttempts) {
          commit('SET_RECONNECT_ATTEMPTS', managerStats.reconnectAttempts)
        }
        
        // 同步注册和激活状态
        if (managerStatus.isRegistered !== state.isRegistered) {
          commit('SET_REGISTERED', managerStatus.isRegistered)
        }
        
        if (managerStatus.isActive !== state.isActive) {
          commit('SET_ACTIVE', managerStatus.isActive)
        }
      }
    }, 5000) // 每5秒同步一次
    
    commit('SET_STATUS_SYNC_TIMER', timer)
    logger.info('WebSocket状态同步定时器已启动')
  },
  
  // 停止状态同步定时器
  stopStatusSync({ state, commit }) {
    if (state.statusSyncTimer) {
      clearInterval(state.statusSyncTimer)
      commit('SET_STATUS_SYNC_TIMER', null)
      logger.info('WebSocket状态同步定时器已停止')
    }
  },
  
  // 刷新WebSocket状态
  refreshStatus({ state, commit }) {
    try {
      if (state.manager) {
        const managerStatus = state.manager.getConnectionStatus()
        const managerStats = state.manager.getStats()
        
        // 同步连接状态
        if (managerStatus.status !== state.connectionStatus) {
          commit('SET_CONNECTION_STATUS', managerStatus.status)
        }
        
        // 同步重连次数
        if (managerStats.reconnectAttempts !== state.reconnectAttempts) {
          commit('SET_RECONNECT_ATTEMPTS', managerStats.reconnectAttempts)
        }
        
        // 同步注册和激活状态
        if (managerStatus.isRegistered !== state.isRegistered) {
          commit('SET_REGISTERED', managerStatus.isRegistered)
        }
        
        if (managerStatus.isActive !== state.isActive) {
          commit('SET_ACTIVE', managerStatus.isActive)
        }
        
        logger.debug('WebSocket状态已刷新')
      }
    } catch (error) {
      logger.error('刷新WebSocket状态失败:', error)
    }
  },
  
  // 清除错误历史
  clearErrorHistory({ commit }) {
    commit('CLEAR_ERROR_HISTORY')
    logger.info('WebSocket错误历史已清除')
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
