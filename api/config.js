/**
 * WebSocket连接配置
 */

// WebSocket服务器配置
export const WEBSOCKET_CONFIG = {
  // 服务器地址
  // HOST: '10.24.200.4',
  HOST: '192.168.1.100',
  
  // 服务器端口
  PORT: 9502,
  
  // 获取完整的WebSocket URL
  getUrl() {
    return `ws://${this.HOST}:${this.PORT}/ws`
  },
  
  // 设置服务器地址
  setHost(host) {
    this.HOST = host
  },
  
  // 设置服务器端口
  setPort(port) {
    this.PORT = port
  },
  
  // 设置完整配置
  setConfig(host, port) {
    this.HOST = host
    this.PORT = port
  }
}

// 导出默认配置
export default WEBSOCKET_CONFIG
