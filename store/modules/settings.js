/**
 * 设置状态管理模块
 */

import { STORAGE_KEYS, DEFAULT_CONFIG, WEBSOCKET_CONFIG } from '../../common/constants/constants.js'
import { Logger } from '../../common/utils/logger.js'

const logger = Logger.createTaggedLogger('SettingsStore')

const state = {
  // WebSocket配置
  websocketConfig: {
    host: WEBSOCKET_CONFIG.DEFAULT_HOST,
    port: WEBSOCKET_CONFIG.DEFAULT_PORT,
    autoConnect: true,
    reconnectInterval: WEBSOCKET_CONFIG.RECONNECT_INTERVAL,
    maxReconnectAttempts: WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS,
    heartbeatInterval: WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL
  },
  
  // 设备配置
  deviceConfig: {
    deviceName: DEFAULT_CONFIG.DEVICE_NAME,
    autoPlay: DEFAULT_CONFIG.AUTO_PLAY,
    volume: 1.0,
    brightness: 1.0
  },
  
  // 播放配置
  playerConfig: {
    autoPlay: DEFAULT_CONFIG.AUTO_PLAY,
    loopMode: false,
    showControls: true,
    defaultVolume: 1.0,
    seekStep: 10 // 快进快退步长（秒）
  },
  
  // 缓存配置
  cacheConfig: {
    enabled: DEFAULT_CONFIG.CACHE_ENABLED,
    maxSize: DEFAULT_CONFIG.CACHE_SIZE_LIMIT,
    autoClean: true,
    cleanThreshold: 0.8 // 达到80%时自动清理
  },
  
  // 显示配置
  displayConfig: {
    theme: 'dark',
    language: 'zh-CN',
    showDebugInfo: false,
    showNetworkStatus: true,
    showPlayerControls: true
  },
  
  // 日志配置
  logConfig: {
    level: DEFAULT_CONFIG.LOG_LEVEL,
    maxEntries: 1000,
    enableConsole: true,
    enableStorage: true
  },
  
  // 是否已加载
  isLoaded: false,
  
  // 最后保存时间
  lastSaveTime: null
}

const getters = {
  // 获取WebSocket配置
  getWebSocketConfig: state => {
    const config = { ...state.websocketConfig }
    logger.debug('获取WebSocket配置:', config)
    return config
  },
  
  // 获取设备配置
  getDeviceConfig: state => ({ ...state.deviceConfig }),
  
  // 获取播放器配置
  getPlayerConfig: state => ({ ...state.playerConfig }),
  
  // 获取缓存配置
  getCacheConfig: state => ({ ...state.cacheConfig }),
  
  // 获取显示配置
  getDisplayConfig: state => ({ ...state.displayConfig }),
  
  // 获取日志配置
  getLogConfig: state => ({ ...state.logConfig }),
  
  // 获取所有配置
  getAllSettings: state => ({
    websocket: state.websocketConfig,
    device: state.deviceConfig,
    player: state.playerConfig,
    cache: state.cacheConfig,
    display: state.displayConfig,
    log: state.logConfig
  }),
  
  // 检查是否已加载
  isSettingsLoaded: state => state.isLoaded,
  
  // 获取WebSocket URL
  getWebSocketUrl: state => {
    return `ws://${state.websocketConfig.host}:${state.websocketConfig.port}/ws`
  },
  
  // 获取统计信息
  getStats: state => ({
    isLoaded: state.isLoaded,
    lastSaveTime: state.lastSaveTime,
    websocketHost: state.websocketConfig.host,
    websocketPort: state.websocketConfig.port,
    deviceName: state.deviceConfig.deviceName,
    autoPlay: state.playerConfig.autoPlay,
    cacheEnabled: state.cacheConfig.enabled,
    theme: state.displayConfig.theme,
    language: state.displayConfig.language,
    logLevel: state.logConfig.level
  })
}

