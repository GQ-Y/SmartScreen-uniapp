/**
 * 网络诊断工具类
 */

import { NetworkUtils } from './networkUtils.js'
import { Logger } from './logger.js'

const logger = Logger.createTaggedLogger('NetworkDiagnostic')

export class NetworkDiagnostic {
  
  /**
   * 执行完整的网络诊断
   */
  static async runFullDiagnostic() {
    logger.info('开始网络诊断')
    
    const results = {
      timestamp: Date.now(),
      basicInfo: await this.getBasicNetworkInfo(),
      connectivity: await this.testConnectivity(),
      speed: await this.testNetworkSpeed(),
      dns: await this.testDNSResolution(),
      websocket: await this.testWebSocketConnectivity(),
      recommendations: []
    }
    
    // 生成建议
    results.recommendations = this.generateRecommendations(results)
    
    logger.info('网络诊断完成', results)
    return results
  }
  
  /**
   * 获取基础网络信息
   */
  static async getBasicNetworkInfo() {
    try {
      const networkInfo = await NetworkUtils.checkConnection()
      const systemInfo = await uni.getSystemInfo()
      
      return {
        networkType: networkInfo.networkType,
        isConnected: networkInfo.isConnected,
        platform: systemInfo.platform,
        system: systemInfo.system,
        model: systemInfo.model,
        brand: systemInfo.brand,
        wifiSignal: await this.getWiFiSignalStrength(),
        timestamp: Date.now()
      }
    } catch (error) {
      logger.error('获取基础网络信息失败:', error)
      return {
        error: error.message,
        timestamp: Date.now()
      }
    }
  }
  
