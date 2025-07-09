/**
 * 缓存管理工具类
 */

import { Logger } from './logger.js'

const logger = Logger.createTaggedLogger('CacheManager')

export class CacheManager {
  
  /**
   * 获取缓存统计信息
   */
  static async getCacheStats() {
    try {
      const stats = {
        storage: await this.getStorageStats(),
        files: await this.getFileStats(),
        total: 0,
        lastCleanTime: this.getLastCleanTime()
      }
      
      stats.total = stats.storage.size + stats.files.size
      
      return stats
    } catch (error) {
      logger.error('获取缓存统计失败:', error)
      throw error
    }
  }
  
  /**
   * 获取存储统计信息
   */
  static async getStorageStats() {
    try {
      const storageInfo = await this.getStorageInfo()
      
      return {
        size: storageInfo.currentSize || 0,
        limit: storageInfo.limitSize || 0,
        usage: storageInfo.currentSize / storageInfo.limitSize || 0,
        items: storageInfo.keys ? storageInfo.keys.length : 0
      }
    } catch (error) {
      logger.warn('获取存储统计失败:', error)
      return {
        size: 0,
        limit: 0,
        usage: 0,
        items: 0
      }
    }
  }
  
  /**
   * 获取文件缓存统计信息
   */
  static async getFileStats() {
    try {
      const fileInfo = await this.getFileInfo()
      
      return {
        size: fileInfo.size || 0,
        count: fileInfo.count || 0,
        tempFiles: fileInfo.tempFiles || 0,
        savedFiles: fileInfo.savedFiles || 0
      }
    } catch (error) {
      logger.warn('获取文件统计失败:', error)
      return {
        size: 0,
        count: 0,
        tempFiles: 0,
        savedFiles: 0
      }
    }
  }
  
  /**
   * 获取存储信息
   */
  static async getStorageInfo() {
    return new Promise((resolve) => {
      try {
        uni.getStorageInfo({
          success: (res) => {
            resolve(res)
          },
          fail: (error) => {
            logger.warn('获取存储信息失败:', error)
            resolve({})
          }
        })
      } catch (error) {
        resolve({})
      }
    })
  }
  