const mutations = {
  // 设置WebSocket配置
  SET_WEBSOCKET_CONFIG(state, config) {
    state.websocketConfig = { ...state.websocketConfig, ...config }
    logger.info('WebSocket配置已更新')
  },
  
  // 设置设备配置
  SET_DEVICE_CONFIG(state, config) {
    state.deviceConfig = { ...state.deviceConfig, ...config }
    logger.info('设备配置已更新')
  },
  
  // 设置播放器配置
  SET_PLAYER_CONFIG(state, config) {
    state.playerConfig = { ...state.playerConfig, ...config }
    logger.info('播放器配置已更新')
  },
  
  // 设置缓存配置
  SET_CACHE_CONFIG(state, config) {
    state.cacheConfig = { ...state.cacheConfig, ...config }
    logger.info('缓存配置已更新')
  },
  
  // 设置显示配置
  SET_DISPLAY_CONFIG(state, config) {
    state.displayConfig = { ...state.displayConfig, ...config }
    logger.info('显示配置已更新')
  },
  
  // 设置日志配置
  SET_LOG_CONFIG(state, config) {
    state.logConfig = { ...state.logConfig, ...config }
    logger.info('日志配置已更新')
  },
  
  // 设置加载状态
  SET_LOADED(state, isLoaded) {
    state.isLoaded = isLoaded
  },
  
  // 设置保存时间
  SET_SAVE_TIME(state, time) {
    state.lastSaveTime = time
  },
  
  // 重置所有配置
  RESET_ALL_SETTINGS(state) {
    state.websocketConfig = {
      host: WEBSOCKET_CONFIG.DEFAULT_HOST,
      port: WEBSOCKET_CONFIG.DEFAULT_PORT,
      autoConnect: true,
      reconnectInterval: WEBSOCKET_CONFIG.RECONNECT_INTERVAL,
      maxReconnectAttempts: WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS,
      heartbeatInterval: WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL
    }
    
    state.deviceConfig = {
      deviceName: DEFAULT_CONFIG.DEVICE_NAME,
      autoPlay: DEFAULT_CONFIG.AUTO_PLAY,
      volume: 1.0,
      brightness: 1.0
    }
    
    state.playerConfig = {
      autoPlay: DEFAULT_CONFIG.AUTO_PLAY,
      loopMode: false,
      showControls: true,
      defaultVolume: 1.0,
      seekStep: 10
    }
    
    state.cacheConfig = {
      enabled: DEFAULT_CONFIG.CACHE_ENABLED,
      maxSize: DEFAULT_CONFIG.CACHE_SIZE_LIMIT,
      autoClean: true,
      cleanThreshold: 0.8
    }
    
    state.displayConfig = {
      theme: 'dark',
      language: 'zh-CN',
      showDebugInfo: false,
      showNetworkStatus: true,
      showPlayerControls: true
    }
    
    state.logConfig = {
      level: DEFAULT_CONFIG.LOG_LEVEL,
      maxEntries: 1000,
      enableConsole: true,
      enableStorage: true
    }
    
    logger.info('所有配置已重置为默认值')
  }
}

