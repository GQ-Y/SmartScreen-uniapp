/**
 * 媒体内容缓存管理工具类
 * 专注于图片、视频、音频文件的本地缓存管理
 */

import { Logger } from './logger.js'

const logger = Logger.createTaggedLogger('MediaCacheManager')

export class MediaCacheManager {
  
  /**
   * 支持的媒体类型
   */
  static MEDIA_TYPES = {
    IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
    VIDEO: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
    AUDIO: ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a']
  }
  
  /**
   * 缓存配置
   */
  static CACHE_CONFIG = {
    MAX_CACHE_SIZE: 500 * 1024 * 1024, // 500MB
    MAX_FILE_SIZE: 100 * 1024 * 1024,  // 100MB per file
    CACHE_EXPIRE_DAYS: 7,              // 7天过期
    CACHE_KEY_PREFIX: 'media_cache_'
  }
  
  /**
   * 获取文件扩展名
   */
  static getFileExtension(url) {
    try {
      const urlPath = url.split('?')[0] // 移除查询参数
      const fileName = urlPath.split('/').pop()
      const extension = fileName.split('.').pop()
      return extension ? extension.toLowerCase() : ''
    } catch (error) {
      return ''
    }
  }
  
  /**
   * 检查是否为支持的媒体文件
   */
  static isSupportedMediaFile(url) {
    const ext = this.getFileExtension(url)
    return [...this.MEDIA_TYPES.IMAGE, ...this.MEDIA_TYPES.VIDEO, ...this.MEDIA_TYPES.AUDIO].includes(ext)
  }
  
  /**
   * 获取媒体文件类型
   */
  static getMediaType(url) {
    const ext = this.getFileExtension(url)
    
    if (this.MEDIA_TYPES.IMAGE.includes(ext)) return 'image'
    if (this.MEDIA_TYPES.VIDEO.includes(ext)) return 'video'
    if (this.MEDIA_TYPES.AUDIO.includes(ext)) return 'audio'
    
    return 'unknown'
  }
  
  /**
   * 生成缓存key
   */
  static generateCacheKey(url) {
    // 使用URL的hash作为唯一标识
    const hash = this.simpleHash(url)
    return `${this.CACHE_CONFIG.CACHE_KEY_PREFIX}${hash}`
  }
  
