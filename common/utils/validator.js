/**
 * 表单验证工具类
 */

export class Validator {
  
  /**
   * 验证IP地址
   */
  static validateIP(ip) {
    if (!ip) {
      return { valid: false, message: 'IP地址不能为空' }
    }
    
    // IPv4正则表达式
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    
    // 域名正则表达式
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
    
    if (ipv4Regex.test(ip) || domainRegex.test(ip) || ip === 'localhost') {
      return { valid: true, message: '' }
    }
    
    return { valid: false, message: '请输入有效的IP地址或域名' }
  }
  
  /**
   * 验证端口号
   */
  static validatePort(port) {
    if (!port && port !== 0) {
      return { valid: false, message: '端口号不能为空' }
    }
    
    const portNum = parseInt(port)
    
    if (isNaN(portNum)) {
      return { valid: false, message: '端口号必须是数字' }
    }
    
    if (portNum < 1 || portNum > 65535) {
      return { valid: false, message: '端口号必须在1-65535之间' }
    }
    
    return { valid: true, message: '' }
  }
  
  /**
   * 验证设备名称
   */
  static validateDeviceName(name) {
    if (!name || name.trim() === '') {
      return { valid: false, message: '设备名称不能为空' }
    }
    
    if (name.length < 2) {
      return { valid: false, message: '设备名称至少需要2个字符' }
    }
    
    if (name.length > 50) {
      return { valid: false, message: '设备名称不能超过50个字符' }
    }
    
    // 检查特殊字符
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(name)) {
      return { valid: false, message: '设备名称不能包含特殊字符 < > : " / \\ | ? *' }
    }
    
    return { valid: true, message: '' }
  }
  
  /**
   * 验证音量值
   */
  static validateVolume(volume) {
    const vol = parseFloat(volume)
    
    if (isNaN(vol)) {
      return { valid: false, message: '音量值必须是数字' }
    }
    
    if (vol < 0 || vol > 1) {
      return { valid: false, message: '音量值必须在0-1之间' }
    }
    
    return { valid: true, message: '' }
  }
  
  /**
   * 验证缓存大小
   */
  static validateCacheSize(size) {
    const sizeNum = parseInt(size)
    
    if (isNaN(sizeNum)) {
      return { valid: false, message: '缓存大小必须是数字' }
    }
    
    if (sizeNum < 1) {
      return { valid: false, message: '缓存大小必须大于0' }
    }
    
    // 最大缓存大小限制为10GB
    const maxSize = 10 * 1024 * 1024 * 1024
    if (sizeNum > maxSize) {
      return { valid: false, message: '缓存大小不能超过10GB' }
    }
    
    return { valid: true, message: '' }
  }
  
  /**
   * 验证WebSocket URL
   */
  static validateWebSocketUrl(host, port) {
    const ipResult = this.validateIP(host)
    if (!ipResult.valid) {
      return ipResult
    }
    
    const portResult = this.validatePort(port)
    if (!portResult.valid) {
      return portResult
    }
    
    return { valid: true, message: '' }
  }
  
  /**
   * 验证JSON格式
   */
  static validateJSON(jsonStr) {
    if (!jsonStr || jsonStr.trim() === '') {
      return { valid: false, message: 'JSON内容不能为空' }
    }
    
    try {
      JSON.parse(jsonStr)
      return { valid: true, message: '' }
    } catch (error) {
      return { valid: false, message: `JSON格式错误: ${error.message}` }
    }
  }
  
  /**
   * 验证数字范围
   */
  static validateNumberRange(value, min, max, fieldName = '值') {
    const num = parseFloat(value)
    
    if (isNaN(num)) {
      return { valid: false, message: `${fieldName}必须是数字` }
    }
    
    if (num < min || num > max) {
      return { valid: false, message: `${fieldName}必须在${min}-${max}之间` }
    }
    
    return { valid: true, message: '' }
  }
  
  /**
   * 验证字符串长度
   */
  static validateStringLength(str, minLength, maxLength, fieldName = '字段') {
    if (!str) {
      return { valid: false, message: `${fieldName}不能为空` }
    }
    
    if (str.length < minLength) {
      return { valid: false, message: `${fieldName}长度不能少于${minLength}个字符` }
    }
    
    if (str.length > maxLength) {
      return { valid: false, message: `${fieldName}长度不能超过${maxLength}个字符` }
    }
    
    return { valid: true, message: '' }
  }
  
  /**
   * 批量验证
   */
  static validateBatch(validations) {
    const results = {}
    let hasError = false
    
    for (const [field, validation] of Object.entries(validations)) {
      const result = validation()
      results[field] = result
      
      if (!result.valid) {
        hasError = true
      }
    }
    
    return {
      valid: !hasError,
      results,
      errors: Object.entries(results)
        .filter(([_, result]) => !result.valid)
        .map(([field, result]) => ({ field, message: result.message }))
    }
  }
  
  /**
   * 获取第一个错误信息
   */
  static getFirstError(validationResults) {
    for (const [field, result] of Object.entries(validationResults)) {
      if (!result.valid) {
        return result.message
      }
    }
    return null
  }
}

/**
 * 实时验证混入
 */
export const validationMixin = {
  data() {
    return {
      validationErrors: {},
      validationTouched: {}
    }
  },
  
  methods: {
    // 验证单个字段
    validateField(field, value, validator) {
      const result = validator(value)
      
      this.$set(this.validationErrors, field, result.valid ? '' : result.message)
      this.$set(this.validationTouched, field, true)
      
      return result.valid
    },
    
    // 清除字段验证错误
    clearFieldError(field) {
      this.$set(this.validationErrors, field, '')
    },
    
    // 检查字段是否有错误
    hasFieldError(field) {
      return this.validationTouched[field] && this.validationErrors[field]
    },
    
    // 获取字段错误信息
    getFieldError(field) {
      return this.validationErrors[field] || ''
    },
    
    // 检查表单是否有效
    isFormValid() {
      return Object.values(this.validationErrors).every(error => !error)
    },
    
    // 重置验证状态
    resetValidation() {
      this.validationErrors = {}
      this.validationTouched = {}
    }
  }
}

/**
 * 常用验证规则
 */
export const ValidationRules = {
  required: (message = '此字段为必填项') => (value) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return { valid: false, message }
    }
    return { valid: true, message: '' }
  },
  
  minLength: (min, message) => (value) => {
    if (!value || value.length < min) {
      return { valid: false, message: message || `最少需要${min}个字符` }
    }
    return { valid: true, message: '' }
  },
  
  maxLength: (max, message) => (value) => {
    if (value && value.length > max) {
      return { valid: false, message: message || `最多允许${max}个字符` }
    }
    return { valid: true, message: '' }
  },
  
  pattern: (regex, message) => (value) => {
    if (value && !regex.test(value)) {
      return { valid: false, message: message || '格式不正确' }
    }
    return { valid: true, message: '' }
  },
  
  range: (min, max, message) => (value) => {
    const num = parseFloat(value)
    if (isNaN(num) || num < min || num > max) {
      return { valid: false, message: message || `值必须在${min}-${max}之间` }
    }
    return { valid: true, message: '' }
  }
}
