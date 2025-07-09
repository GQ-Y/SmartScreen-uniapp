/**
 * 播放器状态管理模块
 */

import { ContentModel } from '../../models/contentModel.js'
import { ContentResponseModel } from '../../models/messageModel.js'
import { PLAYER_STATUS, CONTENT_TYPES, DISPLAY_MODES } from '../../common/constants/constants.js'
import { Logger } from '../../common/utils/logger.js'

const logger = Logger.createTaggedLogger('PlayerStore')

const state = {
  // 播放状态
  status: PLAYER_STATUS.IDLE,
  
  // 当前内容
  currentContent: null,
  currentIndex: 0,
  
  // 内容列表
  contentList: [],
  playlistContents: [],
  directContent: null,
  tempContent: null,
  
  // 播放模式
  displayMode: DISPLAY_MODES.PLAYLIST_FIRST,
  displayModeName: '',
  isLooping: false,
  autoPlay: true,
  
  // 播放进度
  currentTime: 0,
  duration: 0,
  buffered: 0,
  volume: 1.0,
  
  // 播放统计
  totalPlayTime: 0,
  playCount: 0,
  errorCount: 0,
  
  // 错误信息
  lastError: null,
  errorHistory: []
}

const getters = {
  // 获取播放状态
  getPlayerStatus: state => ({
    status: state.status,
    isPlaying: state.status === PLAYER_STATUS.PLAYING,
    isPaused: state.status === PLAYER_STATUS.PAUSED,
    isLoading: state.status === PLAYER_STATUS.LOADING,
    hasError: state.status === PLAYER_STATUS.ERROR
  }),
  
  // 获取当前内容
  getCurrentContent: state => state.currentContent,
  
  // 获取内容列表
  getContentList: state => [...state.contentList],
  
  // 获取播放列表内容
  getPlaylistContents: state => [...state.playlistContents],
  
  // 获取直接内容
  getDirectContent: state => state.directContent,
  
  // 获取临时内容
  getTempContent: state => state.tempContent,
  
  // 获取播放模式
  getDisplayMode: state => ({
    mode: state.displayMode,
    name: state.displayModeName,
    isLooping: state.isLooping,
    autoPlay: state.autoPlay
  }),
  
  // 获取播放进度
  getPlayProgress: state => ({
    currentTime: state.currentTime,
    duration: state.duration,
    buffered: state.buffered,
    progress: state.duration > 0 ? state.currentTime / state.duration : 0,
    volume: state.volume
  }),
  
  // 检查是否有内容
  hasContent: state => {
    return state.contentList.length > 0 || 
           state.directContent !== null || 
           state.tempContent !== null
  },
  
  // 检查是否可以播放下一个
  canPlayNext: state => {
    return state.currentIndex < state.contentList.length - 1 || state.isLooping
  },
  
  // 检查是否可以播放上一个
  canPlayPrevious: state => {
    return state.currentIndex > 0 || state.isLooping
  },
  
  // 获取统计信息
  getStats: state => ({
    status: state.status,
    contentCount: state.contentList.length,
    currentIndex: state.currentIndex,
    totalPlayTime: state.totalPlayTime,
    playCount: state.playCount,
    errorCount: state.errorCount,
    displayMode: state.displayMode,
    volume: state.volume,
    hasError: !!state.lastError
  }),
  
  // 获取最后的错误
  getLastError: state => state.lastError,
  
  // 获取错误历史
  getErrorHistory: state => [...state.errorHistory]
}