  /**
   * 获取文件信息
   */
  static async getFileInfo() {
    return new Promise((resolve) => {
      try {
        // 获取临时文件信息
        uni.getSavedFileList({
          success: (res) => {
            const files = res.fileList || []
            const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0)
            
            resolve({
              size: totalSize,
              count: files.length,
              savedFiles: files.length,
              tempFiles: 0 // 临时文件数量需要其他方式获取
            })
          },
          fail: (error) => {
            logger.warn('获取文件信息失败:', error)
            resolve({
              size: 0,
              count: 0,
              savedFiles: 0,
              tempFiles: 0
            })
          }
        })
      } catch (error) {
        resolve({
          size: 0,
          count: 0,
          savedFiles: 0,
          tempFiles: 0
        })
      }
    })
  }
  
  /**
   * 清理存储缓存
   */
  static async clearStorage(options = {}) {
    try {
      const {
        excludeKeys = ['device_config', 'websocket_config', 'user_settings'],
        clearAll = false
      } = options
      
      if (clearAll) {
        await this.clearAllStorage()
        return { cleared: true, method: 'all' }
      }
      
      const storageInfo = await this.getStorageInfo()
      const keys = storageInfo.keys || []
      const clearedKeys = []
      
      for (const key of keys) {
        if (!excludeKeys.includes(key)) {
          try {
            uni.removeStorageSync(key)
            clearedKeys.push(key)
          } catch (error) {
            logger.warn(`清理存储项失败: ${key}`, error)
          }
        }
      }
      
      logger.info(`存储缓存清理完成，清理了${clearedKeys.length}个项目`)
      
      return {
        cleared: true,
        method: 'selective',
        clearedKeys,
        excludedKeys: excludeKeys
      }
      
    } catch (error) {
      logger.error('清理存储缓存失败:', error)
      throw error
    }
  }
  
  /**
   * 清理所有存储
   */
  static async clearAllStorage() {
    return new Promise((resolve, reject) => {
      uni.clearStorage({
        success: () => {
          logger.info('所有存储已清理')
          resolve()
        },
        fail: (error) => {
          logger.error('清理所有存储失败:', error)
          reject(error)
        }
      })
    })
  }
  
  /**
   * 清理文件缓存
   */
  static async clearFiles(options = {}) {
    try {
      const { clearTemp = true, clearSaved = false } = options
      const results = {
        tempFiles: { cleared: 0, failed: 0 },
        savedFiles: { cleared: 0, failed: 0 }
      }
      
      if (clearSaved) {
        const savedResult = await this.clearSavedFiles()
        results.savedFiles = savedResult
      }
      
      if (clearTemp) {
        // 临时文件清理（UniApp中临时文件通常自动管理）
        results.tempFiles.cleared = 0
      }
      
      logger.info('文件缓存清理完成', results)
      return results
      
    } catch (error) {
      logger.error('清理文件缓存失败:', error)
      throw error
    }
  }
  
  /**
   * 清理保存的文件
   */
  static async clearSavedFiles() {
    return new Promise((resolve) => {
      uni.getSavedFileList({
        success: (res) => {
          const files = res.fileList || []
          let cleared = 0
          let failed = 0
          
          const clearPromises = files.map(file => {
            return new Promise((fileResolve) => {
              uni.removeSavedFile({
                filePath: file.filePath,
                success: () => {
                  cleared++
                  fileResolve()
                },
                fail: () => {
                  failed++
                  fileResolve()
                }
              })
            })
          })
          
          Promise.all(clearPromises).then(() => {
            resolve({ cleared, failed })
          })
        },
        fail: () => {
          resolve({ cleared: 0, failed: 0 })
        }
      })
    })
  }
  
  /**
   * 清理所有缓存
   */
  static async clearAllCache(options = {}) {
    try {
      const {
        preserveSettings = true,
        clearStorage = true,
        clearFiles = true
      } = options
      
      const results = {
        storage: null,
        files: null,
        timestamp: Date.now()
      }
      
      if (clearStorage) {
        results.storage = await this.clearStorage({
          excludeKeys: preserveSettings ? 
            ['device_config', 'websocket_config', 'user_settings', 'cache_config'] : 
            [],
          clearAll: !preserveSettings
        })
      }
      
      if (clearFiles) {
        results.files = await this.clearFiles({
          clearTemp: true,
          clearSaved: true
        })
      }
      
      // 记录清理时间
      this.setLastCleanTime(results.timestamp)
      
      logger.info('所有缓存清理完成', results)
      return results
      
    } catch (error) {
      logger.error('清理所有缓存失败:', error)
      throw error
    }
  }
  
  /**
   * 获取最后清理时间
   */
  static getLastCleanTime() {
    try {
      return uni.getStorageSync('last_cache_clean_time') || null
    } catch (error) {
      return null
    }
  }
  
  /**
   * 设置最后清理时间
   */
  static setLastCleanTime(timestamp) {
    try {
      uni.setStorageSync('last_cache_clean_time', timestamp)
    } catch (error) {
      logger.warn('设置清理时间失败:', error)
    }
  }
  
  /**
   * 格式化缓存大小
   */
  static formatSize(bytes) {
    if (bytes === 0) return '0 B'
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
  }
  
  /**
   * 获取缓存使用率颜色
   */
  static getUsageColor(usage) {
    if (usage >= 0.9) return '#F44336' // 红色
    if (usage >= 0.7) return '#FF9800' // 橙色
    if (usage >= 0.5) return '#FFC107' // 黄色
    return '#4CAF50' // 绿色
  }
  
  /**
   * 检查是否需要清理
   */
  static async shouldCleanCache(threshold = 0.8) {
    try {
      const stats = await this.getCacheStats()
      const storageUsage = stats.storage.usage || 0
      
      return storageUsage >= threshold
    } catch (error) {
      logger.warn('检查缓存清理需求失败:', error)
      return false
    }
  }
  
  /**
   * 自动清理缓存
   */
  static async autoCleanCache(options = {}) {
    try {
      const { threshold = 0.8, preserveSettings = true } = options
      
      const shouldClean = await this.shouldCleanCache(threshold)
      
      if (shouldClean) {
        logger.info('缓存使用率超过阈值，开始自动清理')
        const result = await this.clearAllCache({
          preserveSettings,
          clearStorage: true,
          clearFiles: true
        })
        
        return {
          cleaned: true,
          reason: 'threshold_exceeded',
          result
        }
      }
      
      return {
        cleaned: false,
        reason: 'threshold_not_exceeded'
      }
      
    } catch (error) {
      logger.error('自动清理缓存失败:', error)
      throw error
    }
  }
}
