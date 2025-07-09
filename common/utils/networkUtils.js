/**
 * 网络工具类
 * 提供网络连接检测、请求封装等功能
 */

export class NetworkUtils {
  
  /**
   * 检查网络连接状态
   */
  static async checkConnection() {
    return new Promise((resolve) => {
      uni.getNetworkType({
        success: (res) => {
          resolve({
            isConnected: res.networkType !== 'none',
            networkType: res.networkType
          })
        },
        fail: () => {
          resolve({
            isConnected: false,
            networkType: 'none'
          })
        }
      })
    })
  }
  
  /**
   * 监听网络状态变化
   */
  static onNetworkStatusChange(callback) {
    uni.onNetworkStatusChange((res) => {
      callback({
        isConnected: res.isConnected,
        networkType: res.networkType
      })
    })
  }
  
  /**
   * 发起HTTP请求
   */
  static request(options) {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        timeout: 10000,
        header: {
          'Content-Type': 'application/json'
        }
      }
      
      const requestOptions = Object.assign({}, defaultOptions, options)
      
      requestOptions.success = (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.errMsg}`))
        }
      }
      
      requestOptions.fail = (err) => {
        reject(new Error(`网络请求失败: ${err.errMsg}`))
      }
      
      uni.request(requestOptions)
    })
  }
  
  /**
   * GET请求
   */
  static get(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'GET',
      data,
      ...options
    })
  }
  
  /**
   * POST请求
   */
  static post(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'POST',
      data,
      ...options
    })
  }
  
  /**
   * 上传文件
   */
  static uploadFile(options) {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        timeout: 30000
      }
      
      const uploadOptions = Object.assign({}, defaultOptions, options)
      
      uploadOptions.success = (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res)
        } else {
          reject(new Error(`上传失败: ${res.errMsg}`))
        }
      }
      
      uploadOptions.fail = (err) => {
        reject(new Error(`上传失败: ${err.errMsg}`))
      }
      
      uni.uploadFile(uploadOptions)
    })
  }
  
  /**
   * 下载文件
   */
  static downloadFile(options) {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        timeout: 60000
      }
      
      const downloadOptions = Object.assign({}, defaultOptions, options)
      
      downloadOptions.success = (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res)
        } else {
          reject(new Error(`下载失败: ${res.errMsg}`))
        }
      }
      
      downloadOptions.fail = (err) => {
        reject(new Error(`下载失败: ${err.errMsg}`))
      }
      
      uni.downloadFile(downloadOptions)
    })
  }
  
  /**
   * 检查URL是否可访问
   */
  static async checkUrlAccessible(url, timeout = 5000) {
    try {
      await this.request({
        url,
        method: 'HEAD',
        timeout
      })
      return true
    } catch (error) {
      console.warn(`URL不可访问: ${url}`, error)
      return false
    }
  }
  
  /**
   * 获取文件大小
   */
  static async getFileSize(url) {
    try {
      const res = await this.request({
        url,
        method: 'HEAD'
      })
      
      // 从响应头获取文件大小
      const contentLength = res.header['content-length'] || res.header['Content-Length']
      return contentLength ? parseInt(contentLength) : 0
    } catch (error) {
      console.warn(`获取文件大小失败: ${url}`, error)
      return 0
    }
  }
  
  /**
   * 检查网络速度
   */
  static async checkNetworkSpeed(testUrl = 'https://www.baidu.com', testSize = 1024) {
    try {
      const startTime = Date.now()
      await this.get(testUrl)
      const endTime = Date.now()
      
      const duration = (endTime - startTime) / 1000 // 秒
      const speed = testSize / duration // bytes/s
      
      return {
        duration,
        speed,
        speedKbps: speed / 1024,
        speedMbps: speed / (1024 * 1024)
      }
    } catch (error) {
      console.warn('网络速度检测失败:', error)
      return {
        duration: 0,
        speed: 0,
        speedKbps: 0,
        speedMbps: 0
      }
    }
  }
  
  /**
   * 格式化网络类型显示名称
   */
  static formatNetworkType(networkType) {
    const typeMap = {
      'wifi': 'WiFi',
      '2g': '2G',
      '3g': '3G',
      '4g': '4G',
      '5g': '5G',
      'ethernet': '以太网',
      'unknown': '未知',
      'none': '无网络'
    }
    
    return typeMap[networkType] || networkType
  }
  
  /**
   * 获取网络质量评级
   */
  static getNetworkQuality(networkType) {
    const qualityMap = {
      '5g': { level: 5, name: '优秀', color: '#52c41a' },
      '4g': { level: 4, name: '良好', color: '#1890ff' },
      'wifi': { level: 4, name: '良好', color: '#1890ff' },
      'ethernet': { level: 5, name: '优秀', color: '#52c41a' },
      '3g': { level: 3, name: '一般', color: '#faad14' },
      '2g': { level: 2, name: '较差', color: '#ff7875' },
      'unknown': { level: 1, name: '未知', color: '#d9d9d9' },
      'none': { level: 0, name: '无网络', color: '#ff4d4f' }
    }
    
    return qualityMap[networkType] || qualityMap['unknown']
  }
  
  /**
   * 批量检查URL可访问性
   */
  static async batchCheckUrls(urls, timeout = 5000) {
    const results = await Promise.allSettled(
      urls.map(url => this.checkUrlAccessible(url, timeout))
    )
    
    return urls.map((url, index) => ({
      url,
      accessible: results[index].status === 'fulfilled' && results[index].value,
      error: results[index].status === 'rejected' ? results[index].reason : null
    }))
  }
  
  /**
   * 重试机制包装器
   */
  static async withRetry(asyncFn, maxRetries = 3, delay = 1000) {
    let lastError
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await asyncFn()
      } catch (error) {
        lastError = error
        
        if (i < maxRetries) {
          console.warn(`操作失败，${delay}ms后重试 (${i + 1}/${maxRetries}):`, error)
          await new Promise(resolve => setTimeout(resolve, delay))
          delay *= 2 // 指数退避
        }
      }
    }
    
    throw lastError
  }
}
