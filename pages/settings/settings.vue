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
          <input 
            class="setting-input" 
            v-model="localSettings.websocket.host"
            placeholder="请输入服务器IP地址"
            @input="markChanged"
          />
        </view>
        
        <view class="setting-item">
          <text class="setting-label">端口号</text>
          <input 
            class="setting-input" 
            v-model.number="localSettings.websocket.port"
            type="number"
            placeholder="请输入端口号"
            @input="markChanged"
          />
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
            <button class="test-btn" @click="testConnection">测试连接</button>
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
          <input 
            class="setting-input" 
            v-model="localSettings.device.deviceName"
            placeholder="请输入设备名称"
            @input="markChanged"
          />
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
          <button class="action-btn danger" @click="handleResetSettings">
            重置设置
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

const logger = Logger.createTaggedLogger('SettingsPage')

export default {
  name: 'SettingsPage',
  
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
      ]
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
  
  onLoad() {
    logger.info('设置页面加载')
    this.loadCurrentSettings()
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
    
    // 标记已更改
    markChanged() {
      this.hasChanges = true
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
  align-items: center;
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
}

.setting-input {
  flex: 2;
  padding: 15rpx 20rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10rpx;
  color: #ffffff;
  font-size: 26rpx;
  margin-left: 20rpx;
}

.setting-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

/* 连接状态 */
.connection-status {
  display: flex;
  align-items: center;
  gap: 20rpx;
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

.test-btn {
  padding: 10rpx 20rpx;
  background: rgba(33, 150, 243, 0.8);
  border: 1px solid rgba(33, 150, 243, 1);
  border-radius: 15rpx;
  color: #ffffff;
  font-size: 24rpx;
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