  /**
   * 测试网络连通性
   */
  static async testConnectivity() {
    const testUrls = [
      'https://www.baidu.com',
      'https://www.qq.com',
      'https://httpbin.org/get',
      'https://jsonplaceholder.typicode.com/posts/1'
    ]
    
    const results = []
    
    for (const url of testUrls) {
      const startTime = Date.now()
      try {
        await NetworkUtils.request({
          url,
          method: 'GET',
          timeout: 5000
        })
        
        const responseTime = Date.now() - startTime
        results.push({
          url,
          success: true,
          responseTime,
          error: null
        })
      } catch (error) {
        results.push({
          url,
          success: false,
          responseTime: Date.now() - startTime,
          error: error.message
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const avgResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.responseTime, 0) / successCount || 0
    
    return {
      results,
      summary: {
        successRate: successCount / testUrls.length,
        averageResponseTime: avgResponseTime,
        totalTests: testUrls.length,
        successfulTests: successCount
      }
    }
  }
  
  /**
   * 测试网络速度
   */
  static async testNetworkSpeed() {
    try {
      const speedResult = await NetworkUtils.checkNetworkSpeed()
      
      return {
        success: true,
        duration: speedResult.duration,
        speed: speedResult.speed,
        speedKbps: speedResult.speedKbps,
        speedMbps: speedResult.speedMbps,
        quality: this.getSpeedQuality(speedResult.speedMbps)
      }
    } catch (error) {
      logger.error('网络速度测试失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * 测试DNS解析
   */
  static async testDNSResolution() {
    const testDomains = [
      'www.baidu.com',
      'www.qq.com',
      'github.com',
      'google.com'
    ]
    
    const results = []
    
    for (const domain of testDomains) {
      const startTime = Date.now()
      try {
        // 通过HTTP请求测试域名解析
        await NetworkUtils.request({
          url: `https://${domain}`,
          method: 'HEAD',
          timeout: 3000
        })
        
        const resolveTime = Date.now() - startTime
        results.push({
          domain,
          success: true,
          resolveTime,
          error: null
        })
      } catch (error) {
        results.push({
          domain,
          success: false,
          resolveTime: Date.now() - startTime,
          error: error.message
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const avgResolveTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.resolveTime, 0) / successCount || 0
    
    return {
      results,
      summary: {
        successRate: successCount / testDomains.length,
        averageResolveTime: avgResolveTime,
        totalTests: testDomains.length,
        successfulTests: successCount
      }
    }
  }
  
  /**
   * 测试WebSocket连通性
   */
  static async testWebSocketConnectivity(host = 'localhost', port = 9502) {
    return new Promise((resolve) => {
      const wsUrl = `ws://${host}:${port}/ws`
      const startTime = Date.now()
      let socket = null
      
      const timeout = setTimeout(() => {
        if (socket) {
          socket.close()
        }
        resolve({
          success: false,
          error: '连接超时',
          responseTime: Date.now() - startTime,
          url: wsUrl
        })
      }, 5000)
      
      try {
        socket = uni.connectSocket({
          url: wsUrl,
          success: () => {
            logger.debug('WebSocket连接测试开始')
          },
          fail: (error) => {
            clearTimeout(timeout)
            resolve({
              success: false,
              error: error.errMsg || '连接失败',
              responseTime: Date.now() - startTime,
              url: wsUrl
            })
          }
        })
        
        socket.onOpen(() => {
          clearTimeout(timeout)
          const responseTime = Date.now() - startTime
          socket.close()
          
          resolve({
            success: true,
            responseTime,
            url: wsUrl,
            error: null
          })
        })
        
        socket.onError((error) => {
          clearTimeout(timeout)
          resolve({
            success: false,
            error: error.errMsg || 'WebSocket错误',
            responseTime: Date.now() - startTime,
            url: wsUrl
          })
        })
        
      } catch (error) {
        clearTimeout(timeout)
        resolve({
          success: false,
          error: error.message,
          responseTime: Date.now() - startTime,
          url: wsUrl
        })
      }
    })
  }
  
  /**
   * 获取WiFi信号强度（模拟）
   */
  static async getWiFiSignalStrength() {
    try {
      // 在实际应用中，这里可能需要原生插件支持
      // 目前返回模拟数据
      return {
        strength: Math.floor(Math.random() * 100),
        quality: 'good', // excellent, good, fair, poor
        available: true
      }
    } catch (error) {
      return {
        strength: 0,
        quality: 'unknown',
        available: false,
        error: error.message
      }
    }
  }
  
  /**
   * 获取网络速度质量评级
   */
  static getSpeedQuality(speedMbps) {
    if (speedMbps >= 50) return { level: 'excellent', name: '优秀', color: '#4CAF50' }
    if (speedMbps >= 25) return { level: 'good', name: '良好', color: '#2196F3' }
    if (speedMbps >= 10) return { level: 'fair', name: '一般', color: '#FF9800' }
    if (speedMbps >= 1) return { level: 'poor', name: '较差', color: '#FF5722' }
    return { level: 'very_poor', name: '很差', color: '#F44336' }
  }
  
  /**
   * 生成网络优化建议
   */
  static generateRecommendations(diagnosticResults) {
    const recommendations = []
    
    // 基于连通性测试结果
    if (diagnosticResults.connectivity.summary.successRate < 0.5) {
      recommendations.push({
        type: 'connectivity',
        level: 'high',
        title: '网络连通性问题',
        description: '网络连接不稳定，建议检查网络设置或联系网络管理员',
        actions: ['检查网络连接', '重启路由器', '联系网络服务商']
      })
    }
    
    // 基于速度测试结果
    if (diagnosticResults.speed.success && diagnosticResults.speed.speedMbps < 1) {
      recommendations.push({
        type: 'speed',
        level: 'medium',
        title: '网络速度较慢',
        description: '当前网络速度可能影响视频播放质量',
        actions: ['优化网络环境', '减少其他设备使用', '升级网络套餐']
      })
    }
    
    // 基于DNS解析结果
    if (diagnosticResults.dns.summary.successRate < 0.8) {
      recommendations.push({
        type: 'dns',
        level: 'medium',
        title: 'DNS解析问题',
        description: '域名解析存在问题，可能影响网络访问',
        actions: ['更换DNS服务器', '清除DNS缓存', '检查网络配置']
      })
    }
    
    // 基于WebSocket测试结果
    if (!diagnosticResults.websocket.success) {
      recommendations.push({
        type: 'websocket',
        level: 'high',
        title: 'WebSocket连接失败',
        description: '无法连接到服务器，请检查服务器配置',
        actions: ['检查服务器地址和端口', '确认服务器运行状态', '检查防火墙设置']
      })
    }
    
    // 如果没有问题，给出积极反馈
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        level: 'info',
        title: '网络状态良好',
        description: '所有网络测试均通过，设备可以正常使用',
        actions: ['继续保持当前网络配置']
      })
    }
    
    return recommendations
  }
  
  /**
   * 格式化诊断报告
   */
  static formatDiagnosticReport(results) {
    const report = {
      summary: {
        timestamp: new Date(results.timestamp).toLocaleString(),
        overallStatus: this.getOverallStatus(results),
        networkType: results.basicInfo.networkType,
        platform: results.basicInfo.platform
      },
      details: {
        connectivity: `${(results.connectivity.summary.successRate * 100).toFixed(1)}% 成功率`,
        speed: results.speed.success ? 
          `${results.speed.speedMbps.toFixed(2)} Mbps` : '测试失败',
        dns: `${(results.dns.summary.successRate * 100).toFixed(1)}% 解析成功`,
        websocket: results.websocket.success ? '连接成功' : '连接失败'
      },
      recommendations: results.recommendations
    }
    
    return report
  }
  
  /**
   * 获取整体状态
   */
  static getOverallStatus(results) {
    const issues = results.recommendations.filter(r => r.level === 'high').length
    const warnings = results.recommendations.filter(r => r.level === 'medium').length
    
    if (issues > 0) return { level: 'error', text: '存在问题' }
    if (warnings > 0) return { level: 'warning', text: '需要注意' }
    return { level: 'success', text: '状态良好' }
  }
}
