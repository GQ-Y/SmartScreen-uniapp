/**
 * Vuex 状态管理主文件
 */

import { createStore } from 'vuex'
import websocket from './modules/websocket.js'
import device from './modules/device.js'
import player from './modules/player.js'
import settings from './modules/settings.js'
import { Logger } from '../common/utils/logger.js'

const logger = Logger.createTaggedLogger('Store')

const store = createStore({
  state: {
    // 应用全局状态
    appVersion: '1.0.0',
    isInitialized: false,
    currentPage: 'index',
    lastActiveTime: Date.now(),
    
    // 错误状态
    globalError: null,
    errorHistory: []
  },
  
  getters: {
    // 应用是否已初始化
    isAppInitialized: state => state.isInitialized,
    
    // 获取当前页面
    getCurrentPage: state => state.currentPage,
    
    // 获取应用版本
    getAppVersion: state => state.appVersion,
    
    // 获取全局错误
    getGlobalError: state => state.globalError,
    
    // 获取错误历史
    getErrorHistory: state => state.errorHistory,
    
    // 获取最后活跃时间
    getLastActiveTime: state => state.lastActiveTime,
    
    // 应用整体状态摘要
    getAppStatus: (state, getters) => {
      return {
        isInitialized: state.isInitialized,
        currentPage: state.currentPage,
        hasError: !!state.globalError,
        device: getters['device/getDeviceStatus'],
        websocket: getters['websocket/getConnectionStatus'],
        player: getters['player/getPlayerStatus']
      }
    }
  },
  
  mutations: {
    // 设置初始化状态
    SET_INITIALIZED(state, isInitialized) {
      state.isInitialized = isInitialized
      logger.info(`应用初始化状态: ${isInitialized}`)
    },
    
    // 设置当前页面
    SET_CURRENT_PAGE(state, page) {
      state.currentPage = page
      logger.info(`页面切换: ${page}`)
    },
    
    // 设置全局错误
    SET_GLOBAL_ERROR(state, error) {
      state.globalError = error
      if (error) {
        state.errorHistory.unshift({
          error,
          timestamp: Date.now(),
          page: state.currentPage
        })
        
        // 限制错误历史数量
        if (state.errorHistory.length > 50) {
          state.errorHistory = state.errorHistory.slice(0, 50)
        }
        
        logger.error('全局错误:', error)
      }
    },
    
    // 清除全局错误
    CLEAR_GLOBAL_ERROR(state) {
      state.globalError = null
    },
    
    // 清除错误历史
    CLEAR_ERROR_HISTORY(state) {
      state.errorHistory = []
    },
    
    // 更新最后活跃时间
    UPDATE_LAST_ACTIVE_TIME(state) {
      state.lastActiveTime = Date.now()
    }
  },
  
  actions: {
    // 初始化应用
    async initializeApp({ commit, dispatch, getters }) {
      try {
        logger.info('开始初始化应用')

        // 初始化设备信息
        await dispatch('device/initializeDevice')

        // 初始化设置
        await dispatch('settings/loadSettings')

        // 等待一下确保设置已加载
        await new Promise(resolve => setTimeout(resolve, 100))

        // 初始化WebSocket（如果配置存在）
        try {
          const wsConfig = getters['settings/getWebSocketConfig']
          logger.info('WebSocket配置:', wsConfig)

          if (wsConfig && typeof wsConfig === 'object' && wsConfig.host && wsConfig.port) {
            logger.info('初始化WebSocket管理器')
            await dispatch('websocket/initialize', wsConfig)
          } else {
            logger.info('WebSocket配置不完整，跳过初始化')
          }
        } catch (wsError) {
          logger.warn('WebSocket初始化失败，但继续应用初始化:', wsError)
        }

        commit('SET_INITIALIZED', true)
        logger.info('应用初始化完成')

        return true
      } catch (error) {
        logger.error('应用初始化失败:', error)
        commit('SET_GLOBAL_ERROR', error)
        // 即使初始化失败，也标记为已初始化，避免无限重试
        commit('SET_INITIALIZED', true)
        throw error
      }
    },
    
    // 切换页面
    changePage({ commit }, page) {
      commit('SET_CURRENT_PAGE', page)
      commit('UPDATE_LAST_ACTIVE_TIME')
    },
    
    // 处理全局错误
    handleGlobalError({ commit }, error) {
      commit('SET_GLOBAL_ERROR', error)
    },
    
    // 清除全局错误
    clearGlobalError({ commit }) {
      commit('CLEAR_GLOBAL_ERROR')
    },
    
    // 更新活跃时间
    updateActiveTime({ commit }) {
      commit('UPDATE_LAST_ACTIVE_TIME')
    },
    
    // 重置应用状态
    async resetApp({ commit, dispatch }) {
      try {
        logger.info('重置应用状态')
        
        // 断开WebSocket连接
        await dispatch('websocket/disconnect')
        
        // 停止播放器
        await dispatch('player/stop')
        
        // 清除错误
        commit('CLEAR_GLOBAL_ERROR')
        commit('CLEAR_ERROR_HISTORY')
        
        // 重新初始化
        await dispatch('initializeApp')
        
        logger.info('应用状态重置完成')
      } catch (error) {
        logger.error('重置应用状态失败:', error)
        commit('SET_GLOBAL_ERROR', error)
      }
    },
    
    // 获取应用统计信息
    getAppStats({ state, getters }) {
      return {
        appVersion: state.appVersion,
        isInitialized: state.isInitialized,
        currentPage: state.currentPage,
        lastActiveTime: state.lastActiveTime,
        errorCount: state.errorHistory.length,
        hasGlobalError: !!state.globalError,
        uptime: Date.now() - state.lastActiveTime,
        modules: {
          device: getters['device/getStats'],
          websocket: getters['websocket/getStats'],
          player: getters['player/getStats'],
          settings: getters['settings/getStats']
        }
      }
    }
  },
  
  modules: {
    websocket,
    device,
    player,
    settings
  },
  
  // 开发环境下启用严格模式
  strict: process.env.NODE_ENV !== 'production'
})

// 全局错误处理
store.subscribe((mutation, state) => {
  // 记录所有mutation用于调试
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Mutation:', mutation.type, mutation.payload)
  }
})

// 监听action
store.subscribeAction({
  before: (action, state) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Action before:', action.type, action.payload)
    }
  },
  after: (action, state) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Action after:', action.type)
    }
  },
  error: (action, state, error) => {
    logger.error('Action error:', action.type, error)
    store.dispatch('handleGlobalError', error)
  }
})

export default store
