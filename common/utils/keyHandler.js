/**
 * 按键事件处理工具类
 * 主要用于TV遥控器和键盘事件处理
 */

import { Logger } from './logger.js'

const logger = Logger.createTaggedLogger('KeyHandler')

export class KeyHandler {
  constructor() {
    this.listeners = new Map()
    this.isEnabled = true
    this.lastKeyTime = 0
    this.keyRepeatDelay = 300 // 按键重复延迟(ms)
    
    this.init()
  }
  
  /**
   * 初始化按键监听
   */
  init() {
    // 监听物理按键（主要用于TV）
    this.setupPhysicalKeyListener()
    
    // 监听触摸事件（用于模拟按键）
    this.setupTouchListener()
    
    logger.info('按键处理器初始化完成')
  }
  
  /**
   * 设置物理按键监听
   */
  setupPhysicalKeyListener() {
    // 在UniApp中，物理按键事件需要通过原生插件或条件编译处理
    // 这里提供基础框架
    
    // #ifdef APP-PLUS
    // 监听Android TV遥控器按键
    if (uni.getSystemInfoSync().platform === 'android') {
      this.setupAndroidTVKeys()
    }
    // #endif
    
    // #ifdef H5
    // 监听键盘事件
    this.setupKeyboardListener()
    // #endif
  }
  
  /**
   * 设置Android TV按键监听
   */
  setupAndroidTVKeys() {
    // 这里需要原生插件支持
    // 示例代码框架
    logger.info('设置Android TV按键监听')
    
    // 模拟按键事件
    const keyMap = {
      19: 'UP',        // 上
      20: 'DOWN',      // 下
      21: 'LEFT',      // 左
      22: 'RIGHT',     // 右
      23: 'CENTER',    // 确认/选择
      4: 'BACK',       // 返回
      82: 'MENU',      // 菜单
      24: 'VOLUME_UP', // 音量+
      25: 'VOLUME_DOWN', // 音量-
      164: 'MUTE',     // 静音
      126: 'PLAY_PAUSE', // 播放/暂停
      127: 'STOP',     // 停止
      87: 'NEXT',      // 下一个
      88: 'PREVIOUS'   // 上一个
    }
    
    // 这里应该调用原生插件来监听按键
    // plus.key.addEventListener('keydown', (event) => {
    //   const keyName = keyMap[event.keyCode]
    //   if (keyName) {
    //     this.handleKeyEvent(keyName, 'keydown')
    //   }
    // })
  }
  
