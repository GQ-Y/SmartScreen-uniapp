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
   * 获取屏幕方向信息
   */
  static async getScreenOrientation() {
    try {
      const systemInfo = await this.getSystemInfo()
      const { screenWidth, screenHeight } = systemInfo
      
      // 判断屏幕方向
      const isLandscape = screenWidth > screenHeight
      const aspectRatio = screenWidth / screenHeight
      
      return {
        isLandscape,
        isPortrait: !isLandscape,
        aspectRatio,
        screenWidth,
        screenHeight,
        orientation: isLandscape ? 'landscape' : 'portrait'
      }
    } catch (error) {
      console.error('获取屏幕方向失败:', error)
      return {
        isLandscape: true, // 默认横屏
        isPortrait: false,
        aspectRatio: 16/9,
        screenWidth: 1920,
        screenHeight: 1080,
        orientation: 'landscape'
      }
    }
  }

  /**
   * 检测设备的最佳应用方向
   */
  static async detectOptimalAppOrientation() {
    try {
      const systemInfo = await this.getSystemInfo()
      const { screenWidth, screenHeight, platform, brand, model } = systemInfo
      
      // 判断是否为TV设备
      const isTV = this.isTelevisionDevice(systemInfo)
      
      // 获取当前屏幕方向信息
      const orientationInfo = await this.getScreenOrientation()
      
      console.log('设备信息:', {
        platform,
        brand,
        model,
        screenWidth,
        screenHeight,
        isTV,
        currentOrientation: orientationInfo.orientation
      })
      
      // TV设备和大屏设备通常适合横屏应用
      if (isTV || screenWidth >= 1280) {
        console.log('检测到TV/大屏设备，应用应使用横屏布局')
        return 'landscape'
      } else {
        // 其他设备根据实际屏幕尺寸判断
        if (screenWidth > screenHeight) {
          console.log('检测到横屏设备，应用使用横屏布局')
          return 'landscape'
        } else {
          console.log('检测到竖屏设备，应用使用竖屏布局')
          return 'portrait'
        }
      }
    } catch (error) {
      console.error('检测最佳应用方向失败:', error)
      return 'landscape' // 默认横屏，适合TV应用
    }
  }

  /**
   * 判断是否为电视设备
   */
  static isTelevisionDevice(systemInfo) {
    const { platform, brand, model, screenWidth, screenHeight, system } = systemInfo
    
    // 根据平台判断
    if (platform === 'android') {
      // Android TV的特征
      if (brand && (
        brand.toLowerCase().includes('tv') ||
        brand.toLowerCase().includes('android tv') ||
        brand.toLowerCase().includes('smart tv') ||
        brand.toLowerCase().includes('xiaomi') ||
        brand.toLowerCase().includes('sony') ||
        brand.toLowerCase().includes('samsung') ||
        brand.toLowerCase().includes('lg') ||
        brand.toLowerCase().includes('tcl') ||
        brand.toLowerCase().includes('hisense') ||
        brand.toLowerCase().includes('changhong') ||
        brand.toLowerCase().includes('skyworth') ||
        brand.toLowerCase().includes('coocaa') ||
        brand.toLowerCase().includes('konka') ||
        brand.toLowerCase().includes('haier')
      )) {
        return true
      }
      
      // 根据型号判断
      if (model && (
        model.toLowerCase().includes('tv') ||
        model.toLowerCase().includes('box') ||
        model.toLowerCase().includes('stick') ||
        model.toLowerCase().includes('cast') ||
        model.toLowerCase().includes('fire') ||
        model.toLowerCase().includes('roku') ||
        model.toLowerCase().includes('apple tv') ||
        model.toLowerCase().includes('android tv')
      )) {
        return true
      }
      
      // 根据系统版本判断
      if (system && (
        system.toLowerCase().includes('android tv') ||
        system.toLowerCase().includes('google tv')
      )) {
        return true
      }
    }
    
    // 根据屏幕尺寸判断（大屏幕通常是TV）
    if (screenWidth >= 1280 && screenHeight >= 720) {
      const aspectRatio = screenWidth / screenHeight
      // 常见的TV分辨率比例
      if (Math.abs(aspectRatio - 16/9) < 0.2 || Math.abs(aspectRatio - 4/3) < 0.2) {
        // 如果是常见TV分辨率且屏幕足够大，很可能是TV
        if (screenWidth >= 1920 || screenHeight >= 1080) {
          return true
        }
      }
    }
    
    // 特殊判断：如果屏幕非常大，很可能是TV
    if (screenWidth >= 2560 || screenHeight >= 1440) {
      return true
    }
    
    return false
  }

  /**
   * 获取应用信息
   */
  static getAppInfo() {
    try {
      // 尝试获取账户信息（仅在小程序环境中可用）
      let accountInfo = null
      try {
        if (typeof uni.getAccountInfoSync === 'function') {
          accountInfo = uni.getAccountInfoSync()
        }
      } catch (e) {
        // 在非小程序环境中忽略此错误
      }

      return {
        appId: accountInfo?.miniProgram?.appId || 'com.smartscreen.app',
        version: accountInfo?.miniProgram?.version || '1.0.0',
        envVersion: accountInfo?.miniProgram?.envVersion || 'release',
        platform: uni.getSystemInfoSync().platform || 'unknown'
      }
    } catch (error) {
      console.error('获取应用信息失败:', error)
      return {
        appId: 'com.smartscreen.app',
        version: '1.0.0',
        envVersion: 'release',
        platform: 'unknown'
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