  /**
   * 简单hash函数
   */
  static simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }
  
  /**
   * 缓存媒体文件
   */
  static async cacheMediaFile(url, deviceId = null) {
    try {
      // 检查URL是否有效
      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        return { success: false, reason: 'invalid_url' }
      }
      
      // 检查是否为支持的媒体文件
      if (!this.isSupportedMediaFile(url)) {
        return { success: false, reason: 'unsupported_type' }
      }
      
      const cacheKey = this.generateCacheKey(url)
      const mediaType = this.getMediaType(url)
      
      // 检查是否已缓存
      const existingCache = await this.getCachedFile(url)
      if (existingCache.success) {
        return existingCache
      }
      
      return new Promise((resolve) => {
        uni.downloadFile({
          url: url,
          success: (downloadRes) => {
            if (downloadRes.statusCode === 200) {
              // 保存文件到本地
              uni.saveFile({
                tempFilePath: downloadRes.tempFilePath,
                success: (saveRes) => {
                  // 保存缓存信息
                  const cacheInfo = {
                    url: url,
                    localPath: saveRes.savedFilePath,
                    cacheKey: cacheKey,
                    mediaType: mediaType,
                    deviceId: deviceId,
                    cachedTime: Date.now(),
                    fileSize: 0 // 实际项目中可以从响应头获取
                  }
                  
                  this.saveCacheInfo(cacheKey, cacheInfo)
                  
                  resolve({
                    success: true,
                    localPath: saveRes.savedFilePath,
                    cacheInfo: cacheInfo
                  })
                },
                fail: (saveError) => {
                  logger.error('保存文件失败:', saveError)
                  resolve({ success: false, reason: 'save_failed', error: saveError })
                }
              })
            } else {
              // HTTP状态码非200，下载失败但不打印错误
              resolve({ success: false, reason: 'download_failed', statusCode: downloadRes.statusCode })
            }
          },
          fail: (downloadError) => {
            // 下载失败是常见情况，不打印错误日志，避免日志噪音
            resolve({ success: false, reason: 'download_failed', error: downloadError })
          }
        })
      })
      
    } catch (error) {
      logger.error('缓存媒体文件失败:', error)
      return { success: false, reason: 'cache_failed', error }
    }
  }
  
  /**
   * 获取缓存的文件
   */
  static async getCachedFile(url) {
    try {
      const cacheKey = this.generateCacheKey(url)
      const cacheInfo = this.getCacheInfo(cacheKey)
      
      if (!cacheInfo) {
        return { success: false, reason: 'not_cached' }
      }
      
      // 检查文件是否还存在
      return new Promise((resolve) => {
        uni.getSavedFileInfo({
          filePath: cacheInfo.localPath,
          success: (fileInfo) => {
            // 检查是否过期
            const isExpired = this.isCacheExpired(cacheInfo.cachedTime)
            if (isExpired) {
              this.removeCachedFile(url)
              resolve({ success: false, reason: 'expired' })
            } else {
              resolve({
                success: true,
                localPath: cacheInfo.localPath,
                cacheInfo: cacheInfo
              })
            }
          },
          fail: () => {
            // 文件不存在，清理缓存信息
            this.removeCacheInfo(cacheKey)
            resolve({ success: false, reason: 'file_not_found' })
          }
        })
      })
      
    } catch (error) {
      logger.error('获取缓存文件失败:', error)
      return { success: false, reason: 'get_failed', error }
    }
  }
  
  /**
   * 批量缓存内容中的媒体文件
   */
  static async cacheContentMedia(contentData, deviceId = null) {
    try {
      if (!contentData || !contentData.data) {
        return { success: false, reason: 'no_content' }
      }
      
      const mediaUrls = this.extractMediaUrls(contentData.data)
      const results = []
      
      // 只有在实际有媒体文件需要缓存时才打印日志
      if (mediaUrls.length > 0) {
        logger.info(`开始缓存 ${mediaUrls.length} 个媒体文件`)
      }
      
      for (const url of mediaUrls) {
        try {
          const result = await this.cacheMediaFile(url, deviceId)
          results.push({ url, result })
        } catch (error) {
          // 单个文件缓存失败不影响其他文件
          results.push({ url, result: { success: false, reason: 'cache_error', error } })
        }
      }
      
      const successCount = results.filter(r => r.result.success).length
      const failedCount = results.length - successCount
      
      // 只有在实际缓存了文件时才打印完成日志
      if (mediaUrls.length > 0) {
        if (failedCount > 0) {
          logger.info(`媒体文件缓存完成: ${successCount}/${mediaUrls.length} (${failedCount}个失败)`)
        } else {
          logger.info(`媒体文件缓存完成: ${successCount}/${mediaUrls.length}`)
        }
      }
      
      return {
        success: true,
        total: mediaUrls.length,
        cached: successCount,
        results: results
      }
      
    } catch (error) {
      logger.error('批量缓存媒体文件失败:', error)
      return { success: false, reason: 'batch_cache_failed', error }
    }
  }
  
  /**
   * 从内容数据中提取媒体URL
   */
  static extractMediaUrls(contentData) {
    const mediaUrls = new Set() // 使用Set自动去重
    
    try {
      // 提取直接内容中的媒体
      if (contentData.direct_content) {
        this.extractUrlsFromContent(contentData.direct_content, mediaUrls)
      }
      
      // 提取播放列表中的媒体
      if (contentData.playlist_contents && Array.isArray(contentData.playlist_contents)) {
        contentData.playlist_contents.forEach(content => {
          this.extractUrlsFromContent(content, mediaUrls)
        })
      }
      
      // 提取主要内容中的媒体
      if (contentData.primary_contents && Array.isArray(contentData.primary_contents)) {
        contentData.primary_contents.forEach(content => {
          this.extractUrlsFromContent(content, mediaUrls)
        })
      }
      
      // 提取次要内容中的媒体
      if (contentData.secondary_contents && Array.isArray(contentData.secondary_contents)) {
        contentData.secondary_contents.forEach(content => {
          this.extractUrlsFromContent(content, mediaUrls)
        })
      }
      
    } catch (error) {
      logger.error('提取媒体URL失败:', error)
    }
    
    return Array.from(mediaUrls)
  }
  
  /**
   * 从单个内容中提取媒体URL
   */
  static extractUrlsFromContent(content, mediaUrls) {
    if (!content) return
    
    // 检查常见的媒体字段
    const mediaFields = ['content_url', 'thumbnail', 'url', 'src', 'source', 'file_url', 'media_url', 'image_url', 'video_url', 'audio_url']
    
    mediaFields.forEach(field => {
      if (content[field] && typeof content[field] === 'string') {
        const url = content[field]
        // 检查URL是否有效且为支持的媒体文件
        if (url.startsWith('http') && this.isSupportedMediaFile(url)) {
          mediaUrls.add(url)
        }
      }
    })
    
    // 递归检查嵌套对象
    Object.values(content).forEach(value => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.extractUrlsFromContent(value, mediaUrls)
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            this.extractUrlsFromContent(item, mediaUrls)
          }
        })
      }
    })
  }
  
  /**
   * 保存缓存信息
   */
  static saveCacheInfo(cacheKey, cacheInfo) {
    try {
      uni.setStorageSync(cacheKey, cacheInfo)
    } catch (error) {
      logger.error('保存缓存信息失败:', error)
    }
  }
  
  /**
   * 获取缓存信息
   */
  static getCacheInfo(cacheKey) {
    try {
      return uni.getStorageSync(cacheKey)
    } catch (error) {
      return null
    }
  }
  
  /**
   * 删除缓存信息
   */
  static removeCacheInfo(cacheKey) {
    try {
      uni.removeStorageSync(cacheKey)
    } catch (error) {
      logger.error('删除缓存信息失败:', error)
    }
  }
  
  /**
   * 检查缓存是否过期
   */
  static isCacheExpired(cachedTime) {
    const expireTime = this.CACHE_CONFIG.CACHE_EXPIRE_DAYS * 24 * 60 * 60 * 1000
    return Date.now() - cachedTime > expireTime
  }
  
  /**
   * 删除缓存文件
   */
  static async removeCachedFile(url) {
    try {
      const cacheKey = this.generateCacheKey(url)
      const cacheInfo = this.getCacheInfo(cacheKey)
      
      if (cacheInfo && cacheInfo.localPath) {
        uni.removeSavedFile({
          filePath: cacheInfo.localPath,
          success: () => {
            logger.info('删除缓存文件成功:', url)
          },
          fail: (error) => {
            logger.warn('删除缓存文件失败:', error)
          }
        })
      }
      
      this.removeCacheInfo(cacheKey)
      
    } catch (error) {
      logger.error('删除缓存文件失败:', error)
    }
  }
  
  /**
   * 清理过期的缓存
   */
  static async cleanExpiredCache() {
    try {
      logger.info('开始清理过期缓存')
      
      const storageInfo = await this.getStorageInfo()
      const keys = storageInfo.keys || []
      
      let cleanedCount = 0
      
      for (const key of keys) {
        if (key.startsWith(this.CACHE_CONFIG.CACHE_KEY_PREFIX)) {
          const cacheInfo = this.getCacheInfo(key)
          if (cacheInfo && this.isCacheExpired(cacheInfo.cachedTime)) {
            await this.removeCachedFile(cacheInfo.url)
            cleanedCount++
          }
        }
      }
      
      logger.info(`清理过期缓存完成，清理了${cleanedCount}个文件`)
      return { success: true, cleanedCount }
      
    } catch (error) {
      logger.error('清理过期缓存失败:', error)
      return { success: false, error }
    }
  }
  
  /**
   * 清理指定设备的缓存
   */
  static async cleanDeviceCache(deviceId) {
    try {
      logger.info('开始清理设备缓存:', deviceId)
      
      const storageInfo = await this.getStorageInfo()
      const keys = storageInfo.keys || []
      
      let cleanedCount = 0
      
      for (const key of keys) {
        if (key.startsWith(this.CACHE_CONFIG.CACHE_KEY_PREFIX)) {
          const cacheInfo = this.getCacheInfo(key)
          if (cacheInfo && cacheInfo.deviceId === deviceId) {
            await this.removeCachedFile(cacheInfo.url)
            cleanedCount++
          }
        }
      }
      
      logger.info(`清理设备缓存完成，清理了${cleanedCount}个文件`)
      return { success: true, cleanedCount }
      
    } catch (error) {
      logger.error('清理设备缓存失败:', error)
      return { success: false, error }
    }
  }
  
  /**
   * 获取缓存统计信息
   */
  static async getCacheStats() {
    try {
      const storageInfo = await this.getStorageInfo()
      const keys = storageInfo.keys || []
      
      let totalFiles = 0
      let totalSize = 0
      let expiredCount = 0
      
      const typeStats = {
        image: 0,
        video: 0,
        audio: 0
      }
      
      for (const key of keys) {
        if (key.startsWith(this.CACHE_CONFIG.CACHE_KEY_PREFIX)) {
          const cacheInfo = this.getCacheInfo(key)
          if (cacheInfo) {
            totalFiles++
            totalSize += cacheInfo.fileSize || 0
            
            if (this.isCacheExpired(cacheInfo.cachedTime)) {
              expiredCount++
            }
            
            if (typeStats.hasOwnProperty(cacheInfo.mediaType)) {
              typeStats[cacheInfo.mediaType]++
            }
          }
        }
      }
      
      return {
        totalFiles,
        totalSize,
        expiredCount,
        typeStats,
        maxCacheSize: this.CACHE_CONFIG.MAX_CACHE_SIZE,
        usage: totalSize / this.CACHE_CONFIG.MAX_CACHE_SIZE
      }
      
    } catch (error) {
      logger.error('获取缓存统计失败:', error)
      return {
        totalFiles: 0,
        totalSize: 0,
        expiredCount: 0,
        typeStats: { image: 0, video: 0, audio: 0 },
        maxCacheSize: this.CACHE_CONFIG.MAX_CACHE_SIZE,
        usage: 0
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
          fail: () => {
            resolve({})
          }
        })
      } catch (error) {
        resolve({})
      }
    })
  }
  
  /**
   * 格式化文件大小
   */
  static formatSize(bytes) {
    if (bytes === 0) return '0 B'
    
    const units = ['B', 'KB', 'MB', 'GB']
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
  }
}
