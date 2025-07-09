# SmartScreen UniApp实现任务清单

## 项目概述
基于安卓TV版SmartScreen应用，使用UniApp框架实现跨平台智慧屏应用，支持多媒体播放、WebSocket通信、设备管理等核心功能。支持编译到鸿蒙、Android、iOS等多个平台。

## 技术栈
- **开发框架**: UniApp
- **开发语言**: Vue3 + TypeScript
- **UI框架**: uni-ui组件库
- **网络通信**: WebSocket (uni.connectSocket)
- **媒体播放**: uni.createVideoContext、uni.createInnerAudioContext
- **WebView**: web-view组件
- **存储**: uni.setStorage / uni.getStorage

## 主要任务清单

### 🎯 阶段一：基础架构搭建 (1-2天)

#### 1.1 项目结构设计
- [ ] 创建合理的UniApp目录结构
- [ ] 定义TypeScript接口和数据模型
- [ ] 配置manifest.json和pages.json

#### 1.2 WebSocket通信模块
- [ ] 基于uni.connectSocket实现WebSocketManager类
- [ ] 定义消息模型接口 (RegisterMessage, ContentData等)
- [ ] 实现自动重连机制
- [ ] 实现心跳保持功能

#### 1.3 设备工具类
- [ ] 使用uni.getSystemInfo实现DeviceUtils
- [ ] 使用uni.getNetworkType实现网络状态检测
- [ ] 实现设备信息获取

### 🎯 阶段二：主页面实现 (1-2天)

#### 2.1 主页面布局
- [ ] 设计主页面UI结构
- [ ] 实现左上角Logo显示
- [ ] 实现右上角网络状态图标
- [ ] 实现中央状态文本和引导提示
- [ ] 实现底部版权信息

#### 2.2 状态管理
- [ ] 实现网络连接状态管理
- [ ] 实现WebSocket连接状态管理
- [ ] 实现状态UI更新逻辑
- [ ] 实现按键事件处理（遥控器支持）

### 🎯 阶段三：设置页面实现 (1天)

#### 3.1 设置页面布局
- [ ] 创建设置页面路由
- [ ] 实现侧边菜单导航
- [ ] 实现系统设置界面
- [ ] 实现关于设备界面

#### 3.2 设置功能
- [ ] 实现IP地址和端口配置
- [ ] 使用uni.setStorage/getStorage实现设置保存和读取
- [ ] 实现设备信息显示
- [ ] 实现返回主页功能

### 🎯 阶段四：播放器管理器实现 (2-3天)

#### 4.1 播放器基础框架
- [ ] 创建PlayerManager类
- [ ] 实现播放器生命周期管理
- [ ] 实现播放列表管理
- [ ] 实现内容类型判断和路由

#### 4.2 视频播放功能
- [ ] 使用video组件实现视频播放
- [ ] 实现MP4、AVI等格式支持
- [ ] 实现RTSP直播流播放
- [ ] 使用uni.createVideoContext实现播放控制

#### 4.3 音频播放功能
- [ ] 使用uni.createInnerAudioContext实现音频播放
- [ ] 实现MP3、AAC等格式支持
- [ ] 实现音频封面显示
- [ ] 实现音频信息覆盖层

#### 4.4 图片显示功能
- [ ] 使用image组件实现图片显示
- [ ] 支持JPG、PNG、GIF等格式
- [ ] 实现图片缓存机制
- [ ] 实现自适应缩放

#### 4.5 网页播放功能
- [ ] 使用web-view组件实现网页显示
- [ ] 实现网页加载和渲染
- [ ] 使用postMessage实现JavaScript交互
- [ ] 实现安全控制和权限管理

### 🎯 阶段五：内容缓存管理 (1天)

#### 5.1 缓存框架
- [ ] 实现ContentCacheManager类
- [ ] 实现文件下载和本地存储
- [ ] 实现缓存状态管理
- [ ] 实现缓存清理策略

