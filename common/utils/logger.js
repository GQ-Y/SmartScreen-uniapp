/**
 * 日志工具类
 * 提供统一的日志记录功能
 */

import { STORAGE_KEYS } from '../constants/constants.js'

export class Logger {
  static LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  }
  
  static LOG_LEVEL_NAMES = {
    0: 'DEBUG',
    1: 'INFO',
    2: 'WARN',
    3: 'ERROR'
  }
  
  static currentLevel = Logger.LOG_LEVELS.INFO
  static maxLogEntries = 1000
  static logs = []
  
  /**
   * 初始化日志系统
   */
  static init(level = 'INFO') {
    this.setLevel(level)
    this.loadLogsFromStorage()
  }
  
  /**
   * 设置日志级别
   */
  static setLevel(level) {
    if (typeof level === 'string') {
      this.currentLevel = this.LOG_LEVELS[level.toUpperCase()] || this.LOG_LEVELS.INFO
    } else {
      this.currentLevel = level
    }
  }
  
  /**
   * 记录日志
   */
  static log(level, message, ...args) {
    if (level < this.currentLevel) {
      return
    }
    
    const timestamp = new Date().toISOString()
    const levelName = this.LOG_LEVEL_NAMES[level]
    const logEntry = {
      timestamp,
      level: levelName,
      message,
      args: args.length > 0 ? args : undefined
    }
    
    // 添加到内存日志
    this.logs.push(logEntry)
    
    // 限制日志条数
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries)
    }
    
    // 输出到控制台
    const consoleMessage = `[${timestamp}] [${levelName}] ${message}`
    switch (level) {
      case this.LOG_LEVELS.DEBUG:
        console.log(consoleMessage, ...args)
        break
      case this.LOG_LEVELS.INFO:
        console.info(consoleMessage, ...args)
        break
      case this.LOG_LEVELS.WARN:
        console.warn(consoleMessage, ...args)
        break
      case this.LOG_LEVELS.ERROR:
        console.error(consoleMessage, ...args)
        break
    }
    
    // 异步保存到存储
    this.saveLogsToStorage()
  }
  
  /**
   * DEBUG级别日志
   */
  static debug(message, ...args) {
    this.log(this.LOG_LEVELS.DEBUG, message, ...args)
  }
  
  /**
   * INFO级别日志
   */
  static info(message, ...args) {
    this.log(this.LOG_LEVELS.INFO, message, ...args)
  }
  
  /**
   * WARN级别日志
   */
  static warn(message, ...args) {
    this.log(this.LOG_LEVELS.WARN, message, ...args)
  }
  
  /**
   * ERROR级别日志
   */
  static error(message, ...args) {
    this.log(this.LOG_LEVELS.ERROR, message, ...args)
  }
  
  /**
   * 获取所有日志
   */
  static getLogs() {
    return [...this.logs]
  }
  
  /**
   * 获取指定级别的日志
   */
  static getLogsByLevel(level) {
    const targetLevel = typeof level === 'string' ? 
      this.LOG_LEVELS[level.toUpperCase()] : level
    
    return this.logs.filter(log => 
      this.LOG_LEVELS[log.level] >= targetLevel
    )
  }
  
  /**
   * 获取最近的日志
   */
  static getRecentLogs(count = 100) {
    return this.logs.slice(-count)
  }
  
  /**
   * 清空日志
   */
  static clearLogs() {
    this.logs = []
    this.saveLogsToStorage()
  }
  
  /**
   * 从存储加载日志
   */
  static loadLogsFromStorage() {
    try {
      const storedLogs = uni.getStorageSync('app_logs')
      if (storedLogs && Array.isArray(storedLogs)) {
        this.logs = storedLogs.slice(-this.maxLogEntries)
      }
    } catch (error) {
      console.warn('加载日志失败:', error)
    }
  }
  
  /**
   * 保存日志到存储
   */
  static saveLogsToStorage() {
    try {
      // 只保存最近的日志到存储
      const logsToSave = this.logs.slice(-Math.min(this.maxLogEntries, 500))
      uni.setStorageSync('app_logs', logsToSave)
    } catch (error) {
      console.warn('保存日志失败:', error)
    }
  }
  
  /**
   * 导出日志为文本
   */
  static exportLogsAsText() {
    return this.logs.map(log => {
      const argsStr = log.args ? ` ${JSON.stringify(log.args)}` : ''
      return `[${log.timestamp}] [${log.level}] ${log.message}${argsStr}`
    }).join('\n')
  }
  
  /**
   * 导出日志为JSON
   */
  static exportLogsAsJson() {
    return JSON.stringify(this.logs, null, 2)
  }
  
  /**
   * 记录WebSocket相关日志
   */
  static websocket(action, message, data = null) {
    const logMessage = `WebSocket ${action}: ${message}`
    this.info(logMessage, data)
  }
  
  /**
   * 记录播放器相关日志
   */
  static player(action, message, data = null) {
    const logMessage = `Player ${action}: ${message}`
    this.info(logMessage, data)
  }
  
  /**
   * 记录网络相关日志
   */
  static network(action, message, data = null) {
    const logMessage = `Network ${action}: ${message}`
    this.info(logMessage, data)
  }
  
  /**
   * 记录设备相关日志
   */
  static device(action, message, data = null) {
    const logMessage = `Device ${action}: ${message}`
    this.info(logMessage, data)
  }
  
  /**
   * 记录性能相关日志
   */
  static performance(action, duration, message = '') {
    const logMessage = `Performance ${action}: ${duration}ms ${message}`.trim()
    this.info(logMessage)
  }
  
  /**
   * 创建带标签的日志记录器
   */
  static createTaggedLogger(tag) {
    return {
      debug: (message, ...args) => this.debug(`[${tag}] ${message}`, ...args),
      info: (message, ...args) => this.info(`[${tag}] ${message}`, ...args),
      warn: (message, ...args) => this.warn(`[${tag}] ${message}`, ...args),
      error: (message, ...args) => this.error(`[${tag}] ${message}`, ...args)
    }
  }
  
  /**
   * 获取日志统计信息
   */
  static getLogStats() {
    const stats = {
      total: this.logs.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    }
    
    this.logs.forEach(log => {
      const level = log.level.toLowerCase()
      if (stats.hasOwnProperty(level)) {
        stats[level]++
      }
    })
    
    return stats
  }
  
  /**
   * 搜索日志
   */
  static searchLogs(keyword, options = {}) {
    const {
      level = null,
      startTime = null,
      endTime = null,
      caseSensitive = false
    } = options
    
    return this.logs.filter(log => {
      // 级别过滤
      if (level && log.level !== level.toUpperCase()) {
        return false
      }
      
      // 时间过滤
      const logTime = new Date(log.timestamp)
      if (startTime && logTime < new Date(startTime)) {
        return false
      }
      if (endTime && logTime > new Date(endTime)) {
        return false
      }
      
      // 关键词搜索
      const searchText = caseSensitive ? log.message : log.message.toLowerCase()
      const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase()
      
      return searchText.includes(searchKeyword)
    })
  }
}
