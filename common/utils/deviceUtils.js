/**
 * 设备工具类
 * 提供设备信息获取、网络状态检测等功能
 */

import { STORAGE_KEYS, DEFAULT_CONFIG } from '../constants/constants.js'

export class DeviceUtils {
  
  /**
   * 获取设备系统信息
   */
  static async getSystemInfo() {
    return new Promise((resolve, reject) => {
      uni.getSystemInfo({
        success: (res) => {
          resolve(res)
        },
        fail: (err) => {
          console.error('获取系统信息失败:', err)
          reject(err)
        }
      })
    })
  }
  
  /**
   * 获取网络类型
   */
  static async getNetworkType() {
    return new Promise((resolve, reject) => {
      uni.getNetworkType({
        success: (res) => {
          resolve(res)
        },
        fail: (err) => {
          console.error('获取网络类型失败:', err)
          reject(err)
        }
      })
    })
  }
  
  /**
   * 监听网络状态变化
   */
  static onNetworkStatusChange(callback) {
    uni.onNetworkStatusChange((res) => {
      callback(res)
    })
  }
  
  /**
   * 生成设备MAC地址（模拟）
   * 在实际应用中，可能需要使用设备唯一标识符
   */
  static async generateMacAddress() {
    try {
      const systemInfo = await this.getSystemInfo()
      
      // 尝试使用设备ID或其他唯一标识
      let deviceId = systemInfo.deviceId || systemInfo.system || ''
      
      // 如果没有设备ID，生成一个基于时间戳和随机数的标识
      if (!deviceId) {
        deviceId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }
      
      // 将设备ID转换为MAC地址格式
      const hash = this.simpleHash(deviceId)
      const mac = hash.match(/.{2}/g).slice(0, 6).join(':').toUpperCase()
      
      return mac
    } catch (error) {
      console.error('生成MAC地址失败:', error)
      // 返回一个默认的MAC地址
      return this.generateRandomMac()
    }
  }
  
  /**
   * 生成随机MAC地址
   */
  static generateRandomMac() {
    const chars = '0123456789ABCDEF'
    let mac = ''
    for (let i = 0; i < 6; i++) {
      if (i > 0) mac += ':'
      mac += chars.charAt(Math.floor(Math.random() * 16))
      mac += chars.charAt(Math.floor(Math.random() * 16))
    }
    return mac
  }
  
  /**
   * 简单哈希函数
   */
  static simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(16).padStart(12, '0')
  }
  
  /**
   * 获取设备详细信息
   */
  static async getDeviceInfo() {
    try {
      const [systemInfo, networkInfo] = await Promise.all([
        this.getSystemInfo(),
        this.getNetworkType()
      ])
      
      const mac = await this.generateMacAddress()
      
      return {
        mac,
        deviceName: this.getDeviceName(),
        platform: systemInfo.platform,
        system: systemInfo.system,
        version: systemInfo.version,
        model: systemInfo.model,
        brand: systemInfo.brand,
        screenWidth: systemInfo.screenWidth,
        screenHeight: systemInfo.screenHeight,
        pixelRatio: systemInfo.pixelRatio,
        windowWidth: systemInfo.windowWidth,
        windowHeight: systemInfo.windowHeight,
        statusBarHeight: systemInfo.statusBarHeight,
        language: systemInfo.language,
        networkType: networkInfo.networkType,
        isConnected: networkInfo.networkType !== 'none'
      }
    } catch (error) {
      console.error('获取设备信息失败:', error)
      throw error
    }
  }
  
  /**
   * 获取设备名称
   */
  static getDeviceName() {
    try {
      const config = uni.getStorageSync(STORAGE_KEYS.DEVICE_CONFIG)
      return config?.deviceName || DEFAULT_CONFIG.DEVICE_NAME
    } catch (error) {
      console.error('获取设备名称失败:', error)
      return DEFAULT_CONFIG.DEVICE_NAME
    }
  }
  
  /**
   * 设置设备名称
   */
  static setDeviceName(name) {
    try {
      let config = uni.getStorageSync(STORAGE_KEYS.DEVICE_CONFIG) || {}
      config.deviceName = name
      uni.setStorageSync(STORAGE_KEYS.DEVICE_CONFIG, config)
      return true
    } catch (error) {
      console.error('设置设备名称失败:', error)
      return false
    }
  }
  
  /**
   * 检查网络连接状态
   */
  static async checkNetworkConnection() {
    try {
      const networkInfo = await this.getNetworkType()
      return {
        isConnected: networkInfo.networkType !== 'none',
        networkType: networkInfo.networkType
      }
    } catch (error) {
      console.error('检查网络连接失败:', error)
      return {
        isConnected: false,
        networkType: 'none'
      }
    }
  }
  
  /**
   * 获取应用信息
   */
  static getAppInfo() {
    try {
      const accountInfo = uni.getAccountInfoSync()
      return {
        appId: accountInfo.miniProgram?.appId || '',
        version: accountInfo.miniProgram?.version || '1.0.0',
        envVersion: accountInfo.miniProgram?.envVersion || 'release'
      }
    } catch (error) {
      console.error('获取应用信息失败:', error)
      return {
        appId: '',
        version: '1.0.0',
        envVersion: 'release'
      }
    }
  }
  
  /**
   * 保存设备配置
   */
  static saveDeviceConfig(config) {
    try {
      uni.setStorageSync(STORAGE_KEYS.DEVICE_CONFIG, config)
      return true
    } catch (error) {
      console.error('保存设备配置失败:', error)
      return false
    }
  }
  
  /**
   * 获取设备配置
   */
  static getDeviceConfig() {
    try {
      return uni.getStorageSync(STORAGE_KEYS.DEVICE_CONFIG) || {}
    } catch (error) {
      console.error('获取设备配置失败:', error)
      return {}
    }
  }
  
  /**
   * 格式化设备信息用于显示
   */
  static formatDeviceInfoForDisplay(deviceInfo) {
    return {
      'MAC地址': deviceInfo.mac,
      '设备名称': deviceInfo.deviceName,
      '平台': deviceInfo.platform,
      '系统': deviceInfo.system,
      '型号': deviceInfo.model,
      '品牌': deviceInfo.brand,
      '屏幕尺寸': `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`,
      '像素比': deviceInfo.pixelRatio,
      '语言': deviceInfo.language,
      '网络类型': deviceInfo.networkType,
      '连接状态': deviceInfo.isConnected ? '已连接' : '未连接'
    }
  }
}
