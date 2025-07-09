/**
 * 设备状态管理模块
 */

import { DeviceUtils } from '../../common/utils/deviceUtils.js'
import { NetworkUtils } from '../../common/utils/networkUtils.js'
import { DeviceModel } from '../../models/deviceModel.js'
import { DEVICE_STATUS } from '../../common/constants/constants.js'
import { Logger } from '../../common/utils/logger.js'

const logger = Logger.createTaggedLogger('DeviceStore')

const state = {
  // 设备信息
  deviceInfo: null,
  
  // 网络状态
  networkType: 'none',
  isNetworkConnected: false,
  networkQuality: null,
  
  // 设备状态
  status: DEVICE_STATUS.OFFLINE,
  isActive: false,
  
  // 系统信息
  systemInfo: null,
  appInfo: null,
  
  // 性能信息
  memoryUsage: 0,
  batteryLevel: 0,
  
  // 统计信息
  lastUpdateTime: null,
  networkChangeCount: 0,
  
  // 错误信息
  lastError: null
}

const getters = {
  // 获取设备信息
  getDeviceInfo: state => state.deviceInfo,
  
  // 获取设备状态
  getDeviceStatus: state => ({
    status: state.status,
    isActive: state.isActive,
    networkType: state.networkType,
    isNetworkConnected: state.isNetworkConnected,
    networkQuality: state.networkQuality
  }),
  
  // 获取网络状态
  getNetworkStatus: state => ({
    type: state.networkType,
    isConnected: state.isNetworkConnected,
    quality: state.networkQuality,
    changeCount: state.networkChangeCount
  }),
  
  // 获取系统信息
  getSystemInfo: state => state.systemInfo,
  
  // 获取应用信息
  getAppInfo: state => state.appInfo,
  
  // 检查设备是否在线
  isDeviceOnline: state => {
    return state.status === DEVICE_STATUS.ONLINE && state.isNetworkConnected
  },
  
  // 获取设备摘要
  getDeviceSummary: state => {
    if (!state.deviceInfo) return null
    return state.deviceInfo.getSummary()
  },
  
  // 获取设备详细信息
  getDeviceDetails: state => {
    if (!state.deviceInfo) return null
    return state.deviceInfo.getDetailedInfo()
  },
  
  // 获取统计信息
  getStats: state => ({
    status: state.status,
    isActive: state.isActive,
    networkType: state.networkType,
    isNetworkConnected: state.isNetworkConnected,
    networkChangeCount: state.networkChangeCount,
    lastUpdateTime: state.lastUpdateTime,
    memoryUsage: state.memoryUsage,
    batteryLevel: state.batteryLevel,
    hasError: !!state.lastError
  }),
  
  // 获取最后的错误
  getLastError: state => state.lastError
}

const mutations = {
  // 设置设备信息
  SET_DEVICE_INFO(state, deviceInfo) {
    state.deviceInfo = deviceInfo instanceof DeviceModel ? 
      deviceInfo : new DeviceModel(deviceInfo)
    state.lastUpdateTime = Date.now()
    logger.info('设备信息已更新')
  },
  
  // 设置网络状态
  SET_NETWORK_STATUS(state, { networkType, isConnected }) {
    const oldType = state.networkType
    const oldConnected = state.isNetworkConnected
    
    state.networkType = networkType
    state.isNetworkConnected = isConnected
    
    // 更新网络质量
    state.networkQuality = NetworkUtils.getNetworkQuality(networkType)
    
    // 如果网络状态发生变化，增加计数
    if (oldType !== networkType || oldConnected !== isConnected) {
      state.networkChangeCount++
      logger.info(`网络状态变更: ${oldType}(${oldConnected}) -> ${networkType}(${isConnected})`)
    }
    
    // 更新设备信息中的网络状态
    if (state.deviceInfo) {
      state.deviceInfo.updateNetworkInfo(networkType, isConnected)
    }
  },
  
  // 设置设备状态
  SET_DEVICE_STATUS(state, status) {
    const oldStatus = state.status
    state.status = status
    
    if (state.deviceInfo) {
      state.deviceInfo.updateStatus(status)
    }
    
    logger.info(`设备状态变更: ${oldStatus} -> ${status}`)
  },
  
  // 设置激活状态
  SET_ACTIVE_STATUS(state, isActive) {
    state.isActive = isActive
    
    if (state.deviceInfo) {
      state.deviceInfo.updateActiveStatus(isActive)
    }
    
    logger.info(`设备激活状态: ${isActive}`)
  },
  
  // 设置系统信息
  SET_SYSTEM_INFO(state, systemInfo) {
    state.systemInfo = systemInfo
  },
  
  // 设置应用信息
  SET_APP_INFO(state, appInfo) {
    state.appInfo = appInfo
  },
  
  // 设置性能信息
  SET_PERFORMANCE_INFO(state, { memoryUsage, batteryLevel }) {
    if (memoryUsage !== undefined) {
      state.memoryUsage = memoryUsage
    }
    if (batteryLevel !== undefined) {
      state.batteryLevel = batteryLevel
    }
  },
  
  // 设置错误
  SET_ERROR(state, error) {
    state.lastError = error
    if (error) {
      logger.error('设备模块错误:', error)
    }
  },
  
  // 清除错误
  CLEAR_ERROR(state) {
    state.lastError = null
  },
  
  // 重置统计
  RESET_STATS(state) {
    state.networkChangeCount = 0
    state.lastUpdateTime = null
    state.lastError = null
  }
}