  /**
   * 设置键盘监听（H5环境）
   */
  setupKeyboardListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', (event) => {
        const keyName = this.mapKeyboardKey(event.keyCode, event.key)
        if (keyName) {
          event.preventDefault()
          this.handleKeyEvent(keyName, 'keydown')
        }
      })
      
      document.addEventListener('keyup', (event) => {
        const keyName = this.mapKeyboardKey(event.keyCode, event.key)
        if (keyName) {
          event.preventDefault()
          this.handleKeyEvent(keyName, 'keyup')
        }
      })
      
      logger.info('键盘事件监听已设置')
    }
  }
  
  /**
   * 映射键盘按键
   */
  mapKeyboardKey(keyCode, key) {
    const keyMap = {
      // 方向键
      37: 'LEFT',
      38: 'UP', 
      39: 'RIGHT',
      40: 'DOWN',
      
      // 功能键
      13: 'CENTER',  // Enter
      27: 'BACK',    // Escape
      32: 'CENTER',  // Space
      
      // 字母键
      65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E',
      70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J',
      75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O',
      80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T',
      85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y',
      90: 'Z',
      
      // 数字键
      48: '0', 49: '1', 50: '2', 51: '3', 52: '4',
      53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
      
      // 媒体控制键
      179: 'PLAY_PAUSE', // Media Play/Pause
      178: 'STOP',       // Media Stop
      176: 'NEXT',       // Media Next
      177: 'PREVIOUS',   // Media Previous
      173: 'MUTE',       // Audio Mute
      175: 'VOLUME_UP',  // Audio Volume Up
      174: 'VOLUME_DOWN' // Audio Volume Down
    }
    
    return keyMap[keyCode] || null
  }
  
  /**
   * 设置触摸监听（用于模拟按键）
   */
  setupTouchListener() {
    // 监听滑动手势来模拟方向键
    let touchStartX = 0
    let touchStartY = 0
    let touchStartTime = 0
    
    const handleTouchStart = (event) => {
      if (!this.isEnabled) return
      
      const touch = event.touches[0]
      touchStartX = touch.clientX
      touchStartY = touch.clientY
      touchStartTime = Date.now()
    }
    
    const handleTouchEnd = (event) => {
      if (!this.isEnabled) return
      
      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - touchStartX
      const deltaY = touch.clientY - touchStartY
      const deltaTime = Date.now() - touchStartTime
      
      // 检查是否为有效滑动
      const minDistance = 50
      const maxTime = 500
      
      if (deltaTime > maxTime) return
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平滑动
        if (Math.abs(deltaX) > minDistance) {
          const keyName = deltaX > 0 ? 'RIGHT' : 'LEFT'
          this.handleKeyEvent(keyName, 'swipe')
        }
      } else {
        // 垂直滑动
        if (Math.abs(deltaY) > minDistance) {
          const keyName = deltaY > 0 ? 'DOWN' : 'UP'
          this.handleKeyEvent(keyName, 'swipe')
        }
      }
    }
    
    // 在UniApp中监听触摸事件
    // 这需要在具体页面中实现
    logger.info('触摸事件监听框架已设置')
  }
  
  /**
   * 处理按键事件
   */
  handleKeyEvent(keyName, eventType) {
    if (!this.isEnabled) return
    
    const now = Date.now()
    
    // 防止按键重复触发
    if (now - this.lastKeyTime < this.keyRepeatDelay) {
      return
    }
    
    this.lastKeyTime = now
    
    logger.debug(`按键事件: ${keyName} (${eventType})`)
    
    // 触发监听器
    const listeners = this.listeners.get(keyName) || []
    listeners.forEach(listener => {
      try {
        listener(keyName, eventType)
      } catch (error) {
        logger.error('按键监听器执行失败:', error)
      }
    })
    
    // 触发通用监听器
    const allListeners = this.listeners.get('*') || []
    allListeners.forEach(listener => {
      try {
        listener(keyName, eventType)
      } catch (error) {
        logger.error('通用按键监听器执行失败:', error)
      }
    })
  }
  
  /**
   * 添加按键监听器
   */
  addListener(keyName, callback) {
    if (!this.listeners.has(keyName)) {
      this.listeners.set(keyName, [])
    }
    
    this.listeners.get(keyName).push(callback)
    logger.debug(`添加按键监听器: ${keyName}`)
  }
  
  /**
   * 移除按键监听器
   */
  removeListener(keyName, callback) {
    const listeners = this.listeners.get(keyName)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
        logger.debug(`移除按键监听器: ${keyName}`)
      }
    }
  }
  
  /**
   * 移除所有监听器
   */
  removeAllListeners(keyName = null) {
    if (keyName) {
      this.listeners.delete(keyName)
    } else {
      this.listeners.clear()
    }
    logger.debug('移除按键监听器:', keyName || '全部')
  }
  
  /**
   * 启用/禁用按键处理
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
    logger.info(`按键处理器${enabled ? '启用' : '禁用'}`)
  }
  
  /**
   * 模拟按键事件
   */
  simulateKey(keyName, eventType = 'keydown') {
    this.handleKeyEvent(keyName, eventType)
  }
  
  /**
   * 获取支持的按键列表
   */
  getSupportedKeys() {
    return [
      'UP', 'DOWN', 'LEFT', 'RIGHT', 'CENTER',
      'BACK', 'MENU', 'HOME',
      'VOLUME_UP', 'VOLUME_DOWN', 'MUTE',
      'PLAY_PAUSE', 'STOP', 'NEXT', 'PREVIOUS',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
      'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
      'U', 'V', 'W', 'X', 'Y', 'Z'
    ]
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      isEnabled: this.isEnabled,
      listenerCount: this.listeners.size,
      lastKeyTime: this.lastKeyTime,
      keyRepeatDelay: this.keyRepeatDelay
    }
  }
  
  /**
   * 销毁按键处理器
   */
  destroy() {
    this.removeAllListeners()
    this.setEnabled(false)
    logger.info('按键处理器已销毁')
  }
}

// 创建全局实例
export const globalKeyHandler = new KeyHandler()

// 导出常用按键常量
export const KEYS = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  CENTER: 'CENTER',
  BACK: 'BACK',
  MENU: 'MENU',
  HOME: 'HOME',
  VOLUME_UP: 'VOLUME_UP',
  VOLUME_DOWN: 'VOLUME_DOWN',
  MUTE: 'MUTE',
  PLAY_PAUSE: 'PLAY_PAUSE',
  STOP: 'STOP',
  NEXT: 'NEXT',
  PREVIOUS: 'PREVIOUS'
}
