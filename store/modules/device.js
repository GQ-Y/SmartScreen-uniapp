/**
 * 设备状态管理模块
 */

import { DeviceUtils } from '../../common/utils/deviceUtils.js'
import { DeviceModel } from '../../models/deviceModel.js'
import { DEVICE_STATUS } from '../../common/constants/constants.js'
import { Logger } from '../../common/utils/logger.js'

const logger = Logger.createTaggedLogger('DeviceStore')

const state = {
  // 设备信息
  deviceInfo: null,
  
  // 设备状态
  status: DEVICE_STATUS.OFFLINE,
  isActive: false,
  
  // 系统信息
  systemInfo: null,
  appInfo: null,
  
  // 统计信息
  lastUpdateTime: null,
  
  // 错误信息
  lastError: null
}

const getters = {
  // 获取设备信息
  getDeviceInfo: state => state.deviceInfo,
  
  // 获取设备状态
  getDeviceStatus: state => ({
    status: state.status,
    isActive: state.isActive
  }),
  
  // 获取系统信息
  getSystemInfo: state => state.systemInfo,
  
  // 获取应用信息
  getAppInfo: state => state.appInfo,
  
  // 检查设备是否在线
  isDeviceOnline: state => {
    return state.status === DEVICE_STATUS.ONLINE
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
    lastUpdateTime: state.lastUpdateTime,
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
  },
  
  // 设置设备状态
  SET_DEVICE_STATUS(state, status) {
    const oldStatus = state.status
    state.status = status
    
    if (state.deviceInfo) {
      state.deviceInfo.updateStatus(status)
    }
    
  },
  
  // 设置激活状态
  SET_ACTIVE_STATUS(state, isActive) {
    state.isActive = isActive
    
    if (state.deviceInfo) {
      state.deviceInfo.updateActiveStatus(isActive)
    }
    
  },
  
  // 设置系统信息
  SET_SYSTEM_INFO(state, systemInfo) {
    state.systemInfo = systemInfo
  },
  
  // 设置应用信息
  SET_APP_INFO(state, appInfo) {
    state.appInfo = appInfo
  },
  
 

  
  // 重置统计
  RESET_STATS(state) {
    state.lastUpdateTime = null
    state.lastError = null
  }
}

const actions = {
  // 初始化设备
  async initializeDevice({ commit }) {
    try {
      logger.info('开始初始化设备信息')
      
      // 获取设备信息（如果失败，使用默认值）
      let deviceInfo = null
      try {
        deviceInfo = await DeviceUtils.getDeviceInfo()
        commit('SET_DEVICE_INFO', deviceInfo)
        logger.info('设备信息获取成功')
      } catch (deviceError) {
        logger.warn('设备信息获取失败，使用默认值:', deviceError)
        // 使用默认设备信息
        deviceInfo = {
          mac: '00:00:00:00:00:00',
          deviceName: 'SmartScreen设备',
          platform: 'unknown',
          system: 'unknown',
          version: '1.0.0',
          model: 'unknown',
          brand: 'unknown',
          screenWidth: 1920,
          screenHeight: 1080,
          pixelRatio: 1,
          windowWidth: 1920,
          windowHeight: 1080,
          statusBarHeight: 0,
          language: 'zh-CN',
          networkType: 'unknown',
          isConnected: true
        }
        commit('SET_DEVICE_INFO', deviceInfo)
      }
      
      // 获取系统信息（如果失败，使用默认值）
      try {
        const systemInfo = await DeviceUtils.getSystemInfo()
        commit('SET_SYSTEM_INFO', systemInfo)
        logger.info('系统信息获取成功')
      } catch (systemError) {
        logger.warn('系统信息获取失败，使用默认值:', systemError)
        commit('SET_SYSTEM_INFO', {
          platform: 'unknown',
          system: 'unknown',
          version: '1.0.0'
        })
      }
      
      // 获取应用信息（如果失败，使用默认值）
      try {
        const appInfo = DeviceUtils.getAppInfo()
        commit('SET_APP_INFO', appInfo)
        logger.info('应用信息获取成功')
      } catch (appError) {
        logger.warn('应用信息获取失败，使用默认值:', appError)
        commit('SET_APP_INFO', {
          name: 'SmartScreen',
          version: '1.0.0',
          description: '智慧屏应用'
        })
      }
      
      // 设置设备为在线状态
      commit('SET_DEVICE_STATUS', DEVICE_STATUS.ONLINE)
      
      logger.info('设备初始化完成')
      return true
    } catch (error) {
      logger.error('设备初始化过程中发生严重错误:', error)
      commit('SET_ERROR', error)
      // 不抛出错误，让应用继续运行
      return false
    }
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
      commit('SET_ERROR', error)
      throw error
    }
  },
  
  // 更新激活状态
  updateActiveStatus({ commit }, isActive) {
    commit('SET_ACTIVE_STATUS', isActive)
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
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