const actions = {
  // 初始化设备
  async initializeDevice({ commit, dispatch }) {
    try {
      logger.info('初始化设备信息')
      
      // 获取设备信息
      const deviceInfo = await DeviceUtils.getDeviceInfo()
      commit('SET_DEVICE_INFO', deviceInfo)
      
      // 获取系统信息
      const systemInfo = await DeviceUtils.getSystemInfo()
      commit('SET_SYSTEM_INFO', systemInfo)
      
      // 获取应用信息
      const appInfo = DeviceUtils.getAppInfo()
      commit('SET_APP_INFO', appInfo)
      
      // 获取网络状态
      await dispatch('updateNetworkStatus')
      
      // 设置设备为在线状态
      commit('SET_DEVICE_STATUS', DEVICE_STATUS.ONLINE)
      
      // 开始监听网络状态变化
      dispatch('startNetworkMonitoring')
      
      logger.info('设备初始化完成')
      return true
    } catch (error) {
      logger.error('设备初始化失败:', error)
      commit('SET_ERROR', error)
      throw error
    }
  },
  
  // 更新网络状态
  async updateNetworkStatus({ commit }) {
    try {
      const networkInfo = await NetworkUtils.checkConnection()
      commit('SET_NETWORK_STATUS', {
        networkType: networkInfo.networkType,
        isConnected: networkInfo.isConnected
      })
      
      return networkInfo
    } catch (error) {
      logger.error('更新网络状态失败:', error)
      commit('SET_ERROR', error)
      throw error
    }
  },
  
  // 开始网络监听
  startNetworkMonitoring({ dispatch }) {
    logger.info('开始监听网络状态变化')
    
    NetworkUtils.onNetworkStatusChange((networkInfo) => {
      dispatch('updateNetworkStatus')
    })
  },
  
  // 更新设备名称
  async updateDeviceName({ state, commit }, name) {
    try {
      const success = DeviceUtils.setDeviceName(name)
      if (success && state.deviceInfo) {
        state.deviceInfo.device_name = name
        commit('SET_DEVICE_INFO', state.deviceInfo)
      }
      return success
    } catch (error) {
      logger.error('更新设备名称失败:', error)
      commit('SET_ERROR', error)
      throw error
    }
  },
  
  // 更新激活状态
  updateActiveStatus({ commit }, isActive) {
    commit('SET_ACTIVE_STATUS', isActive)
  },
  
  // 检查网络连接
  async checkNetworkConnection({ dispatch }) {
    try {
      const result = await NetworkUtils.checkConnection()
      await dispatch('updateNetworkStatus')
      return result
    } catch (error) {
      logger.error('检查网络连接失败:', error)
      throw error
    }
  },
  
  // 获取网络速度
  async checkNetworkSpeed({ commit }) {
    try {
      const speedInfo = await NetworkUtils.checkNetworkSpeed()
      logger.info('网络速度检测结果:', speedInfo)
      return speedInfo
    } catch (error) {
      logger.error('网络速度检测失败:', error)
      commit('SET_ERROR', error)
      throw error
    }
  },
  
  // 更新性能信息
  async updatePerformanceInfo({ commit }) {
    try {
      // 获取内存使用情况（如果支持）
      let memoryUsage = 0
      let batteryLevel = 0
      
      // 在实际应用中，这里可以调用相应的API获取性能信息
      // 目前使用模拟数据
      
      commit('SET_PERFORMANCE_INFO', {
        memoryUsage,
        batteryLevel
      })
      
      return { memoryUsage, batteryLevel }
    } catch (error) {
      logger.error('更新性能信息失败:', error)
      commit('SET_ERROR', error)
      throw error
    }
  },
  
  // 保存设备配置
  async saveDeviceConfig({ state }) {
    try {
      if (state.deviceInfo) {
        const success = DeviceUtils.saveDeviceConfig(state.deviceInfo.toJSON())
        return success
      }
      return false
    } catch (error) {
      logger.error('保存设备配置失败:', error)
      throw error
    }
  },
  
  // 加载设备配置
  async loadDeviceConfig({ commit }) {
    try {
      const config = DeviceUtils.getDeviceConfig()
      if (config && Object.keys(config).length > 0) {
        commit('SET_DEVICE_INFO', config)
        return config
      }
      return null
    } catch (error) {
      logger.error('加载设备配置失败:', error)
      commit('SET_ERROR', error)
      throw error
    }
  },
  
  // 重置设备状态
  reset({ commit }) {
    commit('SET_DEVICE_STATUS', DEVICE_STATUS.OFFLINE)
    commit('SET_ACTIVE_STATUS', false)
    commit('RESET_STATS')
    commit('CLEAR_ERROR')
    logger.info('设备状态已重置')
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
