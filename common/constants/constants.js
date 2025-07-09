/**
 * SmartScreen 应用常量定义
 */

// WebSocket 连接配置
export const WEBSOCKET_CONFIG = {
  DEFAULT_HOST: 'localhost',
  DEFAULT_PORT: 9502,
  DEFAULT_URL: 'ws://localhost:9502/ws',
  RECONNECT_INTERVAL: 3000, // 重连间隔(ms)
  MAX_RECONNECT_ATTEMPTS: 10, // 最大重连次数
  HEARTBEAT_INTERVAL: 30000, // 心跳间隔(ms)
  CONNECTION_TIMEOUT: 10000 // 连接超时(ms)
}

// 消息类型
export const MESSAGE_TYPES = {
  // 客户端发送
  REGISTER: 'register',
  HEARTBEAT: 'heartbeat',
  GET_CONTENT: 'get_content',
  
  // 服务端响应
  REGISTER_ACK: 'register_ack',
  HEARTBEAT_ACK: 'heartbeat_ack',
  CONTENT_RESPONSE: 'content_response',
  ERROR: 'error',
  
  // 服务端推送
  ACTIVE_STATUS: 'active_status',
  PUSH_CONTENT: 'push_content',
  DISPLAY_MODE_CHANGE: 'display_mode_change',
  TEMP_CONTENT: 'temp_content',
  BATCH_CONTROL: 'batch_control',
  REFRESH: 'refresh'
}

// 内容类型
export const CONTENT_TYPES = {
  WEBPAGE: 1,    // 网页
  IMAGE: 2,      // 图片
  VIDEO: 3,      // 视频
  LIVE_STREAM: 4, // 直播流
  AUDIO: 5       // 音频
}

// 播放策略
export const DISPLAY_MODES = {
  PLAYLIST_FIRST: 1,    // 播放列表优先
  DIRECT_FIRST: 2,      // 直接内容优先
  PLAYLIST_ONLY: 3,     // 仅播放列表
  DIRECT_ONLY: 4        // 仅直接内容
}

// 设备状态
export const DEVICE_STATUS = {
  OFFLINE: 0,    // 离线
  ONLINE: 1,     // 在线
  INACTIVE: 0,   // 未激活
  ACTIVE: 1      // 已激活
}

// 连接状态
export const CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
}

// 播放状态
export const PLAYER_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ERROR: 'error',
  ENDED: 'ended'
}

// 存储键名
export const STORAGE_KEYS = {
  DEVICE_CONFIG: 'device_config',
  WEBSOCKET_CONFIG: 'websocket_config',
  USER_SETTINGS: 'user_settings',
  CACHE_CONFIG: 'cache_config'
}

// 默认配置
export const DEFAULT_CONFIG = {
  DEVICE_NAME: 'SmartScreen设备',
  AUTO_PLAY: true,
  CACHE_ENABLED: true,
  CACHE_SIZE_LIMIT: 500 * 1024 * 1024, // 500MB
  LOG_LEVEL: 'info'
}

// 错误代码
export const ERROR_CODES = {
  NETWORK_ERROR: 1001,
  WEBSOCKET_ERROR: 1002,
  DEVICE_NOT_REGISTERED: 1003,
  DEVICE_NOT_ACTIVE: 1004,
  CONTENT_LOAD_ERROR: 1005,
  PLAYER_ERROR: 1006
}

// 支持的文件格式
export const SUPPORTED_FORMATS = {
  VIDEO: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'],
  AUDIO: ['mp3', 'aac', 'flac', 'ogg', 'wav'],
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
  LIVE_STREAM: ['m3u8', 'rtmp', 'rtsp', 'mpd']
}

// 应用信息
export const APP_INFO = {
  NAME: 'SmartScreen',
  VERSION: '1.0.0',
  DESCRIPTION: '智慧屏应用',
  AUTHOR: 'SmartScreen Team'
}