const mutations = {
  // 设置播放状态
  SET_PLAYER_STATUS(state, status) {
    const oldStatus = state.status
    state.status = status
    logger.info(`播放器状态变更: ${oldStatus} -> ${status}`)
  },
  
  // 设置当前内容
  SET_CURRENT_CONTENT(state, content) {
    state.currentContent = content instanceof ContentModel ? 
      content : (content ? new ContentModel(content) : null)
    
    if (content) {
      logger.info('当前播放内容:', content.title || content.content_url)
    }
  },
  
  // 设置当前索引
  SET_CURRENT_INDEX(state, index) {
    state.currentIndex = Math.max(0, Math.min(index, state.contentList.length - 1))
  },
  
  // 设置内容列表
  SET_CONTENT_LIST(state, contents) {
    state.contentList = contents.map(content => 
      content instanceof ContentModel ? content : new ContentModel(content)
    )
    logger.info(`内容列表已更新，共${state.contentList.length}项`)
  },
  
  // 设置播放列表内容
  SET_PLAYLIST_CONTENTS(state, contents) {
    state.playlistContents = contents.map(content => 
      content instanceof ContentModel ? content : new ContentModel(content)
    )
  },
  
  // 设置直接内容
  SET_DIRECT_CONTENT(state, content) {
    state.directContent = content ? 
      (content instanceof ContentModel ? content : new ContentModel(content)) : null
  },
  
  // 设置临时内容
  SET_TEMP_CONTENT(state, content) {
    state.tempContent = content ? 
      (content instanceof ContentModel ? content : new ContentModel(content)) : null
  },
  
  // 设置播放模式
  SET_DISPLAY_MODE(state, { mode, name }) {
    state.displayMode = mode
    state.displayModeName = name || ''
    logger.info(`播放模式变更: ${name} (${mode})`)
  },
  
  // 设置循环播放
  SET_LOOPING(state, isLooping) {
    state.isLooping = isLooping
  },
  
  // 设置自动播放
  SET_AUTO_PLAY(state, autoPlay) {
    state.autoPlay = autoPlay
  },
  
  // 设置播放进度
  SET_PLAY_PROGRESS(state, { currentTime, duration, buffered }) {
    if (currentTime !== undefined) state.currentTime = currentTime
    if (duration !== undefined) state.duration = duration
    if (buffered !== undefined) state.buffered = buffered
  },
  
  // 设置音量
  SET_VOLUME(state, volume) {
    state.volume = Math.max(0, Math.min(1, volume))
  },
  
  // 增加播放时间
  ADD_PLAY_TIME(state, seconds) {
    state.totalPlayTime += seconds
  },
  
  // 增加播放次数
  INCREMENT_PLAY_COUNT(state) {
    state.playCount++
  },
  
  // 增加错误次数
  INCREMENT_ERROR_COUNT(state) {
    state.errorCount++
  },
  
  // 设置错误
  SET_ERROR(state, error) {
    state.lastError = error
    if (error) {
      state.errorHistory.unshift({
        error,
        timestamp: Date.now(),
        content: state.currentContent ? state.currentContent.toJSON() : null
      })
      
      // 限制错误历史数量
      if (state.errorHistory.length > 20) {
        state.errorHistory = state.errorHistory.slice(0, 20)
      }
      
      state.errorCount++
      logger.error('播放器错误:', error)
    }
  },
  
  // 清除错误
  CLEAR_ERROR(state) {
    state.lastError = null
  },
  
  // 重置统计
  RESET_STATS(state) {
    state.totalPlayTime = 0
    state.playCount = 0
    state.errorCount = 0
    state.errorHistory = []
  }
}