#### 5.2 缓存优化
- [ ] 实现预加载机制
- [ ] 实现缓存有效期管理
- [ ] 实现存储空间管理
- [ ] 实现缓存性能监控

### 🎯 阶段六：高级功能实现 (1-2天)

#### 6.1 播放控制逻辑
- [ ] 实现循环播放逻辑
- [ ] 实现定时切换功能
- [ ] 实现播放策略支持
- [ ] 实现错误处理和重试

#### 6.2 实时消息处理
- [ ] 实现推送内容播放
- [ ] 实现临时内容插播
- [ ] 实现播放模式切换
- [ ] 实现批量控制命令

### 🎯 阶段七：测试和优化 (1天)

#### 7.1 功能测试
- [ ] WebSocket连接测试
- [ ] 各种媒体格式播放测试
- [ ] 网络异常处理测试
- [ ] 设备配置测试

#### 7.2 性能优化
- [ ] 内存使用优化
- [ ] 播放性能优化
- [ ] 网络请求优化
- [ ] UI响应优化

## 文件结构规划

```
├── common/
│   ├── constants/
│   │   └── constants.js                  # 常量定义
│   ├── utils/
│   │   ├── deviceUtils.js               # 设备工具类
│   │   ├── networkUtils.js              # 网络工具类
│   │   └── logger.js                    # 日志工具
│   └── types/
│       └── messageTypes.js              # 消息类型定义
├── store/
│   ├── index.js                         # Vuex状态管理
│   ├── modules/
│   │   ├── websocket.js                 # WebSocket状态
│   │   ├── player.js                    # 播放器状态
│   │   └── settings.js                  # 设置状态
├── api/
│   ├── websocketManager.js              # WebSocket管理器
│   ├── playerManager.js                 # 播放器管理器
│   ├── contentCacheManager.js           # 内容缓存管理器
│   └── settingsManager.js               # 设置管理器
├── pages/
│   ├── index/
│   │   └── index.vue                    # 主页面
│   └── settings/
│       └── settings.vue                 # 设置页面
├── components/
│   ├── MediaPlayer.vue                  # 媒体播放组件
│   ├── WebPlayer.vue                    # 网页播放组件
│   ├── ImagePlayer.vue                  # 图片显示组件
│   └── AudioPlayer.vue                  # 音频播放组件
└── models/
    ├── contentModel.js                  # 内容数据模型
    ├── messageModel.js                  # 消息数据模型
    └── deviceModel.js                   # 设备数据模型
```

## 关键技术点

### 1. WebSocket实现
- 使用UniApp `uni.connectSocket` API
- 实现断线重连和心跳机制
- 处理JSON消息序列化/反序列化

### 2. 媒体播放
- 视频：使用`video`组件和`uni.createVideoContext`
- 音频：使用`uni.createInnerAudioContext` API
- 图片：使用`image`组件
- 网页：使用`web-view`组件

### 3. 数据存储
- 使用`uni.setStorage/getStorage`保存设置
- 使用`uni.saveFile/getSavedFileList`实现缓存管理

### 4. 网络检测
- 使用`uni.getNetworkType`检测网络状态
- 使用`uni.onNetworkStatusChange`监听网络状态变化

## 开发优先级
1. **优先级1**：WebSocket通信 + 主页面基础框架
2. **优先级2**：播放器管理器 + 基础媒体播放
3. **优先级3**：设置页面 + 完整播放功能
4. **优先级4**：缓存管理 + 高级功能
5. **优先级5**：测试优化 + 性能调优

## 注意事项
1. 严格遵循UniApp开发规范和跨平台兼容性
2. 确保与安卓TV版功能对等
3. 注意不同平台的权限申请要求（鸿蒙、Android、iOS）
4. 考虑不同设备尺寸的适配（TV、平板、手机）
5. 保持与WebSocket协议标准的完全兼容
6. 合理使用条件编译处理平台差异

准备开始实施第一阶段任务。