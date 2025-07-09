<template>
  <view class="settings-container">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="nav-left">
        <button class="back-btn" @click="handleBack">
          <text class="back-icon">←</text>
          <text class="back-text">返回</text>
        </button>
      </view>
      <view class="nav-center">
        <text class="page-title">设置</text>
      </view>
      <view class="nav-right">
        <button class="save-btn" @click="handleSave" :disabled="!hasChanges">
          <text class="save-text">保存</text>
        </button>
      </view>
    </view>
    
    <!-- 设置内容 -->
    <scroll-view class="settings-content" scroll-y="true">
      <!-- WebSocket配置 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">服务器配置</text>
          <text class="section-desc">配置WebSocket服务器连接信息</text>
        </view>
        
        <view class="setting-item">
          <text class="setting-label">服务器地址</text>
          <view class="input-wrapper">
            <input
              class="setting-input"
              :class="{ 'input-error': hasFieldError('host') }"
              v-model="localSettings.websocket.host"
              placeholder="请输入服务器IP地址或域名"
              @input="handleHostInput"
              @blur="validateHost"
            />
            <text class="input-error-text" v-if="hasFieldError('host')">
              {{ getFieldError('host') }}
            </text>
            <text class="input-hint" v-else>
              支持IP地址、域名或localhost
            </text>
          </view>
        </view>

        <view class="setting-item">
          <text class="setting-label">端口号</text>
          <view class="input-wrapper">
            <input
              class="setting-input"
              :class="{ 'input-error': hasFieldError('port') }"
              v-model.number="localSettings.websocket.port"
              type="number"
              placeholder="请输入端口号 (1-65535)"
              @input="handlePortInput"
              @blur="validatePort"
            />
            <text class="input-error-text" v-if="hasFieldError('port')">
              {{ getFieldError('port') }}
            </text>
            <text class="input-hint" v-else>
              常用端口：9502, 8080, 3000
            </text>
          </view>
        </view>
        
        <view class="setting-item">
          <text class="setting-label">自动连接</text>
          <switch 
            :checked="localSettings.websocket.autoConnect"
            @change="handleSwitchChange('websocket.autoConnect', $event)"
          />
        </view>
        
        <view class="setting-item">
          <text class="setting-label">连接状态</text>
          <view class="connection-status" :class="connectionStatusClass">
            <text class="status-text">{{ connectionStatusText }}</text>
            <view class="connection-actions">
              <button class="test-btn" @click="testConnection">测试连接</button>
              <button class="test-btn secondary" @click="runNetworkDiagnostic">网络诊断</button>
            </view>
          </view>
        </view>

        <!-- 网络诊断结果 -->
        <view class="diagnostic-results" v-if="diagnosticResults">
          <view class="diagnostic-header">
            <text class="diagnostic-title">网络诊断结果</text>
            <text class="diagnostic-time">{{ diagnosticResults.summary.timestamp }}</text>
          </view>

          <view class="diagnostic-summary">
            <view class="status-indicator" :class="diagnosticResults.summary.overallStatus.level">
              <text class="status-dot">●</text>
              <text class="status-label">{{ diagnosticResults.summary.overallStatus.text }}</text>
            </view>
          </view>

          <view class="diagnostic-details">
            <view class="detail-item">
              <text class="detail-label">网络连通性</text>
              <text class="detail-value">{{ diagnosticResults.details.connectivity }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">网络速度</text>
              <text class="detail-value">{{ diagnosticResults.details.speed }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">DNS解析</text>
              <text class="detail-value">{{ diagnosticResults.details.dns }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">WebSocket</text>
              <text class="detail-value">{{ diagnosticResults.details.websocket }}</text>
            </view>
          </view>

          <view class="diagnostic-recommendations" v-if="diagnosticResults.recommendations.length > 0">
            <text class="recommendations-title">优化建议</text>
            <view class="recommendation-item"
                  v-for="(rec, index) in diagnosticResults.recommendations"
                  :key="index"
                  :class="rec.level">
              <view class="recommendation-header">
                <text class="recommendation-title">{{ rec.title }}</text>
                <text class="recommendation-level">{{ getLevelText(rec.level) }}</text>
              </view>
              <text class="recommendation-desc">{{ rec.description }}</text>
              <view class="recommendation-actions">
                <text class="action-item" v-for="(action, idx) in rec.actions" :key="idx">
                  • {{ action }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 设备配置 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">设备配置</text>
          <text class="section-desc">配置设备基本信息</text>
        </view>
        
        <view class="setting-item">
          <text class="setting-label">设备名称</text>
          <view class="input-wrapper">
            <input
              class="setting-input"
              :class="{ 'input-error': hasFieldError('deviceName') }"
              v-model="localSettings.device.deviceName"
              placeholder="请输入设备名称"
              maxlength="50"
              @input="handleDeviceNameInput"
              @blur="validateDeviceName"
            />
            <text class="input-error-text" v-if="hasFieldError('deviceName')">
              {{ getFieldError('deviceName') }}
            </text>
            <text class="input-hint" v-else>
              {{ localSettings.device.deviceName.length }}/50 字符
            </text>
          </view>
        </view>
        
        <view class="setting-item">
          <text class="setting-label">自动播放</text>
          <switch 
            :checked="localSettings.device.autoPlay"
            @change="handleSwitchChange('device.autoPlay', $event)"
          />
        </view>
        
        <view class="setting-item">
          <text class="setting-label">默认音量</text>
          <view class="volume-control">
            <slider 
              :value="localSettings.device.volume * 100"
              @change="handleVolumeChange"
              min="0"
              max="100"
              step="1"
              show-value
            />
          </view>
        </view>
      </view>
      
      <!-- 显示配置 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">显示配置</text>
          <text class="section-desc">配置界面显示选项</text>
        </view>
        
        <view class="setting-item">
          <text class="setting-label">主题</text>
          <picker 
            :value="themeIndex"
            :range="themeOptions"
            range-key="name"
            @change="handleThemeChange"
          >
            <view class="picker-display">
              <text class="picker-text">{{ currentTheme.name }}</text>
              <text class="picker-arrow">></text>
            </view>
          </picker>
        </view>
        
        <view class="setting-item">
          <text class="setting-label">显示网络状态</text>
          <switch 
            :checked="localSettings.display.showNetworkStatus"
            @change="handleSwitchChange('display.showNetworkStatus', $event)"
          />
        </view>
        
        <view class="setting-item">
          <text class="setting-label">显示调试信息</text>
          <switch 
            :checked="localSettings.display.showDebugInfo"
            @change="handleSwitchChange('display.showDebugInfo', $event)"
          />
        </view>
      </view>
      
      <!-- 设备信息 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">设备信息</text>
          <text class="section-desc">查看当前设备详细信息</text>
        </view>
        
        <view class="device-info">
          <view class="info-item" v-for="(value, key) in deviceDetails" :key="key">
            <text class="info-label">{{ key }}</text>
            <text class="info-value">{{ value }}</text>
          </view>
        </view>
      </view>
      
      <!-- 缓存管理 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">缓存管理</text>
          <text class="section-desc">管理应用缓存和临时文件</text>
        </view>

        <view class="cache-info" v-if="cacheStats">
          <view class="cache-overview">
            <view class="cache-item">
              <text class="cache-label">总缓存大小</text>
              <text class="cache-value">{{ formatCacheSize(cacheStats.total) }}</text>
            </view>
            <view class="cache-item">
              <text class="cache-label">存储使用率</text>
              <view class="usage-bar">
                <view class="usage-fill"
                      :style="{ width: (cacheStats.storage.usage * 100) + '%', backgroundColor: getUsageColor(cacheStats.storage.usage) }">
                </view>
                <text class="usage-text">{{ (cacheStats.storage.usage * 100).toFixed(1) }}%</text>
              </view>
            </view>
            <view class="cache-item">
              <text class="cache-label">存储项目数</text>
              <text class="cache-value">{{ cacheStats.storage.items }}</text>
            </view>
            <view class="cache-item">
              <text class="cache-label">文件数量</text>
              <text class="cache-value">{{ cacheStats.files.count }}</text>
            </view>
            <view class="cache-item" v-if="cacheStats.lastCleanTime">
              <text class="cache-label">最后清理</text>
              <text class="cache-value">{{ formatCleanTime(cacheStats.lastCleanTime) }}</text>
            </view>
          </view>

          <view class="cache-actions">
            <button class="cache-btn" @click="refreshCacheStats">
              刷新统计
            </button>
            <button class="cache-btn warning" @click="clearStorageCache">
              清理存储
            </button>
            <button class="cache-btn warning" @click="clearFileCache">
              清理文件
            </button>
            <button class="cache-btn danger" @click="clearAllCache">
              清理全部
            </button>
          </view>
        </view>

        <view class="cache-loading" v-else>
          <text class="loading-text">正在加载缓存信息...</text>
        </view>
      </view>

      <!-- 系统日志 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">系统日志</text>
          <text class="section-desc">查看和管理应用日志</text>
        </view>

        <view class="log-info" v-if="logStats">
          <view class="log-overview">
            <view class="log-item">
              <text class="log-label">日志条数</text>
              <text class="log-value">{{ logStats.total }}</text>
            </view>
            <view class="log-item">
              <text class="log-label">错误日志</text>
              <text class="log-value error">{{ logStats.error }}</text>
            </view>
            <view class="log-item">
              <text class="log-label">警告日志</text>
              <text class="log-value warning">{{ logStats.warn }}</text>
            </view>
          </view>

          <view class="log-actions">
            <button class="log-btn" @click="viewLogs">
              查看日志
            </button>
            <button class="log-btn" @click="exportLogs">
              导出日志
            </button>
            <button class="log-btn danger" @click="clearLogs">
              清空日志
            </button>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">系统操作</text>
        </view>

        <view class="action-buttons">
          <button class="action-btn" @click="handleExportSettings">
            导出配置
          </button>
          <button class="action-btn" @click="handleImportSettings">
            导入配置
          </button>
          <button class="action-btn" @click="exportSystemInfo">
            导出系统信息
          </button>
          <button class="action-btn danger" @click="handleResetSettings">
            重置设置
          </button>
          <button class="action-btn danger" @click="resetApplication">
            重置应用
          </button>
        </view>
      </view>
    </scroll-view>
    
    <!-- 加载遮罩 -->
    <view class="loading-overlay" v-if="isLoading">
      <view class="loading-content">
        <text class="loading-icon">⟳</text>
        <text class="loading-text">{{ loadingText }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import { Logger } from '../../common/utils/logger.js'
import { Validator, validationMixin } from '../../common/utils/validator.js'
import { NetworkDiagnostic } from '../../common/utils/networkDiagnostic.js'
import { CacheManager } from '../../common/utils/cacheManager.js'

const logger = Logger.createTaggedLogger('SettingsPage')

export default {
  name: 'SettingsPage',
  mixins: [validationMixin],
  
  data() {
    return {
      localSettings: {
        websocket: {
          host: 'localhost',
          port: 9502,
          autoConnect: true
        },
        device: {
          deviceName: 'SmartScreen设备',
          autoPlay: true,
          volume: 1.0
        },
        display: {
          theme: 'dark',
          showNetworkStatus: true,
          showDebugInfo: false
        }
      },
      
      hasChanges: false,
      isLoading: false,
      loadingText: '',
      
      themeOptions: [
        { value: 'dark', name: '深色主题' },
        { value: 'light', name: '浅色主题' }
      ],

      // 网络诊断结果
      diagnosticResults: null,

      // 缓存统计信息
      cacheStats: null,

      // 日志统计信息
      logStats: null
    }
  },
  
  computed: {
    ...mapGetters('websocket', [
      'getConnectionStatus'
    ]),
    ...mapGetters('device', [
      'getDeviceDetails'
    ]),
    ...mapGetters('settings', [
      'getWebSocketConfig',
      'getDeviceConfig',
      'getDisplayConfig'
    ]),
    
    // 连接状态
    connectionStatusClass() {
      const status = this.getConnectionStatus
      return {
        'status-connected': status.isConnected,
        'status-disconnected': !status.isConnected,
        'status-connecting': status.status === 'connecting'
      }
    },
    
    connectionStatusText() {
      const status = this.getConnectionStatus
      const statusMap = {
        'connected': '已连接',
        'connecting': '连接中',
        'reconnecting': '重连中',
        'disconnected': '未连接',
        'error': '连接错误'
      }
      return statusMap[status.status] || '未知'
    },
    
    // 设备详细信息
    deviceDetails() {
      return this.getDeviceDetails || {}
    },
    
    // 主题相关
    themeIndex() {
      return this.themeOptions.findIndex(option => 
        option.value === this.localSettings.display.theme
      )
    },
    
    currentTheme() {
      return this.themeOptions[this.themeIndex] || this.themeOptions[0]
    }
  },
  
  async onLoad() {
    logger.info('设置页面加载')
    this.loadCurrentSettings()

    // 加载缓存和日志统计
    await this.loadSystemStats()
  },
  
  methods: {
    ...mapActions('settings', [
      'updateWebSocketConfig',
      'updateDeviceConfig',
      'updateDisplayConfig',
      'resetSettings',
      'exportSettings',
      'importSettings'
    ]),
    ...mapActions('websocket', [
      'connect',
      'disconnect'
    ]),
    
    // 加载当前设置
    loadCurrentSettings() {
      try {
        this.localSettings.websocket = { ...this.getWebSocketConfig }
        this.localSettings.device = { ...this.getDeviceConfig }
        this.localSettings.display = { ...this.getDisplayConfig }

        this.hasChanges = false
        logger.info('当前设置已加载')
      } catch (error) {
        logger.error('加载设置失败:', error)
      }
    },

    // 加载系统统计信息
    async loadSystemStats() {
      try {
        // 加载缓存统计
        this.cacheStats = await CacheManager.getCacheStats()

        // 加载日志统计
        this.logStats = Logger.getLogStats()

        logger.info('系统统计信息已加载')
      } catch (error) {
        logger.error('加载系统统计失败:', error)
      }
    },
    
    // 标记已更改
    markChanged() {
      this.hasChanges = true
    },

    // 验证方法
    validateHost() {
      return this.validateField('host', this.localSettings.websocket.host, Validator.validateIP)
    },

    validatePort() {
      return this.validateField('port', this.localSettings.websocket.port, Validator.validatePort)
    },

    validateDeviceName() {
      return this.validateField('deviceName', this.localSettings.device.deviceName, Validator.validateDeviceName)
    },

    // 输入处理方法
    handleHostInput() {
      this.markChanged()
      this.clearFieldError('host')
    },

    handlePortInput() {
      this.markChanged()
      this.clearFieldError('port')
    },

    handleDeviceNameInput() {
      this.markChanged()
      this.clearFieldError('deviceName')
    },

    // 验证整个表单
    validateForm() {
      const validations = {
        host: () => Validator.validateIP(this.localSettings.websocket.host),
        port: () => Validator.validatePort(this.localSettings.websocket.port),
        deviceName: () => Validator.validateDeviceName(this.localSettings.device.deviceName)
      }

      const result = Validator.validateBatch(validations)

      // 更新验证状态
      Object.entries(result.results).forEach(([field, fieldResult]) => {
        this.validationErrors[field] = fieldResult.valid ? '' : fieldResult.message
        this.validationTouched[field] = true
      })

      return result.valid
    },
    
    // 处理开关变化
    handleSwitchChange(path, event) {
      const value = event.detail.value
      const keys = path.split('.')
      
      if (keys.length === 2) {
        this.localSettings[keys[0]][keys[1]] = value
      }
      
      this.markChanged()
    },
    
    // 处理音量变化
    handleVolumeChange(event) {
      this.localSettings.device.volume = event.detail.value / 100
      this.markChanged()
    },
    
    // 处理主题变化
    handleThemeChange(event) {
      const index = event.detail.value
      this.localSettings.display.theme = this.themeOptions[index].value
      this.markChanged()
    },
    
    // 测试连接
    async testConnection() {
      try {
        this.isLoading = true
        this.loadingText = '正在测试连接...'
        
        // 先断开现有连接
        await this.disconnect()
        
        // 临时更新配置
        await this.updateWebSocketConfig(this.localSettings.websocket)
        
        // 尝试连接
        await this.connect()
        
        uni.showToast({
          title: '连接成功',
          icon: 'success'
        })
        
      } catch (error) {
        logger.error('连接测试失败:', error)
        uni.showToast({
          title: '连接失败',
          icon: 'error'
        })
      } finally {
        this.isLoading = false
      }
    },
    
    // 保存设置
    async handleSave() {
      try {
        // 验证表单
        if (!this.validateForm()) {
          const firstError = Validator.getFirstError(this.validationErrors)
          uni.showToast({
            title: firstError || '请检查输入内容',
            icon: 'error',
            duration: 3000
          })
          return
        }

        this.isLoading = true
        this.loadingText = '正在保存设置...'

        await this.updateWebSocketConfig(this.localSettings.websocket)
        await this.updateDeviceConfig(this.localSettings.device)
        await this.updateDisplayConfig(this.localSettings.display)

        this.hasChanges = false

        uni.showToast({
          title: '保存成功',
          icon: 'success'
        })

        logger.info('设置保存成功')

      } catch (error) {
        logger.error('保存设置失败:', error)
        uni.showToast({
          title: '保存失败',
          icon: 'error'
        })
      } finally {
        this.isLoading = false
      }
    },

    // 运行网络诊断
    async runNetworkDiagnostic() {
      try {
        this.isLoading = true
        this.loadingText = '正在进行网络诊断...'

        // 运行完整的网络诊断
        const results = await NetworkDiagnostic.runFullDiagnostic()

        // 如果有WebSocket配置，测试WebSocket连接
        if (this.localSettings.websocket.host && this.localSettings.websocket.port) {
          this.loadingText = '正在测试WebSocket连接...'
          const wsResult = await NetworkDiagnostic.testWebSocketConnectivity(
            this.localSettings.websocket.host,
            this.localSettings.websocket.port
          )
          results.websocket = wsResult
        }

        // 格式化诊断报告
        this.diagnosticResults = NetworkDiagnostic.formatDiagnosticReport(results)

        // 显示诊断完成提示
        const overallStatus = this.diagnosticResults.summary.overallStatus
        uni.showToast({
          title: `诊断完成: ${overallStatus.text}`,
          icon: overallStatus.level === 'success' ? 'success' : 'none',
          duration: 2000
        })

        logger.info('网络诊断完成', this.diagnosticResults)

      } catch (error) {
        logger.error('网络诊断失败:', error)
        uni.showToast({
          title: '诊断失败',
          icon: 'error'
        })
      } finally {
        this.isLoading = false
      }
    },

    // 获取级别文本
    getLevelText(level) {
      const levelMap = {
        'high': '重要',
        'medium': '一般',
        'low': '轻微',
        'info': '信息'
      }
      return levelMap[level] || level
    },

    // 缓存管理方法
    async refreshCacheStats() {
      try {
        this.cacheStats = await CacheManager.getCacheStats()
        this.logStats = Logger.getLogStats()

        uni.showToast({
          title: '统计信息已刷新',
          icon: 'success'
        })
      } catch (error) {
        logger.error('刷新统计信息失败:', error)
        uni.showToast({
          title: '刷新失败',
          icon: 'error'
        })
      }
    },

    async clearStorageCache() {
      uni.showModal({
        title: '清理存储缓存',
        content: '确认要清理存储缓存吗？这将删除除设置外的所有存储数据。',
        success: async (res) => {
          if (res.confirm) {
            try {
              this.isLoading = true
              this.loadingText = '正在清理存储缓存...'

              await CacheManager.clearStorage({ preserveSettings: true })
              await this.refreshCacheStats()

              uni.showToast({
                title: '存储缓存已清理',
                icon: 'success'
              })
            } catch (error) {
              logger.error('清理存储缓存失败:', error)
              uni.showToast({
                title: '清理失败',
                icon: 'error'
              })
            } finally {
              this.isLoading = false
            }
          }
        }
      })
    },

    async clearFileCache() {
      uni.showModal({
        title: '清理文件缓存',
        content: '确认要清理文件缓存吗？这将删除所有临时文件和保存的文件。',
        success: async (res) => {
          if (res.confirm) {
            try {
              this.isLoading = true
              this.loadingText = '正在清理文件缓存...'

              await CacheManager.clearFiles({ clearTemp: true, clearSaved: true })
              await this.refreshCacheStats()

              uni.showToast({
                title: '文件缓存已清理',
                icon: 'success'
              })
            } catch (error) {
              logger.error('清理文件缓存失败:', error)
              uni.showToast({
                title: '清理失败',
                icon: 'error'
              })
            } finally {
              this.isLoading = false
            }
          }
        }
      })
    },

    async clearAllCache() {
      uni.showModal({
        title: '清理全部缓存',
        content: '确认要清理全部缓存吗？这将删除所有缓存数据，但保留应用设置。',
        success: async (res) => {
          if (res.confirm) {
            try {
              this.isLoading = true
              this.loadingText = '正在清理全部缓存...'

              await CacheManager.clearAllCache({ preserveSettings: true })
              await this.refreshCacheStats()

              uni.showToast({
                title: '全部缓存已清理',
                icon: 'success'
              })
            } catch (error) {
              logger.error('清理全部缓存失败:', error)
              uni.showToast({
                title: '清理失败',
                icon: 'error'
              })
            } finally {
              this.isLoading = false
            }
          }
        }
      })
    },

    // 格式化缓存大小
    formatCacheSize(bytes) {
      return CacheManager.formatSize(bytes)
    },

    // 获取使用率颜色
    getUsageColor(usage) {
      return CacheManager.getUsageColor(usage)
    },

    // 格式化清理时间
    formatCleanTime(timestamp) {
      if (!timestamp) return '从未清理'

      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date

      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
      return `${Math.floor(diff / 86400000)}天前`
    },

    // 日志管理方法
    viewLogs() {
      const logs = Logger.getRecentLogs(100)
      const logText = logs.map(log =>
        `[${log.timestamp}] [${log.level}] ${log.message}`
      ).join('\n')

      // 在实际应用中，这里可以打开一个新页面显示日志
      uni.showModal({
        title: '最近日志',
        content: logText.substring(0, 500) + (logText.length > 500 ? '...' : ''),
        showCancel: false
      })
    },

    exportLogs() {
      try {
        const logText = Logger.exportLogsAsText()

        uni.setClipboardData({
          data: logText,
          success: () => {
            uni.showToast({
              title: '日志已复制到剪贴板',
              icon: 'success'
            })
          }
        })
      } catch (error) {
        logger.error('导出日志失败:', error)
        uni.showToast({
          title: '导出失败',
          icon: 'error'
        })
      }
    },

    clearLogs() {
      uni.showModal({
        title: '清空日志',
        content: '确认要清空所有日志吗？此操作不可撤销。',
        success: (res) => {
          if (res.confirm) {
            Logger.clearLogs()
            this.logStats = Logger.getLogStats()

            uni.showToast({
              title: '日志已清空',
              icon: 'success'
            })
          }
        }
      })
    },

    // 导出系统信息
    exportSystemInfo() {
      try {
        const systemInfo = {
          app: this.getAppVersion,
          device: this.deviceDetails,
          cache: this.cacheStats,
          logs: this.logStats,
          network: this.diagnosticResults,
          timestamp: new Date().toISOString()
        }

        const infoText = JSON.stringify(systemInfo, null, 2)

        uni.setClipboardData({
          data: infoText,
          success: () => {
            uni.showToast({
              title: '系统信息已复制到剪贴板',
              icon: 'success'
            })
          }
        })
      } catch (error) {
        logger.error('导出系统信息失败:', error)
        uni.showToast({
          title: '导出失败',
          icon: 'error'
        })
      }
    },

    // 重置应用
    resetApplication() {
      uni.showModal({
        title: '重置应用',
        content: '确认要重置应用吗？这将清除所有数据和设置，应用将恢复到初始状态。',
        success: async (res) => {
          if (res.confirm) {
            try {
              this.isLoading = true
              this.loadingText = '正在重置应用...'

              // 清除所有缓存和设置
              await CacheManager.clearAllCache({ preserveSettings: false })

              // 清空日志
              Logger.clearLogs()

              // 重置Vuex状态
              await this.$store.dispatch('resetApp')

              uni.showToast({
                title: '应用已重置',
                icon: 'success'
              })

              // 延迟后返回主页
              setTimeout(() => {
                uni.navigateBack()
              }, 1500)

            } catch (error) {
              logger.error('重置应用失败:', error)
              uni.showToast({
                title: '重置失败',
                icon: 'error'
              })
            } finally {
              this.isLoading = false
            }
          }
        }
      })
    },

    // 返回
    handleBack() {
      if (this.hasChanges) {
        uni.showModal({
          title: '提示',
          content: '有未保存的更改，是否确认返回？',
          success: (res) => {
            if (res.confirm) {
              uni.navigateBack()
            }
          }
        })
      } else {
        uni.navigateBack()
      }
    },
    
    // 导出设置
    handleExportSettings() {
      try {
        const settingsJson = this.exportSettings()
        
        // 在实际应用中，这里可以保存到文件或分享
        uni.showModal({
          title: '导出设置',
          content: '设置已导出到剪贴板',
          showCancel: false
        })
        
        // 复制到剪贴板（如果支持）
        uni.setClipboardData({
          data: settingsJson,
          success: () => {
            logger.info('设置已复制到剪贴板')
          }
        })
        
      } catch (error) {
        logger.error('导出设置失败:', error)
        uni.showToast({
          title: '导出失败',
          icon: 'error'
        })
      }
    },
    
    // 导入设置
    handleImportSettings() {
      uni.showModal({
        title: '导入设置',
        content: '请确保设置数据格式正确',
        success: (res) => {
          if (res.confirm) {
            // 在实际应用中，这里可以从文件读取或从剪贴板获取
            uni.getClipboardData({
              success: async (clipRes) => {
                try {
                  await this.importSettings(clipRes.data)
                  this.loadCurrentSettings()
                  
                  uni.showToast({
                    title: '导入成功',
                    icon: 'success'
                  })
                } catch (error) {
                  logger.error('导入设置失败:', error)
                  uni.showToast({
                    title: '导入失败',
                    icon: 'error'
                  })
                }
              }
            })
          }
        }
      })
    },
    
    // 重置设置
    handleResetSettings() {
      uni.showModal({
        title: '重置设置',
        content: '确认要重置所有设置到默认值吗？此操作不可撤销。',
        success: async (res) => {
          if (res.confirm) {
            try {
              this.isLoading = true
              this.loadingText = '正在重置设置...'
              
              await this.resetSettings()
              this.loadCurrentSettings()
              
              uni.showToast({
                title: '重置成功',
                icon: 'success'
              })
              
            } catch (error) {
              logger.error('重置设置失败:', error)
              uni.showToast({
                title: '重置失败',
                icon: 'error'
              })
            } finally {
              this.isLoading = false
            }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.settings-container {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  display: flex;
  flex-direction: column;
  color: #ffffff;
}

/* 顶部导航 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 60rpx;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-left,
.nav-right {
  flex: 1;
}

.nav-center {
  flex: 2;
  text-align: center;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 15rpx 25rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
  color: #ffffff;
  font-size: 28rpx;
}

.back-icon {
  font-size: 32rpx;
  font-weight: bold;
}

.page-title {
  font-size: 36rpx;
  font-weight: 600;
}

.save-btn {
  padding: 15rpx 25rpx;
  background: rgba(76, 175, 80, 0.8);
  border: 1px solid rgba(76, 175, 80, 1);
  border-radius: 20rpx;
  color: #ffffff;
  font-size: 28rpx;
  margin-left: auto;
  display: block;
}

.save-btn[disabled] {
  background: rgba(158, 158, 158, 0.3);
  border-color: rgba(158, 158, 158, 0.5);
  color: rgba(255, 255, 255, 0.5);
}

/* 设置内容 */
.settings-content {
  flex: 1;
  padding: 40rpx;
}

.settings-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 40rpx;
  backdrop-filter: blur(10px);
}

.section-header {
  margin-bottom: 40rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
  margin-bottom: 10rpx;
}

.section-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  display: block;
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 25rpx 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  font-size: 28rpx;
  color: #ffffff;
  flex: 1;
  padding-top: 15rpx;
}

.input-wrapper {
  flex: 2;
  margin-left: 20rpx;
}

.setting-input {
  width: 100%;
  padding: 15rpx 20rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10rpx;
  color: #ffffff;
  font-size: 26rpx;
  transition: all 0.3s ease;
}

.setting-input:focus {
  border-color: rgba(33, 150, 243, 0.8);
  background: rgba(255, 255, 255, 0.15);
}

.setting-input.input-error {
  border-color: rgba(244, 67, 54, 0.8);
  background: rgba(244, 67, 54, 0.1);
}

.setting-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.input-error-text {
  display: block;
  font-size: 22rpx;
  color: #F44336;
  margin-top: 8rpx;
  line-height: 1.4;
}

.input-hint {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 8rpx;
  line-height: 1.4;
}

/* 连接状态 */
.connection-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 2;
  margin-left: 20rpx;
}

.connection-status.status-connected .status-text {
  color: #4CAF50;
}

.connection-status.status-disconnected .status-text {
  color: #F44336;
}

.connection-status.status-connecting .status-text {
  color: #FF9800;
}

.connection-actions {
  display: flex;
  gap: 15rpx;
}

.test-btn {
  padding: 10rpx 20rpx;
  background: rgba(33, 150, 243, 0.8);
  border: 1px solid rgba(33, 150, 243, 1);
  border-radius: 15rpx;
  color: #ffffff;
  font-size: 24rpx;
}

.test-btn.secondary {
  background: rgba(156, 39, 176, 0.8);
  border-color: rgba(156, 39, 176, 1);
}

/* 音量控制 */
.volume-control {
  flex: 2;
  margin-left: 20rpx;
}

/* 选择器 */
.picker-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15rpx 20rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10rpx;
  flex: 2;
  margin-left: 20rpx;
}

.picker-text {
  color: #ffffff;
  font-size: 26rpx;
}

.picker-arrow {
  color: rgba(255, 255, 255, 0.7);
  font-size: 24rpx;
}

/* 设备信息 */
.device-info {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 15rpx;
  padding: 30rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15rpx 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
}

.info-value {
  font-size: 26rpx;
  color: #ffffff;
  flex: 2;
  text-align: right;
  word-break: break-all;
}

/* 网络诊断结果 */
.diagnostic-results {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 15rpx;
  padding: 30rpx;
  margin-top: 30rpx;
}

.diagnostic-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 15rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.diagnostic-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}

.diagnostic-time {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
}

.diagnostic-summary {
  margin-bottom: 25rpx;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.status-indicator.success .status-dot {
  color: #4CAF50;
}

.status-indicator.warning .status-dot {
  color: #FF9800;
}

.status-indicator.error .status-dot {
  color: #F44336;
}

.status-dot {
  font-size: 20rpx;
}

.status-label {
  font-size: 26rpx;
  font-weight: 500;
}

.diagnostic-details {
  margin-bottom: 25rpx;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.detail-value {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 500;
}

.diagnostic-recommendations {
  margin-top: 25rpx;
}

.recommendations-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #ffffff;
  display: block;
  margin-bottom: 15rpx;
}

.recommendation-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10rpx;
  padding: 20rpx;
  margin-bottom: 15rpx;
  border-left: 4rpx solid;
}

.recommendation-item.high {
  border-left-color: #F44336;
}

.recommendation-item.medium {
  border-left-color: #FF9800;
}

.recommendation-item.low {
  border-left-color: #2196F3;
}

.recommendation-item.info {
  border-left-color: #4CAF50;
}

.recommendation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.recommendation-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #ffffff;
}

.recommendation-level {
  font-size: 20rpx;
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.recommendation-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
  margin-bottom: 10rpx;
  display: block;
}

.recommendation-actions {
  margin-top: 10rpx;
}

.action-item {
  display: block;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 5rpx;
  line-height: 1.3;
}

/* 缓存管理 */
.cache-info {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 15rpx;
  padding: 30rpx;
}

.cache-overview {
  margin-bottom: 25rpx;
}

.cache-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15rpx 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.cache-item:last-child {
  border-bottom: none;
}

.cache-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.cache-value {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
}

.usage-bar {
  position: relative;
  width: 200rpx;
  height: 20rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10rpx;
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  border-radius: 10rpx;
  transition: all 0.3s ease;
}

.usage-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 18rpx;
  color: #ffffff;
  font-weight: 600;
}

.cache-actions {
  display: flex;
  gap: 15rpx;
  flex-wrap: wrap;
}

.cache-btn {
  padding: 15rpx 25rpx;
  border-radius: 15rpx;
  font-size: 24rpx;
  border: 1px solid;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.cache-btn.warning {
  background: rgba(255, 152, 0, 0.3);
  border-color: rgba(255, 152, 0, 0.5);
}

.cache-btn.danger {
  background: rgba(244, 67, 54, 0.3);
  border-color: rgba(244, 67, 54, 0.5);
}

.cache-loading {
  text-align: center;
  padding: 60rpx;
}

.loading-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.6);
}

/* 日志管理 */
.log-info {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 15rpx;
  padding: 30rpx;
}

.log-overview {
  margin-bottom: 25rpx;
}

.log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15rpx 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.log-item:last-child {
  border-bottom: none;
}

.log-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.log-value {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
}

.log-value.error {
  color: #F44336;
}

.log-value.warning {
  color: #FF9800;
}

.log-actions {
  display: flex;
  gap: 15rpx;
  flex-wrap: wrap;
}

.log-btn {
  padding: 15rpx 25rpx;
  border-radius: 15rpx;
  font-size: 24rpx;
  border: 1px solid;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.log-btn.danger {
  background: rgba(244, 67, 54, 0.3);
  border-color: rgba(244, 67, 54, 0.5);
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 30rpx;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 200rpx;
  padding: 25rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 15rpx;
  color: #ffffff;
  font-size: 28rpx;
  text-align: center;
}

.action-btn.danger {
  background: rgba(244, 67, 54, 0.3);
  border-color: rgba(244, 67, 54, 0.5);
}

/* 加载遮罩 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 60rpx;
  backdrop-filter: blur(10px);
}

.loading-icon {
  font-size: 60rpx;
  display: block;
  margin-bottom: 20rpx;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 28rpx;
  color: #ffffff;
  display: block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media screen and (max-width: 750px) {
  .header {
    padding: 20rpx 30rpx;
  }

  .settings-content {
    padding: 20rpx;
  }

  .settings-section {
    padding: 30rpx 20rpx;
  }

  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 15rpx;
  }

  .setting-input,
  .connection-status,
  .volume-control,
  .picker-display {
    width: 100%;
    margin-left: 0;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }
}
</style>
