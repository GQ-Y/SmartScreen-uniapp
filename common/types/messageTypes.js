/**
 * WebSocket 消息类型定义
 */

/**
 * 基础消息接口
 */
export class BaseMessage {
  constructor(type, data = {}) {
    this.type = type
    this.timestamp = Date.now()
    Object.assign(this, data)
  }
}

/**
 * 设备注册消息
 */
export class RegisterMessage extends BaseMessage {
  constructor(mac, deviceName = '') {
    super('register', {
      mac,
      device_name: deviceName
    })
  }
}

/**
 * 注册响应消息
 */
export class RegisterAckMessage extends BaseMessage {
  constructor(success, active, deviceId, isNewDevice, msg) {
    super('register_ack', {
      success,
      active,
      device_id: deviceId,
      is_new_device: isNewDevice,
      msg
    })
  }
}

/**
 * 心跳消息
 */
export class HeartbeatMessage extends BaseMessage {
  constructor(mac) {
    super('heartbeat', {
      mac
    })
  }
}

/**
 * 心跳响应消息
 */
export class HeartbeatAckMessage extends BaseMessage {
  constructor(success, active, msg) {
    super('heartbeat_ack', {
      success,
      active,
      msg
    })
  }
}

/**
 * 获取内容消息
 */
export class GetContentMessage extends BaseMessage {
  constructor(mac) {
    super('get_content', {
      mac
    })
  }
}

/**
 * 内容响应消息
 */
export class ContentResponseMessage extends BaseMessage {
  constructor(success, msg, data) {
    super('content_response', {
      success,
      msg,
      data
    })
  }
}

/**
 * 内容数据结构
 */
export class ContentData {
  constructor(data = {}) {
    this.id = data.id || 0
    this.title = data.title || ''
    this.content_type = data.content_type || 1
    this.content_url = data.content_url || ''
    this.thumbnail = data.thumbnail || ''
    this.duration = data.duration || 0
    
    // 播放列表相关字段
    if (data.playlist_id) {
      this.playlist_id = data.playlist_id
      this.playlist_name = data.playlist_name || ''
      this.play_mode = data.play_mode || 1
      this.playlist_sort = data.playlist_sort || 0
      this.content_sort = data.content_sort || 0
    }
  }
}

/**
 * 设备内容响应数据结构
 */
export class DeviceContentData {
  constructor(data = {}) {
    this.device_id = data.device_id || 0
    this.display_mode = data.display_mode || 1
    this.display_mode_name = data.display_mode_name || ''
    this.direct_content = data.direct_content ? new ContentData(data.direct_content) : null
    this.playlist_contents = (data.playlist_contents || []).map(item => new ContentData(item))
    this.has_direct_content = data.has_direct_content || false
    this.has_playlist_contents = data.has_playlist_contents || false
    this.primary_contents = (data.primary_contents || []).map(item => new ContentData(item))
    this.secondary_contents = (data.secondary_contents || []).map(item => new ContentData(item))
    this.total_contents = data.total_contents || 0
  }
}

/**
 * 激活状态变更消息
 */
export class ActiveStatusMessage extends BaseMessage {
  constructor(active, msg) {
    super('active_status', {
      active,
      msg
    })
  }
}

/**
 * 内容推送消息
 */
export class PushContentMessage extends BaseMessage {
  constructor(contentData) {
    super('push_content', {
      data: new ContentData(contentData)
    })
  }
}

/**
 * 播放策略变更消息
 */
export class DisplayModeChangeMessage extends BaseMessage {
  constructor(mode, modeName) {
    super('display_mode_change', {
      mode,
      mode_name: modeName
    })
  }
}

/**
 * 临时内容推送消息
 */
export class TempContentMessage extends BaseMessage {
  constructor(contentData) {
    super('temp_content', {
      data: {
        ...new ContentData(contentData),
        is_temp: true
      }
    })
  }
}

/**
 * 批量控制指令消息
 */
export class BatchControlMessage extends BaseMessage {
  constructor(action, message, timestamp) {
    super('batch_control', {
      action,
      message,
      timestamp
    })
  }
}

/**
 * 刷新指令消息
 */
export class RefreshMessage extends BaseMessage {
  constructor(message) {
    super('refresh', {
      message
    })
  }
}

/**
 * 错误消息
 */
export class ErrorMessage extends BaseMessage {
  constructor(msg, code = null) {
    super('error', {
      msg,
      code
    })
  }
}

/**
 * 消息工厂类
 */
export class MessageFactory {
  /**
   * 根据消息类型创建消息对象
   */
  static createMessage(type, data) {
    switch (type) {
      case 'register':
        return new RegisterMessage(data.mac, data.device_name)
      case 'register_ack':
        return new RegisterAckMessage(data.success, data.active, data.device_id, data.is_new_device, data.msg)
      case 'heartbeat':
        return new HeartbeatMessage(data.mac)
      case 'heartbeat_ack':
        return new HeartbeatAckMessage(data.success, data.active, data.msg)
      case 'get_content':
        return new GetContentMessage(data.mac)
      case 'content_response':
        return new ContentResponseMessage(data.success, data.msg, new DeviceContentData(data.data))
      case 'active_status':
        return new ActiveStatusMessage(data.active, data.msg)
      case 'push_content':
        return new PushContentMessage(data.data)
      case 'display_mode_change':
        return new DisplayModeChangeMessage(data.mode, data.mode_name)
      case 'temp_content':
        return new TempContentMessage(data.data)
      case 'batch_control':
        return new BatchControlMessage(data.action, data.message, data.timestamp)
      case 'refresh':
        return new RefreshMessage(data.message)
      case 'error':
        return new ErrorMessage(data.msg, data.code)
      default:
        return new BaseMessage(type, data)
    }
  }
  
  /**
   * 解析JSON消息
   */
  static parseMessage(jsonStr) {
    try {
      const data = JSON.parse(jsonStr)
      return this.createMessage(data.type, data)
    } catch (error) {
      console.error('消息解析失败:', error)
      return new ErrorMessage('消息格式错误')
    }
  }
}