const actions = {
  // 处理内容响应
  handleContent({ commit, dispatch }, message) {
    try {
      logger.info('处理内容响应')
      
      const contentResponse = new ContentResponseModel(message.data)
      
      // 设置播放模式
      commit('SET_DISPLAY_MODE', {
        mode: contentResponse.display_mode,
        name: contentResponse.display_mode_name
      })
      
      // 设置内容
      commit('SET_PLAYLIST_CONTENTS', contentResponse.playlist_contents)
      commit('SET_DIRECT_CONTENT', contentResponse.direct_content)
      
      // 根据播放模式确定主要播放内容
      const primaryContents = contentResponse.getPrimaryContents()
      commit('SET_CONTENT_LIST', primaryContents)
      
      // 如果有内容且启用自动播放，开始播放
      if (primaryContents.length > 0) {
        dispatch('playContent', 0)
      }
      
    } catch (error) {
      logger.error('处理内容响应失败:', error)
      commit('SET_ERROR', error)
    }
  },
  
  // 处理推送内容
  handlePushContent({ commit, dispatch }, message) {
    try {
      logger.info('处理推送内容')
      
      const content = new ContentModel(message.data)
      
      // 如果是临时内容，设置为临时内容
      if (message.data.is_temp) {
        commit('SET_TEMP_CONTENT', content)
        dispatch('playTempContent')
      } else {
        // 添加到内容列表
        const currentList = [...state.contentList]
        currentList.push(content)
        commit('SET_CONTENT_LIST', currentList)
      }
      
    } catch (error) {
      logger.error('处理推送内容失败:', error)
      commit('SET_ERROR', error)
    }
  },
  
  // 处理播放模式变更
  handleDisplayModeChange({ commit, dispatch }, message) {
    try {
      logger.info('处理播放模式变更')
      
      commit('SET_DISPLAY_MODE', {
        mode: message.mode,
        name: message.mode_name
      })
      
      // 重新组织内容列表
      dispatch('reorganizeContentList')
      
    } catch (error) {
      logger.error('处理播放模式变更失败:', error)
      commit('SET_ERROR', error)
    }
  },
  
  // 处理控制指令
  handleControl({ dispatch }, message) {
    try {
      logger.info('处理控制指令:', message.action)
      
      switch (message.action) {
        case 'play':
          dispatch('play')
          break
        case 'pause':
          dispatch('pause')
          break
        case 'stop':
          dispatch('stop')
          break
        case 'next':
          dispatch('next')
          break
        case 'previous':
          dispatch('previous')
          break
        case 'refresh':
          dispatch('refresh')
          break
        default:
          logger.warn('未知控制指令:', message.action)
      }
      
    } catch (error) {
      logger.error('处理控制指令失败:', error)
    }
  },
  
  // 播放指定内容
  async playContent({ state, commit }, index) {
    try {
      if (index < 0 || index >= state.contentList.length) {
        throw new Error('无效的内容索引')
      }
      
      const content = state.contentList[index]
      commit('SET_CURRENT_INDEX', index)
      commit('SET_CURRENT_CONTENT', content)
      commit('SET_PLAYER_STATUS', PLAYER_STATUS.LOADING)
      
      // 这里应该调用实际的播放器组件
      // 目前只是模拟
      setTimeout(() => {
        commit('SET_PLAYER_STATUS', PLAYER_STATUS.PLAYING)
        commit('INCREMENT_PLAY_COUNT')
      }, 1000)
      
      logger.info(`开始播放内容: ${content.title}`)
      
    } catch (error) {
      logger.error('播放内容失败:', error)
      commit('SET_ERROR', error)
      commit('SET_PLAYER_STATUS', PLAYER_STATUS.ERROR)
    }
  },
  
  // 播放临时内容
  async playTempContent({ state, commit }) {
    try {
      if (!state.tempContent) {
        throw new Error('没有临时内容')
      }
      
      commit('SET_CURRENT_CONTENT', state.tempContent)
      commit('SET_PLAYER_STATUS', PLAYER_STATUS.LOADING)
      
      // 这里应该调用实际的播放器组件
      setTimeout(() => {
        commit('SET_PLAYER_STATUS', PLAYER_STATUS.PLAYING)
      }, 1000)
      
      logger.info('开始播放临时内容')
      
    } catch (error) {
      logger.error('播放临时内容失败:', error)
      commit('SET_ERROR', error)
    }
  },
  
  // 播放
  play({ state, commit }) {
    if (state.status === PLAYER_STATUS.PAUSED) {
      commit('SET_PLAYER_STATUS', PLAYER_STATUS.PLAYING)
      logger.info('恢复播放')
    }
  },
  
  // 暂停
  pause({ commit }) {
    commit('SET_PLAYER_STATUS', PLAYER_STATUS.PAUSED)
    logger.info('暂停播放')
  },
  
  // 停止
  stop({ commit }) {
    commit('SET_PLAYER_STATUS', PLAYER_STATUS.IDLE)
    commit('SET_CURRENT_CONTENT', null)
    commit('SET_PLAY_PROGRESS', { currentTime: 0, duration: 0, buffered: 0 })
    logger.info('停止播放')
  },
  
  // 下一个
  async next({ state, dispatch, getters }) {
    if (getters.canPlayNext) {
      let nextIndex = state.currentIndex + 1
      if (nextIndex >= state.contentList.length && state.isLooping) {
        nextIndex = 0
      }
      await dispatch('playContent', nextIndex)
    }
  },
  
  // 上一个
  async previous({ state, dispatch, getters }) {
    if (getters.canPlayPrevious) {
      let prevIndex = state.currentIndex - 1
      if (prevIndex < 0 && state.isLooping) {
        prevIndex = state.contentList.length - 1
      }
      await dispatch('playContent', prevIndex)
    }
  },
  
  // 刷新
  refresh({ dispatch }) {
    logger.info('刷新播放器')
    // 重新获取内容
    dispatch('websocket/getContent', null, { root: true })
  },
  
  // 重新组织内容列表
  reorganizeContentList({ state, commit }) {
    // 根据当前播放模式重新组织内容列表
    let contentList = []
    
    switch (state.displayMode) {
      case DISPLAY_MODES.PLAYLIST_FIRST:
        contentList = [...state.playlistContents]
        if (state.directContent) {
          contentList.push(state.directContent)
        }
        break
      case DISPLAY_MODES.DIRECT_FIRST:
        if (state.directContent) {
          contentList.push(state.directContent)
        }
        contentList.push(...state.playlistContents)
        break
      case DISPLAY_MODES.PLAYLIST_ONLY:
        contentList = [...state.playlistContents]
        break
      case DISPLAY_MODES.DIRECT_ONLY:
        if (state.directContent) {
          contentList.push(state.directContent)
        }
        break
    }
    
    commit('SET_CONTENT_LIST', contentList)
  },
  
  // 设置音量
  setVolume({ commit }, volume) {
    commit('SET_VOLUME', volume)
    logger.info(`音量设置为: ${Math.round(volume * 100)}%`)
  },
  
  // 跳转到指定时间
  seekTo({ commit }, time) {
    commit('SET_PLAY_PROGRESS', { currentTime: time })
    logger.info(`跳转到: ${time}秒`)
  },
  
  // 重置播放器
  reset({ commit }) {
    commit('SET_PLAYER_STATUS', PLAYER_STATUS.IDLE)
    commit('SET_CURRENT_CONTENT', null)
    commit('SET_CURRENT_INDEX', 0)
    commit('SET_CONTENT_LIST', [])
    commit('SET_PLAYLIST_CONTENTS', [])
    commit('SET_DIRECT_CONTENT', null)
    commit('SET_TEMP_CONTENT', null)
    commit('SET_PLAY_PROGRESS', { currentTime: 0, duration: 0, buffered: 0 })
    commit('RESET_STATS')
    commit('CLEAR_ERROR')
    logger.info('播放器已重置')
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