const actions = {
  // 加载设置
  async loadSettings({ commit, state }) {
    try {
      logger.info('加载应用设置')

      // 加载WebSocket配置，如果没有则使用默认值
      const wsConfig = uni.getStorageSync(STORAGE_KEYS.WEBSOCKET_CONFIG)
      if (wsConfig && Object.keys(wsConfig).length > 0) {
        commit('SET_WEBSOCKET_CONFIG', wsConfig)
      } else {
        // 确保有默认的WebSocket配置
        logger.info('使用默认WebSocket配置')
      }

      // 加载设备配置
      const deviceConfig = uni.getStorageSync(STORAGE_KEYS.DEVICE_CONFIG)
      if (deviceConfig && Object.keys(deviceConfig).length > 0) {
        commit('SET_DEVICE_CONFIG', deviceConfig)
      } else {
        logger.info('使用默认设备配置')
      }

      // 加载用户设置
      const userSettings = uni.getStorageSync(STORAGE_KEYS.USER_SETTINGS)
      if (userSettings && Object.keys(userSettings).length > 0) {
        if (userSettings.player) {
          commit('SET_PLAYER_CONFIG', userSettings.player)
        }
        if (userSettings.display) {
          commit('SET_DISPLAY_CONFIG', userSettings.display)
        }
        if (userSettings.log) {
          commit('SET_LOG_CONFIG', userSettings.log)
        }
      } else {
        logger.info('使用默认用户设置')
      }

      // 加载缓存配置
      const cacheConfig = uni.getStorageSync(STORAGE_KEYS.CACHE_CONFIG)
      if (cacheConfig && Object.keys(cacheConfig).length > 0) {
        commit('SET_CACHE_CONFIG', cacheConfig)
      } else {
        logger.info('使用默认缓存配置')
      }

      commit('SET_LOADED', true)
      logger.info('应用设置加载完成')

      // 验证关键配置
      if (!state.websocketConfig.host) {
        logger.warn('WebSocket配置缺少主机地址，使用默认值')
      }

      return true
    } catch (error) {
      logger.error('加载应用设置失败:', error)
      // 即使加载失败，也要确保有基本配置
      commit('SET_LOADED', true)
      throw error
    }
  },
  
  // 保存设置
  async saveSettings({ state, commit }) {
    try {
      logger.info('保存应用设置')
      
      // 保存WebSocket配置
      uni.setStorageSync(STORAGE_KEYS.WEBSOCKET_CONFIG, state.websocketConfig)
      
      // 保存设备配置
      uni.setStorageSync(STORAGE_KEYS.DEVICE_CONFIG, state.deviceConfig)
      
      // 保存用户设置
      const userSettings = {
        player: state.playerConfig,
        display: state.displayConfig,
        log: state.logConfig
      }
      uni.setStorageSync(STORAGE_KEYS.USER_SETTINGS, userSettings)
      
      // 保存缓存配置
      uni.setStorageSync(STORAGE_KEYS.CACHE_CONFIG, state.cacheConfig)
      
      commit('SET_SAVE_TIME', Date.now())
      logger.info('应用设置保存完成')
      
      return true
    } catch (error) {
      logger.error('保存应用设置失败:', error)
      throw error
    }
  },
  
  // 更新WebSocket配置
  async updateWebSocketConfig({ commit, dispatch }, config) {
    commit('SET_WEBSOCKET_CONFIG', config)
    await dispatch('saveSettings')
    
    // 通知WebSocket模块更新配置
    dispatch('websocket/setConfig', config, { root: true })
  },
  
  // 更新设备配置
  async updateDeviceConfig({ commit, dispatch }, config) {
    commit('SET_DEVICE_CONFIG', config)
    await dispatch('saveSettings')
  },
  
  // 更新播放器配置
  async updatePlayerConfig({ commit, dispatch }, config) {
    commit('SET_PLAYER_CONFIG', config)
    await dispatch('saveSettings')
  },
  
  // 更新缓存配置
  async updateCacheConfig({ commit, dispatch }, config) {
    commit('SET_CACHE_CONFIG', config)
    await dispatch('saveSettings')
  },
  
  // 更新显示配置
  async updateDisplayConfig({ commit, dispatch }, config) {
    commit('SET_DISPLAY_CONFIG', config)
    await dispatch('saveSettings')
  },
  
  // 更新日志配置
  async updateLogConfig({ commit, dispatch }, config) {
    commit('SET_LOG_CONFIG', config)
    await dispatch('saveSettings')
    
    // 更新日志系统配置
    if (config.level) {
      Logger.setLevel(config.level)
    }
  },
  
  // 重置设置
  async resetSettings({ commit, dispatch }) {
    try {
      logger.info('重置应用设置')
      
      commit('RESET_ALL_SETTINGS')
      await dispatch('saveSettings')
      
      logger.info('应用设置重置完成')
      return true
    } catch (error) {
      logger.error('重置应用设置失败:', error)
      throw error
    }
  },
  
  // 导出设置
  exportSettings({ getters }) {
    const settings = getters.getAllSettings
    return JSON.stringify(settings, null, 2)
  },
  
  // 导入设置
  async importSettings({ commit, dispatch }, settingsJson) {
    try {
      const settings = JSON.parse(settingsJson)
      
      if (settings.websocket) {
        commit('SET_WEBSOCKET_CONFIG', settings.websocket)
      }
      if (settings.device) {
        commit('SET_DEVICE_CONFIG', settings.device)
      }
      if (settings.player) {
        commit('SET_PLAYER_CONFIG', settings.player)
      }
      if (settings.cache) {
        commit('SET_CACHE_CONFIG', settings.cache)
      }
      if (settings.display) {
        commit('SET_DISPLAY_CONFIG', settings.display)
      }
      if (settings.log) {
        commit('SET_LOG_CONFIG', settings.log)
      }
      
      await dispatch('saveSettings')
      
      logger.info('设置导入完成')
      return true
    } catch (error) {
      logger.error('设置导入失败:', error)
      throw error
    }
  },
  
  // 验证设置
  validateSettings({ state }) {
    const errors = []
    
    // 验证WebSocket配置
    if (!state.websocketConfig.host) {
      errors.push('WebSocket主机地址不能为空')
    }
    if (!state.websocketConfig.port || state.websocketConfig.port <= 0) {
      errors.push('WebSocket端口必须大于0')
    }
    
    // 验证设备配置
    if (!state.deviceConfig.deviceName) {
      errors.push('设备名称不能为空')
    }
    
    // 验证播放器配置
    if (state.playerConfig.defaultVolume < 0 || state.playerConfig.defaultVolume > 1) {
      errors.push('默认音量必须在0-1之间')
    }
    
    // 验证缓存配置
    if (state.cacheConfig.maxSize <= 0) {
      errors.push('缓存大小限制必须大于0')
    }
    
    return {
      isValid: errors.length === 0,
      errors
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
